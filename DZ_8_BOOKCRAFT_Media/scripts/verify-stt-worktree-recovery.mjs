import fs from "node:fs";

const launcher = fs.readFileSync(new URL("../START_BOOKCRAFT_ONE_CLICK.ps1", import.meta.url), "utf8");
const backend = fs.readFileSync(new URL("../backend/app.py", import.meta.url), "utf8");
const observed = fs.readFileSync(new URL("../backend/observed_router_app.py", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

const checks = {
  "proven whisper executable key preserved": launcher.includes('Get-DotEnvValue $EnvFile "WHISPER_CPP_EXE"') && backend.includes('os.getenv("WHISPER_CPP_EXE"'),
  "proven whisper model key preserved": launcher.includes('Get-DotEnvValue $EnvFile "WHISPER_MODEL_PATH"') && backend.includes('os.getenv("WHISPER_MODEL_PATH"'),
  "only STT paths inherited from prior worktree": launcher.includes('Get-DotEnvValue $EnvFile "WHISPER_CPP_EXE"') && launcher.includes('Get-DotEnvValue $EnvFile "WHISPER_MODEL_PATH"') && !launcher.includes("GIGACHAT_ACCESS_TOKEN"),
  "ignored env worktree recovery exists": launcher.includes("Git worktrees do not copy ignored .env files") && launcher.includes('DZ_8_BOOKCRAFT_Media\\.env'),
  "recovered values inherited by backend": launcher.includes('$env:WHISPER_CPP_EXE = $WhisperExe') && launcher.includes('$env:WHISPER_MODEL_PATH = $WhisperModel'),
  "whisper executable auto-discovery": launcher.includes("function Find-WhisperExecutable") && launcher.includes("whisper-cli.exe"),
  "whisper model auto-discovery": launcher.includes("function Find-WhisperModel") && launcher.includes('"ggml-*.bin"'),
  "preferred large v3 turbo model": launcher.includes("large-v3-turbo"),
  "discovery cached outside env": launcher.includes("stt-local-runtime.json") && launcher.includes("cached auto-discovery"),
  "found runtime printed for diagnosis": launcher.includes('Write-Host "       EXE') && launcher.includes('Write-Host "       MODEL'),
  "existing STT endpoint retained": backend.includes('@app.post("/api/stt/transcribe")') || observed.includes('@app.post("/api/stt/transcribe")'),
  "STT status endpoint exists": observed.includes('@app.get("/api/stt/status")'),
  "MP3 upload baseline retained": app.includes("Загрузить MP3 и расшифровать"),
  "microphone baseline retained": app.includes("Диктовать с микрофона") && app.includes("new MediaRecorder(stream)"),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) throw new Error(`FAIL STT-WORKTREE-RECOVERY: ${failed.join(", ")}`);
console.log(`PASS STT-WORKTREE-RECOVERY: ${Object.keys(checks).length}/${Object.keys(checks).length} proven STT baseline + auto-discovery gates green.`);
