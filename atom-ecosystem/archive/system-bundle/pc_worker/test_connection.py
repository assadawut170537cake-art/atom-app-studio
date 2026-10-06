"""One-shot connectivity check for ATOM Core (used before starting daemon).

Exit codes: 0 = Core reachable & secret OK, 2 = reachable but origin down
(Cloudflare 530 = tunnel not connected / service not deployed),
1 = other failure.
"""
import os
import sys

import requests
from dotenv import load_dotenv

load_dotenv()

BASE = os.getenv("ATOM_BASE_URL", "https://assadawut-jarvis.online").rstrip("/")
SECRET = os.getenv("ATOM_SECRET", "change_this_secret")

rows = []


def probe(name, method, path, need_secret=True, expect="200"):
    url = BASE + path
    headers = {"X-Atom-Secret": SECRET} if need_secret else {}
    try:
        r = getattr(requests, method)(url, headers=headers, timeout=10)
        label = str(r.status_code)
        if r.status_code == 530:
            verdict = "TUNNEL_DOWN (Cloudflare: origin unreachable)"
        elif r.status_code == 404:
            verdict = "ENDPOINT_NOT_IMPLEMENTED (Phase 3 backlog)"
        elif r.status_code == 401:
            verdict = "SECRET_REJECTED (check ATOM_SECRET)"
        elif str(r.status_code) == expect:
            verdict = "OK"
        else:
            verdict = "UNEXPECTED"
        rows.append((name, label, verdict))
        return r.status_code
    except Exception as exc:  # noqa: BLE001
        rows.append((name, type(exc).__name__, "NETWORK_ERROR"))
        return None


print("ATOM Core connectivity check ->", BASE)
print("-" * 72)

health = probe("health", "get", "/health", need_secret=False)
ping = probe("ping(atom)", "get", "/api/v1/atom/ping")
hb = probe("presence/heartbeat", "post", "/presence/heartbeat")
qq = probe("queue/claim", "post", "/api/v1/queue/claim")

print(f"{'CHECK':22s} {'HTTP':18s} VERDICT")
for name, code, verdict in rows:
    print(f"{name:22s} {code:18s} {verdict}")

print("-" * 72)
if ping == 200:
    print("RESULT: Core online, secret accepted. Run ultron_daemon.py now.")
    sys.exit(0)
if health == 530 or ping == 530:
    print("RESULT: DNS/Cloudflare OK but VPS tunnel/service is DOWN.")
    print("        Deploy ATOM Core + start cloudflared, then re-run this test.")
    sys.exit(2)
if ping == 401:
    print("RESULT: Core reachable but ATOM_SECRET is wrong. Fix .env.")
    sys.exit(1)
print("RESULT: Core not reachable as expected — see table above.")
sys.exit(1)
