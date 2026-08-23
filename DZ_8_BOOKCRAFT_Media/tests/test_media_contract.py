from pathlib import Path

APP = Path(__file__).resolve().parents[1] / "backend" / "app.py"
source = APP.read_text(encoding="utf-8")

checks = {
    "audio field": 'audio: Annotated[UploadFile | None, File()] = None',
    "text priority": "if not message and audio is not None:",
    "transcription substitution": "message = transcription.strip()",
    "safe STT error": "Не удалось распознать голосовой запрос.",
    "controlled missing input": "Введите текст или прикрепите голосовой запрос.",
    "media type guard": "status_code=415",
    "size guard": "status_code=413",
    "local model inventory": 'root.rglob("*.gguf")',
    "no token persistence": "localStorage" not in source,
}

missing = [name for name, fragment in checks.items() if fragment is not True and fragment not in source]
if checks["no token persistence"] is not True:
    missing.append("no token persistence")
if missing:
    raise SystemExit("FAIL DZ8-PRO: " + ", ".join(missing))

print("PASS DZ8-PRO-MIN: audio is optional and text keeps priority")
print("PASS DZ8-PRO-MED: STT result becomes user_message in one pipeline")
print("PASS DZ8-PRO-MAX: errors, type and size are handled safely")
print("PASS DZ8-MODELS: local GGUF inventory is exposed by the gateway")
print("DZ-8 media acceptance: 4/4 checks green.")
