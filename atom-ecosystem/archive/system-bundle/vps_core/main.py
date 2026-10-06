import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

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
from presence import router as presence_router

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
    "models/gemini-2.5-flash-native-audio-preview-09-2025"
)

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
    return {"history": query_chat(session_id)}

@app.get("/api/v1/knowledge/query", dependencies=[Depends(verify_secret)])
async def knowledge_query(q: str):
    return {"results": query_atom_vault(q)}

@app.post("/api/v1/system/backup-now", dependencies=[Depends(verify_secret)])
async def backup_now():
    return backup_db_to_gdrive()

@app.get("/voice/session-hook", dependencies=[Depends(verify_secret)])
async def voice_hook():
    return {
        "provider": "google",
        "protocol": "websocket",
        "endpoint": GEMINI_LIVE_WS_URL,
        "model": GEMINI_LIVE_MODEL,
        "client_mode": "mobile_direct"
    }

app.include_router(presence_router)
