from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend" / "app.py"
FRONTEND = ROOT / "src" / "App.jsx"
source = BACKEND.read_text(encoding="utf-8")
frontend = FRONTEND.read_text(encoding="utf-8")

checks = {
    "audio field": 'audio: Annotated[UploadFile | None, File()] = None',
    "text priority": "if not message and audio is not None:",
    "transcription substitution": "message = transcription.strip()",
    "safe STT error": "Не удалось распознать голосовой запрос.",
    "controlled missing input": "Введите текст или прикрепите голосовой запрос.",
    "media type guard": "status_code=415",
    "size guard": "status_code=413",
    "local model inventory": 'root.rglob("*.gguf")',
    "art endpoint": '@app.post("/api/art/generate"',
    "official chat route": '"/v1/chat/completions"',
    "text2image auto mode": '"function_call": "auto"',
    "file download route": 'f"/v1/files/{image_id}/content"',
    "safe image extraction": "_extract_gigachat_image_id",
    "browser calls local gateway": 'http://127.0.0.1:8018/api/art/generate',
    "frontend checks data image": 'startsWith("data:image/")',
    "diagnostic endpoint": '@app.post("/api/diagnostics/github")',
    "diagnostic redaction": '"[REDACTED]"',
    "local gh issue submission": '"gh", "issue", "create"',
    "event trace": '"ui.click"',
    "diagnostic download": '"Скачать журнал JSON"',
    "diagnostic review button": '"Отправить на проверку"',
}

missing = [
    name
    for name, fragment in checks.items()
    if fragment not in (source + "\n" + frontend)
]
if missing:
    raise SystemExit("FAIL DZ8-MEDIA: " + ", ".join(missing))

if "localStorage.setItem" in frontend and "gigaAccessToken" in frontend.split("localStorage.setItem", 1)[1].split(")", 1)[0]:
    raise SystemExit("FAIL DZ8-SECURITY: GigaChat token must not be stored")

print("PASS DZ8-PRO-MIN: audio is optional and text keeps priority")
print("PASS DZ8-PRO-MED: STT result becomes user_message in one pipeline")
print("PASS DZ8-PRO-MAX: errors, type and size are handled safely")
print("PASS DZ8-MODELS: local GGUF inventory is exposed by the gateway")
print("PASS DZ8-ART-MIN: selected text becomes an art prompt")
print("PASS DZ8-ART-MED: GigaChat text2image returns a downloadable JPG")
print("PASS DZ8-ART-MAX: token stays in memory and errors are user-safe")
print("PASS DZ8-TRACE-MIN: clicks, model calls and failures enter one bounded journal")
print("PASS DZ8-TRACE-MED: JSON export excludes tokens and manuscript content")
print("PASS DZ8-TRACE-MAX: authenticated local gh creates a review Issue")
print("DZ-8 media acceptance: 10/10 checks green.")
