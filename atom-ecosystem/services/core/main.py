import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

import llm
import cortex
from database import (
    init_database,
    push_updates,
    pull_updates,
    append_chat,
    query_chat
)
from gdrive_vault import (
    query_atom_vault,
    backup_db_to_gdrive
)

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s"
)
logger = logging.getLogger("atom-core")

ATOM_SECRET = os.getenv("ATOM_SECRET", "")
if not ATOM_SECRET:
    raise RuntimeError("ATOM_SECRET is not set in .env — refusing to start")

GEMINI_LIVE_WS_URL = os.getenv(
    "GEMINI_LIVE_WS_URL",
    "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
)
GEMINI_LIVE_MODEL = os.getenv(
    "GEMINI_LIVE_MODEL",
    "models/gemini-3.8-live" # updated to gemini-3.8-live as requested
)

AGENT_PROMPTS_DIR = Path(__file__).parent / "agents"

# Thai wake phrases -> agent id. Matched longest-first so a longer phrase
# ("ต่อสายอัลตรอน") wins over a shorter substring ("อัลตรอน").
HANDOFF_PHRASES = [
    ("ultron", ["ต่อสายอัลตรอน", "เรียกอัลตรอน", "อัลตรอน"]),
    ("friday", ["ต่อสายไฟรเดย์", "ต่อสายฟริเดย์", "เรียกไฟรเดย์", "ไฟรเดย์"]),
    ("atom", ["ตัดสายกลับมาอะตอม", "กลับมาอะตอม", "อะตอม"]),
]

# A handoff needs an explicit switch verb. Without this guard a sentence that
# merely mentions an agent ("พูดว่า 'อะตอมอยู่'") would be misread as a command.
HANDOFF_VERBS = [
    "ต่อสาย", "เรียก", "สลับ", "กลับมา", "เปลี่ยน", "ขอเป็น", "ขอเป็นตัว",
]


def load_agent_prompt(agent_id: str) -> str:
    """Read the persona file so behaviour stays editable without a redeploy."""
    path = AGENT_PROMPTS_DIR / f"{agent_id}.md"
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8").strip()


def detect_handoff(text: str) -> str | None:
    """Return the agent id the user asked for, or None for ordinary chat.

    Requires an explicit switch verb so that merely naming an agent inside a
    longer sentence is not mistaken for a handoff command.
    """
    lowered = text.lower().strip()
    if not any(verb in lowered for verb in HANDOFF_VERBS):
        return None

    best: tuple[int, str] | None = None
    for agent_id, phrases in HANDOFF_PHRASES:
        for phrase in phrases:
            if phrase in lowered:
                score = len(phrase)
                if best is None or score > best[0]:
                    best = (score, agent_id)
                break
    return best[1] if best else None


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_database()
    yield

app = FastAPI(
    title="ATOM Core",
    version="6.0",
    lifespan=lifespan
)

def now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def error(code, message):
    return {
        "error": {
            "code": code,
            "message": message
        }
    }

async def verify_secret(request: Request):
    secret = request.headers.get("X-Atom-Secret")
    if not secret:
        raise HTTPException(401, "Missing X-Atom-Secret")
    if secret != ATOM_SECRET:
        raise HTTPException(401, "Invalid X-Atom-Secret")
    return True

@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    return JSONResponse(status_code=400, content=error(400, "Invalid request"))

@app.exception_handler(StarletteHTTPException)
async def starlette_error(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content=error(exc.status_code, str(exc.detail))
    )

@app.exception_handler(Exception)
async def global_error(request, exc):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content=error(500, "Internal server error"))

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "atom-core",
        "timestamp": now()
    }

@app.get("/api/v1/atom/ping", dependencies=[Depends(verify_secret)])
async def atom_ping():
    return {"service": "atom", "status": "online"}

@app.get("/api/v1/friday/ping", dependencies=[Depends(verify_secret)])
async def friday_ping():
    return {"service": "friday", "status": "online"}

@app.get("/api/v1/ultron/ping", dependencies=[Depends(verify_secret)])
async def ultron_ping():
    return {"service": "ultron", "status": "online"}

@app.post("/api/v1/sync/push", dependencies=[Depends(verify_secret)])
async def sync_push(body: dict):
    updates = body.get("updates")
    if not isinstance(updates, list):
        raise HTTPException(400, "updates required")
    for item in updates:
        if not isinstance(item, dict):
            raise HTTPException(400, "each update must be an object")
        if not item.get("key"):
            raise HTTPException(400, "key is required")
        if not item.get("updated_at"):
            raise HTTPException(400, "updated_at is required")
    try:
        push_updates(updates)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"status": "ok", "count": len(updates)}

@app.get("/api/v1/sync/pull", dependencies=[Depends(verify_secret)])
async def sync_pull():
    return {"updates": pull_updates()}

@app.post("/api/v1/sync/chat/append", dependencies=[Depends(verify_secret)])
async def chat_append(body: dict):
    session_id = body.get("session_id")
    role = body.get("role")
    message = body.get("message")
    if not session_id:
        raise HTTPException(400, "session_id required")
    if role not in ["user", "assistant", "system"]:
        raise HTTPException(400, "invalid role")
    if not message:
        raise HTTPException(400, "message required")
    append_chat(session_id, role, message)
    return {"status": "ok"}

@app.get("/api/v1/sync/chat/history", dependencies=[Depends(verify_secret)])
async def chat_history(session_id: str):
    return {"history": query_chat(session_id)}

@app.get("/api/v1/knowledge/query", dependencies=[Depends(verify_secret)])
async def knowledge_query(q: str):
    if not q or not q.strip():
        raise HTTPException(400, "q is required")
    return {"results": query_atom_vault(q)}

@app.post("/api/v1/system/backup-now", dependencies=[Depends(verify_secret)])
async def backup_now():
    try:
        return backup_db_to_gdrive()
    except Exception as exc:
        logger.exception("Backup failed")
        raise HTTPException(500, str(exc)) from exc

@app.get("/voice/session-hook", dependencies=[Depends(verify_secret)])
async def voice_hook():
    return {
        "provider": "google",
        "protocol": "websocket",
        "endpoint": GEMINI_LIVE_WS_URL,
        "model": GEMINI_LIVE_MODEL,
        "client_mode": "mobile_direct"
    }


@app.get("/api/v1/providers", dependencies=[Depends(verify_secret)])
async def providers():
    """Which backends can answer right now — the app shows this in settings."""
    return {"providers": llm.available_providers()}


@app.post("/api/v1/chat/complete", dependencies=[Depends(verify_secret)])
async def chat_complete(body: dict):
    """Real LLM turn.

    body:
      session_id   str  - chat thread to persist into
      agent_id     str  - atom | friday | ultron (default atom)
      message      str  - the user's turn
      history      list - prior turns [{role, content}], newest last
      mode         str  - auto | local | api
      use_search   bool - ground the answer in Google Search (needs Gemini)
      speak        bool - keep the reply for TTS on the client

    Returns {reply, provider, model, searched, sources, handoff}.
    """
    message = (body.get("message") or "").strip()
    if not message:
        raise HTTPException(400, "message required")

    session_id = body.get("session_id") or "default"
    agent_id = body.get("agent_id") or "atom"
    if agent_id not in ("atom", "friday", "ultron"):
        raise HTTPException(400, "invalid agent_id")

    mode = body.get("mode") or "auto"
    if mode not in ("auto", "local", "api"):
        raise HTTPException(400, "invalid mode")

    use_search = bool(body.get("use_search", False))
    history = body.get("history") or []

    # A handoff request switches persona instead of answering.
    handoff = detect_handoff(message)
    if handoff:
        prompt = load_agent_prompt(handoff)
        reply = {
            "atom": "กลับมาอะตอมแล้วครับลูกพี่ สั่งมาได้เลย",
            "friday": "ต่อสายไฟรเดย์แล้วค่ะลูกพี่",
            "ultron": "อัลตรอนพร้อมลุย สั่งงานมาได้เลยบอส",
        }[handoff]
        try:
            append_chat(session_id, "user", message)
            append_chat(session_id, "assistant", reply)
        except Exception:  # noqa: BLE001 - chat persistence must not block a switch
            logger.exception("could not persist handoff turn")
        return {
            "reply": reply,
            "provider": "system",
            "model": "handoff",
            "searched": False,
            "sources": [],
            "handoff": handoff,
            "agent_prompt": prompt,
        }

    # Build the transcript: persona + prior turns + the new one.
    messages: list[dict[str, str]] = []
    persona = load_agent_prompt(agent_id)
    if persona:
        messages.append({"role": "system", "content": persona})
    for turn in history[-12:]:
        if isinstance(turn, dict) and turn.get("content"):
            messages.append({
                "role": turn.get("role", "user"),
                "content": turn["content"],
            })
    messages.append({"role": "user", "content": message})

    try:
        result = llm.complete(messages, mode=mode, use_search=use_search)
    except llm.LlmUnavailable as exc:
        logger.warning("no LLM provider could serve the request: %s", exc)
        raise HTTPException(503, str(exc)) from exc

    try:
        append_chat(session_id, "user", message)
        append_chat(session_id, "assistant", result.text)
    except Exception:  # noqa: BLE001
        logger.exception("could not persist chat turn")

    return result.to_dict() | {"handoff": None}


@app.get("/api/v1/cortex/personas", dependencies=[Depends(verify_secret)])
async def cortex_personas():
    """Which agents exist and which of them may speak.

    JEV is reported as internal so the client can show it as a fast decision
    agent rather than a conversational persona.
    """
    return {"personas": cortex.personas(), "synthesizer": cortex.SYNTHESIZER}


@app.post("/api/v1/cortex/route", dependencies=[Depends(verify_secret)])
async def cortex_route(body: dict):
    """Explain the routing decision for a message without running any LLM.

    Useful for debugging a misroute from the device without waiting on inference.
    """
    message = (body.get("message") or "").strip()
    if not message:
        raise HTTPException(400, "message required")
    force = body.get("force") or None
    if force and force not in cortex.ALL_AGENTS:
        raise HTTPException(400, "invalid force")
    return cortex.route(message, force=force).to_dict()


@app.post("/api/v1/cortex/turn", dependencies=[Depends(verify_secret)])
async def cortex_turn(body: dict):
    """Multi-persona turn.

    body:
      session_id      str  - chat thread to persist into
      message         str  - the user's turn
      history         list - prior turns [{role, content}], newest last
      force           str  - pin one persona (private lane)
      mode            str  - auto | local | api
      use_search      bool - ground the answer in Google Search (needs Gemini)
      synthesize      bool - collapse a broadcast into one reply (default true)
      subagent_task   str  - optional narrow task delegated to a sub-agent

    Returns {reply, addressed, turns, routing, sources, synthesized, ...}.
    """
    message = (body.get("message") or "").strip()
    if not message:
        raise HTTPException(400, "message required")

    mode = body.get("mode") or "auto"
    if mode not in ("auto", "local", "api"):
        raise HTTPException(400, "invalid mode")

    force = body.get("force") or None
    if force and force not in cortex.ALL_AGENTS:
        raise HTTPException(400, "invalid force")

    session_id = body.get("session_id") or "default"
    history = body.get("history") or []
    do_synthesize = bool(body.get("synthesize", True))
    subagent_task = body.get("subagent_task") or None

    try:
        result = await cortex.run_turn(
            message,
            history=history[-12:],
            force=force,
            mode=mode,
            use_search=bool(body.get("use_search", False)),
            do_synthesize=do_synthesize,
            subagent_task=subagent_task,
        )
    except cortex.CortexError as exc:
        raise HTTPException(400, str(exc)) from exc

    # Persist the user's turn plus each reply the user should see. A failed
    # broadcast is not worth persisting as an assistant turn.
    if result.get("reply", "").strip():
        try:
            append_chat(session_id, "user", message)
            append_chat(session_id, "assistant", result["reply"])
        except Exception:  # noqa: BLE001 - persistence must not block a reply
            logger.exception("could not persist cortex turn")

    providers = {t["agent_id"]: t["provider"] for t in result.get("turns", [])}
    return result | {
        "session_id": session_id,
        "text": result.get("reply", ""),   # legacy key, same as /chat/complete
        "provider": next(
            (p for p in providers.values() if p and p != "unavailable"), ""
        ),
    }

