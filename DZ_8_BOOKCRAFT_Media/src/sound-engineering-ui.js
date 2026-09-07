const TRACE_API = "http://127.0.0.1:8018/api/trace/ui-event";
const STT_API = "http://127.0.0.1:8018/api/stt/transcribe";
const HEALTH_API = "http://127.0.0.1:8018/api/health";
const VIEW_KEY = "bookcraft.engineering.view.v1";
const AUDIO_BIBLE_KEY = "bookcraft.audio.character-voices.v1";
const AUDIO_SCENES_KEY = "bookcraft.audio.scene-plan.v1";
const AUDIO_TRANSCRIPTS_KEY = "bookcraft.audio.transcripts.v1";

const VOICE_PRESETS = {
  woman: { label: "Женщина", rate: 0.95, pitch: 1.08 },
  man: { label: "Мужчина", rate: 0.9, pitch: 0.78 },
  girl: { label: "Девочка", rate: 1.03, pitch: 1.38 },
  boy: { label: "Мальчик", rate: 1.02, pitch: 1.18 },
};

function trace(event, data = {}) {
  fetch(TRACE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, source: "sound-engineering-ui", data }),
  }).catch(() => {});
}

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function activeProject() {
  const activeId = localStorage.getItem("bookcraft.author.active-project.v1");
  const projects = readJson("bookcraft.author.projects.v1", []);
  return Array.isArray(projects) ? projects.find((item) => item.id === activeId) || null : null;
}

function characters() {
  const projectCharacters = activeProject()?.snapshot?.characterProfiles;
  if (Array.isArray(projectCharacters) && projectCharacters.length) return projectCharacters;
  const direct = readJson("bookcraft.characters", []);
  return Array.isArray(direct) ? direct : [];
}

function scriptTextAreas() {
  return Array.from(document.querySelectorAll(".script-block textarea"));
}

function sceneDescriptors() {
  const sections = ["Вступление", "Развитие", "Финал"];
  const result = [];
  let number = 0;
  scriptTextAreas().forEach((area, sectionIndex) => {
    const text = String(area.value || "").trim();
    if (!text) return;
    const chunks = text.split(/\n\s*\n+/).map((item) => item.trim()).filter(Boolean);
    (chunks.length ? chunks : [text]).forEach((chunk, index) => {
      number += 1;
      result.push({
        id: `SC-${String(number).padStart(2, "0")}`,
        sectionIndex,
        section: sections[sectionIndex] || "Сцена",
        index,
        text: chunk,
      });
    });
  });
  return result;
}

function nativeTextareaSet(area, value) {
  if (!area) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(area, value);
  area.dispatchEvent(new Event("input", { bubbles: true }));
  area.dispatchEvent(new Event("change", { bubbles: true }));
}

function injectStyles() {
  if (document.getElementById("bookcraft-sound-engineering-style")) return;
  const style = document.createElement("style");
  style.id = "bookcraft-sound-engineering-style";
  style.textContent = `
    body[data-engineering-view="sound"] .chat-panel{display:none!important}
    body[data-engineering-view="sound"] .workspace-grid{grid-template-columns:1fr!important}
    body[data-engineering-view="sound"] .script-panel>.panel-heading,
    body[data-engineering-view="sound"] .script-block,
    body[data-engineering-view="sound"] .illustration-studio,
    body[data-engineering-view="sound"] .engineering-whole-canvas,
    body[data-engineering-view="sound"] .engineering-scene-board,
    body[data-engineering-view="sound"] .character-bible{display:none!important}
    body[data-engineering-view="sound"] .script-sections{display:block!important}
    body[data-engineering-view="sound"] .voice-studio{display:block!important;margin-top:0!important}
    body[data-engineering-view="sound"] .engineering-video-board{display:none!important}
    .engineering-sound-board{display:none;max-width:1160px;margin:0 auto 18px;padding:18px;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:linear-gradient(155deg,rgba(16,24,39,.9),rgba(10,18,28,.92));box-shadow:0 18px 60px rgba(0,0,0,.2)}
    body[data-engineering-view="sound"] .engineering-sound-board{display:block}
    .sound-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:14px}.sound-head h2{margin:2px 0 5px;font-size:22px}.sound-head p{margin:0;color:#8395ad;font-size:11px;max-width:760px}.sound-head .sound-health{padding:7px 10px;border-radius:9px;border:1px solid rgba(95,190,145,.22);background:rgba(70,170,120,.08);color:#a9e5c3;font-size:10px;white-space:nowrap}
    .sound-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:12px}.sound-card{padding:14px;border:1px solid rgba(255,255,255,.075);border-radius:14px;background:rgba(255,255,255,.035)}.sound-card h3{margin:0 0 4px;font-size:14px}.sound-card>p{margin:0 0 12px;color:#7e91aa;font-size:10px}.sound-actions{display:flex;gap:7px;flex-wrap:wrap}.sound-actions button,.sound-card select,.sound-card input,.sound-card textarea{border:1px solid rgba(255,255,255,.12);border-radius:9px;background:rgba(255,255,255,.05);color:#e6eef9;padding:8px 9px;font:11px Inter,system-ui,sans-serif}.sound-actions button{cursor:pointer}.sound-actions button.primary{border-color:rgba(100,180,255,.35);background:rgba(80,135,210,.13)}.sound-actions button.recording{border-color:rgba(255,100,110,.45);color:#ffc1c5}.sound-card label{display:grid;gap:5px;color:#879ab2;font-size:9px}.sound-transcript{margin-top:10px;padding:10px;border-radius:10px;background:rgba(0,0,0,.16);min-height:54px;color:#c9d5e5;font-size:10px;white-space:pre-wrap}.sound-transcript.empty{color:#687b93}
    .sound-voice-list{display:grid;gap:7px}.sound-voice-row{display:grid;grid-template-columns:minmax(130px,1fr) 150px 92px;gap:7px;align-items:center;padding:8px;border-radius:10px;background:rgba(255,255,255,.028)}.sound-voice-row b{font-size:10px}.sound-voice-row small{display:block;color:#71849d;font-weight:400}.sound-voice-row button{border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:7px;background:rgba(255,255,255,.04);color:#d9e5f3;cursor:pointer;font-size:10px}
    .sound-scenes{grid-column:1/-1}.sound-scene-list{display:grid;gap:7px}.sound-scene-row{display:grid;grid-template-columns:95px 1fr 1fr 1fr;gap:7px;align-items:center}.sound-scene-row>span{font-size:9px;color:#9aacc2}.sound-scene-row input{width:100%;box-sizing:border-box}
    .sound-timeline{grid-column:1/-1}.sound-timeline-grid{display:grid;grid-template-columns:90px 1fr;gap:5px}.sound-track-label{font-size:9px;color:#7890aa;padding:7px}.sound-track{display:flex;gap:4px;min-height:30px;padding:4px;border-radius:8px;background:rgba(255,255,255,.025);overflow:auto}.sound-clip{min-width:92px;padding:5px 7px;border-radius:7px;background:rgba(90,125,200,.12);border:1px solid rgba(105,155,230,.14);font-size:8px;color:#b9cbea}.sound-clip.muted{opacity:.35}.sound-status{margin-top:8px;color:#7f92ab;font-size:9px}.sound-status.error{color:#ffadb5}.sound-status.ready{color:#9ce1ba}
    .sound-engineering-note{margin-top:10px;padding:9px 10px;border-radius:10px;border:1px solid rgba(180,135,255,.14);background:rgba(130,90,210,.06);color:#8092aa;font-size:9px}
    .bookcraft-underhood-audio{margin:12px 0;padding:10px;border:1px solid rgba(100,175,255,.13);border-radius:10px;background:rgba(80,130,210,.05)}.bookcraft-underhood-audio span{display:block;color:#7d90aa;font-size:9px}.bookcraft-underhood-audio b{display:block;margin-top:3px;font-size:10px;color:#d9e6f6}
    @media(max-width:860px){.sound-grid{grid-template-columns:1fr}.sound-scenes,.sound-timeline{grid-column:1}.sound-scene-row{grid-template-columns:80px 1fr}.sound-scene-row input{grid-column:2}.sound-voice-row{grid-template-columns:1fr 130px}.sound-voice-row button{grid-column:1/-1}}
  `;
  document.head.appendChild(style);
}

function buildBoard(root) {
  let board = root.querySelector(".engineering-sound-board");
  if (board) return board;
  board = document.createElement("section");
  board.className = "engineering-sound-board";
  board.innerHTML = `
    <div class="sound-head">
      <div><span style="font-size:9px;color:#71839b;letter-spacing:.14em">SOUND ENGINEERING</span><h2>Звуковой слой произведения</h2><p>Диктовка и аудиофайлы → Whisper → текст; персонажи → постоянные голосовые профили; сцены → атмосфера, эффекты, музыка и озвучка; затем всё попадает в видеомонтаж.</p></div>
      <div class="sound-health" data-sound="health">STT · проверяю…</div>
    </div>
    <div class="sound-grid">
      <article class="sound-card sound-capture">
        <h3>01 · Захват и распознавание</h3><p>Запишите идею голосом или загрузите MP3/WAV/OGG/WebM/M4A. Расшифровка проходит через локальный STT.</p>
        <div class="sound-actions">
          <input data-sound="file" type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/ogg,audio/webm,.mp3,.wav,.m4a,.ogg,.webm" hidden />
          <button type="button" class="primary" data-action="audio-file">Загрузить аудио → текст</button>
          <button type="button" data-action="mic">Записать с микрофона</button>
          <select data-sound="target"><option value="introduction">Вставить во вступление</option><option value="development">Вставить в развитие</option><option value="finale">Вставить в финал</option></select>
          <button type="button" data-action="insert" disabled>Вставить расшифровку</button>
        </div>
        <div class="sound-transcript empty" data-sound="transcript">Расшифровка появится здесь.</div>
        <div class="sound-status" data-sound="capture-status"></div>
      </article>
      <article class="sound-card sound-voices">
        <h3>02 · Voice Bible</h3><p>Каждый герой получает постоянный голосовой профиль, связанный с его character_id.</p>
        <div class="sound-voice-list" data-sound="voices"></div>
      </article>
      <article class="sound-card sound-scenes">
        <h3>03 · Звуковая карта сцен</h3><p>Для каждой сцены фиксируем атмосферу, эффекты и музыкальную задачу. Эти данные потом используются комиксом, аниматиком и видео.</p>
        <div class="sound-scene-list" data-sound="scenes"></div>
      </article>
      <article class="sound-card sound-timeline">
        <h3>04 · Audio Timeline</h3><p>Единая инженерная раскладка звука по сценам.</p>
        <div class="sound-timeline-grid" data-sound="timeline"></div>
      </article>
    </div>
    <div class="sound-engineering-note">Сейчас функциональны: микрофон → STT, аудиофайл → STT, системная локальная озвучка текста и Voice Bible. Музыка/SFX/микс пока хранятся как производственный план; для реального рендера нужен отдельный audio backend, который подключим без изменения структуры проекта.</div>`;
  root.querySelector(".workspace-grid")?.insertAdjacentElement("afterend", board);
  wireCapture(board);
  return board;
}

async function refreshHealth(board) {
  const node = board.querySelector('[data-sound="health"]');
  try {
    const response = await fetch(HEALTH_API);
    const payload = response.ok ? await response.json() : {};
    const status = payload?.stt || "unknown";
    node.textContent = `STT · ${String(status).toUpperCase()}`;
  } catch {
    node.textContent = "STT · OFF";
  }
}

async function transcribe(file, board, source) {
  if (!file) return;
  const status = board.querySelector('[data-sound="capture-status"]');
  const transcript = board.querySelector('[data-sound="transcript"]');
  const insert = board.querySelector('[data-action="insert"]');
  status.className = "sound-status";
  status.textContent = "Распознаю аудио…";
  trace("audio.stt.start", { source, content_type: file.type || "unknown", size_bytes: file.size });
  try {
    const body = new FormData();
    body.append("audio", file, file.name || "audio.webm");
    const response = await fetch(STT_API, { method: "POST", body });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.detail || `HTTP ${response.status}`);
    const text = String(payload?.transcription || "").trim();
    if (!text) throw new Error("Whisper не вернул текст");
    transcript.textContent = text;
    transcript.classList.remove("empty");
    insert.disabled = false;
    insert.dataset.transcript = text;
    const saved = readJson(AUDIO_TRANSCRIPTS_KEY, []);
    const items = Array.isArray(saved) ? saved : [];
    items.push({ id: `audio-${Date.now()}`, source, name: file.name || "microphone", text, created_at: new Date().toISOString() });
    writeJson(AUDIO_TRANSCRIPTS_KEY, items.slice(-50));
    status.className = "sound-status ready";
    status.textContent = `READY · ${text.length} символов · ${payload?.duration_ms || "?"} мс`;
    trace("audio.stt.ready", { source, transcript_length: text.length, duration_ms: payload?.duration_ms || null });
  } catch (error) {
    status.className = "sound-status error";
    status.textContent = `STT ERROR · ${error.message}`;
    trace("audio.stt.error", { source, error: String(error.message || error).slice(0, 260) });
  }
}

function wireCapture(board) {
  if (board.dataset.captureWired === "1") return;
  board.dataset.captureWired = "1";
  const input = board.querySelector('[data-sound="file"]');
  const micButton = board.querySelector('[data-action="mic"]');
  let recorder = null;
  let stream = null;
  let chunks = [];

  board.querySelector('[data-action="audio-file"]')?.addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    input.value = "";
    await transcribe(file, board, "file");
  });

  micButton?.addEventListener("click", async () => {
    if (recorder?.state === "recording") {
      recorder.stop();
      micButton.classList.remove("recording");
      micButton.textContent = "Записать с микрофона";
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      const status = board.querySelector('[data-sound="capture-status"]');
      status.className = "sound-status error";
      status.textContent = "Браузер не поддерживает MediaRecorder.";
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder = new MediaRecorder(stream);
      chunks = [];
      recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        const mime = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunks, { type: mime });
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;
        trace("audio.record.finish", { size_bytes: blob.size, content_type: mime });
        await transcribe(new File([blob], "microphone.webm", { type: mime }), board, "microphone");
      };
      recorder.start();
      micButton.classList.add("recording");
      micButton.textContent = "Остановить запись";
      trace("audio.record.start", {});
    } catch (error) {
      const status = board.querySelector('[data-sound="capture-status"]');
      status.className = "sound-status error";
      status.textContent = "Не удалось получить доступ к микрофону.";
      trace("audio.record.error", { error: String(error.message || error).slice(0, 220) });
    }
  });

  board.querySelector('[data-action="insert"]')?.addEventListener("click", (event) => {
    const text = String(event.currentTarget.dataset.transcript || "").trim();
    if (!text) return;
    const target = board.querySelector('[data-sound="target"]')?.value || "development";
    const index = { introduction: 0, development: 1, finale: 2 }[target] ?? 1;
    const area = scriptTextAreas()[index];
    if (!area) return;
    const next = [String(area.value || "").trim(), text].filter(Boolean).join("\n\n");
    nativeTextareaSet(area, next);
    trace("audio.transcript.insert", { target_section: target, transcript_length: text.length });
    const status = board.querySelector('[data-sound="capture-status"]');
    status.className = "sound-status ready";
    status.textContent = `Расшифровка вставлена в раздел «${target}».`;
  });
}

function previewVoice(character, presetId) {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
  const preset = VOICE_PRESETS[presetId] || VOICE_PRESETS.woman;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(`Это голос персонажа ${character.name || "герой"}.`);
  utterance.lang = "ru-RU";
  utterance.rate = preset.rate;
  utterance.pitch = preset.pitch;
  const voices = window.speechSynthesis.getVoices();
  const russian = voices.filter((voice) => voice.lang?.toLowerCase().startsWith("ru"));
  utterance.voice = russian[0] || voices[0] || null;
  window.speechSynthesis.speak(utterance);
  trace("audio.voice.preview", { character_id: character.id || character.name, preset: presetId });
}

function refreshVoiceBible(board) {
  const holder = board.querySelector('[data-sound="voices"]');
  if (!holder) return;
  holder.replaceChildren();
  const chars = characters();
  const assignments = readJson(AUDIO_BIBLE_KEY, {});
  if (!chars.length) {
    holder.innerHTML = `<div style="color:#70839c;font-size:10px">Персонажи ещё не заведены. Добавьте их во вкладке «Персонажи» — здесь автоматически появятся голосовые профили.</div>`;
    return;
  }
  chars.forEach((character, index) => {
    const id = character.id || `char-${index + 1}`;
    const saved = assignments[id] || {};
    const row = document.createElement("div");
    row.className = "sound-voice-row";
    row.innerHTML = `<div><b></b><small></small></div><select></select><button type="button">▶ Проверить</button>`;
    row.querySelector("b").textContent = character.name || id;
    row.querySelector("small").textContent = id;
    const select = row.querySelector("select");
    for (const [presetId, preset] of Object.entries(VOICE_PRESETS)) {
      const option = document.createElement("option");
      option.value = presetId;
      option.textContent = preset.label;
      select.appendChild(option);
    }
    select.value = saved.preset || (index % 2 ? "man" : "woman");
    select.addEventListener("change", () => {
      const current = readJson(AUDIO_BIBLE_KEY, {});
      current[id] = { preset: select.value, character_name: character.name || id, updated_at: new Date().toISOString() };
      writeJson(AUDIO_BIBLE_KEY, current);
      trace("audio.voice.assign", { character_id: id, preset: select.value });
      refreshTimeline(board);
    });
    row.querySelector("button").addEventListener("click", () => previewVoice({ ...character, id }, select.value));
    holder.appendChild(row);
  });
}

function refreshScenePlan(board) {
  const holder = board.querySelector('[data-sound="scenes"]');
  if (!holder) return;
  holder.replaceChildren();
  const scenes = sceneDescriptors();
  const plan = readJson(AUDIO_SCENES_KEY, {});
  if (!scenes.length) {
    holder.innerHTML = `<div style="color:#70839c;font-size:10px">Нет текста — звуковые сцены появятся после заполнения произведения.</div>`;
    refreshTimeline(board);
    return;
  }
  scenes.slice(0, 30).forEach((scene) => {
    const data = plan[scene.id] || {};
    const row = document.createElement("div");
    row.className = "sound-scene-row";
    row.innerHTML = `<span></span><input data-field="ambience" placeholder="атмосфера: дождь, вокзал, лес…"><input data-field="sfx" placeholder="SFX: шаги, дверь, выстрел…"><input data-field="music" placeholder="музыка: тема/настроение…">`;
    row.querySelector("span").textContent = `${scene.id} · ${scene.section}`;
    for (const field of ["ambience", "sfx", "music"]) {
      const input = row.querySelector(`[data-field="${field}"]`);
      input.value = data[field] || "";
      input.addEventListener("change", () => {
        const current = readJson(AUDIO_SCENES_KEY, {});
        current[scene.id] = { ...(current[scene.id] || {}), [field]: input.value.trim(), updated_at: new Date().toISOString() };
        writeJson(AUDIO_SCENES_KEY, current);
        trace("audio.scene.plan", { scene_id: scene.id, field, has_value: Boolean(input.value.trim()) });
        refreshTimeline(board);
      });
    }
    holder.appendChild(row);
  });
  refreshTimeline(board);
}

function refreshTimeline(board) {
  const holder = board.querySelector('[data-sound="timeline"]');
  if (!holder) return;
  holder.replaceChildren();
  const scenes = sceneDescriptors();
  const plan = readJson(AUDIO_SCENES_KEY, {});
  const assignments = readJson(AUDIO_BIBLE_KEY, {});
  const tracks = [
    ["NARRATOR", () => true],
    ["DIALOGUE", () => Object.keys(assignments).length > 0],
    ["AMBIENCE", (scene) => Boolean(plan[scene.id]?.ambience)],
    ["SFX", (scene) => Boolean(plan[scene.id]?.sfx)],
    ["MUSIC", (scene) => Boolean(plan[scene.id]?.music)],
  ];
  for (const [label, hasClip] of tracks) {
    const trackLabel = document.createElement("div");
    trackLabel.className = "sound-track-label";
    trackLabel.textContent = label;
    const track = document.createElement("div");
    track.className = "sound-track";
    scenes.slice(0, 20).forEach((scene) => {
      const clip = document.createElement("div");
      clip.className = `sound-clip${hasClip(scene) ? "" : " muted"}`;
      clip.textContent = scene.id;
      track.appendChild(clip);
    });
    holder.append(trackLabel, track);
  }
}

function refreshBoard(board) {
  refreshHealth(board);
  refreshVoiceBible(board);
  refreshScenePlan(board);
  const existing = document.querySelector(".voice-studio");
  if (existing && !existing.dataset.soundEngineeringLinked) {
    existing.dataset.soundEngineeringLinked = "1";
    trace("audio.voice-studio.linked", { roles: 4 });
  }
}

function ensureUnderhoodAudio(root) {
  const drawer = root.querySelector(".bookcraft-underhood");
  if (!drawer || drawer.querySelector(".bookcraft-underhood-audio")) return;
  const note = document.createElement("div");
  note.className = "bookcraft-underhood-audio";
  note.innerHTML = `<span>SOUND LAYER</span><b>STT · Voice Bible · Scene Audio · Timeline</b>`;
  drawer.querySelector(".underhood-note")?.insertAdjacentElement("beforebegin", note);
}

function activateSound(root) {
  document.body.dataset.engineeringView = "sound";
  sessionStorage.setItem(VIEW_KEY, "sound");
  for (const button of root.querySelectorAll(".engineering-view-tabs button")) {
    button.classList.toggle("active", button.dataset.view === "sound");
  }
  const board = buildBoard(root);
  refreshBoard(board);
  trace("page.engineering.view", { page: "PAGE 3E · SOUND ENGINEERING", view: "sound" });
}

function ensureSoundTab(root) {
  const tabs = root.querySelector(".engineering-view-tabs");
  if (!tabs || tabs.querySelector('[data-view="sound"]')) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.view = "sound";
  button.textContent = "Звук";
  button.addEventListener("click", () => activateSound(root));
  const video = tabs.querySelector('[data-view="video"]');
  if (video) tabs.insertBefore(button, video); else tabs.appendChild(button);
}

function enhance() {
  const root = document.querySelector(".workspace-shell");
  if (!root) return;
  ensureSoundTab(root);
  buildBoard(root);
  ensureUnderhoodAudio(root);
  if (sessionStorage.getItem(VIEW_KEY) === "sound" && document.body.dataset.engineeringView !== "sound") activateSound(root);
}

export function mountSoundEngineeringUi() {
  injectStyles();
  const observer = new MutationObserver(enhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setInterval(() => {
    const root = document.querySelector(".workspace-shell");
    const board = root?.querySelector(".engineering-sound-board");
    if (board && document.body.dataset.engineeringView === "sound") refreshBoard(board);
  }, 4000);
  enhance();
}

export const SOUND_ENGINEERING_KEYS = {
  voiceBible: AUDIO_BIBLE_KEY,
  scenePlan: AUDIO_SCENES_KEY,
  transcripts: AUDIO_TRANSCRIPTS_KEY,
};
