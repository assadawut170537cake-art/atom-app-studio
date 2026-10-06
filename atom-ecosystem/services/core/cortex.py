"""Multi-persona orchestration for ATOM.

The three personas are not three separate apps talking to each other over the
wire — inside one process they are concurrent speakers with different scopes.
This module decides who should speak, runs those speakers concurrently, and
can hand work to a short-lived sub-agent.

Turn-taking model (chosen deliberately over "everyone always speaks"):

  directed      "อัลตรอน ช่วยดูโค้ดนี้"      -> only that persona answers
  private       a private lane with one persona, fully isolated
  broadcast     "@all" or a question nobody owns -> relevant personas answer
                                          concurrently, each from its own scope
  synthesis     after a broadcast, one persona collapses the answers into a
                single reply so the user is not left reading three essays

Relevance is keyword scoring plus explicit mentions. It is intentionally simple
and inspectable: every decision returns the scores that produced it, so a
misroute can be explained instead of guessed at.
"""
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Iterable

import llm

logger = logging.getLogger("atom-cortex")

AGENTS_DIR = Path(__file__).parent / "agents"

# Personas that can appear in a conversation. Jev is internal (see JEV below)
# and is never offered as a speaking turn.
SPEAKERS = ("atom", "friday", "ultron")
ALL_AGENTS = SPEAKERS + ("jev",)

# Domain keywords per persona. Weight is deliberately coarse: this is a router,
# not a classifier, and the LLM handles the hard part after routing.
DOMAINS: dict[str, dict[str, tuple[str, ...]]] = {
    "atom": {
        "control": ("เปิด", "ปิด", "สั่ง", "ควบคุม", "เสียง", "ไฟ", "มือถือ", "คอม"),
        "chat": ("คุย", "เล่า", "ถาม", "ที่ไหน", "กี่", "อะไร", "ทำไม"),
        "system": ("สถานะ", "ระบบ", "ออนไลน์", "error", "ปัญหา"),
    },
    "friday": {
        "plan": ("แผน", "วาง", "กำหนด", "ตาราง", "สัปดาห์", "วันนี้", "พรุ่งนี้"),
        "spec": ("สเปก", "ข้อกำหนด", "เอกสาร", "สรุป", "รายงาน", "ออกแบบ"),
        "memory": ("จำ", "ความจำ", "บันทึก", "ย้อนหลัง", "เมื่อวาน"),
        "research": ("วิจัย", "ค้นหา", "เปรียบเทียบ", "ข้อมูล", "อ้างอิง"),
    },
    "ultron": {
        "code": ("โค้ด", "code", "เขียน", "ฟังก์ชัน", "คลาส", "refactor", "บั๊ก"),
        "infra": ("build", "deploy", "server", "docker", "api", "ฐานข้อมูล", "git"),
        "security": ("ปลอดภัย", "ช่องโหว่", "เกาะ", "audit", "ป้องกัน", "เข้ารหัส"),
        "debug": ("error", "crash", "พัง", "debug", "trace", "log"),
    },
}

# Thai/English explicit address, longest match wins.
MENTIONS = [
    ("ultron", ["อัลตรอน", "อัลตร้อน", "ultron"]),
    ("friday", ["ไฟรเดย์", "ฟริเดย์", "friday"]),
    ("atom", ["อะตอม", "atom"]),
]

# Words that mean "everyone weigh in".
BROADCAST = ("ทุกคน", "ทั้งหมด", "ทุกตัว", "ช่วยกัน", "@all", "ประชุม", "คุยกัน")

# Which persona collapses a broadcast into one reply.
SYNTHESIZER = "atom"


class CortexError(RuntimeError):
    """Raised when the cortex cannot serve a turn."""


@dataclass
class Turn:
    """One persona's contribution to a conversation."""

    agent_id: str
    text: str
    role: str = "assistant"
    provider: str = ""
    model: str = ""
    sources: list[dict[str, str]] = field(default_factory=list)
    latency_ms: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "agent_id": self.agent_id,
            "text": self.text,
            "role": self.role,
            "provider": self.provider,
            "model": self.model,
            "sources": self.sources,
            "latency_ms": self.latency_ms,
        }


@dataclass
class Routing:
    """Who was asked to speak, and why."""

    mode: str                      # directed | broadcast | private
    addressed: list[str]           # personas asked to speak
    scores: dict[str, int]         # keyword score per persona
    reason: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "mode": self.mode,
            "addressed": self.addressed,
            "scores": self.scores,
            "reason": self.reason,
        }


def load_persona(agent_id: str) -> str:
    """Read a persona file; behaviour stays editable without a redeploy."""
    path = AGENTS_DIR / f"{agent_id}.md"
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8").strip()


def _score_domains(text: str) -> dict[str, int]:
    lowered = text.lower()
    scores: dict[str, int] = {}
    for agent_id, groups in DOMAINS.items():
        total = 0
        for words in groups.values():
            for w in words:
                if w in lowered:
                    total += 1
        scores[agent_id] = total
    return scores


def detect_mentions(text: str) -> list[str]:
    """Personas named in the text. Longest phrase wins per persona."""
    lowered = text.lower()
    hits: list[tuple[int, str]] = []
    for agent_id, words in MENTIONS:
        best = 0
        for w in words:
            if w in lowered:
                best = max(best, len(w))
        if best:
            hits.append((best, agent_id))
    hits.sort(reverse=True)
    return [agent_id for _, agent_id in hits]


def route(text: str, force: str | None = None) -> Routing:
    """Decide which personas speak to this utterance."""
    scores = _score_domains(text)

    if force and force in ALL_AGENTS:
        mode = "private" if force in SPEAKERS else "directed"
        return Routing(mode, [force], scores, f"forced:{force}")

    mentioned = detect_mentions(text)
    lowered = text.lower()

    # An explicit name always wins over keyword scoring.
    if mentioned and not any(b in lowered for b in BROADCAST):
        return Routing("directed", [mentioned[0]], scores,
                       f"addressed:{mentioned[0]}")

    if any(b in lowered for b in BROADCAST):
        # Everyone with a stake in it; always include ATOM as the host.
        picked = [a for a in SPEAKERS if scores.get(a, 0) > 0]
        if not picked:
            picked = [SYNTHESIZER]
        if SYNTHESIZER not in picked:
            picked.insert(0, SYNTHESIZER)
        return Routing("broadcast", picked, scores, "broadcast")

    # Undirected question: whoever scores highest speaks. Ties break toward ATOM.
    ranked = sorted(scores.items(), key=lambda kv: (-kv[1], kv[0] != SYNTHESIZER))
    best = ranked[0]
    if best[1] > 0:
        return Routing("directed", [best[0]], scores, f"top-score:{best[0]}")
    return Routing("directed", [SYNTHESIZER], scores, "fallback:atom")


def build_messages(
    agent_id: str,
    text: str,
    history: Iterable[dict[str, str]],
    peers: Iterable[Turn] = (),
) -> list[dict[str, str]]:
    """Assemble the transcript one persona will see.

    On a broadcast each persona also sees what the others already said, which is
    what lets them support or disagree with each other instead of answering in
    isolation.
    """
    messages: list[dict[str, str]] = []
    persona = load_persona(agent_id)
    if persona:
        messages.append({"role": "system", "content": persona})

    for turn in history:
        if turn.get("content"):
            messages.append({
                "role": turn.get("role", "user"),
                "content": turn["content"],
            })

    peers = list(peers)
    if peers:
        rendered = "\n".join(f"- {p.agent_id}: {p.text}" for p in peers)
        messages.append({
            "role": "system",
            "content": (
                "ตัวตนอื่นพูดไปแล้วในรอบนี้ "
                "อย่าตอบซ้ำ ให้เสริมหรือทักท้วงในส่วนที่ยังขาด:\n" + rendered
            ),
        })

    messages.append({"role": "user", "content": text})
    return messages


# A sub-agent gets a small, bounded budget: it exists to finish one delegated
# task, not to open a second long-running conversation.
MAX_SUBAGENT_DEPTH = 2


def _run_sync(
    agent_id: str,
    messages: list[dict[str, str]],
    mode: str,
    use_search: bool,
) -> Turn:
    """Blocking single-persona generation. Runs in a worker thread."""
    started = time.perf_counter()
    try:
        result = llm.complete(messages, mode=mode, use_search=use_search)
    except llm.LlmUnavailable as exc:
        # One persona failing must not kill the whole turn; it simply declines.
        logger.warning("persona %s could not answer: %s", agent_id, exc)
        return Turn(
            agent_id=agent_id,
            text="",
            role="assistant",
            provider="unavailable",
            model="",
            latency_ms=int((time.perf_counter() - started) * 1000),
        )

    latency = int((time.perf_counter() - started) * 1000)
    return Turn(
        agent_id=agent_id,
        text=result.text,
        role="assistant",
        provider=result.provider,
        model=result.model,
        sources=[s.to_dict() for s in result.sources],
        latency_ms=latency,
    )


async def speak(
    agent_id: str,
    text: str,
    history: Iterable[dict[str, str]] = (),
    peers: Iterable[Turn] = (),
    mode: str = "auto",
    use_search: bool = False,
) -> Turn:
    """Generate one persona's turn without blocking the event loop."""
    messages = build_messages(agent_id, text, list(history), list(peers))
    return await asyncio.to_thread(_run_sync, agent_id, messages, mode, use_search)


async def speak_many(
    agent_ids: Iterable[str],
    text: str,
    history: Iterable[dict[str, str]] = (),
    peers: Iterable[Turn] = (),
    mode: str = "auto",
    use_search: bool = False,
) -> list[Turn]:
    """Run personas concurrently, preserving the given order in the result.

    Concurrency is safe because each persona builds an independent transcript and
    the provider layer is stateless.
    """
    ids = list(agent_ids)
    if not ids:
        return []
    history = list(history)
    tasks = [
        speak(a, text, history, peers, mode=mode, use_search=use_search)
        for a in ids
    ]
    return list(await asyncio.gather(*tasks))


async def synthesize(
    question: str,
    turns: Iterable[Turn],
    mode: str = "auto",
    use_search: bool = False,
) -> Turn | None:
    """Collapse several personas into one reply.

    ATOM hosts, so it does the collapsing. A broadcast of one persona is already
    a complete answer and is returned as-is.
    """
    turns = [t for t in turns if t.text.strip()]
    if not turns:
        return None
    if len(turns) == 1:
        return turns[0]

    rendered = "\n\n".join(
        f"[{t.agent_id}] (ผู้ช่วยภายในของอะตอม):\n{t.text}" for t in turns
    )
    instruction = (
        "ทีมงานตัวตนภายในตอบกลับมาดังนี้ กรุณารวมเป็นคำตอบเดียวสำหรับลูกพี่ "
        "เก็บรายละเอียดที่มีประโยชน์ไว้ ตัดสิ่งที่ซ้ำและสิ่งที่ไม่จำเป็นออก "
        "ถ้าข้อมูลขัดกันให้ระบุว่าขัดกัน อย่าแต่งข้อมูลใหม่:\n\n"
        f"{rendered}\n\nคำถามของลูกพี่: {question}"
    )

    messages = [
        {"role": "system", "content": load_persona(SYNTHESIZER) or ""},
        {"role": "user", "content": instruction},
    ]
    turn = await asyncio.to_thread(_run_sync, SYNTHESIZER, messages, mode, use_search)
    if not turn.text.strip():
        # Synthesis failed; fall back to the raw persona turns so the user is
        # never left with nothing.
        return turns[0]
    turn.role = "synthesis"
    return turn


async def spawn_subagent(
    parent: str,
    task: str,
    mode: str = "auto",
    depth: int = 1,
) -> Turn:
    """Delegate one narrow task to a short-lived internal agent.

    Sub-agents never route and never spawn further agents past
    MAX_SUBAGENT_DEPTH; they exist to finish one delegated task.
    """
    agent_id = parent if parent in ALL_AGENTS else SYNTHESIZER
    if depth >= MAX_SUBAGENT_DEPTH:
        logger.info("sub-agent depth limit reached for %s", agent_id)

    messages = [
        {"role": "system", "content": load_persona(agent_id) or ""},
        {
            "role": "system",
            "content": (
                "คุณเป็นตัวช่วยย่อยที่ถูกว่างงานเฉพาะกิจหนึ่งงาน "
                "ตอบเฉพาะผลลัพธ์ที่ถูกมอบหมาย ไม่ต้องเกริ่นนำ"
            ),
        },
        {"role": "user", "content": task},
    ]
    turn = await asyncio.to_thread(
        _run_sync, f"{agent_id}:sub", messages, mode, False
    )
    turn.role = "subagent"
    return turn


async def run_turn(
    text: str,
    history: Iterable[dict[str, str]] = (),
    force: str | None = None,
    mode: str = "auto",
    use_search: bool = False,
    do_synthesize: bool = True,
    subagent_task: str | None = None,
) -> dict[str, Any]:
    """Full orchestration for one user utterance.

    Returns a dict shaped for the mobile client:

      reply        the text the user should see (synthesis on a broadcast)
      addressed    personas that actually spoke
      turns        every contribution, for a persona switcher UI
      routing      mode/addressed/scores/reason, so a misroute is debuggable
      sources      citations across all turns
    """
    text = (text or "").strip()
    if not text:
        raise CortexError("empty turn")

    decision = route(text, force=force)
    history = list(history)

    # A private lane is fully isolated: one persona, no peers, no synthesis, and
    # nothing from the other personas leaks into its transcript.
    if decision.mode == "private":
        turn = await speak(
            decision.addressed[0], text, history, (), mode=mode,
            use_search=use_search,
        )
        return {
            "reply": turn.text,
            "addressed": [turn.agent_id],
            "turns": [turn.to_dict()],
            "routing": decision.to_dict(),
            "search": use_search,
            "sources": turn.sources,
            "synthesized": False,
        }

    if decision.mode == "broadcast":
        turns = await speak_many(
            decision.addressed, text, history, (), mode=mode,
            use_search=use_search,
        )
        spoken = [t for t in turns if t.text.strip()]

        # Everyone failed; surface that instead of an empty reply.
        if not spoken:
            return {
                "reply": "",
                "addressed": [],
                "turns": [t.to_dict() for t in turns],
                "routing": decision.to_dict(),
                "search": use_search,
                "sources": [],
                "synthesized": False,
                "error": "no persona could answer",
            }

        final: Turn | None = None
        if do_synthesize and len(spoken) > 1:
            final = await synthesize(
                text, spoken,
                mode="local" if mode == "auto" else mode,
                use_search=False,
            )
        if final is None:
            final = spoken[0]

        sources: list[dict[str, str]] = []
        seen: set[str] = set()
        for t in spoken:
            for s in t.sources:
                if s["uri"] not in seen:
                    seen.add(s["uri"])
                    sources.append(s)

        return {
            "reply": final.text,
            "addressed": [t.agent_id for t in spoken],
            "turns": [t.to_dict() for t in turns] + (
                [] if final in spoken else [final.to_dict()]
            ),
            "routing": decision.to_dict(),
            "search": use_search,
            "sources": sources,
            "synthesized": final.role == "synthesis",
        }

    # Directed: exactly one persona answers. No synthesis, no extra cost.
    turn = await speak(
        decision.addressed[0], text, history, (), mode=mode, use_search=use_search
    )

    sub: Turn | None = None
    if subagent_task:
        sub = await spawn_subagent(
            decision.addressed[0], subagent_task, mode=mode, depth=1
        )

    return {
        "reply": turn.text,
        "addressed": [turn.agent_id],
        "turns": [turn.to_dict()] + ([sub.to_dict()] if sub else []),
        "routing": decision.to_dict(),
        "search": use_search,
        "sources": turn.sources,
        "synthesized": False,
        "subagent": sub.to_dict() if sub else None,
    }


def personas() -> list[dict[str, Any]]:
    """Describe the agents (for a settings/picker UI).

    JEV is listed as internal so the client can show it as an internal fast
    decision agent, never as a speaking turn.
    """
    out: list[dict[str, Any]] = [
        {"agent_id": a, "kind": "speaker", "has_prompt": bool(load_persona(a))}
        for a in SPEAKERS
    ]
    out.append(
        {"agent_id": "jev", "kind": "internal", "has_prompt": bool(load_persona("jev"))}
    )
    return out
