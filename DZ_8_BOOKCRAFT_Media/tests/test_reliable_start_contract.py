from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
launcher = (ROOT / "START_BOOKCRAFT_MEDIA.ps1").read_text(encoding="utf-8-sig")
stopper = (ROOT / "STOP_BOOKCRAFT_MEDIA.ps1").read_text(encoding="utf-8-sig")
backend = (ROOT / "backend" / "app.py").read_text(encoding="utf-8")
frontend = (ROOT / "src" / "App.jsx").read_text(encoding="utf-8")

checks = {
    "three service endpoints": all(port in launcher for port in ("5173", "8018", "1234")),
    "LM auth classification": "authentication-required" in launcher and "Require Authentication" in launcher,
    "loaded model discovery": '"/llm-api/v1/models"' in frontend,
    "runtime model identifiers": "availableLocalModels" in frontend,
    "readiness API": '@app.get("/api/readiness")' in backend,
    "safe runtime logs": 'RuntimeRoot = Join-Path $ProjectRoot ".runtime"' in launcher,
    "launcher JSONL trace": "Write-RunTrace" in launcher and "run_id" in launcher,
    "gateway request correlation": '"X-Request-ID"' in frontend and '"X-Request-ID"' in backend,
    "metadata-only LLM trace": '"llm.forward.start"' in backend and "message_count" in backend,
    "trace review endpoint": '@app.get("/api/trace/recent")' in backend,
    "owned process shutdown": "no longer belongs to BOOK.CRAFT" in stopper,
    "no blind process kill": "Get-CimInstance Win32_Process" in stopper,
}

failed = [name for name, passed in checks.items() if not passed]
if failed:
    raise SystemExit("FAIL RELIABLE-START: " + ", ".join(failed))

print(f"PASS RELIABLE-START: {len(checks)}/{len(checks)} launch and shutdown gates green")
