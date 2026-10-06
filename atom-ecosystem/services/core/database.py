import os
import sqlite3
from datetime import datetime, timezone

DATABASE_PATH = os.getenv(
    "DATABASE_PATH",
    "/opt/atom-core/data/atom_master.db"
)


def utc_timestamp():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def normalize_timestamp(value):
    if not value or not isinstance(value, str):
        raise ValueError("updated_at is required")
    candidate = value.strip()
    if not candidate:
        raise ValueError("updated_at is required")
    try:
        datetime.fromisoformat(candidate.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("updated_at must be an ISO-8601 timestamp") from exc
    return candidate


def bootstrap_database():
    db_dir = os.path.dirname(DATABASE_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH, timeout=5)
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS app_states (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                updated_by TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.commit()
    finally:
        conn.close()


def get_connection():
    bootstrap_database()
    conn = sqlite3.connect(DATABASE_PATH, timeout=5)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    return conn


def init_database():
    bootstrap_database()


def push_updates(updates):
    conn = get_connection()
    cursor = conn.cursor()
    for item in updates:
        if not isinstance(item, dict):
            raise ValueError("each update must be an object")
        key = item.get("key")
        if not isinstance(key, str) or not key.strip():
            raise ValueError("key is required")
        updated_at = normalize_timestamp(item.get("updated_at"))
        updated_by = item.get("updated_by")
        if not isinstance(updated_by, str) or not updated_by.strip():
            raise ValueError("updated_by is required")
        value = item.get("value")
        if value is None:
            raise ValueError("value is required")
        cursor.execute("""
            INSERT INTO app_states (key, value, updated_at, updated_by)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at,
                updated_by = excluded.updated_by
            WHERE excluded.updated_at > app_states.updated_at
        """, (
            key,
            str(value),
            updated_at,
            updated_by,
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
        snapshot_dir = os.path.dirname(snapshot_path)
        if snapshot_dir:
            os.makedirs(snapshot_dir, exist_ok=True)
        src = sqlite3.connect(DATABASE_PATH)
        dst = sqlite3.connect(snapshot_path)
        with dst:
            src.backup(dst)
    finally:
        if src:
            src.close()
        if dst:
            dst.close()
