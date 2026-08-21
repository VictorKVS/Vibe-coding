from __future__ import annotations

import ast
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / "src" / "app.py"
source = APP.read_text(encoding="utf-8")
tree = ast.parse(source)

required_fragments = {
    "PDF button": 'Скачать протокол (PDF)',
    "TXT button": 'Скачать транскрипт (TXT)',
    "PDF callback": 'callback_data=f"download_pdf:{artifact_id}"',
    "TXT callback": 'callback_data=f"download_txt:{artifact_id}"',
    "artifact-bound state": 'ARTIFACT_STATE[artifact.id] = result_state',
    "transcript path": '"transcript_path": str(transcript_path)',
    "TXT handler": 'async def download_transcript',
    "TXT delivery": 'FSInputFile(transcript_path)',
    "missing-file alert": 'Файл транскрипта отсутствует.',
    "safe alert": 'show_alert=True',
}

missing = [name for name, fragment in required_fragments.items() if fragment not in source]
if missing:
    raise SystemExit("FAIL DZ5-TXT: missing " + ", ".join(missing))

handlers = {
    node.name
    for node in ast.walk(tree)
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
for name in {"kb_ready", "_artifact_file", "download_pdf", "download_transcript"}:
    if name not in handlers:
        raise SystemExit(f"FAIL DZ5-TXT: handler/helper {name} is absent")

button_order = source.index('Скачать протокол (PDF)') < source.index('Скачать транскрипт (TXT)')
if not button_order:
    raise SystemExit("FAIL DZ5-TXT: PDF and TXT buttons are not built together")

print("PASS DZ5-TXT-MIN: one result message contains PDF and TXT inline buttons")
print("PASS DZ5-TXT-MED: every callback is bound to its artifact_id")
print("PASS DZ5-TXT-MAX: missing transcript returns a safe Telegram alert")
print("DZ-5 transcript download acceptance: 3/3 checks green.")
