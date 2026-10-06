import os
import json
import logging
from typing import Optional
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from database import (
    init_database, push_updates, pull_updates, append_chat, query_chat,
    enqueue_task, approve_task, reject_task, claim_next_task, complete_task,
    unlock_stale_tasks, list_tasks
)
from gdrive_vault import query_atom_vault, backup_db_to_gdrive


load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("atom-core")

ATOM_SECRET = os.getenv("ATOM_SECRET", "")
if not ATOM_SECRET:
    raise RuntimeError("ATOM_SECRET is not set in .env — refusing to start")

GEMINI_LIVE_WS_URL = os.getenv("GEMINI_LIVE_WS_URL", "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent")
GEMINI_LIVE_MODEL = os.getenv("GEMINI_LIVE_MODEL", "models/gemini-2.5-flash-native-audio-preview-09-2025")

PRESENCE_TTL_SECONDS = int(os.getenv("PRESENCE_TTL_SECONDS", "30"))
LOCK_FILE = "/opt/atom-core/data/.emergency_lock"
ALLOWED_NODES = ["PC_WORKSTATION", "MOBILE_S10"]

presence_registry = {}
KILL_SWITCH_ACTIVE = False
KILL_SWITCH_SINCE = None

ALLOW_ALWAYS = ["/health", "/voice/session-hook", "/presence", "/emergency", "/api/v1/atom/ping", "/api/v1/friday/ping", "/api/v1/ultron/ping"]
BLOCK_WHEN_KILLED = ["/api/v1/sync", "/api/v1/queue", "/api/v1/system/backup-now", "/api/v1/knowledge/query"]


def utc_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def error_response(code, message):
    return {"error": {"code": code, "message": message}}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global KILL_SWITCH_ACTIVE, KILL_SWITCH_SINCE
    init_database()
    unlock_stale_tasks()
    if os.path.exists(LOCK_FILE):
        KILL_SWITCH_ACTIVE = True
        try:
            with open(LOCK_FILE, "r") as f:
                KILL_SWITCH_SINCE = f.read().strip() or utc_now()
        except Exception:
            KILL_SWITCH_SINCE = utc_now()
        logger.warning("Emergency lock detected since %s", KILL_SWITCH_SINCE)
    yield


app = FastAPI(title="ATOM Core", version="8.0", lifespan=lifespan)


@app.middleware("http")
async def emergency_middleware(request: Request, call_next):
    path = request.url.path
    if KILL_SWITCH_ACTIVE:
        allowed = False
        for item in ALLOW_ALWAYS:
            if path.startswith(item):
                allowed = True
                break
        if not allowed:
            for blocked in BLOCK_WHEN_KILLED:
                if path.startswith(blocked):
                    return JSONResponse(status_code=503, content=error_response(503, "SYSTEM_EMERGENCY_STOP_ACTIVE"))
    return await call_next(request)


async def verify_secret(request: Request):
    secret = request.headers.get("X-Atom-Secret")
    if not secret:
        raise HTTPException(401, "Missing X-Atom-Secret")
    if secret != ATOM_SECRET:
        raise HTTPException(401, "Invalid X-Atom-Secret")
    return True


@app.exception_handler(RequestValidationError)
async def validation_handler(request, exc):
    return JSONResponse(status_code=400, content=error_response(400, "Invalid request"))


@app.exception_handler(StarletteHTTPException)
async def http_handler(request, exc):
    return JSONResponse(status_code=exc.status_code, content=error_response(exc.status_code, str(exc.detail)))


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content=error_response(500, "Internal server error"))


@app.get("/health")
async def health():
    return {"status": "ok", "service": "atom-core", "version": "8.0", "timestamp": utc_now()}


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
        if not item.get("key"):
            raise HTTPException(400, "key is required")
        if not item.get("updated_at"):
            raise HTTPException(400, "updated_at is required")
    push_updates(updates)
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
    if not session_id:
        raise HTTPException(400, "session_id required")
    return {"history": query_chat(session_id)}


@app.get("/api/v1/knowledge/query", dependencies=[Depends(verify_secret)])
async def knowledge_query(q: str):
    if not q:
        raise HTTPException(400, "q required")
    return {"results": query_atom_vault(q)}


@app.post("/api/v1/system/backup-now", dependencies=[Depends(verify_secret)])
async def backup_now():
    return backup_db_to_gdrive()


@app.get("/voice/session-hook", dependencies=[Depends(verify_secret)])
async def voice_session_hook():
    return {"provider": "google", "protocol": "websocket", "endpoint": GEMINI_LIVE_WS_URL, "model": GEMINI_LIVE_MODEL, "client_mode": "mobile_direct"}


ALLOWED_TASK_TYPES = ["ULTRON_CODE", "FRIDAY_RESEARCH"]
ALLOWED_STATUS = ["COMPLETED", "FAILED"]


@app.post("/api/v1/queue/submit", dependencies=[Depends(verify_secret)])
async def queue_submit(body: dict):
    task_type = body.get("task_type")
    payload = body.get("payload")
    created_by = body.get("created_by")
    if task_type not in ALLOWED_TASK_TYPES:
        raise HTTPException(400, "invalid task_type")
    if not payload:
        raise HTTPException(400, "payload required")
    if not created_by:
        raise HTTPException(400, "created_by required")
    task_id = enqueue_task(task_type, json.dumps(payload), created_by)
    return {"task_id": task_id, "status": "PENDING_APPROVAL"}


@app.get("/api/v1/queue/list", dependencies=[Depends(verify_secret)])
async def queue_list(status: Optional[str] = None, limit: int = 50):
    unlock_stale_tasks()
    return {"tasks": list_tasks(status, limit)}


@app.post("/api/v1/queue/{task_id}/review", dependencies=[Depends(verify_secret)])
async def queue_review(task_id: str, body: dict):
    action = body.get("action")
    reviewed_by = body.get("reviewed_by")
    if not reviewed_by:
        raise HTTPException(400, "reviewed_by required")
    try:
        if action == "approve":
            status = approve_task(task_id, reviewed_by)
        elif action == "reject":
            status = reject_task(task_id, reviewed_by)
        else:
            raise HTTPException(400, "invalid action")
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    if status is None:
        raise HTTPException(404, "task not found")
    return {"task_id": task_id, "status": status}


@app.post("/api/v1/queue/claim", dependencies=[Depends(verify_secret)])
async def queue_claim(body: dict):
    worker_id = body.get("worker_id")
    if not worker_id:
        raise HTTPException(400, "worker_id required")
    return {"task": claim_next_task(worker_id)}


@app.post("/api/v1/queue/{task_id}/complete", dependencies=[Depends(verify_secret)])
async def queue_complete(task_id: str, body: dict):
    worker_id = body.get("worker_id")
    status = body.get("status")
    result = body.get("result", {})
    error = body.get("error", "")
    if status not in ALLOWED_STATUS:
        raise HTTPException(400, "invalid status")
    if not worker_id:
        raise HTTPException(400, "worker_id required")
    try:
        final_status = complete_task(task_id, worker_id, status, json.dumps(result), error)
    except PermissionError as exc:
        raise HTTPException(403, str(exc))
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    if final_status is None:
        raise HTTPException(404, "task not found")
    return {"task_id": task_id, "status": final_status}


def cleanup_presence():
    now = datetime.now(timezone.utc)
    expired = []
    for node_id, data in presence_registry.items():
        last_seen = datetime.fromisoformat(data["last_seen"].replace("Z", "+00:00"))
        if (now - last_seen).total_seconds() > PRESENCE_TTL_SECONDS:
            expired.append(node_id)
    for node_id in expired:
        del presence_registry[node_id]


@app.post("/presence/heartbeat", dependencies=[Depends(verify_secret)])
async def presence_heartbeat(body: dict):
    node_id = body.get("node_id")
    metadata = body.get("metadata", {})
    if node_id not in ALLOWED_NODES:
        raise HTTPException(400, "invalid node_id")
    if len(json.dumps(metadata)) > 1024:
        raise HTTPException(400, "metadata too large")
    now = utc_now()
    presence_registry[node_id] = {"last_seen": now, "metadata": metadata}
    return {"status": "ok", "node_id": node_id, "last_seen": now}


@app.get("/presence/status", dependencies=[Depends(verify_secret)])
async def presence_status():
    cleanup_presence()
    response = {"nodes": {}}
    for node_id in ALLOWED_NODES:
        if node_id in presence_registry:
            data = presence_registry[node_id]
            response["nodes"][node_id] = {"status": "ONLINE", "last_seen": data["last_seen"], "metadata": data["metadata"]}
        else:
            response["nodes"][node_id] = {"status": "OFFLINE"}
    return response


@app.post("/emergency/kill-switch", dependencies=[Depends(verify_secret)])
async def activate_kill_switch(body: dict):
    global KILL_SWITCH_ACTIVE, KILL_SWITCH_SINCE
    requested_by = body.get("requested_by")
    if not requested_by:
        raise HTTPException(400, "requested_by required")
    logger.warning("Emergency kill switch activated by %s", requested_by)
    lock_timestamp = utc_now()
    with open(LOCK_FILE, "w") as f:
        f.write(lock_timestamp)
    os.chmod(LOCK_FILE, 0o600)
    KILL_SWITCH_ACTIVE = True
    KILL_SWITCH_SINCE = lock_timestamp
    return {"status": "active", "since": KILL_SWITCH_SINCE, "activated_by": requested_by}


@app.post("/emergency/resume", dependencies=[Depends(verify_secret)])
async def resume_system(body: dict):
    global KILL_SWITCH_ACTIVE, KILL_SWITCH_SINCE
    requested_by = body.get("requested_by")
    if not requested_by:
        raise HTTPException(400, "requested_by required")
    logger.warning("Emergency resume by %s", requested_by)
    if os.path.exists(LOCK_FILE):
        os.remove(LOCK_FILE)
    KILL_SWITCH_ACTIVE = False
    KILL_SWITCH_SINCE = None
    return {"status": "normal", "resumed_by": requested_by}


@app.get("/emergency/status", dependencies=[Depends(verify_secret)])
async def emergency_status():
    return {"kill_switch_active": KILL_SWITCH_ACTIVE, "since": KILL_SWITCH_SINCE}
