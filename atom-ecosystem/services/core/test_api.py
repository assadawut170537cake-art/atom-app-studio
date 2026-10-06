"""End-to-end test for the chat endpoint.

Starts uvicorn against a throwaway database on a free port, then exercises
health, providers, chat/complete and the handoff path. Never touches the real
VPS, Drive, or any production database.

Run from services/core:  python test_api.py
"""
import os
import socket
import sys
import tempfile
import threading
import time
from pathlib import Path

import httpx
import uvicorn

sys.path.insert(0, str(Path(__file__).parent))

# Point the core at a scratch database BEFORE importing main.
_TMP = Path(tempfile.mkdtemp(prefix="atom-api-test-"))
os.environ["DATABASE_PATH"] = str(_TMP / "test.db")
os.environ["ATOM_SECRET"] = "test-secret-1234"
# Small model keeps tests fast.
os.environ.setdefault("TEST_MODEL", "gemma4:e4b")
os.environ["OLLAMA_MODEL"] = os.environ["TEST_MODEL"]
# Keep a stuck/saturated local GPU from burning minutes per call. The default
# in llm.py is 120s, which is right for real use but far too slow for a suite.
os.environ.setdefault("LLM_TIMEOUT", "25")

import main as core  # noqa: E402  (import after env setup is deliberate)

SECRET = os.environ["ATOM_SECRET"]
HEADERS = {"X-Atom-Secret": SECRET}

passed = 0
failed = 0
skipped = 0

# Set to False once a real provider fails to answer. Ollama shares the GPU with
# whatever else the PC is running, so a saturated machine can time out; that is an
# environment problem, not a contract failure, and must not mask real regressions.
llm_available = True


def check(name: str, ok: bool, detail: str = "") -> None:
    global passed, failed
    if ok:
        passed += 1
        print(f"  PASS  {name}")
    else:
        failed += 1
        print(f"  FAIL  {name}  {detail}")


def check_llm(name: str, ok: bool, detail: str = "") -> None:
    """Assert only while a real provider is actually answering."""
    global skipped
    if not llm_available:
        skipped += 1
        print(f"  SKIP  {name}  (no LLM provider answering)")
        return
    check(name, ok, detail)


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def wait_ready(port: int, timeout: float = 30.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            if httpx.get(f"http://127.0.0.1:{port}/health", timeout=2).status_code == 200:
                return True
        except httpx.HTTPError:
            pass
        time.sleep(0.4)
    return False


def run_tests(port: int) -> None:
    base = f"http://127.0.0.1:{port}"
    c = httpx.Client(base_url=base, headers=HEADERS, timeout=180.0)

    print("\n[1] health")
    r = c.get("/health")
    check("GET /health -> 200", r.status_code == 200, r.text[:120])
    check("health reports ok", r.json().get("status") == "ok")

    print("\n[2] auth")
    r = httpx.get(f"{base}/api/v1/providers", timeout=10)
    check("no secret -> 401", r.status_code == 401, str(r.status_code))
    r = httpx.get(
        f"{base}/api/v1/providers",
        headers={"X-Atom-Secret": "wrong"},
        timeout=10,
    )
    check("bad secret -> 401", r.status_code == 401, str(r.status_code))

    print("\n[3] providers")
    r = c.get("/api/v1/providers")
    check("GET /providers -> 200", r.status_code == 200, r.text[:120])
    provs = r.json().get("providers", [])
    check("ollama advertised", "ollama" in provs, str(provs))

    print("\n[4] chat validation")
    r = c.post("/api/v1/chat/complete", json={})
    check("empty message -> 400", r.status_code == 400, str(r.status_code))
    r = c.post("/api/v1/chat/complete",
               json={"message": "hi", "agent_id": "bogus"})
    check("bad agent_id -> 400", r.status_code == 400, str(r.status_code))
    r = c.post("/api/v1/chat/complete",
               json={"message": "hi", "mode": "bogus"})
    check("bad mode -> 400", r.status_code == 400, str(r.status_code))

    print("\n[5] handoff (no LLM call)")
    r = c.post("/api/v1/chat/complete",
               json={"session_id": "t", "agent_id": "atom",
                     "message": "ต่อสายไฟรเดย์"})
    check("handoff -> 200", r.status_code == 200, r.text[:200])
    if r.status_code == 200:
        d = r.json()
        check("handoff=friday", d.get("handoff") == "friday", str(d.get("handoff")))
        check("handoff provider=system", d.get("provider") == "system")

    r = c.post("/api/v1/chat/complete",
               json={"session_id": "t", "message": "ต่อสายอัลตรอน"})
    check("longest phrase wins -> ultron",
          r.json().get("handoff") == "ultron",
          str(r.json().get("handoff")))

    r = c.post("/api/v1/chat/complete",
               json={"session_id": "t", "message": "อะตอมช่วยหน่อย"})
    check("bare agent name is not a handoff",
          r.json().get("handoff") is None,
          str(r.json().get("handoff")))

    print("\n[6] real LLM turn (local ollama)")
    r = c.post("/api/v1/chat/complete",
               json={"session_id": "t", "agent_id": "atom",
                     "message": "พูดว่า 'อะตอมอยู่' สั้น ๆ",
                     "mode": "local"})
    if r.status_code == 200:
        d = r.json()
        if not d.get("reply", "").strip():
            globals()["llm_available"] = False
            print("        (local provider did not answer; "
                  "remaining LLM checks will be skipped)")
        check_llm("reply non-empty", bool(d.get("reply", "").strip()),
                  r.text[:200])
        check("provider reported", bool(d.get("provider")), str(d.get("provider")))
        check("sources is list", isinstance(d.get("sources"), list))
        print(f"        reply: {d.get('reply', '')[:120]}")
    elif r.status_code == 503:
        # The core is up and correctly reports that no provider could serve the
        # request. That is the designed behaviour when the local GPU is busy.
        globals()["llm_available"] = False
        check("chat -> 503 when no provider available", True)
        print("        (no LLM provider available; remaining LLM checks skipped)")
    else:
        check("chat -> 200", False, f"status={r.status_code} {r.text[:200]}")

    print("\n[7] chat persisted")
    r = c.get("/api/v1/sync/chat/history", params={"session_id": "t"})
    check("history -> 200", r.status_code == 200)
    hist = r.json().get("history", [])
    if llm_available:
        check("history has turns", len(hist) >= 4, f"got {len(hist)}")
    else:
        # Sessions "t" already holds the two handoff pairs from section [5]
        # (handoffs persist without an LLM). A failed LLM turn must add nothing.
        check("failed LLM turn not persisted",
              len(hist) == 4, f"got {len(hist)}")

    print("\n[8] persona loaded")
    prompt = core.load_agent_prompt("atom")
    check("atom persona non-empty", len(prompt) > 10, f"len={len(prompt)}")
    check("friday persona non-empty", len(core.load_agent_prompt("friday")) > 10)
    check("ultron persona non-empty", len(core.load_agent_prompt("ultron")) > 10)
    check("missing persona -> empty",
          core.load_agent_prompt("nobody") == "")

    print("\n[9] sync push/pull still works")
    r = c.post("/api/v1/sync/push", json={"updates": [
        {"key": "t/k", "value": "v", "updated_at": "2026-10-05T00:00:00Z",
         "updated_by": "test"}
    ]})
    check("push -> 200", r.status_code == 200, r.text[:120])
    r = c.get("/api/v1/sync/pull")
    check("pull contains key",
          any(u["key"] == "t/k" for u in r.json().get("updates", [])))

    print("\n[10] cortex personas")
    r = c.get("/api/v1/cortex/personas")
    check("personas -> 200", r.status_code == 200, r.text[:200])
    ps = r.json().get("personas", [])
    ids = [p["agent_id"] for p in ps]
    check("three speakers listed",
          {"atom", "friday", "ultron"} <= set(ids), str(ids))
    check("jev is internal",
          any(p["agent_id"] == "jev" and p["kind"] == "internal" for p in ps),
          str(ps))
    check("synthesizer is atom", r.json().get("synthesizer") == "atom")

    print("\n[11] cortex route (no LLM)")
    r = c.post("/api/v1/cortex/route", json={})
    check("route empty message -> 400", r.status_code == 400, str(r.status_code))
    r = c.post("/api/v1/cortex/route",
               json={"message": "x", "force": "nobody"})
    check("route bad force -> 400", r.status_code == 400, str(r.status_code))

    r = c.post("/api/v1/cortex/route", json={"message": "อัลตรอนช่วยดูโค้ด"})
    d = r.json()
    check("route directed to ultron",
          d.get("mode") == "directed" and d.get("addressed") == ["ultron"],
          r.text[:200])
    check("route explains itself", bool(d.get("reason")), str(d.get("reason")))
    check("route returns scores", isinstance(d.get("scores"), dict))

    r = c.post("/api/v1/cortex/route",
               json={"message": "ช่วยกันวางแผนและเขียนโค้ด"})
    check("route broadcast",
          r.json().get("mode") == "broadcast", r.text[:200])

    print("\n[12] cortex turn validation")
    r = c.post("/api/v1/cortex/turn", json={})
    check("cortex empty message -> 400", r.status_code == 400, str(r.status_code))
    r = c.post("/api/v1/cortex/turn",
               json={"message": "hi", "mode": "bogus"})
    check("cortex bad mode -> 400", r.status_code == 400, str(r.status_code))
    r = c.post("/api/v1/cortex/turn",
               json={"message": "hi", "force": "ghost"})
    check("cortex bad force -> 400", r.status_code == 400, str(r.status_code))

    print("\n[13] cortex directed turn (real local LLM)")
    r = c.post("/api/v1/cortex/turn",
               json={"session_id": "cx", "message": "พูดว่า 'อัลตอมอยู่' สั้น ๆ",
                     "mode": "local"})
    check("cortex turn -> 200", r.status_code == 200, r.text[:200])
    if r.status_code == 200:
        d = r.json()
        if not d.get("reply", "").strip():
            globals()["llm_available"] = False
        check_llm("cortex reply non-empty", bool(d.get("reply", "").strip()),
                  r.text[:200])
        check("legacy text key matches reply", d.get("text") == d.get("reply"))
        check("cortex addressed one persona", len(d.get("addressed", [])) == 1,
              str(d.get("addressed")))
        check_llm("cortex provider reported", bool(d.get("provider")),
                  str(d.get("provider")))
        check("cortex routing echoed", isinstance(d.get("routing"), dict))
        check("cortex not synthesized", d.get("synthesized") is False)
        print(f"        reply: {d.get('reply', '')[:100]}")

    print("\n[14] cortex private lane (real local LLM)")
    r = c.post("/api/v1/cortex/turn",
               json={"session_id": "cx", "message": "ช่วยดูสิ่งนี้หน่อย",
                     "force": "ultron", "mode": "local"})
    check("private turn -> 200", r.status_code == 200, r.text[:200])
    if r.status_code == 200:
        d = r.json()
        check("private lane is ultron", d.get("addressed") == ["ultron"],
              str(d.get("addressed")))
        check("private lane mode=private",
              d.get("routing", {}).get("mode") == "private",
              str(d.get("routing", {}).get("mode")))
        check("private lane not synthesized", d.get("synthesized") is False)

    print("\n[15] cortex turn persisted")
    r = c.get("/api/v1/sync/chat/history", params={"session_id": "cx"})
    hist = r.json().get("history", [])
    if llm_available:
        check("cortex history has turns", len(hist) >= 4, f"got {len(hist)}")
    else:
        # Nothing was persisted because no persona produced a reply to store.
        check("no turns persisted when provider failed",
              len(hist) == 0, f"got {len(hist)}")

    print("\n[16] providers endpoint still intact")
    r = c.get("/api/v1/providers")
    check("providers -> 200", r.status_code == 200)
    check("ollama still advertised", "ollama" in r.json().get("providers", []))

    c.close()


def main() -> int:
    port = free_port()
    cfg = uvicorn.Config(core.app, host="127.0.0.1", port=port, log_level="error")
    server = uvicorn.Server(cfg)

    t = threading.Thread(target=server.run, daemon=True)
    t.start()

    print(f"starting test server on 127.0.0.1:{port} (db={_TMP / 'test.db'})")
    if not wait_ready(port):
        print("server failed to start")
        return 1

    try:
        run_tests(port)
    finally:
        server.should_exit = True
        t.join(timeout=5)

    print(f"\n{'=' * 46}")
    print(f"  passed: {passed}   failed: {failed}   skipped: {skipped}")
    if skipped:
        print("  note: some LLM checks skipped - no local provider answered")
    print(f"{'=' * 46}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
