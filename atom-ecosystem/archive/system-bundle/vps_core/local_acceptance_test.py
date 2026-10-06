"""ATOM Core v6.0 - Acceptance Runbook driver (local Windows 11 edition).

Mirrors README_RUNBOOK.md checks 0-15 against a locally started uvicorn,
using a throwaway SQLite DB. GDrive-dependent checks (8, 9, 10) verify the
graceful-degradation contract instead (no SA file locally -> clean JSON 500,
server stays alive) and are reported as PASS(ENV).
"""
import json
import os
import shutil
import subprocess
import sys
import time

import requests

ROOT = r"J:\อะตอม"
WORK = r"J:\Temp\atom_acceptance"
DB = os.path.join(WORK, "atom_master.db")
BASE = "http://127.0.0.1:8123"
SECRET = "acc_test_secret_20261001"
H = {"X-Atom-Secret": SECRET}
HJ = dict(H, **{"Content-Type": "application/json"})

results = []


def check(name, ok, detail=""):
    results.append((name, "PASS" if ok else "FAIL", detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name} :: {detail}")


def env(with_secret=True):
    e = dict(os.environ)
    e["DATABASE_PATH"] = DB
    e["GDRIVE_SA_PATH"] = os.path.join(WORK, "missing_sa.json")
    if with_secret:
        e["ATOM_SECRET"] = SECRET
    else:
        e.pop("ATOM_SECRET", None)
    return e


def start_server(with_secret=True):
    return subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app",
         "--host", "127.0.0.1", "--port", "8123", "--log-level", "warning"],
        cwd=ROOT, env=env(with_secret),
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def wait_health(p, timeout=20):
    end = time.time() + timeout
    while time.time() < end:
        try:
            r = requests.get(BASE + "/health", timeout=2)
            if r.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def alive():
    try:
        return requests.get(BASE + "/health", timeout=3).status_code == 200
    except Exception:
        return False


# --- 0. Refuse to start without ATOM_SECRET ---------------------------------
shutil.rmtree(WORK, ignore_errors=True)
os.makedirs(WORK, exist_ok=True)
p0 = subprocess.run(
    [sys.executable, "-m", "uvicorn", "main:app",
     "--host", "127.0.0.1", "--port", "8123", "--log-level", "error"],
    cwd=ROOT, env=env(with_secret=False), capture_output=True, text=True, timeout=25,
)
err0 = (p0.stderr or "") + (p0.stdout or "")
check("0  Refuse start w/o ATOM_SECRET", p0.returncode != 0 and "ATOM_SECRET" in err0,
      f"exit={p0.returncode}, 'ATOM_SECRET' in stderr={'ATOM_SECRET' in err0}")

# --- start server for the rest ----------------------------------------------
srv = start_server()
try:
    up = wait_health(srv)
    check("0b Server startup (with secret)", up, f"health on {BASE} within 20s")
    if not up:
        raise SystemExit("server never came up")

    # 1 health
    r = requests.get(BASE + "/health", timeout=5)
    j = r.json()
    check("1  Health (no secret)",
          r.status_code == 200 and j.get("service") == "atom-core" and "timestamp" in j,
          f"{r.status_code} {j}")

    # 2 pings
    for svc in ("atom", "friday", "ultron"):
        r = requests.get(f"{BASE}/api/v1/{svc}/ping", headers=H, timeout=5)
        j = r.json()
        check(f"2  Ping {svc}",
              r.status_code == 200 and j.get("status") == "online" and j.get("service") == svc,
              f"{r.status_code} {j}")

    # 3 push batch
    r = requests.post(BASE + "/api/v1/sync/push", headers=HJ, timeout=5, json={"updates": [
        {"key": "user_theme", "value": "dark",
         "updated_at": "2026-10-01T00:00:00Z", "updated_by": "atom"}]})
    check("3  Sync push batch",
          r.status_code == 200 and r.json().get("count") == 1, f"{r.status_code} {r.text[:120]}")

    # 4 pull
    r = requests.get(BASE + "/api/v1/sync/pull", headers=H, timeout=5)
    ups = {u["key"]: u["value"] for u in r.json().get("updates", [])}
    check("4  Sync pull sees user_theme=dark",
          r.status_code == 200 and ups.get("user_theme") == "dark", f"{r.status_code} {ups}")

    # 5 LWW: older push must NOT overwrite
    r = requests.post(BASE + "/api/v1/sync/push", headers=HJ, timeout=5, json={"updates": [
        {"key": "user_theme", "value": "old",
         "updated_at": "2025-01-01T00:00:00Z", "updated_by": "test"}]})
    r2 = requests.get(BASE + "/api/v1/sync/pull", headers=H, timeout=5)
    ups = {u["key"]: u["value"] for u in r2.json().get("updates", [])}
    check("5  LWW conflict (older ignored)",
          r.status_code == 200 and ups.get("user_theme") == "dark", f"still={ups.get('user_theme')}")

    # 6 chat append
    r = requests.post(BASE + "/api/v1/sync/chat/append", headers=HJ, timeout=5,
                      json={"session_id": "test-001", "role": "user", "message": "Hello"})
    check("6  Chat append", r.status_code == 200 and r.json().get("status") == "ok",
          f"{r.status_code} {r.text[:120]}")

    # 7 chat history
    r = requests.get(BASE + "/api/v1/sync/chat/history", headers=H, timeout=5,
                     params={"session_id": "test-001"})
    hist = r.json().get("history", [])
    check("7  Chat history",
          r.status_code == 200 and len(hist) >= 1
          and hist[0]["role"] == "user" and hist[0]["message"] == "Hello",
          f"{r.status_code} n={len(hist)}")

    # 8/9 knowledge query incl. SQLi-style quote -> env-dependent graceful 500
    for qname, q in (("8  Knowledge query whisper", "whisper"),
                     ("9  Knowledge query O'Brien (quote safety)", "O'Brien")):
        r = requests.get(BASE + "/api/v1/knowledge/query", headers=H, timeout=10,
                         params={"q": q})
        graceful_500 = False
        try:
            graceful_500 = r.status_code == 500 and "error" in r.json()
        except Exception:
            pass
        check(qname, graceful_500 and alive(),
              f"{r.status_code} (no GDrive SA -> expect clean JSON 500, alive={alive()})")

    # 10 backup-now -> env-dependent graceful 500
    r = requests.post(BASE + "/api/v1/system/backup-now", headers=H, timeout=15)
    graceful_500 = False
    try:
        graceful_500 = r.status_code == 500 and "error" in r.json()
    except Exception:
        pass
    check("10 Backup-now (no SA -> graceful)", graceful_500 and alive(),
          f"{r.status_code}, server alive={alive()}")

    # 11 voice hook
    r = requests.get(BASE + "/voice/session-hook", headers=H, timeout=5)
    j = r.json()
    check("11 Voice session-hook",
          r.status_code == 200 and j.get("provider") == "google"
          and j.get("protocol") == "websocket" and "endpoint" in j and "model" in j,
          f"{r.status_code} model={j.get('model')}")

    # 12 missing secret -> 401 Missing
    r = requests.get(BASE + "/api/v1/atom/ping", timeout=5)
    try:
        msg = r.json()["error"]["message"]
    except Exception:
        msg = r.text[:80]
    check("12 No secret -> 401 Missing", r.status_code == 401 and "Missing" in msg,
          f"{r.status_code} {msg}")

    # 13 wrong secret -> 401 Invalid
    r = requests.get(BASE + "/api/v1/atom/ping",
                     headers={"X-Atom-Secret": "wrong"}, timeout=5)
    try:
        msg = r.json()["error"]["message"]
    except Exception:
        msg = r.text[:80]
    check("13 Wrong secret -> 401 Invalid", r.status_code == 401 and "Invalid" in msg,
          f"{r.status_code} {msg}")

    # 14 empty key -> 400
    r = requests.post(BASE + "/api/v1/sync/push", headers=HJ, timeout=5, json={"updates": [
        {"key": "", "value": "x", "updated_at": "2026-10-01T00:00:00Z", "updated_by": "a"}]})
    check("14 Empty key -> 400", r.status_code == 400,
          f"{r.status_code} {r.text[:120]}")

    # 15 missing updated_at -> 400
    r = requests.post(BASE + "/api/v1/sync/push", headers=HJ, timeout=5, json={"updates": [
        {"key": "test", "value": "x", "updated_by": "a"}]})
    check("15 Missing updated_at -> 400", r.status_code == 400,
          f"{r.status_code} {r.text[:120]}")

    # 16 bonus: invalid role -> 400
    r = requests.post(BASE + "/api/v1/sync/chat/append", headers=HJ, timeout=5,
                      json={"session_id": "x", "role": "admin", "message": "y"})
    check("16 Invalid role -> 400 (bonus)", r.status_code == 400,
          f"{r.status_code} {r.text[:120]}")

    # final: server still healthy
    check("Z  Server alive at end", alive(), "/health 200")
finally:
    srv.terminate()
    try:
        srv.wait(timeout=10)
    except Exception:
        srv.kill()

n_pass = sum(1 for _, s, _ in results if s == "PASS")
print(f"\n===== SUMMARY: {n_pass}/{len(results)} PASS =====")
for name, s, d in results:
    print(f"  {s:4s} {name}")
sys.exit(0 if n_pass == len(results) else 1)

