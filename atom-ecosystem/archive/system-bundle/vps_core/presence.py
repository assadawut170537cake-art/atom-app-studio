import os
import json

from fastapi import APIRouter, Depends, Request, HTTPException

from database import get_connection, utc_timestamp

router = APIRouter()

ATOM_SECRET = os.getenv("ATOM_SECRET", "")
PRESENCE_TTL_SECONDS = 120
KILL_SWITCH_KEY = "emergency.kill_switch"


async def verify_secret(request: Request):
    secret = request.headers.get("X-Atom-Secret")
    if not secret:
        raise HTTPException(401, "Missing X-Atom-Secret")
    if secret != ATOM_SECRET:
        raise HTTPException(401, "Invalid X-Atom-Secret")
    return True


def _get_row(key):
    conn = get_connection()
    row = conn.execute(
        "SELECT value, updated_at FROM app_states WHERE key = ?", (key,)
    ).fetchone()
    conn.close()
    return row


def _set_state(key, value, updated_by):
    conn = get_connection()
    conn.execute(
        """INSERT INTO app_states (key, value, updated_at, updated_by)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (key) DO UPDATE SET
               value = excluded.value,
               updated_at = excluded.updated_at,
               updated_by = excluded.updated_by""",
        (key, json.dumps(value), utc_timestamp(), updated_by),
    )
    conn.commit()
    conn.close()


def _presence_key(node_id):
    return "presence." + node_id


def _is_online(updated_at):
    try:
        seen = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return False
    age = (datetime.now(timezone.utc) - seen).total_seconds()
    return age <= PRESENCE_TTL_SECONDS


@router.post("/presence/heartbeat", dependencies=[Depends(verify_secret)])
async def presence_heartbeat(body: dict):
    node_id = body.get("node_id")
    if not node_id:
        raise HTTPException(400, "node_id required")
    metadata = body.get("metadata") or {}
    if not isinstance(metadata, dict):
        raise HTTPException(400, "metadata must be an object")
    _set_state(_presence_key(node_id), metadata, node_id)
    return {"status": "ok", "node_id": node_id}


@router.get("/presence/status", dependencies=[Depends(verify_secret)])
async def presence_status():
    conn = get_connection()
    rows = conn.execute(
        "SELECT key, value, updated_at FROM app_states WHERE key LIKE 'presence.%'"
    ).fetchall()
    conn.close()
    nodes = {}
    for row in rows:
        node_id = row["key"][len("presence."):]
        try:
            metadata = json.loads(row["value"])
        except (ValueError, TypeError):
            metadata = {}
        nodes[node_id] = {
            "status": "online" if _is_online(row["updated_at"]) else "offline",
            "last_seen": row["updated_at"],
            "metadata": metadata,
        }
    return {"nodes": nodes}


def _emergency_status_payload():
    row = _get_row(KILL_SWITCH_KEY)
    if not row:
        return {"kill_switch_active": False, "since": None}
    try:
        state = json.loads(row["value"])
    except (ValueError, TypeError):
        state = {}
    return {
        "kill_switch_active": bool(state.get("active", False)),
        "since": state.get("since") if state.get("active") else None,
    }


@router.get("/emergency/status", dependencies=[Depends(verify_secret)])
async def emergency_status():
    return _emergency_status_payload()


@router.post("/emergency/kill-switch", dependencies=[Depends(verify_secret)])
async def emergency_kill_switch(body: dict):
    requested_by = body.get("requested_by")
    if not requested_by:
        raise HTTPException(400, "requested_by required")
    existing = _get_row(KILL_SWITCH_KEY)
    since = utc_timestamp()
    if existing:
        try:
            state = json.loads(existing["value"])
            if state.get("active") and state.get("since"):
                since = state["since"]
        except (ValueError, TypeError):
            pass
    _set_state(
        KILL_SWITCH_KEY,
        {"active": True, "since": since, "requested_by": requested_by},
        requested_by,
    )
    return _emergency_status_payload()


@router.post("/emergency/resume", dependencies=[Depends(verify_secret)])
async def emergency_resume(body: dict):
    requested_by = body.get("requested_by") or "unknown"
    _set_state(
        KILL_SWITCH_KEY,
        {"active": False, "since": None, "requested_by": requested_by},
        requested_by,
    )
    return _emergency_status_payload()
