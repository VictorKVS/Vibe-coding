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

function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} Б`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} КБ`;
  return `${(value / 1024 / 1024).toFixed(1)} МБ`;
}

function injectStyles() {
  if (document.getElementById("bookcraft-sound-quick-style")) return;
  const style = document.createElement("style");
  style.id = "bookcraft-sound-quick-style";
  style.textContent = `
    .bookcraft-sound-quick{display:flex;align-items:center;gap:6px;margin-left:6px}
    .bookcraft-sound-quick button{border:1px solid rgba(255,255,255,.11);border-radius:10px;padding:7px 10px;background:rgba(255,255,255,.045);color:#d9e5f4;cursor:pointer;font-size:11px;white-space:nowrap;transition:.16s ease}
    .bookcraft-sound-quick button:hover{border-color:rgba(100,180,255,.36);background:rgba(80,135,210,.11);transform:translateY(-1px)}
    .bookcraft-sound-quick button.recording{border-color:rgba(255,105,115,.5);color:#ffc2c7;background:rgba(190,65,75,.13)}

    .bookcraft-sound-popover{position:fixed;right:22px;top:72px;z-index:10120;width:min(760px,calc(100vw - 30px));max-height:calc(100vh - 94px);overflow:auto;padding:0;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:linear-gradient(165deg,rgba(10,16,27,.995),rgba(7,12,20,.995));box-shadow:0 36px 100px rgba(0,0,0,.6),0 0 0 1px rgba(115,170,255,.035) inset;color:#e8eff9;display:none}
    .bookcraft-sound-popover.open{display:block}
    .premium-recorder-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:18px 20px 12px;border-bottom:1px solid rgba(255,255,255,.07)}
    .premium-recorder-head .kicker{display:block;color:#7392b8;font-size:9px;letter-spacing:.16em;text-transform:uppercase;margin-bottom:4px}.premium-recorder-head h3{margin:0;font-size:20px}.premium-recorder-head p{margin:5px 0 0;color:#74879e;font-size:10px}.premium-recorder-head>button{border:0;background:transparent;color:#b9c7d8;font-size:26px;cursor:pointer}
    .premium-recorder-health{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:5px 8px;border-radius:999px;border:1px solid rgba(95,190,145,.18);background:rgba(60,155,105,.07);color:#9fdcb8;font-size:9px}.premium-recorder-health i{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 10px currentColor}

    .premium-recorder-stage{padding:18px 20px 12px}.premium-wave-wrap{position:relative;height:190px;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.075);background:radial-gradient(circle at 50% 110%,rgba(95,140,220,.11),transparent 48%),linear-gradient(180deg,#0a111c,#08101a)}
    .premium-wave-wrap canvas{position:absolute;inset:0;width:100%;height:100%}.premium-wave-grid{position:absolute;inset:0;pointer-events:none;background:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:100% 38px,64px 100%}
    .premium-wave-center{position:absolute;left:50%;top:12px;bottom:12px;width:1px;background:rgba(255,255,255,.14);pointer-events:none}.premium-wave-center:after{content:"";position:absolute;top:-2px;left:-3px;width:7px;height:7px;border-radius:50%;background:#d9e6f6}
    .premium-timer{position:absolute;left:18px;top:14px;z-index:2;padding:6px 9px;border-radius:9px;background:rgba(4,8,14,.58);backdrop-filter:blur(8px);font:700 22px/1 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.04em}.premium-timer small{display:block;margin-top:3px;color:#6f8299;font:9px/1.2 Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}
    .premium-file-meta{position:absolute;right:16px;top:16px;z-index:2;text-align:right}.premium-file-meta strong{display:block;font-size:10px;max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.premium-file-meta span{display:block;margin-top:3px;color:#6e8098;font-size:9px}

    .premium-level{display:grid;grid-template-columns:92px 1fr 48px;gap:9px;align-items:center;margin:12px 2px 0}.premium-level label{color:#74879d;font-size:9px;text-transform:uppercase;letter-spacing:.12em}.premium-level-track{display:grid;grid-template-columns:repeat(24,1fr);gap:3px}.premium-level-track i{height:8px;border-radius:3px;background:rgba(255,255,255,.055);transition:.08s linear}.premium-level-track i.on{background:linear-gradient(90deg,#63c58b,#b3d65e)}.premium-level-track i.hot{background:linear-gradient(90deg,#e6c34f,#ed784e)}.premium-level output{font:10px ui-monospace,monospace;color:#8fa2b9;text-align:right}

    .premium-transport{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:18px;padding:14px 20px 20px}.premium-side-controls{display:flex;gap:8px;align-items:center}.premium-side-controls.right{justify-content:flex-end}.premium-side-controls button{min-width:74px;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:9px 10px;background:rgba(255,255,255,.04);color:#cdd8e7;cursor:pointer;font-size:10px}.premium-side-controls button:disabled{opacity:.35;cursor:not-allowed}.premium-side-controls button.active{border-color:rgba(255,200,95,.35);color:#f5d798;background:rgba(195,145,55,.09)}
    .premium-record-button{width:86px;height:86px;border-radius:50%;border:1px solid rgba(255,255,255,.13);background:radial-gradient(circle at 35% 30%,#ff6b70,#d92f3c 66%,#931c28);box-shadow:0 0 0 9px rgba(255,255,255,.035),0 13px 40px rgba(210,40,55,.34),inset 0 1px 2px rgba(255,255,255,.35);color:white;cursor:pointer;display:grid;place-items:center;font-size:0;transition:.16s ease}.premium-record-button:before{content:"";width:28px;height:28px;border-radius:50%;background:white}.premium-record-button.recording:before{border-radius:6px;width:25px;height:25px}.premium-record-button:hover{transform:scale(1.025)}
    .premium-record-caption{text-align:center;margin-top:11px;color:#8395aa;font-size:9px;letter-spacing:.08em;text-transform:uppercase}

    .premium-preview{display:none;margin:0 20px 16px;padding:12px;border:1px solid rgba(255,255,255,.075);border-radius:14px;background:rgba(255,255,255,.025)}.premium-preview.ready{display:block}.premium-preview audio{width:100%;height:36px}.premium-preview-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.premium-preview-actions button{border:1px solid rgba(255,255,255,.11);border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.045);color:#dbe6f4;cursor:pointer;font-size:10px}.premium-preview-actions .primary{border-color:rgba(94,183,255,.36);background:rgba(72,128,205,.14);color:#edf6ff}.premium-preview-actions .danger{border-color:rgba(255,105,115,.22);color:#ffb7bd}

    .premium-transcription{margin:0 20px 20px;border:1px solid rgba(255,255,255,.075);border-radius:16px;overflow:hidden;background:rgba(255,255,255,.025)}.premium-transcription-head{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.06)}.premium-transcription-head strong{font-size:11px}.premium-transcription-head span{color:#6f8299;font-size:9px}.bookcraft-sound-transcript{min-height:110px;max-height:260px;overflow:auto;padding:12px;white-space:pre-wrap;color:#d6e0ee;font-size:11px;line-height:1.58}.bookcraft-sound-transcript.empty{color:#64768c}.premium-insert-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:11px 12px;border-top:1px solid rgba(255,255,255,.06)}.premium-insert-row select,.premium-insert-row button{border:1px solid rgba(255,255,255,.11);border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.05);color:#e3ecf8;font-size:10px}.premium-insert-row button{cursor:pointer}.premium-insert-row button.primary{border-color:rgba(100,180,255,.36);background:rgba(75,130,205,.14)}.premium-insert-row button:disabled{opacity:.35;cursor:not-allowed}
    .bookcraft-sound-quick-status{padding:0 12px 12px;min-height:16px;color:#8093aa;font-size:9px}.bookcraft-sound-quick-status.error{color:#ffadb5}.bookcraft-sound-quick-status.ready{color:#9ce0bb}.bookcraft-sound-quick-status.busy{color:#d9c27b}
    .premium-recorder-foot{display:flex;justify-content:space-between;gap:12px;padding:10px 20px 15px;border-top:1px solid rgba(255,255,255,.055);color:#65788f;font-size:9px}.premium-recorder-foot b{color:#8ea1b8}

    @media(max-width:900px){.bookcraft-sound-quick{display:none}.bookcraft-sound-popover{top:12px;right:12px;left:12px;width:auto;max-height:calc(100vh - 24px)}.premium-transport{grid-template-columns:1fr}.premium-side-controls,.premium-side-controls.right{justify-content:center}.premium-record-wrap{grid-row:1}.premium-recorder-foot{flex-direction:column}.premium-file-meta{max-width:42%}}
  `;
  document.head.appendChild(style);
}

function setStatus(popover, text, kind = "") {
  const status = popover.querySelector(".bookcraft-sound-quick-status");
  status.className = `bookcraft-sound-quick-status ${kind}`.trim();
  status.textContent = text;
}

function setFileMeta(popover, file, durationSeconds = null) {
  const name = popover.querySelector('[data-recorder="file-name"]');
  const meta = popover.querySelector('[data-recorder="file-meta"]');
  if (name) name.textContent = file?.name || "Новая запись";
  if (meta) {
    const duration = durationSeconds == null ? "" : ` · ${formatDuration(durationSeconds)}`;
    meta.textContent = file ? `${formatBytes(file.size)}${duration}` : "локальная запись";
  }
}

function drawIdleWave(popover) {
  const canvas = popover.querySelector('[data-recorder="wave"]');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  const center = rect.height / 2;
  ctx.strokeStyle = "rgba(118,153,197,.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x <= rect.width; x += 4) {
    const envelope = Math.sin((x / Math.max(1, rect.width)) * Math.PI);
    const y = center + Math.sin(x * 0.065) * 8 * envelope + Math.sin(x * 0.019) * 4;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function updateLevel(popover, value) {
  const normalized = Math.max(0, Math.min(1, Number(value) || 0));
  const bars = Array.from(popover.querySelectorAll(".premium-level-track i"));
  const lit = Math.round(normalized * bars.length);
  bars.forEach((bar, index) => {
    bar.classList.toggle("on", index < lit);
    bar.classList.toggle("hot", index < lit && index >= Math.floor(bars.length * .78));
  });
  const output = popover.querySelector('[data-recorder="level"]');
  if (output) output.textContent = `${Math.round(normalized * 100)}%`;
}

function stopVisualizer(popover) {
  const state = popover._recorderState;
  if (!state) return;
  if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
  state.animationFrame = null;
  try { state.audioContext?.close?.(); } catch {}
  state.audioContext = null;
  state.analyser = null;
  updateLevel(popover, 0);
  drawIdleWave(popover);
}

function startVisualizer(popover, stream) {
  stopVisualizer(popover);
  const state = popover._recorderState;
  const canvas = popover.querySelector('[data-recorder="wave"]');
  if (!canvas || !state) return;
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return;
  try {
    const context = new AudioContextCtor();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = .76;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);
    state.audioContext = context;
    state.analyser = analyser;
    const data = new Uint8Array(analyser.fftSize);

    const draw = () => {
      if (!state.analyser) return;
      analyser.getByteTimeDomainData(data);
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      if (canvas.width !== Math.floor(rect.width * ratio) || canvas.height !== Math.floor(rect.height * ratio)) {
        canvas.width = Math.max(1, Math.floor(rect.width * ratio));
        canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      }
      const ctx = canvas.getContext("2d");
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      const center = rect.height / 2;
      let power = 0;
      ctx.beginPath();
      for (let index = 0; index < data.length; index += 1) {
        const normalized = (data[index] - 128) / 128;
        power += normalized * normalized;
        const x = (index / (data.length - 1)) * rect.width;
        const y = center + normalized * rect.height * .38;
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      const rms = Math.sqrt(power / data.length);
      const level = Math.min(1, rms * 5.3);
      ctx.strokeStyle = level > .78 ? "rgba(240,118,82,.95)" : "rgba(108,201,159,.95)";
      ctx.lineWidth = 2;
      ctx.stroke();
      updateLevel(popover, level);
      state.animationFrame = requestAnimationFrame(draw);
    };
    draw();
  } catch {
    drawIdleWave(popover);
  }
}

async function transcribe(file, popover, source) {
  if (!file) return;
  const transcript = popover.querySelector(".bookcraft-sound-transcript");
  const insert = popover.querySelector('[data-action="insert"]');
  const recognize = popover.querySelector('[data-action="recognize"]');
  setStatus(popover, "Whisper распознаёт аудио…", "busy");
  transcript.textContent = "Распознавание…";
  transcript.classList.remove("empty");
  transcript.dataset.text = "";
  insert.disabled = true;
  recognize.disabled = true;
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
    setStatus(popover, `Готово · ${text.length} символов · ${Math.round((payload.duration_ms || 0) / 1000)} сек обработки`, "ready");
    saveTranscript(text, source, file.name || "microphone");
    trace("audio.quick.stt.ready", { source, text_length: text.length, duration_ms: payload.duration_ms || 0 });
  } catch (error) {
    transcript.textContent = "Расшифровка не получена.";
    transcript.classList.add("empty");
    setStatus(popover, `STT ERROR · ${error.message}`, "error");
    trace("audio.quick.stt.error", { source, error: String(error.message || error).slice(0, 220) });
  } finally {
    recognize.disabled = !popover._recorderState?.currentFile;
  }
}

function setPreview(popover, file, source) {
  const state = popover._recorderState;
  if (!state) return;
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.currentFile = file;
  state.currentSource = source;
  state.previewUrl = URL.createObjectURL(file);
  const preview = popover.querySelector(".premium-preview");
  const audio = popover.querySelector("audio[data-recorder=preview]");
  preview.classList.add("ready");
  audio.src = state.previewUrl;
  audio.load();
  popover.querySelector('[data-action="recognize"]').disabled = false;
  popover.querySelector('[data-action="delete-audio"]').disabled = false;
  setFileMeta(popover, file);
  audio.onloadedmetadata = () => setFileMeta(popover, file, Number.isFinite(audio.duration) ? audio.duration : null);
  drawIdleWave(popover);
}

function clearPreview(popover) {
  const state = popover._recorderState;
  if (!state) return;
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.previewUrl = "";
  state.currentFile = null;
  state.currentSource = "";
  const preview = popover.querySelector(".premium-preview");
  const audio = popover.querySelector("audio[data-recorder=preview]");
  preview.classList.remove("ready");
  audio.removeAttribute("src");
  audio.load();
  popover.querySelector('[data-action="recognize"]').disabled = true;
  popover.querySelector('[data-action="delete-audio"]').disabled = true;
  popover.querySelector(".bookcraft-sound-transcript").textContent = "После распознавания здесь появится текст.";
  popover.querySelector(".bookcraft-sound-transcript").dataset.text = "";
  popover.querySelector(".bookcraft-sound-transcript").classList.add("empty");
  popover.querySelector('[data-action="insert"]').disabled = true;
  setFileMeta(popover, null);
  setStatus(popover, "Готов к новой записи.");
  drawIdleWave(popover);
}

function buildPopover() {
  let popover = document.querySelector(".bookcraft-sound-popover");
  if (popover) return popover;
  popover = document.createElement("aside");
  popover.className = "bookcraft-sound-popover";
  popover.innerHTML = `
    <div class="premium-recorder-head">
      <div>
        <span class="kicker">BOOK·CRAFT VOICE STUDIO</span>
        <h3>Премиум-диктофон</h3>
        <p>Запись → прослушивание → локальный Whisper → текст произведения</p>
        <span class="premium-recorder-health"><i></i> LOCAL · PRIVATE · WHISPER</span>
      </div>
      <button type="button" aria-label="Закрыть">×</button>
    </div>

    <section class="premium-recorder-stage">
      <div class="premium-wave-wrap">
        <canvas data-recorder="wave"></canvas>
        <div class="premium-wave-grid"></div>
        <div class="premium-wave-center"></div>
        <div class="premium-timer"><span data-recorder="timer">00:00</span><small data-recorder="state">готов к записи</small></div>
        <div class="premium-file-meta"><strong data-recorder="file-name">Новая запись</strong><span data-recorder="file-meta">локальная запись</span></div>
      </div>
      <div class="premium-level">
        <label>Уровень голоса</label>
        <div class="premium-level-track">${Array.from({ length: 24 }, () => "<i></i>").join("")}</div>
        <output data-recorder="level">0%</output>
      </div>
    </section>

    <section class="premium-transport">
      <div class="premium-side-controls">
        <button type="button" data-action="pause" disabled>Ⅱ Пауза</button>
        <button type="button" data-action="upload-audio">↑ MP3 / аудио</button>
        <input data-sound="quick-file" type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/ogg,audio/webm,.mp3,.wav,.m4a,.ogg,.webm" hidden />
      </div>
      <div class="premium-record-wrap">
        <button type="button" class="premium-record-button" data-action="record" aria-label="Начать запись"></button>
        <div class="premium-record-caption" data-recorder="caption">Начать запись</div>
      </div>
      <div class="premium-side-controls right">
        <button type="button" data-action="recognize" disabled>✦ Распознать</button>
        <button type="button" data-action="sound-tab">Sound Engineering</button>
      </div>
    </section>

    <section class="premium-preview">
      <audio data-recorder="preview" controls preload="metadata"></audio>
      <div class="premium-preview-actions">
        <button type="button" class="primary" data-action="recognize">✦ Распознать Whisper</button>
        <button type="button" class="danger" data-action="delete-audio">Удалить запись</button>
      </div>
    </section>

    <section class="premium-transcription">
      <div class="premium-transcription-head"><strong>Расшифровка</strong><span>проверяйте текст перед вставкой</span></div>
      <div class="bookcraft-sound-transcript empty">После распознавания здесь появится текст.</div>
      <div class="premium-insert-row">
        <select data-sound="target">
          <option value="whole">Добавить как рассказ целиком</option>
          <option value="scene">Добавить как новую сцену</option>
          <option value="introduction">Во вступление</option>
          <option value="development">В развитие</option>
          <option value="finale">В финал</option>
        </select>
        <button type="button" class="primary" data-action="insert" disabled>Вставить в произведение</button>
      </div>
      <div class="bookcraft-sound-quick-status">Готов к новой записи.</div>
    </section>

    <footer class="premium-recorder-foot"><span><b>Приватность:</b> аудио обрабатывается локальным Whisper.</span><span><b>TRACE:</b> фиксируются только размер, формат, время и результат; аудио и текст не журналируются.</span></footer>`;

  document.body.appendChild(popover);
  popover._recorderState = {
    recorder: null,
    stream: null,
    chunks: [],
    startedAt: 0,
    elapsedBeforePause: 0,
    timer: null,
    audioContext: null,
    analyser: null,
    animationFrame: null,
    currentFile: null,
    currentSource: "",
    previewUrl: "",
  };

  popover.querySelector(".premium-recorder-head>button")?.addEventListener("click", () => popover.classList.remove("open"));
  popover.querySelector('[data-action="insert"]')?.addEventListener("click", () => {
    const text = String(popover.querySelector(".bookcraft-sound-transcript")?.dataset.text || "").trim();
    if (!text) return;
    const target = popover.querySelector('[data-sound="target"]')?.value || "whole";
    const result = insertTranscript(text, target);
    setStatus(popover, result.result, result.ok ? "ready" : "error");
    trace("audio.quick.insert", { target, ok: result.ok, text_length: text.length });
  });
  popover.querySelectorAll('[data-action="sound-tab"]').forEach((button) => button.addEventListener("click", () => {
    document.querySelector('.engineering-view-tabs button[data-view="sound"]')?.click();
    popover.classList.remove("open");
  }));
  popover.querySelectorAll('[data-action="recognize"]').forEach((button) => button.addEventListener("click", async () => {
    const state = popover._recorderState;
    if (!state?.currentFile) return;
    await transcribe(state.currentFile, popover, state.currentSource || "file");
  }));
  popover.querySelector('[data-action="delete-audio"]')?.addEventListener("click", () => {
    clearPreview(popover);
    trace("audio.quick.preview.delete", {});
  });
  drawIdleWave(popover);
  return popover;
}

function updateRecorderClock(popover) {
  const state = popover._recorderState;
  if (!state) return;
  const now = Date.now();
  const elapsed = state.elapsedBeforePause + (state.startedAt ? now - state.startedAt : 0);
  const timer = popover.querySelector('[data-recorder="timer"]');
  if (timer) timer.textContent = formatDuration(elapsed / 1000);
}

function startClock(popover) {
  const state = popover._recorderState;
  if (!state) return;
  clearInterval(state.timer);
  updateRecorderClock(popover);
  state.timer = window.setInterval(() => updateRecorderClock(popover), 250);
}

function stopClock(popover) {
  const state = popover._recorderState;
  if (!state) return;
  clearInterval(state.timer);
  state.timer = null;
  updateRecorderClock(popover);
}

async function startRecording(popover, externalButton = null) {
  const state = popover._recorderState;
  if (!state) return;
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    setStatus(popover, "Браузер не поддерживает запись с микрофона.", "error");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
    const mime = mimeCandidates.find((item) => MediaRecorder.isTypeSupported?.(item)) || "";
    const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    state.stream = stream;
    state.recorder = recorder;
    state.chunks = [];
    state.startedAt = Date.now();
    state.elapsedBeforePause = 0;
    recorder.ondataavailable = (event) => { if (event.data?.size) state.chunks.push(event.data); };
    recorder.onstop = () => {
      stopClock(popover);
      stopVisualizer(popover);
      state.stream?.getTracks?.().forEach((track) => track.stop());
      const finalMime = recorder.mimeType || "audio/webm";
      const blob = new Blob(state.chunks, { type: finalMime });
      const extension = finalMime.includes("ogg") ? "ogg" : "webm";
      const file = new File([blob], `dictation-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`, { type: finalMime });
      setPreview(popover, file, "microphone");
      const recordButton = popover.querySelector('[data-action="record"]');
      const caption = popover.querySelector('[data-recorder="caption"]');
      const recorderState = popover.querySelector('[data-recorder="state"]');
      recordButton.classList.remove("recording");
      recordButton.setAttribute("aria-label", "Начать новую запись");
      caption.textContent = "Новая запись";
      recorderState.textContent = "запись готова";
      popover.querySelector('[data-action="pause"]').disabled = true;
      popover.querySelector('[data-action="pause"]').classList.remove("active");
      popover.querySelector('[data-action="pause"]').textContent = "Ⅱ Пауза";
      if (externalButton) {
        externalButton.classList.remove("recording");
        externalButton.textContent = "🎙 Диктовать";
      }
      setStatus(popover, `Запись готова · ${formatBytes(file.size)}. Прослушайте или распознайте Whisper.`, "ready");
      trace("audio.quick.record.finish", { size_bytes: file.size, content_type: finalMime, duration_ms: state.elapsedBeforePause });
      state.recorder = null;
      state.stream = null;
      state.chunks = [];
      state.startedAt = 0;
      state.elapsedBeforePause = 0;
    };
    recorder.start(500);
    clearPreview(popover);
    state.startedAt = Date.now();
    state.elapsedBeforePause = 0;
    startClock(popover);
    startVisualizer(popover, stream);
    const recordButton = popover.querySelector('[data-action="record"]');
    const caption = popover.querySelector('[data-recorder="caption"]');
    const recorderState = popover.querySelector('[data-recorder="state"]');
    recordButton.classList.add("recording");
    recordButton.setAttribute("aria-label", "Остановить запись");
    caption.textContent = "Остановить";
    recorderState.textContent = "идёт запись";
    popover.querySelector('[data-action="pause"]').disabled = false;
    if (externalButton) {
      externalButton.classList.add("recording");
      externalButton.textContent = "■ Остановить";
    }
    setStatus(popover, "Запись идёт. Говорите обычным голосом; индикатор показывает реальный уровень микрофона.", "busy");
    trace("audio.quick.record.start", { content_type: recorder.mimeType || "unknown" });
  } catch (error) {
    setStatus(popover, "Не удалось включить микрофон. Разрешите доступ браузеру.", "error");
    trace("audio.quick.record.error", { error: String(error.message || error).slice(0, 220) });
  }
}

function stopRecording(popover) {
  const state = popover._recorderState;
  if (state?.recorder?.state === "recording" || state?.recorder?.state === "paused") {
    if (state.startedAt) state.elapsedBeforePause += Date.now() - state.startedAt;
    state.startedAt = 0;
    state.recorder.stop();
  }
}

function togglePause(popover) {
  const state = popover._recorderState;
  const button = popover.querySelector('[data-action="pause"]');
  const label = popover.querySelector('[data-recorder="state"]');
  if (!state?.recorder) return;
  if (state.recorder.state === "recording") {
    state.elapsedBeforePause += Date.now() - state.startedAt;
    state.startedAt = 0;
    state.recorder.pause();
    button.classList.add("active");
    button.textContent = "▶ Продолжить";
    label.textContent = "пауза";
    stopClock(popover);
    trace("audio.quick.record.pause", { duration_ms: state.elapsedBeforePause });
  } else if (state.recorder.state === "paused") {
    state.recorder.resume();
    state.startedAt = Date.now();
    button.classList.remove("active");
    button.textContent = "Ⅱ Пауза";
    label.textContent = "идёт запись";
    startClock(popover);
    trace("audio.quick.record.resume", { duration_ms: state.elapsedBeforePause });
  }
}

function buildQuickControls(root) {
  const ribbon = root.querySelector(".bookcraft-engineering-ribbon");
  if (!ribbon || ribbon.querySelector(".bookcraft-sound-quick")) return;
  const underhood = ribbon.querySelector(".engineering-underhood-button");
  const quick = document.createElement("div");
  quick.className = "bookcraft-sound-quick";
  quick.innerHTML = `<button type="button" data-action="quick-mic">🎙 Диктовать</button><button type="button" data-action="quick-file">⬆ Рассказ MP3</button>`;
  underhood?.insertAdjacentElement("beforebegin", quick);

  const popover = buildPopover();
  const embeddedInput = popover.querySelector('[data-sound="quick-file"]');
  const fileButton = quick.querySelector('[data-action="quick-file"]');
  const micButton = quick.querySelector('[data-action="quick-mic"]');
  const recordButton = popover.querySelector('[data-action="record"]');
  const pauseButton = popover.querySelector('[data-action="pause"]');
  const uploadButton = popover.querySelector('[data-action="upload-audio"]');

  fileButton?.addEventListener("click", () => {
    popover.classList.add("open");
    embeddedInput?.click();
  });
  uploadButton?.addEventListener("click", () => embeddedInput?.click());
  embeddedInput?.addEventListener("change", () => {
    const file = embeddedInput.files?.[0];
    embeddedInput.value = "";
    if (!file) return;
    popover.classList.add("open");
    clearPreview(popover);
    setPreview(popover, file, "file");
    setStatus(popover, `Аудиофайл загружен · ${formatBytes(file.size)}. Прослушайте или нажмите «Распознать Whisper».`, "ready");
    trace("audio.quick.file.ready", { size_bytes: file.size, content_type: file.type || "unknown" });
  });

  micButton?.addEventListener("click", async () => {
    popover.classList.add("open");
    const state = popover._recorderState;
    if (state?.recorder?.state === "recording" || state?.recorder?.state === "paused") stopRecording(popover);
    else await startRecording(popover, micButton);
  });
  recordButton?.addEventListener("click", async () => {
    const state = popover._recorderState;
    if (state?.recorder?.state === "recording" || state?.recorder?.state === "paused") stopRecording(popover);
    else await startRecording(popover, micButton);
  });
  pauseButton?.addEventListener("click", () => togglePause(popover));
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
