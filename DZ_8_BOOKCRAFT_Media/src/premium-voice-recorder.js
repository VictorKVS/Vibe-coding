const RECORDER_ID = "bookcraft-premium-recorder";
const STYLE_ID = "bookcraft-premium-recorder-style";

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .bc-recorder-launch{position:fixed;right:22px;bottom:22px;z-index:12000;border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:11px 15px;background:linear-gradient(145deg,rgba(18,28,44,.97),rgba(9,15,26,.97));color:#eef5ff;box-shadow:0 18px 55px rgba(0,0,0,.42),inset 0 1px rgba(255,255,255,.05);font:600 12px/1.2 Inter,system-ui,sans-serif;letter-spacing:.02em;cursor:pointer;backdrop-filter:blur(16px);transition:.18s ease}
    .bc-recorder-launch:hover{transform:translateY(-2px);border-color:rgba(115,180,255,.42);box-shadow:0 22px 65px rgba(0,0,0,.5),0 0 0 1px rgba(115,180,255,.08) inset}
    .bc-recorder-overlay{position:fixed;inset:0;z-index:12100;display:none;align-items:center;justify-content:center;padding:28px;background:rgba(3,7,13,.72);backdrop-filter:blur(12px)}
    .bc-recorder-overlay.open{display:flex}
    .bc-recorder{width:min(820px,96vw);max-height:94vh;overflow:auto;border:1px solid rgba(255,255,255,.13);border-radius:26px;background:linear-gradient(165deg,#0d1726 0%,#09111d 48%,#070d16 100%);color:#edf4fe;box-shadow:0 45px 140px rgba(0,0,0,.72),0 0 0 1px rgba(120,175,255,.035) inset;font-family:Inter,system-ui,sans-serif}
    .bc-recorder-head{display:flex;justify-content:space-between;gap:18px;padding:20px 22px 14px;border-bottom:1px solid rgba(255,255,255,.065)}
    .bc-recorder-kicker{display:block;margin-bottom:5px;color:#7f9fc8;font-size:9px;letter-spacing:.18em;text-transform:uppercase}.bc-recorder-head h2{margin:0;font-size:22px;letter-spacing:-.025em}.bc-recorder-head p{margin:6px 0 0;color:#73869d;font-size:10px}.bc-recorder-close{border:0;background:transparent;color:#aebed1;font-size:28px;line-height:1;cursor:pointer}
    .bc-recorder-badges{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.bc-recorder-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border-radius:999px;border:1px solid rgba(95,195,145,.17);background:rgba(56,151,104,.07);color:#a2dfbc;font-size:9px}.bc-recorder-badge.muted{border-color:rgba(140,160,190,.14);background:rgba(120,140,170,.05);color:#8498b1}.bc-recorder-badge i{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 10px currentColor}
    .bc-recorder-stage{padding:18px 22px 8px}.bc-wave{position:relative;height:235px;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,.075);background:radial-gradient(circle at 50% 120%,rgba(80,145,225,.14),transparent 48%),linear-gradient(180deg,#0b1522,#08101b)}.bc-wave canvas{position:absolute;inset:0;width:100%;height:100%}.bc-wave-grid{position:absolute;inset:0;pointer-events:none;background:linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);background-size:100% 47px,72px 100%}.bc-wave-center{position:absolute;left:50%;top:12px;bottom:12px;width:1px;background:rgba(255,255,255,.14);pointer-events:none}.bc-wave-center:after{content:"";position:absolute;top:-1px;left:-3px;width:7px;height:7px;border-radius:50%;background:#dfeafa;box-shadow:0 0 16px rgba(180,215,255,.45)}
    .bc-timer{position:absolute;left:18px;top:15px;z-index:2;padding:7px 10px;border-radius:10px;background:rgba(3,8,15,.62);backdrop-filter:blur(9px);font:700 24px/1 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.04em}.bc-timer small{display:block;margin-top:4px;color:#70839a;font:9px/1.2 Inter,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase}.bc-file-meta{position:absolute;right:17px;top:16px;z-index:2;text-align:right}.bc-file-meta strong{display:block;max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px}.bc-file-meta span{display:block;margin-top:4px;color:#6e8198;font-size:9px}
    .bc-level{display:grid;grid-template-columns:105px 1fr 48px;gap:10px;align-items:center;margin:13px 2px 0}.bc-level label{color:#71849b;font-size:9px;text-transform:uppercase;letter-spacing:.12em}.bc-level-bars{display:grid;grid-template-columns:repeat(28,1fr);gap:3px}.bc-level-bars i{height:8px;border-radius:3px;background:rgba(255,255,255,.055);transition:.08s linear}.bc-level-bars i.on{background:linear-gradient(90deg,#62c58d,#b6d765)}.bc-level-bars i.hot{background:linear-gradient(90deg,#e7c451,#ef7a50)}.bc-level output{font:10px ui-monospace,Consolas,monospace;color:#8da1b8;text-align:right}
    .bc-transport{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:18px;padding:14px 22px 19px}.bc-side{display:flex;gap:8px;align-items:center}.bc-side.right{justify-content:flex-end}.bc-side button{min-width:86px;border:1px solid rgba(255,255,255,.105);border-radius:12px;padding:9px 11px;background:rgba(255,255,255,.042);color:#d0dbea;font-size:10px;cursor:pointer}.bc-side button:hover{border-color:rgba(110,175,255,.28)}.bc-side button:disabled{opacity:.35;cursor:not-allowed}.bc-side button.active{border-color:rgba(255,202,95,.35);color:#f7d99b;background:rgba(194,147,55,.1)}
    .bc-record-wrap{text-align:center}.bc-record{width:92px;height:92px;border-radius:50%;border:1px solid rgba(255,255,255,.15);background:radial-gradient(circle at 35% 30%,#ff767a,#dd3341 66%,#951b29);box-shadow:0 0 0 10px rgba(255,255,255,.035),0 14px 42px rgba(215,45,60,.35),inset 0 1px 2px rgba(255,255,255,.38);cursor:pointer;display:grid;place-items:center;transition:.16s ease}.bc-record:before{content:"";width:29px;height:29px;border-radius:50%;background:#fff}.bc-record.recording:before{width:26px;height:26px;border-radius:6px}.bc-record:hover{transform:scale(1.025)}.bc-record-caption{margin-top:12px;color:#8799ad;font-size:9px;letter-spacing:.09em;text-transform:uppercase}
    .bc-preview{display:none;margin:0 22px 18px;padding:13px;border:1px solid rgba(255,255,255,.075);border-radius:15px;background:rgba(255,255,255,.026)}.bc-preview.ready{display:block}.bc-preview audio{width:100%;height:38px}.bc-preview-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.bc-preview-actions button,.bc-preview-actions a{border:1px solid rgba(255,255,255,.105);border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.045);color:#dbe6f4;text-decoration:none;cursor:pointer;font-size:10px}.bc-preview-actions .primary{border-color:rgba(94,183,255,.36);background:rgba(72,128,205,.14);color:#edf6ff}.bc-preview-actions .danger{border-color:rgba(255,105,115,.23);color:#ffb8be}
    .bc-status{margin:0 22px 18px;padding:11px 12px;border-radius:13px;border:1px solid rgba(255,255,255,.055);background:rgba(255,255,255,.022);color:#8093aa;font-size:10px}.bc-status.ready{color:#9ce0bb;border-color:rgba(95,190,145,.15)}.bc-status.busy{color:#dbc57f;border-color:rgba(220,190,90,.14)}.bc-status.error{color:#ffadb5;border-color:rgba(255,105,115,.2)}
    .bc-foot{display:flex;justify-content:space-between;gap:12px;padding:11px 22px 16px;border-top:1px solid rgba(255,255,255,.055);color:#65788f;font-size:9px}.bc-foot b{color:#8ea1b8}
    @media(max-width:760px){.bc-recorder-overlay{padding:10px}.bc-recorder{width:100%;max-height:98vh}.bc-transport{grid-template-columns:1fr}.bc-record-wrap{grid-row:1}.bc-side,.bc-side.right{justify-content:center}.bc-level{grid-template-columns:85px 1fr 40px}.bc-wave{height:190px}.bc-foot{flex-direction:column}.bc-recorder-launch{right:12px;bottom:12px}}
  `;
  document.head.appendChild(style);
}

function fmtDuration(ms) {
  const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} Б`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} КБ`;
  return `${(value / 1024 / 1024).toFixed(1)} МБ`;
}

function preferredMime() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  return candidates.find((item) => MediaRecorder.isTypeSupported?.(item)) || "";
}

function createShell() {
  if (document.getElementById(RECORDER_ID)) return document.getElementById(RECORDER_ID);
  const launcher = document.createElement("button");
  launcher.className = "bc-recorder-launch";
  launcher.type = "button";
  launcher.textContent = "🎙 Диктофон";

  const overlay = document.createElement("div");
  overlay.className = "bc-recorder-overlay";
  overlay.id = RECORDER_ID;
  overlay.innerHTML = `
    <section class="bc-recorder" role="dialog" aria-modal="true" aria-label="BOOK CRAFT Voice Recorder">
      <header class="bc-recorder-head">
        <div>
          <span class="bc-recorder-kicker">BOOK·CRAFT VOICE RECORDER</span>
          <h2>Премиум-диктофон</h2>
          <p>Чистая локальная запись с микрофона · этап 1 без расшифровки</p>
          <div class="bc-recorder-badges"><span class="bc-recorder-badge"><i></i> ЛОКАЛЬНАЯ ЗАПИСЬ</span><span class="bc-recorder-badge muted"><i></i> STT · ЭТАП 2</span></div>
        </div>
        <button class="bc-recorder-close" type="button" aria-label="Закрыть">×</button>
      </header>
      <div class="bc-recorder-stage">
        <div class="bc-wave"><canvas data-r="wave"></canvas><div class="bc-wave-grid"></div><div class="bc-wave-center"></div><div class="bc-timer"><span data-r="timer">00:00</span><small data-r="state">готов к записи</small></div><div class="bc-file-meta"><strong data-r="file-name">Новая запись</strong><span data-r="file-meta">микрофон · локально</span></div></div>
        <div class="bc-level"><label>Уровень голоса</label><div class="bc-level-bars">${Array.from({ length: 28 }, () => "<i></i>").join("")}</div><output data-r="level">0%</output></div>
      </div>
      <div class="bc-transport">
        <div class="bc-side"><button type="button" data-action="pause" disabled>Ⅱ Пауза</button><button type="button" data-action="upload">↑ Аудиофайл</button><input data-r="file-input" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm" hidden></div>
        <div class="bc-record-wrap"><button type="button" class="bc-record" data-action="record" aria-label="Начать запись"></button><div class="bc-record-caption" data-r="caption">Начать запись</div></div>
        <div class="bc-side right"><button type="button" data-action="stop" disabled>■ Стоп</button><button type="button" data-action="clear" disabled>Очистить</button></div>
      </div>
      <div class="bc-preview"><audio data-r="preview" controls preload="metadata"></audio><div class="bc-preview-actions"><a class="primary" data-r="download" href="#">↓ Сохранить запись</a><button type="button" class="danger" data-action="delete">Удалить запись</button></div></div>
      <div class="bc-status" data-r="status">Готов к новой записи. Нажмите красную кнопку и говорите обычным голосом.</div>
      <footer class="bc-foot"><span><b>Приватность:</b> запись остаётся в браузере до закрытия/удаления.</span><span><b>Дальше:</b> на этапе 2 подключим проверенную расшифровку.</span></footer>
    </section>`;
  document.body.append(launcher, overlay);
  return overlay;
}

function buildController(overlay) {
  const state = {
    recorder: null,
    stream: null,
    chunks: [],
    startedAt: 0,
    elapsedBeforePause: 0,
    timerId: null,
    audioContext: null,
    analyser: null,
    animationId: null,
    objectUrl: "",
    file: null,
  };

  const q = (selector) => overlay.querySelector(selector);
  const qa = (selector) => Array.from(overlay.querySelectorAll(selector));
  const setStatus = (text, kind = "") => {
    const node = q('[data-r="status"]');
    node.className = `bc-status ${kind}`.trim();
    node.textContent = text;
  };
  const setStateText = (text) => { q('[data-r="state"]').textContent = text; };
  const setClock = () => {
    const elapsed = state.elapsedBeforePause + (state.startedAt ? Date.now() - state.startedAt : 0);
    q('[data-r="timer"]').textContent = fmtDuration(elapsed);
  };
  const startClock = () => {
    clearInterval(state.timerId);
    setClock();
    state.timerId = window.setInterval(setClock, 200);
  };
  const stopClock = () => { clearInterval(state.timerId); state.timerId = null; setClock(); };
  const updateLevel = (value) => {
    const level = Math.max(0, Math.min(1, Number(value) || 0));
    q('[data-r="level"]').textContent = `${Math.round(level * 100)}%`;
    const bars = qa(".bc-level-bars i");
    const active = Math.round(level * bars.length);
    bars.forEach((bar, index) => {
      bar.classList.toggle("on", index < active);
      bar.classList.toggle("hot", index < active && level > .78);
    });
  };
  const drawIdle = () => {
    const canvas = q('[data-r="wave"]');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.beginPath();
    const mid = rect.height / 2;
    for (let x = 0; x <= rect.width; x += 4) {
      const y = mid + Math.sin(x / 34) * 2 + Math.sin(x / 11) * .7;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(108,160,215,.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    updateLevel(0);
  };
  const stopVisualizer = () => {
    if (state.animationId) cancelAnimationFrame(state.animationId);
    state.animationId = null;
    state.analyser = null;
    if (state.audioContext) state.audioContext.close().catch(() => {});
    state.audioContext = null;
  };
  const startVisualizer = (stream) => {
    stopVisualizer();
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    try {
      const context = new AudioContextCtor();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = .76;
      context.createMediaStreamSource(stream).connect(analyser);
      state.audioContext = context;
      state.analyser = analyser;
      const data = new Uint8Array(analyser.fftSize);
      const canvas = q('[data-r="wave"]');
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
        for (let i = 0; i < data.length; i += 1) {
          const normalized = (data[i] - 128) / 128;
          power += normalized * normalized;
          const x = (i / (data.length - 1)) * rect.width;
          const y = center + normalized * rect.height * .39;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        const rms = Math.sqrt(power / data.length);
        const level = Math.min(1, rms * 5.3);
        ctx.strokeStyle = level > .78 ? "rgba(240,118,82,.96)" : "rgba(106,202,160,.96)";
        ctx.lineWidth = 2;
        ctx.stroke();
        updateLevel(level);
        state.animationId = requestAnimationFrame(draw);
      };
      draw();
    } catch {
      drawIdle();
    }
  };
  const revokePreview = () => {
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = "";
  };
  const setPreview = (file) => {
    revokePreview();
    state.file = file;
    state.objectUrl = URL.createObjectURL(file);
    const preview = q(".bc-preview");
    const audio = q('[data-r="preview"]');
    const download = q('[data-r="download"]');
    preview.classList.add("ready");
    audio.src = state.objectUrl;
    audio.load();
    download.href = state.objectUrl;
    download.download = file.name || `bookcraft-recording-${Date.now()}.webm`;
    q('[data-r="file-name"]').textContent = file.name || "Запись";
    q('[data-r="file-meta"]').textContent = `${fmtBytes(file.size)} · ${file.type || "audio"}`;
    q('[data-action="clear"]').disabled = false;
    setStatus(`Запись готова · ${fmtBytes(file.size)}. Прослушайте или сохраните файл.`, "ready");
  };
  const clearPreview = () => {
    revokePreview();
    state.file = null;
    const audio = q('[data-r="preview"]');
    audio.removeAttribute("src");
    audio.load();
    q(".bc-preview").classList.remove("ready");
    q('[data-r="file-name"]').textContent = "Новая запись";
    q('[data-r="file-meta"]').textContent = "микрофон · локально";
    q('[data-action="clear"]').disabled = true;
    state.elapsedBeforePause = 0;
    state.startedAt = 0;
    setClock();
    setStateText("готов к записи");
    setStatus("Готов к новой записи. Нажмите красную кнопку и говорите обычным голосом.");
    drawIdle();
  };
  const stopTracks = () => {
    state.stream?.getTracks?.().forEach((track) => track.stop());
    state.stream = null;
  };
  const finishRecording = () => {
    stopClock();
    stopVisualizer();
    stopTracks();
    const mime = state.recorder?.mimeType || "audio/webm";
    const blob = new Blob(state.chunks, { type: mime });
    const ext = mime.includes("ogg") ? "ogg" : "webm";
    const file = new File([blob], `bookcraft-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`, { type: mime });
    q('[data-action="record"]').classList.remove("recording");
    q('[data-action="record"]').setAttribute("aria-label", "Начать запись");
    q('[data-action="pause"]').disabled = true;
    q('[data-action="pause"]').classList.remove("active");
    q('[data-action="pause"]').textContent = "Ⅱ Пауза";
    q('[data-action="stop"]').disabled = true;
    q('[data-r="caption"]').textContent = "Записать ещё";
    setStateText("запись готова");
    state.recorder = null;
    state.chunks = [];
    if (file.size) setPreview(file); else setStatus("Запись получилась пустой. Попробуйте ещё раз.", "error");
  };
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("Этот браузер не поддерживает запись с микрофона.", "error");
      return;
    }
    clearPreview();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const mime = preferredMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      state.stream = stream;
      state.recorder = recorder;
      state.chunks = [];
      state.elapsedBeforePause = 0;
      state.startedAt = Date.now();
      recorder.ondataavailable = (event) => { if (event.data?.size) state.chunks.push(event.data); };
      recorder.onstop = finishRecording;
      recorder.start(400);
      startVisualizer(stream);
      startClock();
      q('[data-action="record"]').classList.add("recording");
      q('[data-action="record"]').setAttribute("aria-label", "Остановить запись");
      q('[data-action="pause"]').disabled = false;
      q('[data-action="stop"]').disabled = false;
      q('[data-r="caption"]').textContent = "Идёт запись";
      setStateText("идёт запись");
      setStatus("Запись идёт. Говорите обычным голосом; индикатор показывает реальный уровень входа.", "busy");
    } catch {
      stopTracks();
      setStatus("Не удалось включить микрофон. Разрешите доступ браузеру и повторите.", "error");
    }
  };
  const stopRecording = () => {
    if (!state.recorder || !["recording", "paused"].includes(state.recorder.state)) return;
    if (state.startedAt) state.elapsedBeforePause += Date.now() - state.startedAt;
    state.startedAt = 0;
    state.recorder.stop();
  };
  const togglePause = () => {
    const recorder = state.recorder;
    if (!recorder) return;
    const button = q('[data-action="pause"]');
    if (recorder.state === "recording") {
      state.elapsedBeforePause += Date.now() - state.startedAt;
      state.startedAt = 0;
      recorder.pause();
      button.classList.add("active");
      button.textContent = "▶ Продолжить";
      setStateText("пауза");
      stopClock();
      setStatus("Запись на паузе.", "busy");
    } else if (recorder.state === "paused") {
      recorder.resume();
      state.startedAt = Date.now();
      button.classList.remove("active");
      button.textContent = "Ⅱ Пауза";
      setStateText("идёт запись");
      startClock();
      setStatus("Запись продолжена.", "busy");
    }
  };

  q(".bc-recorder-close").addEventListener("click", () => {
    if (state.recorder && state.recorder.state !== "inactive") stopRecording();
    overlay.classList.remove("open");
  });
  overlay.addEventListener("click", (event) => { if (event.target === overlay) overlay.classList.remove("open"); });
  q('[data-action="record"]').addEventListener("click", () => {
    if (state.recorder && ["recording", "paused"].includes(state.recorder.state)) stopRecording(); else startRecording();
  });
  q('[data-action="pause"]').addEventListener("click", togglePause);
  q('[data-action="stop"]').addEventListener("click", stopRecording);
  q('[data-action="clear"]').addEventListener("click", clearPreview);
  q('[data-action="delete"]').addEventListener("click", clearPreview);
  q('[data-action="upload"]').addEventListener("click", () => q('[data-r="file-input"]').click());
  q('[data-r="file-input"]').addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    clearPreview();
    setPreview(file);
    setStateText("файл загружен");
  });
  window.addEventListener("beforeunload", revokePreview);
  drawIdle();
  return { open: () => { overlay.classList.add("open"); drawIdle(); } };
}

export function mountPremiumVoiceRecorder() {
  injectStyles();
  const overlay = createShell();
  if (overlay.dataset.mounted === "1") return;
  overlay.dataset.mounted = "1";
  const controller = buildController(overlay);
  const launcher = document.querySelector(".bc-recorder-launch");
  launcher?.addEventListener("click", controller.open);
}
