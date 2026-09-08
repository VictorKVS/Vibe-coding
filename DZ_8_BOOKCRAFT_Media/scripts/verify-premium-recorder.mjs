import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const page = fs.readFileSync(path.join(root, "src", "recorder-page.js"), "utf8");
const audio = fs.readFileSync(path.join(root, "src", "recorder-audio.js"), "utf8");
const trace = fs.readFileSync(path.join(root, "src", "recorder-trace.js"), "utf8");
const main = fs.readFileSync(path.join(root, "src", "main.jsx"), "utf8");

const checks = {
  "full recorder mounted": main.includes("mountRecorderPage") && main.includes("./recorder-page.js"),
  "full page workspace": page.includes("BOOK·CRAFT RECORDER") && page.includes("br-page") && page.includes("← BOOK.CRAFT"),
  "MediaRecorder used": page.includes("new MediaRecorder"),
  "microphone constraints": page.includes("echoCancellation") && page.includes("noiseSuppression") && page.includes("autoGainControl"),
  "live waveform": page.includes("createAnalyser()") && page.includes("getByteTimeDomainData"),
  "record pause stop": page.includes("record.pause()") || page.includes("recorder.pause()") && page.includes("recorder.resume()") && page.includes("recorder.stop()"),
  "playback": page.includes("▶ Прослушать") && page.includes("preview.play"),
  "wave selection": page.includes("pointerdown") && page.includes("pointermove") && page.includes("wave.selection"),
  "delete selection": page.includes("✂ Удалить выделенное") && page.includes("cutSelection"),
  "trim selection": page.includes("Обрезать до выделенного") && page.includes("trimToSelection"),
  "undo redo": page.includes("edit.undo") && page.includes("edit.redo") && page.includes("↶ Отмена") && page.includes("↷ Вернуть"),
  "audio import and download": page.includes("Импорт MP3 / WAV / WebM") && page.includes("audio.download"),
  "wav export after edits": audio.includes("audioBufferToWavBlob") && audio.includes("RIFF") && audio.includes("WAVE"),
  "on-screen trace": page.includes("ТРАССИРОВКА / ОТЧЁТ") && page.includes("Копировать отчёт"),
  "trace privacy": trace.includes("transcript") && trace.includes("[REDACTED]"),
  "state tracing": page.includes("state.change") && page.includes("microphone.request") && page.includes("record.finish"),
  "STT intentionally deferred": page.includes("Этап 2") && !page.includes("/api/stt/"),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) throw new Error(`FAIL RECORDER-WORKSPACE: ${failed.join(", ")}`);
console.log(`PASS RECORDER-WORKSPACE: ${Object.keys(checks).length}/${Object.keys(checks).length} recorder + trace gates green.`);
