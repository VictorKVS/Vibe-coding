from __future__ import annotations

import csv
import sqlite3
from pathlib import Path
from typing import Any

ALLOWED_PRICE_STATUSES = {"VERIFIED", "INTERNAL_APPROVED", "INTERNAL_MVP"}

SCHEMA = """
CREATE TABLE IF NOT EXISTS tours (
    tour_code TEXT PRIMARY KEY,
    country TEXT NOT NULL,
    city TEXT,
    title TEXT NOT NULL,
    hotel TEXT,
    stars INTEGER,
    meal TEXT,
    days INTEGER,
    nights INTEGER,
    adults INTEGER,
    children INTEGER,
    departure_city TEXT,
    price REAL,
    currency TEXT,
    rating REAL,
    available INTEGER NOT NULL DEFAULT 0,
    last_update TEXT,
    price_status TEXT NOT NULL,
    price_source TEXT,
    notes TEXT
);
"""


def build_sqlite(csv_path: str, sqlite_path: str) -> None:
    Path(sqlite_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(sqlite_path)
    conn.executescript(SCHEMA)
    conn.execute("DELETE FROM tours")

    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            conn.execute(
                """
                INSERT INTO tours VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    row["tour_code"], row["country"], row["city"], row["title"],
                    row["hotel"], int(row["stars"] or 0), row["meal"],
                    int(row["days"] or 0), int(row["nights"] or 0),
                    int(row["adults"] or 0), int(row["children"] or 0),
                    row["departure_city"], float(row["price"] or 0), row["currency"],
                    float(row["rating"] or 0), 1 if row["available"].lower() == "true" else 0,
                    row["last_update"], row["price_status"], row["price_source"], row["notes"],
                ),
            )
    conn.commit()
    conn.close()


def get_tour(sqlite_path: str, tour_code: str) -> dict[str, Any] | None:
    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM tours WHERE tour_code = ?", (tour_code,)).fetchone()
    conn.close()
    if not row:
        return None
    data = dict(row)
    if data["price_status"] not in ALLOWED_PRICE_STATUSES:
        data["price"] = None
    return data


def find_tours(sqlite_path: str, country: str | None = None, max_price: float | None = None) -> list[dict[str, Any]]:
    query = "SELECT * FROM tours WHERE available = 1"
    params: list[Any] = []
    if country:
        query += " AND lower(country) = lower(?)"
        params.append(country)
    if max_price is not None:
        query += " AND price <= ?"
        params.append(max_price)
    query += " ORDER BY price ASC"

    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(query, params).fetchall()
    conn.close()

    result = []
    for row in rows:
        item = dict(row)
        if item["price_status"] not in ALLOWED_PRICE_STATUSES:
            item["price"] = None
        result.append(item)
    return result
