import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const source = fs.readFileSync(path.join(root, "src", "premium-voice-recorder.js"), "utf8");
const main = fs.readFileSync(path.join(root, "src", "main.jsx"), "utf8");

const checks = {
  "recorder mounted": main.includes("mountPremiumVoiceRecorder"),
  "MediaRecorder used": source.includes("new MediaRecorder"),
  "microphone constraints": source.includes("echoCancellation") && source.includes("noiseSuppression") && source.includes("autoGainControl"),
  "live waveform": source.includes("createAnalyser()") && source.includes("getByteTimeDomainData"),
  "input level meter": source.includes("bc-level-bars") && source.includes("Уровень голоса"),
  "timer": source.includes('data-r=\"timer\"') && source.includes("startClock"),
  "pause resume": source.includes("recorder.pause()") && source.includes("recorder.resume()"),
  "preview": source.includes('data-r=\"preview\"') && source.includes("URL.createObjectURL"),
  "local download": source.includes('data-r=\"download\"') && source.includes("download.download"),
  "no STT call in recorder step": !source.includes("/api/stt/") && source.includes("STT · ЭТАП 2"),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) throw new Error(`FAIL PREMIUM-RECORDER: ${failed.join(", ")}`);
console.log(`PASS PREMIUM-RECORDER: ${Object.keys(checks).length}/${Object.keys(checks).length} recorder gates green.`);
