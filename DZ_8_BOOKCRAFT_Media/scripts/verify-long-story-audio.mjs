import fs from "node:fs";

const observed = fs.readFileSync(new URL("../backend/observed_router_app.py", import.meta.url), "utf8");

const checks = {
  "long STT endpoint overrides base": observed.includes('getattr(route, "path", None) == "/api/stt/transcribe"') && observed.includes('@app.post("/api/stt/transcribe")'),
  "500 MB default story limit": observed.includes('BOOKCRAFT_MAX_STORY_AUDIO_MB') && observed.includes('"500"'),
  "streaming upload chunks": observed.includes('await audio.read(1024 * 1024)') && observed.includes('with audio_path.open("wb")'),
  "large file not buffered in RAM": !observed.includes('await audio.read(_story_audio_limit_bytes()'),
  "proven whisper cli retained": observed.includes('WHISPER_CPP_EXE') && observed.includes('WHISPER_MODEL_PATH') && observed.includes('"-otxt"'),
  "long timeout configurable": observed.includes('BOOKCRAFT_STT_TIMEOUT_SECONDS') && observed.includes('7200'),
  "long form traced": observed.includes('long_form=total_bytes > 25 * 1024 * 1024'),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) throw new Error(`FAIL LONG-STORY-AUDIO: ${failed.join(", ")}`);
console.log(`PASS LONG-STORY-AUDIO: ${Object.keys(checks).length}/${Object.keys(checks).length} gates green.`);
