from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REGISTRY = Path(__file__).with_name("technologies.json")
ALLOWED_STATUS = {"PROVEN", "IMPLEMENTED", "CONFIG_REQUIRED", "ROADMAP"}
ALLOWED_MATURITY = {"MIN", "MED", "MAX"}
ALLOWED_REUSE = {"REUSE", "IMPROVE", "REFERENCE_ONLY"}


def main() -> None:
    payload = json.loads(REGISTRY.read_text(encoding="utf-8"))
    entries = payload.get("technologies", [])
    assert entries, "technology registry must not be empty"

    ids: set[str] = set()
    for entry in entries:
        tech_id = entry.get("id", "")
        assert tech_id and tech_id not in ids, f"missing or duplicate id: {tech_id}"
        ids.add(tech_id)
        assert entry.get("status") in ALLOWED_STATUS, f"invalid status: {tech_id}"
        assert entry.get("maturity") in ALLOWED_MATURITY, f"invalid maturity: {tech_id}"
        assert entry.get("reuse") in ALLOWED_REUSE, f"invalid reuse: {tech_id}"
        assert entry.get("source"), f"missing source: {tech_id}"
        assert entry.get("evidence"), f"missing evidence: {tech_id}"
        assert entry.get("limitations"), f"missing limitations: {tech_id}"
        assert entry.get("next"), f"missing next action: {tech_id}"
        for source in entry["source"]:
            assert (ROOT / source).exists(), f"missing source path for {tech_id}: {source}"

    serialized = REGISTRY.read_text(encoding="utf-8").lower()
    forbidden = ("bearer ", "api_key=", "access_token=")
    assert not any(marker in serialized for marker in forbidden), "possible secret in registry"
    print(f"PASS TECHNOLOGY-REGISTRY: {len(entries)} unique reusable capabilities validated")


if __name__ == "__main__":
    main()
