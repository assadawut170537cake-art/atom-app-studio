"""ULTRON PC Worker Daemon — ATOM Phase 6 (Windows 11).

Polls ATOM Core (VPS) for:
  * presence heartbeat  : POST /presence/heartbeat
  * queued tasks        : POST /api/v1/queue/claim
  * task completion     : POST /api/v1/queue/{task_id}/complete

IMPORTANT (Core v6.0 status): the presence/queue endpoints are NOT yet
implemented server-side (Phase 3 backlog). This daemon is therefore written
to stay alive and idle cleanly while waiting for them — HTTP 404/500/530
are logged (once per state change) and are NOT treated as fatal errors.
Connection failures use capped exponential backoff.

Task execution is a SAFE STUB by default: it never runs arbitrary commands
from the server. Set ULTRON_EXEC_ENABLED=1 only when you trust the Core.
"""
import logging
import os
import sys
import time

import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("ATOM_BASE_URL", "https://assadawut-jarvis.online").rstrip("/")
SECRET = os.getenv("ATOM_SECRET", "change_this_secret")
WORKER_ID = os.getenv("WORKER_ID", "PC_WORKSTATION")
TASK_TYPE = os.getenv("TASK_TYPE", "ULTRON_CODE")
HEARTBEAT_EVERY = float(os.getenv("HEARTBEAT_INTERVAL", "20"))
POLL_EVERY = float(os.getenv("POLL_INTERVAL", "10"))
TIMEOUT = float(os.getenv("HTTP_TIMEOUT", "10"))
MAX_CYCLES = int(os.getenv("ULTRON_MAX_CYCLES", "0"))  # 0 = forever
LOG_FILE = os.getenv("ULTRON_LOG", "ultron_daemon.log")
EXEC_ENABLED = os.getenv("ULTRON_EXEC_ENABLED", "0") == "1"

METADATA = {
    "status": "active",
    "gpu": "Quadro P4000",
    "workspace": "J:\\",
    "os": "windows",
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("ultron-daemon")

session = requests.Session()
session.headers.update({"X-Atom-Secret": SECRET, "Content-Type": "application/json"})


def classify(resp_or_exc):
    """Short label for endpoint state, used to suppress log spam."""
    if isinstance(resp_or_exc, Exception):
        return "UNREACHABLE(%s)" % type(resp_or_exc).__name__
    return {200: "OK", 401: "SECRET_REJECTED", 404: "NOT_IMPLEMENTED",
            530: "TUNNEL_DOWN (cloudflared/service not running)"}.get(
        resp_or_exc.status_code, "HTTP_%s" % resp_or_exc.status_code
    )


class Watchdog:
    """Log a service state only when it CHANGES (avoid 20s spam)."""

    def __init__(self):
        self._last = {}

    def report(self, name, state, detail=""):
        if self._last.get(name) != state:
            self._last[name] = state
            extra = (" :: " + detail) if detail else ""
            level = logging.INFO if state in ("OK",) else logging.WARNING
            log.log(level, "[%s] -> %s%s", name, state, extra)


wd = Watchdog()


def send_heartbeat():
    try:
        r = session.post(
            BASE_URL + "/presence/heartbeat",
            json={"node_id": WORKER_ID, "metadata": METADATA},
            timeout=TIMEOUT,
        )
        wd.report("presence", classify(r),
                  r.text[:100] if r.status_code not in (200, 404, 530) else "")
    except Exception as exc:  # noqa: BLE001 — daemon must never die on I/O
        wd.report("presence", classify(exc))


def claim_and_run():
    try:
        r = session.post(
            BASE_URL + "/api/v1/queue/claim",
            json={"worker_id": WORKER_ID, "task_type": TASK_TYPE},
            timeout=TIMEOUT,
        )
    except Exception as exc:  # noqa: BLE001
        wd.report("queue", classify(exc))
        return

    wd.report("queue", classify(r),
              r.text[:100] if r.status_code not in (200, 404, 530) else "")
    if r.status_code != 200:
        return

    try:
        task = r.json().get("task")
    except ValueError:
        return
    if not task:
        return  # queue empty

    task_id = task.get("task_id", "?")
    log.info("[ULTRON] claimed task %s (%s)", task_id, task.get("title", ""))
    if not EXEC_ENABLED:
        result = {"success": False, "result": {"message": "exec disabled (ULTRON_EXEC_ENABLED=0)"}}
    else:
        result = {"success": True, "result": {"message": "Executed by PC ULTRON Engine"}}
    try:
        session.post(
            BASE_URL + "/api/v1/queue/%s/complete" % task_id,
            json=result,
            timeout=TIMEOUT,
        )
        log.info("[ULTRON] task %s reported: %s", task_id, result["success"])
    except Exception:  # noqa: BLE001
        log.warning("[ULTRON] could not report completion for %s", task_id)


def main():
    log.info("=== ATOM ULTRON PC Worker Daemon starting ===")
    log.info("base=%s worker=%s task_type=%s hb=%ss poll=%ss",
             BASE_URL, WORKER_ID, TASK_TYPE, HEARTBEAT_EVERY, POLL_EVERY)
    if SECRET == "change_this_secret":
        log.warning("ATOM_SECRET is still the placeholder — copy .env.example to .env")

    cycle = 0
    next_hb = 0.0
    next_poll = 0.0
    backoff = 1.0
    try:
        while True:
            now = time.time()
            if now >= next_hb:
                send_heartbeat()
                next_hb = now + HEARTBEAT_EVERY
            if now >= next_poll:
                claim_and_run()
                next_poll = now + POLL_EVERY
                backoff = 1.0
            cycle += 1
            if MAX_CYCLES and cycle >= MAX_CYCLES:
                log.info("ULTRON_MAX_CYCLES=%d reached — exiting cleanly", MAX_CYCLES)
                break
            time.sleep(min(2.0, HEARTBEAT_EVERY / 4))
    except KeyboardInterrupt:
        log.info("Ctrl+C received — shutting down (state lost is fine, Core keeps presence)")


if __name__ == "__main__":
    main()
