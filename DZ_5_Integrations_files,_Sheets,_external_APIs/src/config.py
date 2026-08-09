from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
RUNTIME_DIR = PROJECT_ROOT / "runtime"
TRANSCRIPTS_DIR = PROJECT_ROOT / "transcripts"
PROTOCOLS_DIR = PROJECT_ROOT / "protocols"
DOWNLOADS_DIR = RUNTIME_DIR / "downloads"
NORMALIZED_DIR = RUNTIME_DIR / "normalized"

for p in [RUNTIME_DIR, TRANSCRIPTS_DIR, PROTOCOLS_DIR, DOWNLOADS_DIR, NORMALIZED_DIR]:
    p.mkdir(parents=True, exist_ok=True)


def _secret(name: str, aliases: tuple[str, ...] = ()) -> str:
    try:
        from google.colab import userdata  # type: ignore
        for key in (name, *aliases):
            value = userdata.get(key)
            if value:
                return value
    except Exception:
        pass
    raise RuntimeError(f"Missing Colab Secret: {name}")


@dataclass(frozen=True)
class Settings:
    telegram_token: str
    openai_api_key: str
    assemblyai_api_key: str
    google_sa_json: str
    google_sheets_id: str
    openai_model: str = "gpt-4o-mini"
    sheets_name: str = "Лист1"

    @classmethod
    def from_colab(cls) -> "Settings":
        return cls(
            telegram_token=_secret("TELEGRAM_BOT_TOKEN", ("TELEGRAM_TOKEN", "BOT_TOKEN", "TG_TOKEN2")),
            openai_api_key=_secret("OPENAI_API_KEY", ("OPENAI_KEY",)),
            assemblyai_api_key=_secret("ASSEMBLYAI_API_KEY", ("ASSEMBLYAI_KEY",)),
            google_sa_json=_secret("GOOGLE_SERVICE_ACCOUNT_JSON", ("GOOGLE_SERVICE_ACCOUNT",)),
            google_sheets_id=_secret("GOOGLE_SHEETS_ID", ("SHEETS_ID", "GOOGLE_SHEET_ID")),
        )

    def google_service_account(self) -> dict:
        return json.loads(self.google_sa_json)
