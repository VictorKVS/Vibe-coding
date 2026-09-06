from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
launcher = (ROOT / "START_BOOKCRAFT_MEDIA.ps1").read_text(encoding="utf-8-sig")
stopper = (ROOT / "STOP_BOOKCRAFT_MEDIA.ps1").read_text(encoding="utf-8-sig")
backend = (ROOT / "backend" / "app.py").read_text(encoding="utf-8")
router_backend = (ROOT / "backend" / "model_router_app.py").read_text(encoding="utf-8")
frontend = (ROOT / "src" / "App.jsx").read_text(encoding="utf-8")
vite = (ROOT / "vite.config.js").read_text(encoding="utf-8")

checks = {
    "four service endpoints": all(port in launcher for port in ("5173", "8018", "1234", "8188")),
    "Comfy optional for text STT router": "OPTIONAL  ComfyUI" in launcher and "ComfyUI 8188 is not running" in launcher,
    "router-aware backend launch": "backend.model_router_app:app" in launcher,
    "LM auth classification": "authentication-required" in launcher and "Require Authentication" in launcher,
    "GigaChat template compatibility": '"--no-jinja", "--chat-template", "chatml"' in launcher,
    "loaded model discovery": '"/llm-api/v1/models"' in frontend,
    "runtime model identifiers": "availableLocalModels" in frontend,
    "model discovery routed through gateway": 'target: "http://127.0.0.1:8018"' in vite,
    "auto router catalog": '@app.get("/v1/models")' in router_backend and 'AUTO_MODEL_ID = "auto"' in router_backend,
    "manual selection preserved": '"mode": "manual"' in router_backend,
    "readiness API": '@app.get("/api/readiness")' in backend,
    "safe runtime logs": 'RuntimeRoot = Join-Path $ProjectRoot ".runtime"' in launcher,
    "launcher JSONL trace": "Write-RunTrace" in launcher and "run_id" in launcher,
    "gateway request correlation": '"X-Request-ID"' in frontend and '"X-Request-ID"' in backend,
    "metadata-only LLM trace": '"llm.forward.start"' in backend and "message_count" in backend,
    "router trace": '"llm.route"' in router_backend and "route_reason" in router_backend,
    "trace review endpoint": '@app.get("/api/trace/recent")' in backend,
    "owned process shutdown": "no longer belongs to BOOK.CRAFT" in stopper,
    "no blind process kill": "Get-CimInstance Win32_Process" in stopper,
}

failed = [name for name, passed in checks.items() if not passed]
if re.search(r'\\$[A-Za-z_][A-Za-z0-9_]*:', stopper):
    failed.append("ambiguous PowerShell variable before colon")
if failed:
    raise SystemExit("FAIL RELIABLE-START: " + ", ".join(failed))

print(f"PASS RELIABLE-START: {len(checks)}/{len(checks)} launch, router and shutdown gates green")
