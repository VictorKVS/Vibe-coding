import {
  audioBufferToWavBlob,
  cutSelection,
  drawWaveform,
  formatBytes,
  formatClock,
  preferredMime,
  trimToSelection,
} from "./recorder-audio.js";
import { createRecorderTrace } from "./recorder-trace.js";

const PAGE_ID = "bookcraft-recorder-page-v3";
const STYLE_ID = "bookcraft-recorder-page-v3-style";

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .br-page .br-record{margin-inline:auto}.br-page .br-btn{font-size:12px;min-height:36px}.br-page .br-head p,.br-page .br-sub small,.br-page .br-stt span{font-size:12px;line-height:1.5}.br-page .br-event{font-size:11px}.br-page .br-toast{font-size:13px}.br-page .br-caption,.br-page .br-selection,.br-page .br-meta{font-size:11px}.br-page button:focus-visible{outline:2px solid #7dbbff;outline-offset:3px}.br-page .br-file{min-width:0;max-width:45%}.br-page .br-file strong{max-width:100%}
    .br-launch{position:fixed;right:20px;bottom:20px;z-index:11990;border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:11px 15px;background:linear-gradient(145deg,rgba(18,29,46,.98),rgba(8,14,25,.98));color:#eef5ff;box-shadow:0 18px 55px rgba(0,0,0,.46);font:650 12px Inter,system-ui,sans-serif;cursor:pointer}
    .br-page{position:fixed;inset:0;z-index:12000;display:none;overflow:auto;background:radial-gradient(circle at 20% -10%,rgba(60,120,200,.18),transparent 36%),linear-gradient(180deg,#07101a,#050a12 70%);color:#eef5ff;font-family:Inter,system-ui,sans-serif}.br-page.open{display:block}
    .br-top{position:sticky;top:0;z-index:20;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:12px 18px;border-bottom:1px solid rgba(255,255,255,.07);background:rgba(7,13,23,.92);backdrop-filter:blur(18px)}
    .br-left,.br-right,.br-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.br-right{justify-content:flex-end}.br-title{text-align:center}.br-title strong{display:block;font-size:13px;letter-spacing:.14em}.br-title span{font-size:9px;color:#72859b}
    .br-btn{border:1px solid rgba(255,255,255,.11);border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.045);color:#dae5f3;font-size:10px;cursor:pointer}.br-btn:hover{border-color:rgba(105,175,255,.32);background:rgba(72,128,205,.1)}.br-btn:disabled{opacity:.34;cursor:not-allowed}.br-btn.danger{border-color:rgba(255,102,116,.24);color:#ffb5bd}.br-btn.primary{border-color:rgba(97,177,255,.31);background:rgba(72,129,205,.12)}
    .br-state{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;border:1px solid rgba(96,193,143,.18);background:rgba(56,154,105,.07);color:#9edeb9;font-size:9px}.br-state i{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 10px currentColor}
    .br-shell{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:16px;max-width:1620px;margin:0 auto;padding:18px 20px 34px}.br-main{min-width:0}.br-card{border:1px solid rgba(255,255,255,.075);border-radius:19px;background:linear-gradient(165deg,rgba(16,26,42,.88),rgba(8,14,25,.88));box-shadow:0 18px 60px rgba(0,0,0,.24)}
    .br-wave-card{padding:16px}.br-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:12px}.br-kicker{font-size:9px;color:#7697c1;letter-spacing:.16em}.br-head h1{margin:4px 0;font-size:23px}.br-head p{margin:0;color:#71849b;font-size:10px}.br-file{text-align:right}.br-file strong{display:block;max-width:360px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px}.br-file span{display:block;margin-top:4px;color:#6e8198;font-size:9px}
    .br-wave-wrap{position:relative;height:320px;overflow:hidden;border:1px solid rgba(255,255,255,.08);border-radius:17px;background:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px),radial-gradient(circle at 50% 115%,rgba(70,145,225,.12),transparent 50%),#07111c;background-size:100% 52px,72px 100%,auto,auto;user-select:none}.br-wave-wrap canvas{position:absolute;inset:0;width:100%;height:100%;cursor:crosshair;touch-action:none}.br-empty{position:absolute;inset:0;display:grid;place-items:center;color:#53677f;text-align:center;font-size:11px;pointer-events:none}.br-time{position:absolute;left:14px;top:13px;padding:7px 10px;border-radius:9px;background:rgba(3,8,15,.66);font:700 23px ui-monospace,Consolas,monospace}.br-time small{display:block;margin-top:4px;font:9px Inter,system-ui,sans-serif;color:#70839a;text-transform:uppercase}.br-selection{position:absolute;right:14px;bottom:13px;padding:7px 9px;border-radius:9px;background:rgba(3,8,15,.66);font:9px ui-monospace,Consolas,monospace;color:#91a8c3}
    .br-level{display:grid;grid-template-columns:105px 1fr 50px;gap:10px;align-items:center;margin-top:11px}.br-level label{font-size:9px;color:#74869c;text-transform:uppercase;letter-spacing:.12em}.br-bars{display:grid;grid-template-columns:repeat(30,1fr);gap:3px}.br-bars i{height:8px;border-radius:3px;background:rgba(255,255,255,.055)}.br-bars i.on{background:linear-gradient(90deg,#62c58d,#b6d765)}.br-bars i.hot{background:linear-gradient(90deg,#e7c451,#ef7a50)}.br-level output{text-align:right;color:#8da1b8;font:10px ui-monospace,Consolas,monospace}
    .br-transport{display:grid;grid-template-columns:1fr auto 1fr;gap:18px;align-items:center;padding:16px 8px 3px}.br-side{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.br-side.right{justify-content:flex-end}.br-record-wrap{text-align:center}.br-record{width:94px;height:94px;border-radius:50%;border:1px solid rgba(255,255,255,.15);background:radial-gradient(circle at 35% 30%,#ff767a,#dd3341 66%,#951b29);box-shadow:0 0 0 10px rgba(255,255,255,.035),0 14px 42px rgba(215,45,60,.35),inset 0 1px 2px rgba(255,255,255,.38);cursor:pointer;display:grid;place-items:center}.br-record:before{content:"";width:30px;height:30px;border-radius:50%;background:#fff}.br-record.recording:before{width:26px;height:26px;border-radius:6px}.br-record:disabled{opacity:.4}.br-caption{margin-top:10px;color:#8497ad;font-size:9px;letter-spacing:.09em;text-transform:uppercase}
    .br-sub{margin-top:14px;padding:14px 16px}.br-sub-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px}.br-sub h3{margin:0;font-size:11px;letter-spacing:.05em}.br-sub small{color:#71849a;font-size:9px}.br-sub audio{width:100%;height:38px;margin-top:8px}.br-meta{display:flex;justify-content:space-between;gap:12px;margin-top:8px;color:#71849b;font-size:9px}
    .br-stt{margin-top:14px;padding:14px 16px;display:flex;justify-content:space-between;gap:12px;align-items:center}.br-stt strong{font-size:11px}.br-stt span{display:block;margin-top:4px;color:#71849a;font-size:9px}
    .br-trace{position:sticky;top:70px;align-self:start;max-height:calc(100vh - 90px);overflow:hidden;display:flex;flex-direction:column}.br-trace-head{padding:13px 14px 10px;border-bottom:1px solid rgba(255,255,255,.06)}.br-trace-head h3{margin:0;font-size:11px}.br-trace-head p{margin:5px 0 0;color:#71849a;font-size:9px}.br-diag{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.055)}.br-diag div{padding:7px;border-radius:9px;background:rgba(255,255,255,.026)}.br-diag span{display:block;color:#687d96;font-size:8px;text-transform:uppercase}.br-diag strong{display:block;margin-top:3px;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.br-trace-actions{display:flex;gap:6px;padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.055)}.br-trace-actions button{flex:1}.br-events{overflow:auto;padding:6px 9px 12px}.br-event{padding:8px 7px;border-bottom:1px solid rgba(255,255,255,.045);font:9px/1.45 ui-monospace,Consolas,monospace;color:#9eafc4}.br-event b{color:#d6e2f1}.br-event small{display:block;color:#61758d;margin-top:2px;word-break:break-word}.br-event.error b{color:#ffadb5}.br-event.ready b{color:#9de0ba}.br-event.warn b{color:#dbc67e}
    .br-toast{position:fixed;right:24px;top:74px;z-index:12030;display:none;max-width:430px;padding:10px 12px;border:1px solid rgba(255,255,255,.1);border-radius:11px;background:rgba(8,15,26,.97);box-shadow:0 18px 55px rgba(0,0,0,.45);font-size:10px}.br-toast.show{display:block}
    @media(max-width:1060px){.br-shell{grid-template-columns:1fr}.br-trace{position:relative;top:auto;max-height:420px}.br-wave-wrap{height:260px}}@media(max-width:760px){.br-top{grid-template-columns:1fr auto}.br-title{display:none}.br-shell{padding:10px}.br-transport{grid-template-columns:1fr}.br-record-wrap{grid-row:1}.br-side,.br-side.right{justify-content:center}.br-wave-wrap{height:220px}.br-level{grid-template-columns:85px 1fr 42px}}
  `;
  document.head.appendChild(style);
}

function buildPage() {
  let page = document.getElementById(PAGE_ID);
  if (page) return page;
  const launcher = document.createElement("button");
  launcher.className = "br-launch";
  launcher.type = "button";
  launcher.textContent = "🎙 Диктофон";
  page = document.createElement("section");
  page.id = PAGE_ID;
  page.className = "br-page";
  page.innerHTML = `
    <header class="br-top">
      <div class="br-left"><button class="br-btn" data-action="close">← BOOK.CRAFT</button><span class="br-state"><i></i><b data-r="state-badge">EMPTY</b></span></div>
      <div class="br-title"><strong>BOOK·CRAFT RECORDER</strong><span>запись · монтаж · прослушивание</span></div>
      <div class="br-right"><span data-r="clock" style="font:10px ui-monospace,Consolas,monospace;color:#8ca0b8">00:00</span><button class="br-btn" data-action="copy-report">Копировать отчёт</button></div>
    </header>
    <div class="br-shell">
      <main class="br-main">
        <section class="br-card br-wave-card">
          <div class="br-head"><div><span class="br-kicker">VOICE RECORDER · LOCAL</span><h1>Диктофон</h1><p>Старт · пауза · стоп · прослушивание · выделение и удаление фрагмента.</p></div><div class="br-file"><strong data-r="file-name">Новая запись</strong><span data-r="file-meta">микрофон · локально</span></div></div>
          <div class="br-wave-wrap"><canvas data-r="wave"></canvas><div class="br-empty" data-r="empty">Нажмите «Запись» — здесь появится живая волна.<br>После остановки выделяйте куски мышкой.</div><div class="br-time"><span data-r="timer">00:00</span><small data-r="state">готов к записи</small></div><div class="br-selection" data-r="selection">Выделение: —</div></div>
          <div class="br-level"><label>Уровень голоса</label><div class="br-bars">${Array.from({ length: 30 }, () => "<i></i>").join("")}</div><output data-r="level">0%</output></div>
          <div class="br-transport">
            <div class="br-side"><button class="br-btn" data-action="play" disabled>▶ Прослушать</button><button class="br-btn" data-action="pause-record" disabled>Ⅱ Пауза</button></div>
            <div class="br-record-wrap"><button class="br-record" data-action="record" aria-label="Начать запись"></button><div class="br-caption" data-r="caption">Начать запись</div></div>
            <div class="br-side right"><button class="br-btn" data-action="stop" disabled>■ Стоп</button><button class="br-btn" data-action="new">Новая</button></div>
          </div>
        </section>
        <section class="br-card br-sub"><div class="br-sub-head"><div><h3>РЕДАКТИРОВАНИЕ</h3><small>Выделите фрагмент на волне. Изменения можно отменять и возвращать.</small></div><span data-r="edit-state" style="color:#70839a;font-size:9px">нет выделения</span></div><div class="br-row"><button class="br-btn danger" data-action="delete-selection" disabled>✂ Удалить выделенное</button><button class="br-btn" data-action="trim-selection" disabled>Обрезать до выделенного</button><button class="br-btn" data-action="undo" disabled>↶ Отмена</button><button class="br-btn" data-action="redo" disabled>↷ Вернуть</button><button class="br-btn" data-action="clear-selection" disabled>Снять выделение</button></div></section>
        <section class="br-card br-sub"><h3>ПРОСЛУШИВАНИЕ И ФАЙЛ</h3><audio data-r="preview" controls preload="metadata"></audio><div class="br-row" style="margin-top:10px"><button class="br-btn primary" data-action="download" disabled>↓ Сохранить запись</button><button class="br-btn" data-action="import">↑ Импорт MP3 / WAV / WebM</button><input data-r="file-input" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm" hidden><button class="br-btn danger" data-action="clear" disabled>Удалить запись</button></div><div class="br-meta"><span data-r="duration">Длительность: —</span><span data-r="format">Формат: —</span></div></section>
        <section class="br-card br-stt"><div><strong>РАСПОЗНАВАНИЕ</strong><span>Этап 2. Здесь появится реальный прогресс Whisper, сегменты и ETA.</span></div><button class="br-btn" data-action="recognize" disabled>✦ Распознать · этап 2</button></section>
      </main>
      <aside class="br-card br-trace"><div class="br-trace-head"><h3>ТРАССИРОВКА / ОТЧЁТ</h3><p>Копируйте отчёт и присылайте мне. Аудио и будущий текст в трассу не попадают.</p></div><div class="br-diag"><div><span>Session</span><strong data-r="diag-session">—</strong></div><div><span>State</span><strong data-r="diag-state">EMPTY</strong></div><div><span>MediaRecorder</span><strong data-r="diag-media">—</strong></div><div><span>AudioContext</span><strong data-r="diag-audio">—</strong></div><div><span>MIME</span><strong data-r="diag-mime">—</strong></div><div><span>Events</span><strong data-r="diag-events">0</strong></div></div><div class="br-trace-actions"><button class="br-btn" data-action="copy-report">Копировать</button><button class="br-btn" data-action="clear-trace">Очистить</button></div><div class="br-events" data-r="events"></div></aside>
    </div><div class="br-toast" data-r="toast" role="status" aria-live="polite"></div>`;
  document.body.append(launcher, page);
  launcher.addEventListener("click", () => { page.classList.add("open"); page._recorder?.open(); });
  return page;
}

function makeController(page) {
  const q = (selector) => page.querySelector(selector);
  const qa = (selector) => Array.from(page.querySelectorAll(selector));
  const audio = q('[data-r="preview"]');
  const canvas = q('[data-r="wave"]');
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  let audioContext = null;
  let operation = 0;
  let savedOverflow = "";
  let returnFocus = null;
  const state = {
    phase: "EMPTY", recorder: null, stream: null, recordMime: "",
    recordStartedAt: null, elapsedBeforePause: 0, timer: null,
    sourceNode: null, analyser: null, raf: null, buffer: null, blob: null,
    fileName: "", mime: "", objectUrl: "", duration: 0, playhead: 0,
    selectionStart: null, selectionEnd: null, selecting: false,
    undo: [], redo: [], original: null, dirty: false,
  };
  const busy = () => ["REQUESTING", "RECORDING", "PAUSED", "PROCESSING"].includes(state.phase);
  const restingPhase = () => state.blob ? (state.undo.length ? "EDITING" : "RECORDED") : "EMPTY";
  const toast = (message) => {
    const node = q('[data-r="toast"]');
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(node._t);
    node._t = setTimeout(() => node.classList.remove("show"), 6500);
  };
  let tracer;
  const traceRender = () => {
    if (!tracer) return;
    q('[data-r="diag-session"]').textContent = tracer.state.sessionId.slice(0, 8);
    q('[data-r="diag-state"]').textContent = state.phase;
    q('[data-r="diag-media"]').textContent = typeof MediaRecorder === "undefined" ? "NO" : "YES";
    q('[data-r="diag-audio"]').textContent = audioContext?.state || (AudioContextCtor ? "READY" : "NO");
    q('[data-r="diag-mime"]').textContent = state.recordMime || state.mime || "—";
    q('[data-r="diag-events"]').textContent = String(tracer.state.events.length);
    // File names and browser errors are untrusted text, never HTML.
    q('[data-r="events"]').replaceChildren(...tracer.state.events.slice(-70).reverse().map((event) => {
      const row = document.createElement("div");
      row.className = `br-event ${["error", "ready", "warn"].includes(event.kind) ? event.kind : ""}`;
      const title = document.createElement("b");
      title.textContent = `#${event.seq} ${event.event}`;
      const detail = document.createElement("small");
      detail.textContent = `${event.time.slice(11, 23)} · ${event.state} · ${Object.entries(event.meta).map(([k, v]) => `${k}=${v}`).join(" · ")}`;
      row.append(title, detail);
      return row;
    }));
  };
  tracer = createRecorderTrace(traceRender);
  const trace = (event, meta = {}, kind = "") => tracer.trace(event, state.phase, meta, kind);
  const fail = (event, error, message) => {
    trace(event, { name: error?.name || "Error", error: error?.message || String(error) }, "error");
    toast(message);
  };
  const context = () => {
    if (!AudioContextCtor) throw new Error("AudioContext недоступен");
    if (!audioContext || audioContext.state === "closed") audioContext = new AudioContextCtor();
    return audioContext;
  };
  const suspendContext = () => {
    if (audioContext?.state === "running") audioContext.suspend().catch(error => fail("audio.suspend.error", error, "Не удалось приостановить аудиоконтекст."));
  };
  const recordElapsed = () => state.elapsedBeforePause + (state.recordStartedAt === null ? 0 : performance.now() - state.recordStartedAt);
  const updateClock = () => {
    const value = ["RECORDING", "PAUSED", "PROCESSING"].includes(state.phase) ? recordElapsed() : state.playhead * 1000;
    q('[data-r="timer"]').textContent = q('[data-r="clock"]').textContent = formatClock(value);
  };
  const stopClock = () => { clearInterval(state.timer); state.timer = null; updateClock(); };
  const startClock = () => { stopClock(); state.timer = setInterval(updateClock, 200); };
  const selection = () => {
    if (state.selectionStart === null || state.selectionEnd === null) return null;
    const start = Math.max(0, Math.min(state.selectionStart, state.selectionEnd));
    const end = Math.min(state.duration, Math.max(state.selectionStart, state.selectionEnd));
    return end - start >= 0.025 ? { start, end } : null;
  };
  const redraw = () => drawWaveform({ canvas, buffer: state.buffer, selection: selection(), playhead: state.playhead });
  const refreshControls = () => {
    const locked = busy();
    const active = ["RECORDING", "PAUSED"].includes(state.phase);
    const editable = Boolean(state.buffer) && !locked;
    const range = Boolean(selection());
    const enable = (name, enabled) => { q(`[data-action="${name}"]`).disabled = !enabled; };
    enable("record", !locked);
    enable("pause-record", active);
    enable("stop", active || state.phase === "PLAYING");
    enable("play", Boolean(state.blob) && !locked);
    enable("delete-selection", editable && range);
    enable("trim-selection", editable && range);
    enable("clear-selection", editable && range);
    enable("undo", !locked && state.undo.length > 0);
    enable("redo", !locked && state.redo.length > 0);
    enable("download", Boolean(state.blob) && !locked);
    enable("clear", Boolean(state.blob) || locked);
    enable("import", !locked);
    audio.controls = !locked;
    audio.hidden = locked || !state.blob;
    q('[data-action="pause-record"]').textContent = state.phase === "PAUSED" ? "▶ Продолжить" : "Ⅱ Пауза";
    q('[data-action="play"]').textContent = state.phase === "PLAYING" ? "Ⅱ Пауза воспроизведения" : "▶ Прослушать";
    const caption = state.phase === "REQUESTING" ? "Разрешите микрофон" : state.phase === "PROCESSING" ? "Обработка аудио" : state.phase === "RECORDING" ? "Идёт запись" : state.phase === "PAUSED" ? "Пауза" : state.blob ? "Новая запись" : "Начать запись";
    q('[data-r="caption"]').textContent = caption;
    q('[data-action="record"]').setAttribute("aria-label", caption);
    q('[data-action="record"]').classList.toggle("recording", state.phase === "RECORDING");
  };
  const setPhase = (phase, reason) => {
    const from = state.phase;
    state.phase = phase;
    q('[data-r="state-badge"]').textContent = phase;
    q('[data-r="state"]').textContent = { EMPTY: "готов к записи", REQUESTING: "ожидание микрофона", RECORDING: "идёт запись", PAUSED: "пауза", PROCESSING: "обработка аудио", RECORDED: "запись готова", EDITING: "редактирование", PLAYING: "прослушивание" }[phase];
    refreshControls(); updateClock();
    trace("state.change", { from, to: phase, reason }, phase === "RECORDED" ? "ready" : "");
  };
  const renderSelection = () => {
    const range = selection();
    q('[data-r="selection"]').textContent = range ? `${range.start.toFixed(3)} → ${range.end.toFixed(3)} сек` : "Выделение: —";
    q('[data-r="edit-state"]').textContent = range ? `${(range.end - range.start).toFixed(3)} сек выделено` : "нет выделения";
    refreshControls();
  };
  const updateLevel = (level) => {
    const bars = qa('.br-bars i');
    const active = Math.round(Math.max(0, Math.min(1, level)) * bars.length);
    bars.forEach((bar, index) => { bar.classList.toggle("on", index < active); bar.classList.toggle("hot", index < active && index > bars.length * .78); });
    q('[data-r="level"]').textContent = `${Math.round(level * 100)}%`;
  };
  const stopVisualizer = () => {
    if (state.raf !== null) cancelAnimationFrame(state.raf);
    state.raf = null;
    state.sourceNode?.disconnect(); state.analyser?.disconnect();
    state.sourceNode = state.analyser = null;
    updateLevel(0);
  };
  const startVisualizer = (stream) => {
    stopVisualizer();
    try {
      const ctx = context();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = .72;
      state.sourceNode = ctx.createMediaStreamSource(stream);
      state.sourceNode.connect(analyser);
      state.analyser = analyser;
      const data = new Uint8Array(analyser.fftSize);
      const draw = () => {
        if (!state.analyser || state.phase !== "RECORDING") return;
        analyser.getByteTimeDomainData(data);
        const rect = canvas.getBoundingClientRect();
        const ratio = Math.max(1, window.devicePixelRatio || 1);
        canvas.width = Math.max(1, Math.floor(rect.width * ratio));
        canvas.height = Math.max(1, Math.floor(rect.height * ratio));
        const paint = canvas.getContext("2d");
        if (!paint) return;
        paint.setTransform(ratio, 0, 0, ratio, 0, 0); paint.clearRect(0, 0, rect.width, rect.height); paint.beginPath();
        let power = 0;
        data.forEach((value, index) => {
          const n = (value - 128) / 128; power += n * n;
          const x = index / (data.length - 1) * rect.width;
          const y = rect.height / 2 + n * rect.height * .42;
          if (index === 0) paint.moveTo(x, y); else paint.lineTo(x, y);
        });
        const level = Math.min(1, Math.sqrt(power / data.length) * 5.4);
        paint.strokeStyle = level > .78 ? "#f27956" : "#55e5b2"; paint.lineWidth = 2; paint.stroke(); updateLevel(level);
        state.raf = requestAnimationFrame(draw);
      };
      draw(); trace("visualizer.ready", { fft_size: analyser.fftSize }, "ready");
    } catch (error) { fail("visualizer.error", error, "Не удалось построить живую волну; запись продолжается."); }
  };
  const stopTracks = (stream) => stream?.getTracks().forEach(track => track.stop());
  const releaseCapture = () => {
    const recorder = state.recorder;
    if (recorder) {
      recorder.onstop = recorder.ondataavailable = recorder.onerror = null;
      if (recorder.state !== "inactive") { try { recorder.stop(); } catch {} }
    }
    state.recorder = null; stopTracks(state.stream); state.stream = null;
    stopClock(); stopVisualizer(); suspendContext();
  };
  const revokeUrl = () => { if (state.objectUrl) URL.revokeObjectURL(state.objectUrl); state.objectUrl = ""; };
  const installAudio = (blob, buffer, name) => {
    // Prepare URL first; only replace the old recording after preparation succeeds.
    const url = URL.createObjectURL(blob);
    audio.pause(); revokeUrl();
    Object.assign(state, { blob, buffer, fileName: name, mime: blob.type || "audio", objectUrl: url, duration: buffer?.duration || 0, playhead: 0, selectionStart: null, selectionEnd: null, selecting: false });
    audio.src = url; audio.load();
    q('[data-r="file-name"]').textContent = name;
    q('[data-r="file-meta"]').textContent = `${state.mime} · ${formatBytes(blob.size)}`;
    q('[data-r="format"]').textContent = `Формат: ${state.mime} · ${formatBytes(blob.size)}`;
    q('[data-r="duration"]').textContent = buffer ? `Длительность: ${formatClock(buffer.duration * 1000)}` : "Длительность: недоступна (декодирование не удалось)";
    q('[data-r="empty"]').style.display = buffer ? "none" : "grid";
    q('[data-r="empty"]').textContent = "Волна недоступна. Можно прослушать и сохранить исходный файл.";
    renderSelection(); redraw(); updateClock();
  };
  const decodeBlob = async (blob, source) => {
    trace("audio.decode.start", { source, size_bytes: blob.size, content_type: blob.type });
    const decoded = await context().decodeAudioData(await blob.arrayBuffer());
    return decoded;
  };
  const decodedTrace = (buffer) => trace("audio.decode.ready", { duration_ms: Math.round(buffer.duration * 1000), channels: buffer.numberOfChannels, sample_rate: buffer.sampleRate }, "ready");
  const confirmReplace = () => !state.dirty || window.confirm("Текущая запись не сохранена. Заменить её?");
  const clearAudio = (reason) => {
    if ((state.dirty || busy()) && !window.confirm("Удалить текущую запись? Это действие нельзя отменить.")) return;
    ++operation; releaseCapture(); audio.pause(); revokeUrl();
    Object.assign(state, { buffer: null, blob: null, original: null, fileName: "", mime: "", recordMime: "", duration: 0, playhead: 0, recordStartedAt: null, elapsedBeforePause: 0, selectionStart: null, selectionEnd: null, selecting: false, undo: [], redo: [], dirty: false });
    audio.removeAttribute("src"); audio.load();
    q('[data-r="file-name"]').textContent = "Новая запись";
    q('[data-r="file-meta"]').textContent = "микрофон · локально";
    q('[data-r="duration"]').textContent = "Длительность: —";
    q('[data-r="format"]').textContent = "Формат: —";
    q('[data-r="empty"]').textContent = "Нажмите «Запись» — здесь появится живая волна.";
    q('[data-r="empty"]').style.display = "grid";
    setPhase("EMPTY", reason); renderSelection(); redraw(); trace("audio.clear", { reason }, "warn");
  };
  const startRecording = async () => {
    if (busy() || !confirmReplace()) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      fail("record.error", new Error("MediaRecorder / getUserMedia unavailable"), "Микрофон недоступен. Откройте приложение на localhost или по HTTPS."); return;
    }
    audio.pause(); releaseCapture();
    const id = ++operation;
    state.recordStartedAt = null; state.elapsedBeforePause = 0;
    setPhase("REQUESTING", "microphone-request"); trace("microphone.request");
    let stream;
    try {
      // Resume during the user gesture. Permission and decode may finish much later.
      if (AudioContextCtor) await context().resume();
      if (id !== operation) return;
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (id !== operation) { stopTracks(stream); return; }
      state.stream = stream;
      const mime = preferredMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      state.recorder = recorder; state.recordMime = recorder.mimeType || mime || "browser-default";
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (id !== operation || !event.data?.size) return;
        chunks.push(event.data); trace("record.blob", { size_bytes: event.data.size, content_type: event.data.type });
      };
      recorder.onerror = (event) => {
        if (id !== operation) return;
        ++operation; releaseCapture(); setPhase(restingPhase(), "record-error"); redraw();
        fail("record.media-error", event.error || new Error("MediaRecorder error"), "Ошибка записи. Предыдущий файл сохранён; попробуйте записать снова.");
      };
      recorder.onstop = async () => {
        if (id !== operation) return;
        if (state.recordStartedAt !== null) state.elapsedBeforePause = recordElapsed();
        state.recordStartedAt = null;
        releaseCapture(); setPhase("PROCESSING", "record-stop");
        const finalMime = recorder.mimeType || mime || "audio/webm";
        const blob = new Blob(chunks, { type: finalMime }); chunks.length = 0;
        trace("record.finish", { size_bytes: blob.size, content_type: finalMime, elapsed_ms: state.elapsedBeforePause }, "ready");
        if (!blob.size) { setPhase(restingPhase(), "empty-recording"); redraw(); fail("record.empty", new Error("Empty recording"), "Запись пустая. Попробуйте записать ещё раз."); return; }
        let buffer = null;
        try { buffer = await decodeBlob(blob, "microphone"); }
        catch (error) {
          if (id !== operation) return;
          fail("audio.decode.error", error, "Запись получена. Волна недоступна, но можно прослушать и сохранить файл.");
        }
        if (id !== operation) return;
        try {
          const ext = finalMime.includes("mp4") ? "m4a" : finalMime.includes("ogg") ? "ogg" : finalMime.includes("wav") ? "wav" : "webm";
          installAudio(blob, buffer, `bookcraft-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`);
          state.undo = []; state.redo = []; state.original = buffer; state.dirty = true;
          if (buffer) decodedTrace(buffer);
          setPhase("RECORDED", "record-ready"); suspendContext();
          if (buffer) toast("Запись готова. Можно слушать, выделять и удалять фрагменты.");
        } catch (error) { setPhase(restingPhase(), "record-install-error"); fail("record.install.error", error, "Не удалось подготовить запись."); }
      };
      recorder.start(500);
      state.recordStartedAt = performance.now();
      setPhase("RECORDING", "record-start"); startClock();
      q('[data-r="empty"]').style.display = "none";
      startVisualizer(stream);
      trace("microphone.ready", { tracks: stream.getAudioTracks().length, content_type: state.recordMime }, "ready");
      trace("record.start", { content_type: state.recordMime });
    } catch (error) {
      stopTracks(stream);
      if (id !== operation) return;
      releaseCapture(); setPhase(restingPhase(), "microphone-error"); redraw();
      const message = error.name === "NotAllowedError" ? "Доступ к микрофону запрещён. Разрешите его в настройках сайта и повторите запись." : error.name === "NotFoundError" ? "Микрофон не найден. Подключите устройство и повторите запись." : "Не удалось включить микрофон. Проверьте устройство и разрешения браузера.";
      fail("microphone.error", error, message);
    }
  };
  const togglePause = async () => {
    const recorder = state.recorder;
    if (!recorder) return;
    if (state.phase === "RECORDING") {
      recorder.pause(); state.elapsedBeforePause = recordElapsed(); state.recordStartedAt = null;
      stopClock(); stopVisualizer(); suspendContext(); setPhase("PAUSED", "record-pause"); trace("record.pause", { elapsed_ms: recordElapsed() });
    } else if (state.phase === "PAUSED") {
      const id = operation;
      if (AudioContextCtor) await context().resume();
      if (id !== operation || state.phase !== "PAUSED" || recorder.state !== "paused") return;
      recorder.resume(); state.recordStartedAt = performance.now();
      setPhase("RECORDING", "record-resume"); startClock(); startVisualizer(state.stream); trace("record.resume", { elapsed_ms: recordElapsed() });
    }
  };
  const stopRecording = () => {
    if (state.phase === "PLAYING") { audio.pause(); audio.currentTime = 0; state.playhead = 0; updateClock(); redraw(); return; }
    if (!state.recorder || !["RECORDING", "PAUSED"].includes(state.phase)) return;
    state.elapsedBeforePause = recordElapsed(); state.recordStartedAt = null;
    stopClock(); stopVisualizer(); setPhase("PROCESSING", "record-stop-request");
    trace("record.stop.request", { elapsed_ms: recordElapsed() }); state.recorder.stop();
  };
  // AudioBuffers are immutable in this controller; history shares them instead of
  // duplicating entire recordings. Keep the original separately from bounded undo.
  const edit = (kind) => {
    if (busy() || !state.buffer) return;
    const range = selection();
    if (!range) return;
    const previous = state.buffer;
    const next = kind === "delete-selection" ? cutSelection(context(), previous, range.start, range.end) : trimToSelection(context(), previous, range.start, range.end);
    const name = state.fileName.replace(/(?:-edited)?\.[^.]+$/, "") + "-edited.wav";
    installAudio(audioBufferToWavBlob(next), next, name);
    state.undo.push(previous); if (state.undo.length > 20) state.undo.splice(1, 1); state.redo = []; state.dirty = true;
    setPhase("EDITING", kind);
    trace(`edit.${kind}`, { start_ms: Math.round(range.start * 1000), end_ms: Math.round(range.end * 1000), duration_before_ms: Math.round(previous.duration * 1000), duration_after_ms: Math.round(next.duration * 1000) }, "ready");
  };
  const history = (kind) => {
    if (busy()) return;
    const from = kind === "undo" ? state.undo : state.redo;
    const to = kind === "undo" ? state.redo : state.undo;
    if (!from.length) return;
    const previous = state.buffer;
    const next = from.at(-1);
    installAudio(audioBufferToWavBlob(next), next, state.fileName.replace(/(?:-edited)?\.[^.]+$/, "") + "-edited.wav");
    from.pop(); to.push(previous); state.dirty = true;
    setPhase(restingPhase(), kind); trace(`edit.${kind}`, { undo_count: state.undo.length, redo_count: state.redo.length }, "ready");
  };
  const importAudio = async (file) => {
    if (!file || busy() || !confirmReplace()) return;
    audio.pause(); const id = ++operation;
    state.recordStartedAt = null; state.elapsedBeforePause = 0;
    setPhase("PROCESSING", "import-start"); trace("import.start", { name: file.name, size_bytes: file.size, content_type: file.type });
    try {
      if (!file.size) throw new Error("Файл пустой");
      const buffer = await decodeBlob(file, "import");
      if (id !== operation) return;
      installAudio(file, buffer, file.name || `import-${Date.now()}`);
      state.original = buffer; state.undo = []; state.redo = []; state.dirty = false; state.recordMime = "";
      decodedTrace(buffer); setPhase("RECORDED", "import-ready"); suspendContext();
      trace("import.ready", { name: file.name, size_bytes: file.size, duration_ms: Math.round(buffer.duration * 1000) }, "ready"); toast("Аудиофайл загружен.");
    } catch (error) {
      if (id !== operation) return;
      setPhase(restingPhase(), "import-error"); suspendContext(); redraw();
      fail("import.error", error, "Не удалось открыть аудиофайл. Предыдущая запись сохранена. Попробуйте WAV, MP3 или другой поддерживаемый браузером формат.");
    }
  };
  const play = async () => {
    if (busy() || !state.blob) return;
    if (!audio.paused) { audio.pause(); return; }
    const range = selection();
    if (range && (state.playhead < range.start || state.playhead >= range.end)) audio.currentTime = range.start;
    else audio.currentTime = state.playhead >= state.duration && state.duration ? 0 : state.playhead;
    try { await audio.play(); }
    catch (error) { fail("preview.play.error", error, "Браузер не смог воспроизвести файл. Сохраните его или импортируйте другой формат."); }
  };
  const report = () => tracer.buildReport({
    recorderState: state.phase,
    runtime: { user_agent: navigator.userAgent, media_recorder: typeof MediaRecorder !== "undefined", audio_context: Boolean(AudioContextCtor), audio_context_state: audioContext?.state || "not-created", get_user_media: Boolean(navigator.mediaDevices?.getUserMedia), record_mime: state.recordMime || null },
    audio: state.blob ? { name: state.fileName, content_type: state.mime, size_bytes: state.blob.size, duration_ms: state.buffer ? Math.round(state.duration * 1000) : null, channels: state.buffer?.numberOfChannels || null, sample_rate: state.buffer?.sampleRate || null } : null,
    selection: selection() ? { start_ms: Math.round(selection().start * 1000), end_ms: Math.round(selection().end * 1000) } : null,
  });
  const download = (blob, name, url = "") => {
    const temporary = !url;
    const link = document.createElement("a"); link.href = url || URL.createObjectURL(blob); link.download = name;
    document.body.append(link); link.click(); link.remove();
    if (temporary) setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  const copyReport = async () => {
    trace("report.copy.request");
    const text = JSON.stringify(report(), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      trace("report.copy", { characters: text.length }, "ready"); toast("Отчёт скопирован.");
    } catch {
      const area = document.createElement("textarea"); area.value = text; page.append(area); area.select();
      let copied = false;
      try { copied = document.execCommand?.("copy") === true; } catch {} finally { area.remove(); }
      if (copied) { trace("report.copy.fallback", { characters: text.length }, "ready"); toast("Отчёт скопирован."); }
      else {
        trace("report.copy.unavailable", {}, "warn");
        download(new Blob([JSON.stringify(report(), null, 2)], { type: "application/json" }), "bookcraft-recorder-report.json");
        toast("Буфер обмена недоступен. Отчёт сохранён как JSON-файл.");
      }
    }
  };
  const guard = (operationName, fn) => (...args) => {
    try { Promise.resolve(fn(...args)).catch(error => fail("recorder.unexpected", error, `Ошибка: ${operationName}. Подробности в отчёте.`)); }
    catch (error) { fail("recorder.unexpected", error, `Ошибка: ${operationName}. Подробности в отчёте.`); }
  };
  const action = (name, fn) => qa(`[data-action="${name}"]`).forEach(button => button.addEventListener("click", guard(name, fn)));
  const eventTime = (event) => {
    const rect = canvas.getBoundingClientRect();
    return Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width))) * state.duration;
  };
  canvas.addEventListener("pointerdown", guard("selection", event => {
    if (!state.buffer || busy() || (event.button !== undefined && event.button !== 0)) return;
    event.preventDefault(); audio.pause(); canvas.setPointerCapture?.(event.pointerId);
    state.selecting = true; state.selectionStart = state.selectionEnd = eventTime(event);
    renderSelection(); redraw(); trace("wave.selection.start", { start_ms: state.selectionStart * 1000 });
  }));
  canvas.addEventListener("pointermove", event => { if (state.selecting) { state.selectionEnd = eventTime(event); renderSelection(); redraw(); } });
  canvas.addEventListener("pointerup", event => {
    if (!state.selecting) return;
    state.selecting = false; state.selectionEnd = eventTime(event);
    const range = selection();
    if (range) trace("wave.selection", { start_ms: range.start * 1000, end_ms: range.end * 1000 }, "ready");
    else {
      state.playhead = state.selectionEnd; audio.currentTime = state.playhead;
      state.selectionStart = state.selectionEnd = null; trace("wave.seek", { position_ms: state.playhead * 1000 });
    }
    canvas.releasePointerCapture?.(event.pointerId); renderSelection(); redraw(); updateClock();
  });
  const cancelSelection = () => {
    if (!state.selecting) return;
    state.selecting = false; state.selectionStart = state.selectionEnd = null;
    renderSelection(); redraw(); trace("wave.selection.cancel");
  };
  canvas.addEventListener("pointercancel", cancelSelection);
  canvas.addEventListener("lostpointercapture", cancelSelection);
  action("close", () => {
    if (busy()) { trace("ui.close.blocked", { reason: state.phase }, "warn"); toast("Остановите запись и дождитесь обработки, либо нажмите «Новая» для отмены."); return; }
    audio.pause(); suspendContext(); page.classList.remove("open"); document.body.style.overflow = savedOverflow; returnFocus?.focus(); trace("ui.close");
  });
  action("record", startRecording); action("pause-record", togglePause); action("stop", stopRecording);
  action("new", () => clearAudio("new-recording")); action("clear", () => clearAudio("delete")); action("play", play);
  action("delete-selection", () => edit("delete-selection")); action("trim-selection", () => edit("trim-selection"));
  action("undo", () => history("undo")); action("redo", () => history("redo"));
  action("clear-selection", () => { state.selectionStart = state.selectionEnd = null; renderSelection(); redraw(); trace("wave.selection.clear"); });
  action("import", () => { trace("import.dialog.open"); q('[data-r="file-input"]').click(); });
  q('[data-r="file-input"]').addEventListener("change", guard("import", event => { const file = event.target.files?.[0]; event.target.value = ""; return importAudio(file); }));
  action("download", () => {
    if (!state.blob || busy()) return;
    download(state.blob, state.fileName, state.objectUrl);
    // Browsers cannot confirm the user completed the Save dialog; retain dirty protection.
    trace("audio.download", { name: state.fileName, size_bytes: state.blob.size }, "ready"); toast("Файл передан браузеру для сохранения.");
  });
  action("copy-report", copyReport); action("clear-trace", () => tracer.clear(state.phase));
  audio.addEventListener("play", () => {
    if (busy() || !state.blob || !page.classList.contains("open")) { audio.pause(); return; }
    setPhase("PLAYING", "preview-play"); trace("preview.play", { from_ms: audio.currentTime * 1000 });
  });
  audio.addEventListener("pause", () => {
    if (busy() || !state.blob) return;
    state.playhead = Number(audio.currentTime) || 0;
    if (state.phase === "PLAYING") setPhase(restingPhase(), "preview-pause");
    trace("preview.pause", { at_ms: state.playhead * 1000 }); updateClock(); redraw();
  });
  audio.addEventListener("timeupdate", () => {
    if (busy() || !state.blob) return;
    state.playhead = Number(audio.currentTime) || 0;
    const range = selection();
    if (range && !audio.paused && state.playhead >= range.end) {
      audio.pause(); audio.currentTime = state.playhead = range.start; trace("preview.selection-end", { end_ms: range.end * 1000 });
    }
    updateClock(); redraw();
  });
  audio.addEventListener("ended", () => {
    if (busy() || !state.blob) return;
    state.playhead = 0; setPhase(restingPhase(), "preview-ended"); trace("preview.ended"); redraw();
  });
  audio.addEventListener("seeking", () => {
    if (busy() || !state.blob) return;
    state.playhead = Number(audio.currentTime) || 0; trace("preview.seek", { position_ms: state.playhead * 1000 }); updateClock(); redraw();
  });
  audio.addEventListener("error", () => { if (state.blob && !busy()) fail("preview.error", new Error(`MediaError ${audio.error?.code || "unknown"}`), "Браузер не поддерживает воспроизведение этого файла. Сохраните оригинал."); });
  const resize = () => { if (!busy()) redraw(); };
  window.addEventListener("resize", resize);
  window.addEventListener("beforeunload", event => { if (state.dirty || busy()) { event.preventDefault(); event.returnValue = ""; } });
  window.addEventListener("pagehide", () => {
    ++operation; releaseCapture(); audio.pause();
    if (audioContext) { const old = audioContext; audioContext = null; old.close().catch(() => {}); }
    revokeUrl(); setPhase(restingPhase(), "pagehide"); trace("resources.release");
  });
  window.addEventListener("pageshow", () => {
    if (state.blob && !state.objectUrl) { state.objectUrl = URL.createObjectURL(state.blob); audio.src = state.objectUrl; audio.load(); redraw(); }
  });
  page._recorder = {
    trace, report,
    open: () => { returnFocus = document.activeElement; savedOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"; redraw(); updateClock(); q('[data-action="close"]').focus(); trace("ui.open", {}, "ready"); },
  };
  trace("recorder.mount", { media_recorder: typeof MediaRecorder !== "undefined", audio_context: Boolean(AudioContextCtor) }, "ready");
  renderSelection(); refreshControls(); traceRender();
}

export function mountRecorderPage() { injectStyles(); const page = buildPage(); if (!page._recorder) makeController(page); }
