"""Read-only migration integrity checks and isolated local API smoke tests."""
import ast
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import requests
from organize_project import ROOT, digest

checked = 0
for record in json.loads((ROOT / "migration/manifest.json").read_text(encoding="utf-8")):
    target = Path(record["target"])
    for relative, expected in record["hashes"].items():
        item = target if relative == "." else target / relative
        if expected.startswith("LINK:"):
            assert item.exists() and os.readlink(item) == expected[5:], str(item)
        else:
            assert digest(item) == expected, str(item)
        checked += 1
print(f"Integrity: {checked} original file/link entries verified")

count = 0
for folder in [ROOT / "services/core", ROOT / "workers/pc", ROOT / "integrations", ROOT / "tools"]:
    for item in folder.rglob("*.py"):
        ast.parse(item.read_text(encoding="utf-8-sig"), filename=str(item))
        count += 1
print(f"Python syntax: {count} files passed")

runtime = ROOT / "data/tests"
runtime.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(dir=runtime) as temp:
    env = dict(os.environ, ATOM_SECRET="local-migration-test",
               DATABASE_PATH=str(Path(temp) / "smoke.db"), PYTHONDONTWRITEBYTECODE="1")
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    base = f"http://127.0.0.1:{port}"
    headers = {"X-Atom-Secret": env["ATOM_SECRET"]}
    log = open(ROOT / "migration/smoke-server.log", "w", encoding="utf-8")
    process = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", "--host",
                                "127.0.0.1", "--port", str(port)],
                               cwd=ROOT / "services/core", env=env, stdout=log, stderr=log)
    try:
        for attempt in range(40):
            if process.poll() is not None:
                raise RuntimeError("Server startup failed; see migration/smoke-server.log")
            try:
                if requests.get(base + "/health", timeout=1).status_code == 200:
                    break
            except requests.RequestException:
                pass
            time.sleep(0.25)
        else:
            raise RuntimeError("Server health timeout")
        assert requests.get(base + "/api/v1/atom/ping", timeout=5).status_code == 401
        assert requests.get(base + "/api/v1/atom/ping", headers=headers, timeout=5).status_code == 200
        response = requests.post(base + "/api/v1/sync/chat/append", headers=headers,
                                 json={"session_id": "migration", "role": "user", "message": "hello"}, timeout=5)
        assert response.status_code == 200, response.text
        response = requests.get(base + "/api/v1/sync/chat/history", headers=headers,
                                params={"session_id": "migration"}, timeout=5)
        assert response.json()["history"][0]["message"] == "hello"
        print("API: health, authentication, chat write/read passed")
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=10)
        log.close()
print("PASS: local migration validation")