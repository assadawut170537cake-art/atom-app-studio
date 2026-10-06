"""Tests for the multi-persona router.

Routing is pure string matching, so these tests need no LLM and no network: they
stub llm.complete so the orchestration paths (directed / private / broadcast /
synthesis / sub-agent / failure isolation) run deterministically and instantly.

Run from services/core:  python test_cortex.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import cortex  # noqa: E402
import llm  # noqa: E402

passed = 0
failed = 0


def check(name: str, ok: bool, detail: str = "") -> None:
    global passed, failed
    if ok:
        passed += 1
        print(f"  PASS  {name}")
    else:
        failed += 1
        print(f"  FAIL  {name}  {detail}")


# --------------------------------------------------------------------------
# 1. Routing (no LLM)
# --------------------------------------------------------------------------
def test_routing() -> None:
    print("\n[1] routing")

    r = cortex.route("อัลตรอน ช่วยดูโค้ดตรงนี้หน่อย")
    check("explicit name -> directed", r.mode == "directed", r.mode)
    check("explicit name -> ultron", r.addressed == ["ultron"], str(r.addressed))

    r = cortex.route("ไฟรเดย์ วางแผนสัปดาห์หน้าให้หน่อย")
    check("explicit name -> friday", r.addressed == ["friday"], str(r.addressed))

    r = cortex.route("อะตอมอยู่ไหม")
    check("bare name still routes to atom",
          r.addressed == ["atom"], str(r.addressed))

    r = cortex.route("ช่วยกันดูเรื่องวางแผนกับเขียนโค้ดด้วย")
    check("broadcast phrase -> broadcast", r.mode == "broadcast", r.mode)
    check("broadcast keeps friday", "friday" in r.addressed, str(r.addressed))
    check("broadcast keeps ultron", "ultron" in r.addressed, str(r.addressed))
    check("broadcast always includes host atom",
          "atom" in r.addressed, str(r.addressed))

    r = cortex.route("ช่วยเขียนโค้ด python หน่อย")
    check("keyword -> ultron", r.addressed == ["ultron"], str(r.addressed))

    r = cortex.route("วางแผนงานสัปดาห์หน้าหน่อย")
    check("keyword -> friday", r.addressed == ["friday"], str(r.addressed))

    r = cortex.route("สถานะระบบตอนนี้เป็นอย่างไร")
    check("keyword -> atom", r.addressed == ["atom"], str(r.addressed))

    r = cortex.route("...", force="ultron")
    check("force speaker -> private", r.mode == "private", r.mode)
    check("force speaker -> ultron", r.addressed == ["ultron"], str(r.addressed))

    r = cortex.route("...", force="jev")
    check("force internal -> directed", r.mode == "directed", r.mode)

    r = cortex.route("...", force="ghost")
    check("unknown force is ignored", r.reason != "forced:ghost", r.reason)

    r = cortex.route("asdkjhaskdjh")
    check("no signal falls back to atom",
          r.addressed == ["atom"] and r.reason == "fallback:atom", r.reason)


# --------------------------------------------------------------------------
# 2. Persona files
# --------------------------------------------------------------------------
def test_personas() -> None:
    print("\n[2] personas")
    for a in ("atom", "friday", "ultron"):
        check(f"{a}.md exists", len(cortex.load_persona(a)) > 10)
    check("missing persona -> empty", cortex.load_persona("nobody") == "")

    listed = cortex.personas()
    ids = [p["agent_id"] for p in listed]
    check("personas lists all three speakers",
          {"atom", "friday", "ultron"} <= set(ids), str(ids))
    jev = next((p for p in listed if p["agent_id"] == "jev"), None)
    check("jev marked internal", jev is not None and jev["kind"] == "internal")


# --------------------------------------------------------------------------
# 3. build_messages
# --------------------------------------------------------------------------
def test_build_messages() -> None:
    print("\n[3] build_messages")
    hist = [{"role": "user", "content": "สวัสดี"}]
    msgs = cortex.build_messages("atom", "ทำอะไรต่อ", hist)
    check("system persona first", msgs[0]["role"] == "system")
    check("history preserved", msgs[1]["content"] == "สวัสดี")
    check("new turn last", msgs[-1]["content"] == "ทำอะไรต่อ")

    peer = cortex.Turn(agent_id="friday", text="ฉันวางแผนไว้แล้ว")
    msgs = cortex.build_messages("ultron", "แล้วโค้ดล่ะ", hist, [peer])
    check("peer transcript injected",
          any("ฉันวางแผนไว้แล้ว" in m["content"] for m in msgs))
    check("peer is a system note, not a user turn",
          all(m["role"] == "system" for m in msgs if "ฉันวางแผน" in m["content"]))

    msgs = cortex.build_messages("atom", "x", [{"role": "user", "content": ""}])
    check("empty history turns are dropped",
          sum(1 for m in msgs if m["content"] == "") == 0)


# --------------------------------------------------------------------------
# 4. Orchestration with a stubbed provider (no network)
# --------------------------------------------------------------------------
class _StubResult:
    def __init__(self, text, provider="ollama", model="stub"):
        self.text = text
        self.provider = provider
        self.model = model
        self.sources = []
        self.searched = False


def _stub_llm(calls: list[str]):
    """Stand in for llm.complete, recording the final user turn each call saw."""
    def fake_complete(messages, mode="auto", use_search=False, prefer_local=True):
        agent = "?"
        for m in messages:
            if m.get("role") == "system" and "คุณคือ" in m["content"]:
                agent = m["content"][:20]
                break
        calls.append(messages[-1]["content"])
        if any("ตัวตนอื่นพูดไปแล้ว" in m["content"] for m in messages):
            return _StubResult(f"{agent}|SEES-PEERS")
        return _StubResult(f"คำตอบจาก {agent}")
    return fake_complete


def run_async(coro):
    return asyncio.run(coro)


def test_orchestration() -> None:
    print("\n[4] orchestration (stubbed LLM)")

    calls: list[str] = []
    original = llm.complete
    llm.complete = _stub_llm(calls)
    try:
        # Directed: one persona, no synthesis.
        calls.clear()
        out = run_async(cortex.run_turn("เขียนโค้ดให้หน่อย"))
        check("directed reply non-empty", bool(out["reply"].strip()))
        check("directed = single persona", len(out["addressed"]) == 1,
              str(out["addressed"]))
        check("directed is not synthesized", out["synthesized"] is False)
        check("directed made 1 provider call", len(calls) == 1, str(len(calls)))

        # Private lane: forced persona answers in isolation.
        calls.clear()
        out = run_async(cortex.run_turn("ช่วยดูโค้ดนี้", force="ultron"))
        check("private = single persona", len(out["addressed"]) == 1,
              str(out["addressed"]))
        check("private is ultron", out["addressed"] == ["ultron"],
              str(out["addressed"]))
        check("private not synthesized", out["synthesized"] is False)
        check("private made 1 call", len(calls) == 1, str(len(calls)))

        # Broadcast: several personas, then a synthesis turn.
        calls.clear()
        out = run_async(cortex.run_turn(
            "ช่วยกันวางแผนและเขียนโค้ดด้วย", do_synthesize=True
        ))
        check("broadcast addressed >1", len(out["addressed"]) > 1,
              str(out["addressed"]))
        check("broadcast is synthesized", out["synthesized"] is True)
        check("broadcast calls = speakers + synthesis",
              len(calls) == len(out["addressed"]) + 1, str(len(calls)))

        # Broadcast with synthesis off: no extra call.
        calls.clear()
        out = run_async(cortex.run_turn(
            "ช่วยกันวางแผนและเขียนโค้ดด้วย", do_synthesize=False
        ))
        check("no-synthesis call count = speakers",
              len(calls) == len(out["addressed"]), str(len(calls)))
        check("no-synthesis flag false", out["synthesized"] is False)

        # Sub-agent: extra delegated turn, bounded and separate.
        calls.clear()
        out = run_async(cortex.run_turn(
            "ช่วยดูโค้ด", subagent_task="สรุปชื่อฟังก์ชันทั้งหมด"
        ))
        check("subagent present", out["subagent"] is not None)
        check("subagent role", out["subagent"]["role"] == "subagent",
              str(out["subagent"]["role"]))
        check("subagent got its own call", len(calls) == 2, str(len(calls)))

        # Empty turn is rejected.
        raised = False
        try:
            run_async(cortex.run_turn("   "))
        except cortex.CortexError:
            raised = True
        check("empty turn -> CortexError", raised)

    finally:
        llm.complete = original


# --------------------------------------------------------------------------
# 5. Failure isolation
# --------------------------------------------------------------------------
def test_provider_failure() -> None:
    print("\n[5] provider failure")

    original = llm.complete

    def boom(messages, mode="auto", use_search=False, prefer_local=True):
        raise llm.LlmUnavailable("nothing available")

    llm.complete = boom
    try:
        out = run_async(cortex.run_turn("สวัสดี"))
        check("directed failure -> empty reply", out["reply"] == "")
        check("directed failure marks unavailable",
              out["turns"][0]["provider"] == "unavailable",
              out["turns"][0]["provider"])

        out = run_async(cortex.run_turn("ช่วยกันวางแผนและเขียนโค้ด"))
        check("broadcast total failure reports error",
              out.get("error") == "no persona could answer", str(out.get("error")))
        check("broadcast total failure -> empty reply", out["reply"] == "")
    finally:
        llm.complete = original


def main() -> int:
    test_routing()
    test_personas()
    test_build_messages()
    test_orchestration()
    test_provider_failure()

    print(f"\n{'=' * 46}")
    print(f"  passed: {passed}   failed: {failed}")
    print(f"{'=' * 46}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())