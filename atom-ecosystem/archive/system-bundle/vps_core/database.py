import os
import sqlite3
from datetime import datetime, timezone

DATABASE_PATH = os.getenv(
    "DATABASE_PATH",
    "/opt/atom-core/data/atom_master.db"
)

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
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS app_states (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            updated_by TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def push_updates(updates):
    conn = get_connection()
    cursor = conn.cursor()
    for item in updates:
        cursor.execute("""
            INSERT INTO app_states (key, value, updated_at, updated_by)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at,
                updated_by = excluded.updated_by
            WHERE excluded.updated_at > app_states.updated_at
        """, (
            item["key"],
            item["value"],
            item["updated_at"],
            item["updated_by"]
        ))
    conn.commit()
    conn.close()

def pull_updates():
    conn = get_connection()
    rows = conn.execute("""
        SELECT key, value, updated_at, updated_by
        FROM app_states
        ORDER BY key ASC
    """).fetchall()
    conn.close()
    return [dict(row) for row in rows]

def append_chat(session_id, role, message):
    conn = get_connection()
    conn.execute("""
        INSERT INTO chat_history (session_id, role, message, created_at)
        VALUES (?, ?, ?, ?)
    """, (session_id, role, message, utc_timestamp()))
    conn.commit()
    conn.close()

def query_chat(session_id, limit=50):
    conn = get_connection()
    rows = conn.execute("""
        SELECT id, session_id, role, message, created_at
        FROM chat_history
        WHERE session_id = ?
        ORDER BY id DESC
        LIMIT ?
    """, (session_id, limit)).fetchall()
    conn.close()
    return [dict(row) for row in rows]

def backup_db_to_snapshot(snapshot_path):
    src = None
    dst = None
    try:
        src = sqlite3.connect(DATABASE_PATH)
        dst = sqlite3.connect(snapshot_path)
        with dst:
            src.backup(dst)
    finally:
        if src:
            src.close()
        if dst:
            dst.close()
