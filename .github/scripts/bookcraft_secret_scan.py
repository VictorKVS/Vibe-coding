from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2] / "DZ_8_BOOKCRAFT_Media"
SOURCE_SUFFIXES = {".py", ".js", ".jsx", ".json", ".yaml", ".yml", ".ps1", ".md"}
EXCLUDED_PARTS = {"node_modules", "dist", ".venv", ".venv-runtime", ".runtime"}
SECRET = re.compile(
    r"(?:api[_-]?key|access[_-]?token|password)\s*[:=]\s*"
    r"(?P<quote>['\"])(?P<value>[^'\"]{8,})(?P=quote)",
    re.IGNORECASE,
)
SAFE_MARKERS = ("placeholder", "example", "not_saved", "not-saved", "memory only")


def candidates() -> list[Path]:
    return [
        path
        for path in ROOT.rglob("*")
        if path.is_file()
        and path.suffix.lower() in SOURCE_SUFFIXES
        and not EXCLUDED_PARTS.intersection(path.parts)
        and not path.name.endswith(".example")
    ]


def main() -> int:
    findings: list[tuple[str, int]] = []
    for path in candidates():
        for line_number, line in enumerate(path.read_text(encoding="utf-8", errors="ignore").splitlines(), 1):
            match = SECRET.search(line)
            if match and not any(marker in match.group("value").lower() for marker in SAFE_MARKERS):
                findings.append((path.relative_to(ROOT).as_posix(), line_number))

    if findings:
        print("Possible hard-coded secrets found; values are intentionally hidden:")
        for relative_path, line_number in findings:
            print(f"- {relative_path}:{line_number}")
        return 1

    print(f"PASS secret scan: {len(candidates())} source files checked")
    return 0


if __name__ == "__main__":
    sys.exit(main())
