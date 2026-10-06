import os
import sqlite3
import uuid
import logging
from datetime import datetime, timezone, timedelta

DATABASE_PATH = os.getenv("DATABASE_PATH", "/opt/atom-core/data/atom_master.db")
QUEUE_TIMEOUT_MINUTES = int(os.getenv("QUEUE_TIMEOUT_MINUTES", "15"))
logger = logging.getLogger("atom-core.database")

def utc_timestamp():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def get_connection():
    conn = sqlite3.connect(DATABASE_PATH, timeout=5)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    return conn

def init_database():
    db_dir = os.path.dirname(DATABASE_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS app_states (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS chat_history (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, role TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL)")
    cursor.execute("CREATE TABLE IF NOT EXISTS task_queue (task_id TEXT PRIMARY KEY, task_type TEXT NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL, result TEXT, error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, created_by TEXT NOT NULL, approved_by TEXT, approved_at TEXT, worker_id TEXT, claimed_at TEXT, completed_at TEXT)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_task_queue_status ON task_queue(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_task_queue_created ON task_queue(created_at)")
    conn.commit()
    conn.close()

def push_updates(updates):
    conn = get_connection()
    cursor = conn.cursor()
    for item in updates:
        cursor.execute("INSERT INTO app_states (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at, updated_by=excluded.updated_by WHERE excluded.updated_at > app_states.updated_at", (item["key"], item["value"], item["updated_at"], item["updated_by"]))
    conn.commit()
    conn.close()

def pull_updates():
    conn = get_connection()
    rows = conn.execute("SELECT key, value, updated_at, updated_by FROM app_states ORDER BY key ASC").fetchall()
    conn.close()
    return [dict(row) for row in rows]

def append_chat(session_id, role, message):
    conn = get_connection()
    conn.execute("INSERT INTO chat_history (session_id, role, message, created_at) VALUES (?, ?, ?, ?)", (session_id, role, message, utc_timestamp()))
    conn.commit()
    conn.close()

def query_chat(session_id, limit=50):
    conn = get_connection()
    rows = conn.execute("SELECT id, session_id, role, message, created_at FROM chat_history WHERE session_id = ? ORDER BY id DESC LIMIT ?", (session_id, limit)).fetchall()
    conn.close()
    return [dict(row) for row in rows]

def enqueue_task(task_type, payload, created_by):
    task_id = uuid.uuid4().hex
    now = utc_timestamp()
    conn = get_connection()
    conn.execute("INSERT INTO task_queue (task_id, task_type, status, payload, created_at, updated_at, created_by) VALUES (?, ?, 'PENDING_APPROVAL', ?, ?, ?, ?)", (task_id, task_type, payload, now, now, created_by))
    conn.commit()
    conn.close()
    return task_id

def approve_task(task_id, reviewed_by):
    conn = get_connection()
    task = conn.execute("SELECT * FROM task_queue WHERE task_id=?", (task_id,)).fetchone()
    if not task:
        conn.close(); return None
    if task["status"] != "PENDING_APPROVAL":
        conn.close(); raise ValueError("Task is not pending approval")
    now = utc_timestamp()
    conn.execute("UPDATE task_queue SET status='QUEUED', approved_by=?, approved_at=?, updated_at=? WHERE task_id=?", (reviewed_by, now, now, task_id))
    conn.commit(); conn.close()
    return "QUEUED"

def reject_task(task_id, reviewed_by):
    conn = get_connection()
    task = conn.execute("SELECT * FROM task_queue WHERE task_id=?", (task_id,)).fetchone()
    if not task:
        conn.close(); return None
    if task["status"] != "PENDING_APPROVAL":
        conn.close(); raise ValueError("Task is not pending approval")
    now = utc_timestamp()
    conn.execute("UPDATE task_queue SET status='REJECTED', approved_by=?, approved_at=?, updated_at=? WHERE task_id=?", (reviewed_by, now, now, task_id))
    conn.commit(); conn.close()
    return "REJECTED"

def unlock_stale_tasks():
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=QUEUE_TIMEOUT_MINUTES)).isoformat().replace("+00:00", "Z")
    now = utc_timestamp()
    conn = get_connection()
    conn.execute("UPDATE task_queue SET status='QUEUED', worker_id=NULL, claimed_at=NULL, updated_at=? WHERE status='RUNNING' AND claimed_at < ?", (now, cutoff))
    conn.commit(); conn.close()

def claim_next_task(worker_id):
    unlock_stale_tasks()
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("BEGIN IMMEDIATE")
        row = cursor.execute("UPDATE task_queue SET status='RUNNING', worker_id=?, claimed_at=?, updated_at=? WHERE task_id = (SELECT task_id FROM task_queue WHERE status='QUEUED' ORDER BY created_at ASC LIMIT 1) RETURNING *", (worker_id, utc_timestamp(), utc_timestamp())).fetchone()
        conn.commit()
        if row: return dict(row)
        return None
    except Exception:
        conn.rollback(); raise
    finally:
        conn.close()

def complete_task(task_id, worker_id, status, result, error):
    conn = get_connection()
    task = conn.execute("SELECT * FROM task_queue WHERE task_id=?", (task_id,)).fetchone()
    if not task:
        conn.close(); return None
    if task["status"] != "RUNNING":
        if task["worker_id"] == worker_id:
            logger.warning("Completing unlocked task %s by same worker", task_id)
        else:
            conn.close(); raise ValueError("Task is not running")
    if task["worker_id"] != worker_id:
        conn.close(); raise PermissionError("Worker mismatch")
    now = utc_timestamp()
    conn.execute("UPDATE task_queue SET status=?, result=?, error=?, completed_at=?, updated_at=? WHERE task_id=?", (status, result, error, now, now, task_id))
    conn.commit(); conn.close()
    return status

def list_tasks(status=None, limit=50):
    conn = get_connection()
    if status:
        rows = conn.execute("SELECT * FROM task_queue WHERE status=? ORDER BY created_at ASC LIMIT ?", (status, limit)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM task_queue ORDER BY created_at ASC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(row) for row in rows]

def backup_db_to_snapshot(snapshot_path):
    src = None; dst = None
    try:
        src = sqlite3.connect(DATABASE_PATH)
        dst = sqlite3.connect(snapshot_path)
        with dst:
            src.backup(dst)
    finally:
        if src: src.close()
        if dst: dst.close()
