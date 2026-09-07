const STT_API = "http://127.0.0.1:8018/api/stt/transcribe";
const TRACE_API = "http://127.0.0.1:8018/api/trace/ui-event";
const TRANSCRIPTS_KEY = "bookcraft.audio.transcripts.v1";

function trace(event, data = {}) {
  fetch(TRACE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, source: "sound-quick-capture", data }),
  }).catch(() => {});
}

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}

function saveTranscript(text, source, name) {
  const current = readJson(TRANSCRIPTS_KEY, []);
  const items = Array.isArray(current) ? current : [];
  items.push({
    id: `audio-${Date.now()}`,
    source,
    name,
    text,
    created_at: new Date().toISOString(),
  });
  localStorage.setItem(TRANSCRIPTS_KEY, JSON.stringify(items.slice(-100)));
}

function setTextareaValue(area, value) {
  if (!area) return false;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(area, value);
  area.dispatchEvent(new Event("input", { bubbles: true }));
  area.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function scriptAreas() {
  return Array.from(document.querySelectorAll(".script-block textarea"));
}

function appendText(area, text, separator = "\n\n") {
  if (!area) return false;
  const current = String(area.value || "").trim();
  return setTextareaValue(area, current ? `${current}${separator}${text}` : text);
}

function insertTranscript(text, target) {
  const areas = scriptAreas();
  if (!areas.length) return { ok: false, result: "Редактор текста ещё не готов." };

  if (target === "whole") {
    const hasText = areas.some((area) => String(area.value || "").trim());
    const area = hasText ? (areas[1] || areas[0]) : areas[0];
    appendText(area, text);
    return { ok: true, result: hasText ? "Рассказ добавлен к текущему произведению." : "Рассказ добавлен как черновик произведения." };
  }

  if (target === "scene") {
    appendText(areas[1] || areas[0], text, "\n\n");
    return { ok: true, result: "Расшифровка добавлена как новая черновая сцена." };
  }

  const index = { introduction: 0, development: 1, finale: 2 }[target] ?? 1;
  appendText(areas[index] || areas[0], text);
  return { ok: true, result: "Расшифровка вставлена в выбранную часть произведения." };
}

function injectStyles() {
  if (document.getElementById("bookcraft-sound-quick-style")) return;
  const style = document.createElement("style");
  style.id = "bookcraft-sound-quick-style";
  style.textContent = `
    .bookcraft-sound-quick{display:flex;align-items:center;gap:6px;margin-left:6px}
    .bookcraft-sound-quick button{border:1px solid rgba(255,255,255,.11);border-radius:9px;padding:7px 9px;background:rgba(255,255,255,.045);color:#d9e5f4;cursor:pointer;font-size:11px;white-space:nowrap}
    .bookcraft-sound-quick button:hover{border-color:rgba(100,180,255,.36);background:rgba(80,135,210,.11)}
    .bookcraft-sound-quick button.recording{border-color:rgba(255,105,115,.5);color:#ffc2c7;background:rgba(190,65,75,.13)}
    .bookcraft-sound-popover{position:fixed;right:22px;top:116px;z-index:10120;width:min(520px,calc(100vw - 30px));padding:14px;border:1px solid rgba(255,255,255,.11);border-radius:16px;background:rgba(9,15,25,.98);box-shadow:0 22px 70px rgba(0,0,0,.42);color:#e8eff9;display:none}
    .bookcraft-sound-popover.open{display:block}.bookcraft-sound-popover header{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.bookcraft-sound-popover h3{margin:0;font-size:15px}.bookcraft-sound-popover header span{display:block;color:#7c8fa8;font-size:9px;margin-top:2px}.bookcraft-sound-popover header button{border:0;background:transparent;color:#b9c7d8;font-size:22px;cursor:pointer}
    .bookcraft-sound-transcript{margin:10px 0;min-height:88px;max-height:230px;overflow:auto;padding:10px;border-radius:11px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);white-space:pre-wrap;color:#d6e0ee;font-size:11px;line-height:1.5}.bookcraft-sound-transcript.empty{color:#6f8299}
    .bookcraft-sound-popover .row{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.bookcraft-sound-popover select,.bookcraft-sound-popover .row button{border:1px solid rgba(255,255,255,.11);border-radius:9px;padding:8px 9px;background:rgba(255,255,255,.05);color:#e3ecf8;font-size:10px}.bookcraft-sound-popover .row button{cursor:pointer}.bookcraft-sound-popover .row button.primary{border-color:rgba(100,180,255,.36);background:rgba(75,130,205,.14)}
    .bookcraft-sound-quick-status{margin-top:8px;min-height:16px;color:#8093aa;font-size:9px}.bookcraft-sound-quick-status.error{color:#ffadb5}.bookcraft-sound-quick-status.ready{color:#9ce0bb}
    @media(max-width:900px){.bookcraft-sound-quick{display:none}.bookcraft-sound-popover{top:82px;right:12px}}
  `;
  document.head.appendChild(style);
}

async function transcribe(file, popover, source) {
  if (!file) return;
  const transcript = popover.querySelector(".bookcraft-sound-transcript");
  const status = popover.querySelector(".bookcraft-sound-quick-status");
  const insert = popover.querySelector('[data-action="insert"]');
  status.className = "bookcraft-sound-quick-status";
  status.textContent = "Whisper распознаёт аудио…";
  transcript.textContent = "Распознавание…";
  transcript.classList.remove("empty");
  insert.disabled = true;
  trace("audio.quick.stt.start", { source, size_bytes: file.size, content_type: file.type || "unknown" });
  try {
    const body = new FormData();
    body.append("audio", file, file.name || "microphone.webm");
    const response = await fetch(STT_API, { method: "POST", body });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.detail || `HTTP ${response.status}`);
    const text = String(payload?.transcription || "").trim();
    if (!text) throw new Error("Whisper не вернул текст");
    transcript.textContent = text;
    transcript.dataset.text = text;
    insert.disabled = false;
    status.className = "bookcraft-sound-quick-status ready";
    status.textContent = `Готово · ${text.length} символов`;
    saveTranscript(text, source, file.name || "microphone");
    trace("audio.quick.stt.ready", { source, text_length: text.length });
  } catch (error) {
    transcript.textContent = "Расшифровка не получена.";
    transcript.classList.add("empty");
    status.className = "bookcraft-sound-quick-status error";
    status.textContent = `STT ERROR · ${error.message}`;
    trace("audio.quick.stt.error", { source, error: String(error.message || error).slice(0, 220) });
  }
}

function buildPopover(root) {
  let popover = document.querySelector(".bookcraft-sound-popover");
  if (popover) return popover;
  popover = document.createElement("aside");
  popover.className = "bookcraft-sound-popover";
  popover.innerHTML = `
    <header><div><h3>🎙 Голос → рассказ</h3><span>Диктовка и MP3/WAV/M4A/OGG/WebM → локальный Whisper → текст произведения</span></div><button type="button" aria-label="Закрыть">×</button></header>
    <div class="bookcraft-sound-transcript empty">Здесь появится расшифровка.</div>
    <div class="row">
      <select data-sound="target">
        <option value="whole">Добавить как рассказ целиком</option>
        <option value="scene">Добавить как новую сцену</option>
        <option value="introduction">Во вступление</option>
        <option value="development">В развитие</option>
        <option value="finale">В финал</option>
      </select>
      <button type="button" class="primary" data-action="insert" disabled>Вставить в произведение</button>
      <button type="button" data-action="sound-tab">Открыть Sound Engineering</button>
    </div>
    <div class="bookcraft-sound-quick-status"></div>`;
  document.body.appendChild(popover);
  popover.querySelector("header button")?.addEventListener("click", () => popover.classList.remove("open"));
  popover.querySelector('[data-action="insert"]')?.addEventListener("click", () => {
    const text = String(popover.querySelector(".bookcraft-sound-transcript")?.dataset.text || "").trim();
    if (!text) return;
    const target = popover.querySelector('[data-sound="target"]')?.value || "whole";
    const result = insertTranscript(text, target);
    const status = popover.querySelector(".bookcraft-sound-quick-status");
    status.className = `bookcraft-sound-quick-status ${result.ok ? "ready" : "error"}`;
    status.textContent = result.result;
    trace("audio.quick.insert", { target, ok: result.ok, text_length: text.length });
  });
  popover.querySelector('[data-action="sound-tab"]')?.addEventListener("click", () => {
    document.querySelector('.engineering-view-tabs button[data-view="sound"]')?.click();
    popover.classList.remove("open");
  });
  return popover;
}

function buildQuickControls(root) {
  const ribbon = root.querySelector(".bookcraft-engineering-ribbon");
  if (!ribbon || ribbon.querySelector(".bookcraft-sound-quick")) return;
  const underhood = ribbon.querySelector(".engineering-underhood-button");
  const quick = document.createElement("div");
  quick.className = "bookcraft-sound-quick";
  quick.innerHTML = `
    <input data-sound="quick-file" type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/ogg,audio/webm,.mp3,.wav,.m4a,.ogg,.webm" hidden />
    <button type="button" data-action="quick-mic">🎙 Диктовать</button>
    <button type="button" data-action="quick-file">⬆ Рассказ MP3</button>`;
  underhood?.insertAdjacentElement("beforebegin", quick);

  const popover = buildPopover(root);
  const input = quick.querySelector('[data-sound="quick-file"]');
  const fileButton = quick.querySelector('[data-action="quick-file"]');
  const micButton = quick.querySelector('[data-action="quick-mic"]');
  let recorder = null;
  let stream = null;
  let chunks = [];

  fileButton?.addEventListener("click", () => input?.click());
  input?.addEventListener("change", async () => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    popover.classList.add("open");
    await transcribe(file, popover, "file");
  });

  micButton?.addEventListener("click", async () => {
    if (recorder?.state === "recording") {
      recorder.stop();
      micButton.classList.remove("recording");
      micButton.textContent = "🎙 Диктовать";
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      const status = popover.querySelector(".bookcraft-sound-quick-status");
      popover.classList.add("open");
      status.className = "bookcraft-sound-quick-status error";
      status.textContent = "Браузер не поддерживает запись с микрофона.";
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorder = new MediaRecorder(stream);
      chunks = [];
      recorder.ondataavailable = (event) => { if (event.data?.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        stream?.getTracks?.().forEach((track) => track.stop());
        const mime = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunks, { type: mime });
        const file = new File([blob], "dictation.webm", { type: mime });
        popover.classList.add("open");
        await transcribe(file, popover, "microphone");
      };
      recorder.start();
      micButton.classList.add("recording");
      micButton.textContent = "■ Остановить";
      trace("audio.quick.record.start", {});
    } catch (error) {
      popover.classList.add("open");
      const status = popover.querySelector(".bookcraft-sound-quick-status");
      status.className = "bookcraft-sound-quick-status error";
      status.textContent = "Не удалось включить микрофон. Разрешите доступ браузеру.";
      trace("audio.quick.record.error", { error: String(error.message || error).slice(0, 220) });
    }
  });
}

function enhanceWorkspace() {
  const root = document.querySelector(".workspace-shell");
  if (!root) return;
  buildQuickControls(root);
}

export function mountSoundQuickCapture() {
  injectStyles();
  const observer = new MutationObserver(enhanceWorkspace);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  enhanceWorkspace();
}
