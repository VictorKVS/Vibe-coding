import fs from "node:fs";

const quick = fs.readFileSync(new URL("../src/sound-quick-capture.js", import.meta.url), "utf8");
const main = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");

const checks = {
  "quick sound capture mounted": main.includes("mountSoundQuickCapture();"),
  "dictation button visible": quick.includes("🎙 Диктовать"),
  "MP3 story button visible": quick.includes("⬆ Рассказ MP3"),
  "audio types accepted": quick.includes(".mp3,.wav,.m4a,.ogg,.webm"),
  "local STT endpoint used": quick.includes("/api/stt/transcribe"),
  "microphone uses MediaRecorder": quick.includes("new MediaRecorder(stream"),
  "premium recorder shell exists": quick.includes("Премиум-диктофон") && quick.includes("BOOK·CRAFT VOICE STUDIO"),
  "live waveform uses analyser": quick.includes("createAnalyser()") && quick.includes("getByteTimeDomainData"),
  "live input level exists": quick.includes("premium-level-track") && quick.includes("Уровень голоса"),
  "recording timer exists": quick.includes('data-recorder="timer"') && quick.includes("startClock(popover)"),
  "pause resume supported": quick.includes("recorder.pause()") && quick.includes("recorder.resume()"),
  "recording can be previewed": quick.includes('audio data-recorder="preview" controls') && quick.includes("URL.createObjectURL(file)"),
  "recognition is explicit": quick.includes("Распознать Whisper") && quick.includes('data-action="recognize"'),
  "transcript can become whole story": quick.includes('value="whole"') && quick.includes("Добавить как рассказ целиком"),
  "transcript can become scene": quick.includes('value="scene"') && quick.includes("Добавить как новую сцену"),
  "existing text updated through input/change": quick.includes('new Event("input"') && quick.includes('new Event("change"'),
  "audio actions traced": quick.includes("audio.quick.stt.start") && quick.includes("audio.quick.stt.ready") && quick.includes("audio.quick.insert"),
  "record lifecycle traced": quick.includes("audio.quick.record.start") && quick.includes("audio.quick.record.pause") && quick.includes("audio.quick.record.finish"),
  "observer does not rebuild existing controls": quick.includes('ribbon.querySelector(".bookcraft-sound-quick")') && quick.includes("return;"),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) throw new Error(`FAIL SOUND-QUICK-CAPTURE: ${failed.join(", ")}`);

console.log(`PASS SOUND-QUICK-CAPTURE: ${Object.keys(checks).length}/${Object.keys(checks).length} premium recorder gates green.`);
