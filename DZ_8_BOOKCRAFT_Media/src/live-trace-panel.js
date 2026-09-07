const TRACE_API = "http://127.0.0.1:8018/api/trace/recent?limit=180";
const RUNTIME_API = "http://127.0.0.1:8018/api/models/runtime";
const FAILURES_API = "http://127.0.0.1:8018/api/models/failures";
const READINESS_API = "http://127.0.0.1:8018/api/readiness";
const UI_TRACE_API = "http://127.0.0.1:8018/api/trace/ui-event";
const PANEL_OPEN_KEY = "bookcraft.trace.panel.open.v1";

const MODEL_EVENTS = new Set([
  "llm.switch.request",
  "llm.switch.ready",
  "llm.switch.error",
  "llm.model.unload",
  "llm.model.load.start",
  "llm.model.load.finish",
  "llm.route",
  "llm.route.quarantine",
  "llm.route.fallback",
  "llm.forward.finish",
  "llm.forward.error",
]);

function readJson(response) {
  return response.json().catch(() => ({}));
}

async function postUiTrace(event, data = {}) {
  try {
    await fetch(UI_TRACE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, source: "bookcraft-ui", data }),
    });
  } catch {
    // Observability must never block the editor.
  }
}

function short(value, max = 58) {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function eventModel(event) {
  return event.target_model || event.model || event.selected_model || event.failed_model || event.instance_id || "";
}

function humanEvent(event) {
  const model = short(eventModel(event));
  const map = {
    "llm.switch.request": `СМЕНА → ${model || "модель"}`,
    "llm.switch.ready": `АКТИВНА → ${model || "модель"}`,
    "llm.switch.error": `ОШИБКА СМЕНЫ → ${model || "модель"}`,
    "llm.model.unload": `ВЫГРУЗКА → ${model || "instance"}`,
    "llm.model.load.start": `ЗАГРУЗКА → ${model || "модель"}`,
    "llm.model.load.finish": `ПОДНЯТА → ${model || "модель"}`,
    "llm.route": `ROUTER → ${model || "модель"}`,
    "llm.route.quarantine": `КАРАНТИН → ${model || "модель"}`,
    "llm.route.fallback": `FALLBACK после ${model || "ошибки"}`,
    "llm.forward.finish": `ОТВЕТ ← ${model || "модель"}`,
    "llm.forward.error": `ОШИБКА INFERENCE ← ${model || "модель"}`,
  };
  if (map[event.event]) return map[event.event];
  if (String(event.event || "").startsWith("ui.agent.")) {
    return `UI → ${short(event.event.replace("ui.agent.", "agent."))} ${short(event.model || event.preset || "")}`;
  }
  return short(event.event || "event", 72);
}

function eventKind(event) {
  const name = String(event.event || "");
  const statusCode = Number(event.status_code || 0);
  if (name.includes("error") || name.includes("quarantine") || statusCode >= 400) return "error";
  if (name.includes("finish") || name.includes("ready")) return "ready";
  if (name.includes("start") || name.includes("request") || name.includes("fallback")) return "busy";
  return "info";
}

function buildPanel() {
  if (document.getElementById("bookcraft-live-trace")) return document.getElementById("bookcraft-live-trace");
  const root = document.createElement("aside");
  root.id = "bookcraft-live-trace";
  root.innerHTML = `
    <button class="trace-toggle" type="button"><b>TRACE</b><span class="trace-dot"></span><em>IDLE</em></button>
    <section class="trace-drawer" hidden>
      <header>
        <div><strong>LIVE TRACE · MODEL LIFECYCLE</strong><small>что сейчас происходит и почему</small></div>
        <button type="button" data-action="close">×</button>
      </header>
      <div class="trace-summary">
        <div><span>Gateway</span><b data-field="gateway">…</b></div>
        <div><span>LM Studio</span><b data-field="lm">…</b></div>
        <div><span>В памяти</span><b data-field="loaded">…</b></div>
      </div>
      <div class="trace-diagnosis" data-field="diagnosis">Получаю состояние…</div>
      <div class="trace-actions">
        <label><input type="checkbox" data-action="models-only" checked /> только модели/агенты</label>
        <button type="button" data-action="refresh">Обновить</button>
        <button type="button" data-action="download">Скачать JSON</button>
      </div>
      <div class="trace-events" data-field="events"></div>
    </section>
  `;
  const style = document.createElement("style");
  style.id = "bookcraft-live-trace-style";
  style.textContent = `
    #bookcraft-live-trace{position:fixed;left:16px;bottom:16px;z-index:10020;font:12px/1.35 Inter,system-ui,sans-serif;color:#dbe6f7}
    #bookcraft-live-trace .trace-toggle{display:flex;gap:7px;align-items:center;border:1px solid rgba(120,180,255,.35);border-radius:12px;padding:9px 11px;background:rgba(10,16,28,.94);color:#e9f2ff;box-shadow:0 12px 36px rgba(0,0,0,.35);cursor:pointer}
    #bookcraft-live-trace .trace-toggle em{font-style:normal;font-size:10px;color:#9fb0c8}
    #bookcraft-live-trace .trace-dot{width:8px;height:8px;border-radius:50%;background:#7c8ba1;box-shadow:0 0 10px currentColor}
    #bookcraft-live-trace[data-state="ready"] .trace-dot{background:#59d990}#bookcraft-live-trace[data-state="busy"] .trace-dot{background:#f4c95d}#bookcraft-live-trace[data-state="error"] .trace-dot{background:#ff6f78}
    #bookcraft-live-trace .trace-drawer{position:absolute;left:0;bottom:48px;width:min(560px,calc(100vw - 32px));max-height:72vh;overflow:hidden;border:1px solid rgba(120,180,255,.25);border-radius:16px;background:rgba(10,16,28,.97);box-shadow:0 24px 70px rgba(0,0,0,.5);backdrop-filter:blur(18px)}
    #bookcraft-live-trace header{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.09)}
    #bookcraft-live-trace header div{display:flex;flex-direction:column;gap:2px}#bookcraft-live-trace header small{color:#8393aa}#bookcraft-live-trace header button{border:0;background:transparent;color:#c9d4e5;font-size:24px;cursor:pointer}
    #bookcraft-live-trace .trace-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:10px 12px}.trace-summary div{padding:8px;border-radius:10px;background:rgba(255,255,255,.045)}.trace-summary span{display:block;color:#7f90a8;font-size:10px}.trace-summary b{display:block;margin-top:3px;word-break:break-word}
    #bookcraft-live-trace .trace-diagnosis{margin:0 12px 10px;padding:10px 11px;border-radius:10px;background:rgba(85,135,205,.11);border:1px solid rgba(100,160,240,.18);white-space:pre-wrap}
    #bookcraft-live-trace[data-state="error"] .trace-diagnosis{background:rgba(220,70,80,.11);border-color:rgba(255,100,110,.25);color:#ffc3c7}
    #bookcraft-live-trace[data-state="busy"] .trace-diagnosis{background:rgba(230,175,60,.10);border-color:rgba(240,190,70,.22);color:#f8df9c}
    #bookcraft-live-trace .trace-actions{display:flex;align-items:center;gap:8px;padding:0 12px 10px;flex-wrap:wrap}.trace-actions label{margin-right:auto;color:#8fa0b7}.trace-actions button{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#dbe6f7;border-radius:8px;padding:6px 8px;cursor:pointer}
    #bookcraft-live-trace .trace-events{max-height:42vh;overflow:auto;padding:0 12px 12px}.trace-event{display:grid;grid-template-columns:68px 86px 1fr;gap:7px;padding:7px 0;border-top:1px solid rgba(255,255,255,.055)}.trace-event time{color:#718198}.trace-event code{font:10px ui-monospace,Consolas,monospace;color:#8fa7c8}.trace-event strong{font-weight:550;word-break:break-word}.trace-event[data-kind="error"] strong{color:#ffadb4}.trace-event[data-kind="ready"] strong{color:#9ce4bd}.trace-event[data-kind="busy"] strong{color:#f0d48b}
    @media(max-width:700px){#bookcraft-live-trace{left:8px;bottom:8px}.trace-event{grid-template-columns:58px 1fr}.trace-event code{display:none}}
  `;
  document.head.appendChild(style);
  document.body.appendChild(root);
  return root;
}

function terminalAfterStart(start, events) {
  const startTime = Date.parse(start.timestamp || "") || 0;
  const model = eventModel(start);
  return events.find((event) => {
    const time = Date.parse(event.timestamp || "") || 0;
    if (time <= startTime) return false;
    const sameRequest = start.request_id && event.request_id === start.request_id;
    const sameModel = model && eventModel(event) === model;
    if (!sameRequest && !sameModel) return false;
    const name = String(event.event || "");
    return name === "llm.model.load.finish" || name === "llm.switch.ready" || name === "llm.switch.error" || name === "llm.route.quarantine" || (name === "http.request.finish" && Number(event.status_code || 0) >= 400);
  });
}

function diagnose(events, runtime, failures) {
  const modelEvents = events.filter((event) => MODEL_EVENTS.has(String(event.event || "")) || String(event.event || "").startsWith("ui.agent."));
  const lastError = [...modelEvents].reverse().find((event) => eventKind(event) === "error");
  const starts = modelEvents.filter((event) => event.event === "llm.model.load.start");
  const lastStart = starts.at(-1);
  if (lastStart && !terminalAfterStart(lastStart, events)) {
    const ageSec = Math.max(0, Math.round((Date.now() - (Date.parse(lastStart.timestamp || "") || Date.now())) / 1000));
    const model = short(eventModel(lastStart));
    if (ageSec > 210) return { state: "error", text: `ВЕРОЯТНО ЗАВИСЛО: ${model}. Загрузка началась ${ageSec} сек назад и не завершилась. Откройте последние события ниже.` };
    return { state: "busy", text: `ИДЁТ ЗАГРУЗКА: ${model}. Прошло ${ageSec} сек. Пока нет события READY/ERROR.` };
  }
  if (lastError) {
    const detail = lastError.detail || lastError.error || lastError.category || "см. событие ниже";
    return { state: "error", text: `ПОСЛЕДНЯЯ ОШИБКА: ${humanEvent(lastError)}\n${short(detail, 240)}` };
  }
  const loaded = (runtime?.models || []).filter((item) => item?.loaded);
  if (loaded.length) return { state: "ready", text: `ГОТОВО: в памяти ${loaded.map((item) => item.display_name || item.id).join(", ")}.` };
  const quarantined = failures?.failures || [];
  if (quarantined.length) return { state: "error", text: `Нет активной модели. В карантине: ${quarantined.map((item) => item.model).join(", ")}.` };
  return { state: "info", text: "Активная модель не загружена. Выберите модель или оставьте AUTO и отправьте запрос." };
}

async function loadSnapshot() {
  const [traceRes, runtimeRes, failuresRes, readinessRes] = await Promise.all([
    fetch(TRACE_API), fetch(RUNTIME_API), fetch(FAILURES_API), fetch(READINESS_API),
  ]);
  return {
    trace: traceRes.ok ? await readJson(traceRes) : { events: [] },
    runtime: runtimeRes.ok ? await readJson(runtimeRes) : { models: [] },
    failures: failuresRes.ok ? await readJson(failuresRes) : { failures: [] },
    readiness: readinessRes.ok ? await readJson(readinessRes) : {},
  };
}

function render(root, snapshot) {
  const events = Array.isArray(snapshot.trace?.events) ? snapshot.trace.events : [];
  const runtime = snapshot.runtime || { models: [] };
  const failures = snapshot.failures || { failures: [] };
  const readiness = snapshot.readiness || {};
  const diagnosis = diagnose(events, runtime, failures);
  root.dataset.state = diagnosis.state;
  root.querySelector(".trace-toggle em").textContent = diagnosis.state.toUpperCase();
  root.querySelector('[data-field="diagnosis"]').textContent = diagnosis.text;
  root.querySelector('[data-field="gateway"]').textContent = readiness?.media_gateway?.ready === false ? "ERROR" : "READY";
  root.querySelector('[data-field="lm"]').textContent = readiness?.llm?.ready ? "READY" : readiness?.llm?.status || "…";
  const loaded = (runtime.models || []).filter((item) => item?.loaded);
  root.querySelector('[data-field="loaded"]').textContent = loaded.length ? loaded.map((item) => short(item.display_name || item.id, 30)).join(", ") : "нет";

  const modelsOnly = root.querySelector('[data-action="models-only"]')?.checked !== false;
  const visible = events.filter((event) => !modelsOnly || MODEL_EVENTS.has(String(event.event || "")) || String(event.event || "").startsWith("ui.agent."));
  const holder = root.querySelector('[data-field="events"]');
  holder.replaceChildren();
  for (const event of visible.slice(-80).reverse()) {
    const row = document.createElement("div");
    row.className = "trace-event";
    row.dataset.kind = eventKind(event);
    const date = new Date(event.timestamp || Date.now());
    row.innerHTML = `<time>${date.toLocaleTimeString("ru-RU")}</time><code>${short(event.request_id || "—", 12)}</code><strong></strong>`;
    row.querySelector("strong").textContent = humanEvent(event);
    row.title = JSON.stringify(event, null, 2);
    holder.appendChild(row);
  }

  if (diagnosis.state === "error") {
    const drawer = root.querySelector(".trace-drawer");
    if (drawer.hidden && localStorage.getItem(PANEL_OPEN_KEY) !== "0") drawer.hidden = false;
  }
  root._lastSnapshot = snapshot;
}

async function refresh(root) {
  try {
    render(root, await loadSnapshot());
  } catch (error) {
    root.dataset.state = "error";
    root.querySelector(".trace-toggle em").textContent = "OFFLINE";
    root.querySelector('[data-field="diagnosis"]').textContent = `Trace API недоступен: ${error.message}`;
  }
}

function wireUiActionTracing(root) {
  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (target.closest(".model-gateway") && Array.from(target.options).some((option) => option.value === "auto")) {
      postUiTrace("agent.local.select", { model: target.value || "auto" });
    }
  }, true);
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.(".bookcraft-agent-switcher button, .model-source-switch button");
    if (!button) return;
    postUiTrace("agent.control.click", { control: short(button.textContent || "button", 120) });
  }, true);

  root.querySelector(".trace-toggle").addEventListener("click", () => {
    const drawer = root.querySelector(".trace-drawer");
    drawer.hidden = !drawer.hidden;
    localStorage.setItem(PANEL_OPEN_KEY, drawer.hidden ? "0" : "1");
    if (!drawer.hidden) refresh(root);
  });
  root.querySelector('[data-action="close"]').addEventListener("click", () => {
    root.querySelector(".trace-drawer").hidden = true;
    localStorage.setItem(PANEL_OPEN_KEY, "0");
  });
  root.querySelector('[data-action="refresh"]').addEventListener("click", () => refresh(root));
  root.querySelector('[data-action="models-only"]').addEventListener("change", () => root._lastSnapshot && render(root, root._lastSnapshot));
  root.querySelector('[data-action="download"]').addEventListener("click", () => {
    if (!root._lastSnapshot) return;
    const blob = new Blob([JSON.stringify(root._lastSnapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bookcraft-live-trace-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });
}

export function mountLiveTracePanel() {
  const root = buildPanel();
  if (localStorage.getItem(PANEL_OPEN_KEY) === "1") root.querySelector(".trace-drawer").hidden = false;
  wireUiActionTracing(root);
  refresh(root);
  window.setInterval(() => refresh(root), 1500);
}
