import fs from "node:fs";

const sound = fs.readFileSync(new URL("../src/sound-engineering-ui.js", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const main = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const backend = fs.readFileSync(new URL("../backend/app.py", import.meta.url), "utf8");

const checks = {
  "sound workspace mounted": main.includes("mountSoundEngineeringUi();"),
  "sound tab exists": sound.includes('button.dataset.view = "sound"') && sound.includes('button.textContent = "Звук"'),
  "audio file goes to STT": sound.includes('/api/stt/transcribe') && sound.includes('body.append("audio"'),
  "microphone capture uses MediaRecorder": sound.includes("navigator.mediaDevices?.getUserMedia") && sound.includes("new MediaRecorder"),
  "transcript can enter manuscript": sound.includes("nativeTextareaSet") && sound.includes("audio.transcript.insert"),
  "voice bible bound to character ids": sound.includes("bookcraft.audio.character-voices.v1") && sound.includes("character_id"),
  "scene sound plan persists": sound.includes("bookcraft.audio.scene-plan.v1") && sound.includes("ambience") && sound.includes("sfx") && sound.includes("music"),
  "audio timeline has five tracks": ["NARRATOR", "DIALOGUE", "AMBIENCE", "SFX", "MUSIC"].every((name) => sound.includes(`\"${name}\"`)),
  "existing local voice studio retained": app.includes('className="voice-studio"') && app.includes("speechSynthesis"),
  "backend STT endpoint retained": backend.includes('@app.post("/api/stt/transcribe")'),
  "sound trace is metadata based": sound.includes("audio.stt.start") && sound.includes("audio.stt.ready") && sound.includes("audio.record.start"),
  "video consumes sound layer": sound.includes("Audio Timeline") && sound.includes("scene_id"),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) throw new Error(`FAIL SOUND-ENGINEERING: ${failed.join(", ")}`);
console.log(`PASS SOUND-ENGINEERING: ${Object.keys(checks).length}/${Object.keys(checks).length} audio gates green.`);
