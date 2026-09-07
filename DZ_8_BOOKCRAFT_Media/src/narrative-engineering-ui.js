const TRACE_API = "http://127.0.0.1:8018/api/trace/ui-event";
const RUNTIME_API = "http://127.0.0.1:8018/api/models/runtime";
const READINESS_API = "http://127.0.0.1:8018/api/readiness";
const COMFY_API = "http://127.0.0.1:8018/api/comfy/health";
const VIEW_KEY = "bookcraft.engineering.view.v1";

const VIEWS = [
  { id: "whole", label: "Целиком", page: "PAGE 3A · ПРОИЗВЕДЕНИЕ ЦЕЛИКОМ" },
  { id: "scenes", label: "Сцены", page: "PAGE 3B · КОНСТРУКТОР СЦЕН" },
  { id: "characters", label: "Персонажи", page: "PAGE 3C · БАЗА ПЕРСОНАЖЕЙ" },
  { id: "comic", label: "Комикс", page: "PAGE 3D · COMIC STORYBOARD" },
  { id: "video", label: "Видео", page: "PAGE 3E · VIDEO PIPELINE" },
];

function trace(event, data = {}) {
  fetch(TRACE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, source: "narrative-engineering-ui", data }),
  }).catch(() => {});
}

function readJson(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}

function injectStyles() {
  if (document.getElementById("bookcraft-engineering-ui-style")) return;
  const style = document.createElement("style");
  style.id = "bookcraft-engineering-ui-style";
  style.textContent = `
    body.bookcraft-engineering-active .diagnostic-panel,
    body.bookcraft-engineering-active .model-gateway,
    body.bookcraft-engineering-active .knowledge-panel,
    body.bookcraft-engineering-active .blueprint{display:none!important}
    body.bookcraft-engineering-active.bookcraft-tech-reveal .diagnostic-panel,
    body.bookcraft-engineering-active.bookcraft-tech-reveal .model-gateway,
    body.bookcraft-engineering-active.bookcraft-tech-reveal .knowledge-panel,
    body.bookcraft-engineering-active.bookcraft-tech-reveal .blueprint{display:block!important}

    .bookcraft-engineering-ribbon{position:sticky;top:0;z-index:1005;display:flex;align-items:center;gap:9px;padding:9px 14px;margin:0 0 12px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(9,14,24,.91);backdrop-filter:blur(18px);box-shadow:0 8px 25px rgba(0,0,0,.15)}
    .engineering-project-name{min-width:180px;margin-right:8px}.engineering-project-name span{display:block;color:#74879f;font-size:9px;text-transform:uppercase;letter-spacing:.14em}.engineering-project-name strong{display:block;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
    .engineering-view-tabs{display:flex;gap:5px;flex:1;justify-content:center}.engineering-view-tabs button,.engineering-underhood-button{border:1px solid rgba(255,255,255,.11);border-radius:9px;padding:7px 10px;background:rgba(255,255,255,.045);color:#b9c6d8;cursor:pointer;font-size:11px}.engineering-view-tabs button.active{color:#f5f8fd;border-color:rgba(110,175,255,.4);background:rgba(75,115,190,.16)}
    .engineering-underhood-button{margin-left:auto;color:#d8e3f2;border-color:rgba(164,129,244,.3)}

    body[data-engineering-view="whole"] .chat-panel{display:none!important}
    body[data-engineering-view="whole"] .workspace-grid{grid-template-columns:1fr!important}
    body[data-engineering-view="whole"] .script-sections{display:none!important}
    body[data-engineering-view="whole"] .character-bible{display:none!important}

    body[data-engineering-view="scenes"] .chat-panel{display:none!important}
    body[data-engineering-view="scenes"] .workspace-grid{grid-template-columns:1fr!important}
    body[data-engineering-view="scenes"] .character-bible{display:none!important}
    body[data-engineering-view="scenes"] .voice-studio,
    body[data-engineering-view="scenes"] .illustration-studio{display:none!important}

    body[data-engineering-view="characters"] .workspace-grid{display:none!important}
    body[data-engineering-view="characters"] .character-bible{display:block!important}

    body[data-engineering-view="comic"] .chat-panel{display:none!important}
    body[data-engineering-view="comic"] .workspace-grid{grid-template-columns:1fr!important}
    body[data-engineering-view="comic"] .character-bible{display:none!important}
    body[data-engineering-view="comic"] .script-block,
    body[data-engineering-view="comic"] .voice-studio{display:none!important}
    body[data-engineering-view="comic"] .illustration-studio{display:block!important}

    body[data-engineering-view="video"] .workspace-grid,
    body[data-engineering-view="video"] .character-bible{display:none!important}

    .engineering-whole-canvas{display:none;max-width:1060px;margin:0 auto 24px;padding:clamp(24px,4vw,54px);border:1px solid rgba(255,255,255,.08);border-radius:20px;background:linear-gradient(150deg,rgba(25,28,42,.82),rgba(12,21,29,.88));box-shadow:0 22px 70px rgba(0,0,0,.18)}
    body[data-engineering-view="whole"] .engineering-whole-canvas{display:block}
    .engineering-whole-canvas header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:28px}.engineering-whole-canvas header span{color:#7f91a9;font-size:9px;letter-spacing:.16em;text-transform:uppercase}.engineering-whole-canvas header h2{font-size:30px;margin:3px 0 0}.engineering-whole-canvas header button{border:1px solid rgba(100,175,255,.25);border-radius:9px;padding:8px 10px;background:rgba(85,135,210,.09);color:#dbe8fa;cursor:pointer}
    .engineering-manuscript{font:17px/1.82 Georgia,"Times New Roman",serif;color:#dce3ec;white-space:pre-wrap}.engineering-manuscript .empty{font-family:Inter,system-ui,sans-serif;color:#75869c;font-size:13px}

    .engineering-scene-board{display:none;margin:0 0 16px;padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:16px;background:rgba(17,24,36,.62)}
    body[data-engineering-view="scenes"] .engineering-scene-board{display:block}
    .engineering-scene-board header{display:flex;justify-content:space-between;align-items:end;margin-bottom:10px}.engineering-scene-board h3{margin:0;font-size:16px}.engineering-scene-board small{color:#788ca5}.engineering-scene-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}.engineering-scene-card{padding:12px;border:1px solid rgba(255,255,255,.075);border-radius:12px;background:rgba(255,255,255,.035)}.engineering-scene-card b{display:block;font-size:12px}.engineering-scene-card span{display:block;color:#8496ad;font-size:10px;margin:4px 0 8px}.engineering-scene-card p{margin:0;color:#aab7c9;font-size:10px;line-height:1.45;max-height:58px;overflow:hidden}

    .engineering-video-board{display:none;max-width:1100px;margin:22px auto;padding:22px;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:rgba(16,23,34,.76)}
    body[data-engineering-view="video"] .engineering-video-board{display:block}.engineering-video-board h2{margin:0 0 5px}.engineering-video-board>p{margin:0 0 18px;color:#8596ae}.engineering-video-pipeline{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.engineering-video-pipeline article{padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.035)}.engineering-video-pipeline b{display:block;margin-bottom:4px}.engineering-video-pipeline span{color:#8293aa;font-size:10px}

    .bookcraft-underhood{position:fixed;inset:0 0 0 auto;width:min(410px,100vw);z-index:10150;transform:translateX(103%);transition:.2s ease;background:rgba(8,13,22,.98);border-left:1px solid rgba(255,255,255,.1);box-shadow:-28px 0 80px rgba(0,0,0,.38);color:#e8eff9;padding:18px;overflow:auto}.bookcraft-underhood.open{transform:translateX(0)}
    .bookcraft-underhood header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:18px}.bookcraft-underhood header span{color:#7f91aa;font-size:10px}.bookcraft-underhood header h2{margin:2px 0 0}.bookcraft-underhood header button{border:0;background:transparent;color:#c8d4e5;font-size:25px;cursor:pointer}
    .underhood-metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}.underhood-metrics div{padding:10px;border-radius:10px;background:rgba(255,255,255,.045)}.underhood-metrics span{display:block;color:#7d90aa;font-size:9px}.underhood-metrics b{display:block;margin-top:3px;font-size:11px;word-break:break-word}
    .underhood-actions{display:grid;gap:7px}.underhood-actions button{border:1px solid rgba(255,255,255,.11);border-radius:10px;padding:10px;text-align:left;background:rgba(255,255,255,.045);color:#dfe8f5;cursor:pointer}.underhood-actions button small{display:block;color:#788da8;margin-top:3px}.underhood-note{margin-top:14px;padding:10px;border:1px solid rgba(120,95,220,.15);border-radius:10px;color:#8798b0;font-size:10px;background:rgba(100,75,190,.06)}

    @media(max-width:800px){.engineering-project-name{display:none}.engineering-view-tabs{overflow:auto;justify-content:flex-start}.engineering-view-tabs button{white-space:nowrap}.engineering-video-pipeline{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);
}

function projectTitle() {
  const activeId = localStorage.getItem("bookcraft.author.active-project.v1");
  const projects = readJson("bookcraft.author.projects.v1", []);
  const item = Array.isArray(projects) ? projects.find((project) => project.id === activeId) : null;
  return item?.title || document.querySelector(".workspace-heading strong")?.textContent?.trim() || "Произведение";
}

function textAreas() {
  return Array.from(document.querySelectorAll(".script-block textarea"));
}

function refreshWholeCanvas(root) {
  const canvas = root.querySelector(".engineering-whole-canvas");
  if (!canvas) return;
  const parts = textAreas().map((area) => area.value.trim()).filter(Boolean);
  const manuscript = canvas.querySelector(".engineering-manuscript");
  manuscript.replaceChildren();
  if (!parts.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Текст пока пуст. Перейдите в «Сцены», чтобы начать конструировать произведение.";
    manuscript.appendChild(empty);
    return;
  }
  manuscript.textContent = parts.join("\n\n");
}

function refreshSceneBoard(root) {
  const board = root.querySelector(".engineering-scene-board");
  if (!board) return;
  const holder = board.querySelector(".engineering-scene-cards");
  holder.replaceChildren();
  const titles = ["Вступление", "Развитие", "Финал"];
  let count = 0;
  textAreas().forEach((area, sectionIndex) => {
    const text = area.value.trim();
    if (!text) return;
    const chunks = text.split(/\n\s*\n+/).map((item) => item.trim()).filter(Boolean);
    const scenes = chunks.length ? chunks : [text];
    scenes.forEach((scene, index) => {
      count += 1;
      const card = document.createElement("article");
      card.className = "engineering-scene-card";
      card.innerHTML = `<b>SC-${String(count).padStart(2,"0")} · ${titles[sectionIndex] || "Сцена"}</b><span>${scene.length} символов · черновая граница сцены</span><p></p>`;
      card.querySelector("p").textContent = scene.slice(0, 260);
      holder.appendChild(card);
    });
  });
  board.querySelector("header small").textContent = count ? `${count} черновых сцен · затем подключим AI Scene Parser` : "текст ещё не добавлен";
}

function createWorkspaceExtras(root) {
  if (!root.querySelector(".engineering-whole-canvas")) {
    const scriptPanel = root.querySelector(".script-panel");
    const canvas = document.createElement("section");
    canvas.className = "engineering-whole-canvas";
    canvas.innerHTML = `<header><div><span>MANUSCRIPT VIEW</span><h2></h2></div><button type="button">Редактировать по сценам</button></header><div class="engineering-manuscript"></div>`;
    canvas.querySelector("h2").textContent = projectTitle();
    canvas.querySelector("button").addEventListener("click", () => setView(root, "scenes"));
    scriptPanel?.prepend(canvas);
  }
  if (!root.querySelector(".engineering-scene-board")) {
    const sections = root.querySelector(".script-sections");
    const board = document.createElement("section");
    board.className = "engineering-scene-board";
    board.innerHTML = `<header><div><h3>Карта сцен</h3><small></small></div><span>текст → сцены → биты → кадры</span></header><div class="engineering-scene-cards"></div>`;
    sections?.insertAdjacentElement("beforebegin", board);
  }
  if (!root.querySelector(".engineering-video-board")) {
    const board = document.createElement("section");
    board.className = "engineering-video-board";
    board.innerHTML = `<h2>Video Engineering Pipeline</h2><p>Видео строится из тех же сцен и канона, что и рассказ и комикс.</p><div class="engineering-video-pipeline">
      <article><b>01 · Сцены</b><span>выбираем драматургические эпизоды</span></article>
      <article><b>02 · Шоты</b><span>ракурс, движение, длительность</span></article>
      <article><b>03 · Визуал</b><span>кадры и постоянные герои</span></article>
      <article><b>04 · Звук</b><span>голоса, музыка, эффекты, субтитры</span></article>
      <article><b>05 · Монтаж</b><span>timeline и экспорт ролика</span></article>
    </div>`;
    root.querySelector(".workspace-grid")?.insertAdjacentElement("afterend", board);
  }
  refreshWholeCanvas(root);
  refreshSceneBoard(root);
}

async function refreshUnderhood(root) {
  const drawer = root.querySelector(".bookcraft-underhood");
  if (!drawer) return;
  const [runtime, readiness, comfy] = await Promise.all([
    fetch(RUNTIME_API).then((r) => r.ok ? r.json() : {}).catch(() => ({})),
    fetch(READINESS_API).then((r) => r.ok ? r.json() : {}).catch(() => ({})),
    fetch(COMFY_API).then((r) => r.ok ? r.json() : {}).catch(() => ({})),
  ]);
  const loaded = (runtime?.models || []).filter((item) => item?.loaded).map((item) => item.display_name || item.id);
  const sources = readJson("bookcraft.sources", []);
  const characters = readJson("bookcraft.characters", []);
  const set = (name, value) => { const el = drawer.querySelector(`[data-underhood="${name}"]`); if (el) el.textContent = value; };
  set("model", loaded.join(", ") || "нет");
  set("lm", readiness?.llm?.ready ? "READY" : readiness?.llm?.status || "…");
  set("sources", String(Array.isArray(sources) ? sources.length : 0));
  set("characters", String(Array.isArray(characters) ? characters.length : 0));
  set("comfy", comfy?.ready ? `READY · ${comfy.checkpoints?.length || 0} checkpoint` : comfy?.status || "OFF");
}

function openTechnicalSection(root, selector) {
  document.body.classList.add("bookcraft-tech-reveal");
  const node = root.querySelector(selector);
  if (node?.tagName === "DETAILS") node.open = true;
  node?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildUnderhood(root) {
  if (root.querySelector(".bookcraft-underhood")) return;
  const drawer = document.createElement("aside");
  drawer.className = "bookcraft-underhood";
  drawer.innerHTML = `<header><div><span>ENGINEERING LAYER</span><h2>⚙ Под капотом</h2></div><button type="button" aria-label="Закрыть">×</button></header>
    <div class="underhood-metrics">
      <div><span>LM Studio</span><b data-underhood="lm">…</b></div>
      <div><span>Активная модель</span><b data-underhood="model">…</b></div>
      <div><span>Источники памяти</span><b data-underhood="sources">0</b></div>
      <div><span>Персонажи</span><b data-underhood="characters">0</b></div>
      <div><span>Image backend</span><b data-underhood="comfy">…</b></div>
      <div><span>Trace</span><b>append-only JSONL</b></div>
    </div>
    <div class="underhood-actions">
      <button type="button" data-open=".model-gateway"><b>AI / модели</b><small>AUTO, локальные и внешние агенты, runtime switching</small></button>
      <button type="button" data-open=".knowledge-panel"><b>Память / источники</b><small>канон, документы, RAG-контекст</small></button>
      <button type="button" data-open=".diagnostic-panel"><b>Диагностика</b><small>события UI, ошибки и состояние сервисов</small></button>
      <button type="button" data-action="trace"><b>Live TRACE</b><small>клики, ожидания, модели, fallback и зависания</small></button>
      <button type="button" data-action="hide-tech"><b>Скрыть технические панели</b><small>вернуться к чистому авторскому интерфейсу</small></button>
    </div>
    <div class="underhood-note">Автор работает с произведением. Инженерный слой открывается только по запросу и не должен мешать чтению, редактированию и конструированию сцен.</div>`;
  drawer.querySelector("header button").addEventListener("click", () => drawer.classList.remove("open"));
  for (const button of drawer.querySelectorAll("[data-open]")) button.addEventListener("click", () => { drawer.classList.remove("open"); openTechnicalSection(root, button.dataset.open); });
  drawer.querySelector('[data-action="trace"]').addEventListener("click", () => { drawer.classList.remove("open"); document.querySelector("#bookcraft-live-trace .trace-toggle")?.click(); });
  drawer.querySelector('[data-action="hide-tech"]').addEventListener("click", () => { document.body.classList.remove("bookcraft-tech-reveal"); drawer.classList.remove("open"); });
  root.appendChild(drawer);
}

function setView(root, viewId) {
  const meta = VIEWS.find((item) => item.id === viewId) || VIEWS[0];
  document.body.dataset.engineeringView = meta.id;
  sessionStorage.setItem(VIEW_KEY, meta.id);
  for (const button of root.querySelectorAll(".engineering-view-tabs button")) button.classList.toggle("active", button.dataset.view === meta.id);
  if (meta.id === "characters") {
    const node = root.querySelector(".character-bible");
    if (node?.tagName === "DETAILS") node.open = true;
  }
  if (meta.id === "comic") {
    root.querySelector(".illustration-studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  refreshWholeCanvas(root);
  refreshSceneBoard(root);
  trace("page.engineering.view", { page: meta.page, view: meta.id, project: projectTitle() });
}

function buildRibbon(root) {
  if (root.querySelector(".bookcraft-engineering-ribbon")) return;
  const header = root.querySelector(".workspace-header");
  if (!header) return;
  const ribbon = document.createElement("nav");
  ribbon.className = "bookcraft-engineering-ribbon";
  ribbon.innerHTML = `<div class="engineering-project-name"><span>NARRATIVE PROJECT</span><strong></strong></div><div class="engineering-view-tabs"></div><button class="engineering-underhood-button" type="button">⚙ Под капотом</button>`;
  ribbon.querySelector(".engineering-project-name strong").textContent = projectTitle();
  const tabs = ribbon.querySelector(".engineering-view-tabs");
  for (const view of VIEWS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.view = view.id;
    button.textContent = view.label;
    button.addEventListener("click", () => setView(root, view.id));
    tabs.appendChild(button);
  }
  ribbon.querySelector(".engineering-underhood-button").addEventListener("click", () => {
    const drawer = root.querySelector(".bookcraft-underhood");
    drawer?.classList.toggle("open");
    refreshUnderhood(root);
    trace("engineering.underhood.toggle", { open: Boolean(drawer?.classList.contains("open")) });
  });
  header.insertAdjacentElement("afterend", ribbon);
}

function wireTextRefresh(root) {
  if (root.dataset.engineeringTextWired === "1") return;
  root.dataset.engineeringTextWired = "1";
  root.addEventListener("input", (event) => {
    if (!event.target?.matches?.(".script-block textarea")) return;
    window.clearTimeout(root._engineeringRefreshTimer);
    root._engineeringRefreshTimer = window.setTimeout(() => { refreshWholeCanvas(root); refreshSceneBoard(root); }, 180);
  });
}

function enhanceWorkspace() {
  const root = document.querySelector(".workspace-shell");
  if (!root || root.dataset.narrativeEngineering === "1") return;
  root.dataset.narrativeEngineering = "1";
  document.body.classList.add("bookcraft-engineering-active");
  buildRibbon(root);
  createWorkspaceExtras(root);
  buildUnderhood(root);
  wireTextRefresh(root);
  const saved = sessionStorage.getItem(VIEW_KEY);
  setView(root, VIEWS.some((item) => item.id === saved) ? saved : "whole");
}

export function mountNarrativeEngineeringUi() {
  injectStyles();
  const observer = new MutationObserver(enhanceWorkspace);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  enhanceWorkspace();
}
