from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

LEADS_SCHEMA = """
CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    telegram_user_id INTEGER,
    telegram_username TEXT,
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT NOT NULL,
    tour_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEW'
);
"""


def init_runtime_schema(sqlite_path: str) -> None:
    Path(sqlite_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(sqlite_path)
    conn.executescript(LEADS_SCHEMA)
    conn.commit()
    conn.close()


def save_lead(
    sqlite_path: str,
    *,
    telegram_user_id: int | None,
    telegram_username: str | None,
    first_name: str | None,
    last_name: str | None,
    phone_number: str,
    tour_code: str,
) -> int:
    init_runtime_schema(sqlite_path)
    created_at = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(sqlite_path)
    cursor = conn.execute(
        """
        INSERT INTO leads (
            created_at, telegram_user_id, telegram_username,
            first_name, last_name, phone_number, tour_code, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW')
        """,
        (
            created_at,
            telegram_user_id,
            telegram_username,
            first_name,
            last_name,
            phone_number,
            tour_code,
        ),
    )
    lead_id = int(cursor.lastrowid)
    conn.commit()
    conn.close()
    return lead_id
