from __future__ import annotations

import csv
from pathlib import Path
from typing import Any


def load_destinations(csv_path: str) -> list[dict[str, Any]]:
    path = Path(csv_path)
    if not path.exists():
        return []
    with path.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    for row in rows:
        row["telegram_enabled"] = str(row.get("telegram_enabled", "")).lower() == "true"
    return rows


def get_destination(csv_path: str, slug: str) -> dict[str, Any] | None:
    for item in load_destinations(csv_path):
        if item.get("slug") == slug:
            return item
    return None


def enabled_destinations(csv_path: str) -> list[dict[str, Any]]:
    return [x for x in load_destinations(csv_path) if x.get("telegram_enabled")]


def can_answer_expert_questions(destination: dict[str, Any] | None) -> bool:
    return bool(destination and destination.get("knowledge_status") == "DETAILED")
