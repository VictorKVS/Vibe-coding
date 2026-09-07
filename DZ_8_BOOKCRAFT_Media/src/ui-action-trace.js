const TRACE_API = "http://127.0.0.1:8018/api/trace/ui-event";
const PENDING_KEY = "bookcraft.ui.pending-action.v1";
const PAGE_STATE_KEY = "bookcraft.ui.last-page.v1";

function nowIso() {
  return new Date().toISOString();
}

function actionId() {
  return globalThis.crypto?.randomUUID?.() || `ui-action-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function postTrace(event, data = {}) {
  const requestId = data.action_id || actionId();
  return fetch(TRACE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": requestId,
    },
    keepalive: true,
    body: JSON.stringify({ event, source: "ui-action-trace", data }),
  }).catch(() => null);
}

function pageState() {
  const hub = document.getElementById("bookcraft-author-hub");
  if (hub && !hub.hidden) {
    if (hub.querySelector(".author-login")) {
      return { id: "page-1", traceId: "page-1", number: 1, name: "ОБЛОЖКА + АВТОРИЗАЦИЯ", label: "PAGE 1 · ОБЛОЖКА + АВТОРИЗАЦИЯ" };
    }
    if (hub.querySelector(".project-grid")) {
      const browser = hub.querySelector(".bookcraft-format-browser");
      if (browser?.dataset.selected === "1") {
        const heading = browser.querySelector(".bookcraft-format-head h2")?.textContent?.trim() || "Проекты";
        return { id: "page-2", traceId: `page-2b:${heading}`, number: 2, name: heading.toUpperCase(), label: `PAGE 2B · ${heading.toUpperCase()}` };
      }
      return { id: "page-2", traceId: "page-2a", number: 2, name: "ВЫБОР ФОРМАТА", label: "PAGE 2A · ВЫБОР ФОРМАТА" };
    }
  }
  if (document.querySelector(".workspace-shell")) {
    const view = document.body.dataset.engineeringView || "whole";
    const labels = {
      whole: "PAGE 3A · ПРОИЗВЕДЕНИЕ ЦЕЛИКОМ",
      scenes: "PAGE 3B · КОНСТРУКТОР СЦЕН",
      characters: "PAGE 3C · БАЗА ПЕРСОНАЖЕЙ",
      comic: "PAGE 3D · COMIC STORYBOARD",
      sound: "PAGE 3E · SOUND ENGINEERING",
      video: "PAGE 3F · VIDEO PIPELINE",
    };
    return { id: "page-3", traceId: `page-3:${view}`, number: 3, name: labels[view] || "РЕДАКТОР ПРОЕКТА", label: labels[view] || "PAGE 3 · РЕДАКТОР ПРОЕКТА" };
  }
  if (document.querySelector(".start-shell")) {
    return { id: "page-0", traceId: "page-0", number: 0, name: "СТАРТОВЫЙ СЛОЙ", label: "PAGE 0 · СТАРТОВЫЙ СЛОЙ" };
  }
  return { id: "boot", traceId: "boot", number: -1, name: "ЗАГРУЗКА", label: "BOOT · ЗАГРУЗКА" };
}

function shortLabel(value, max = 110) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function controlLabel(control) {
  if (!control) return "неизвестный элемент";
  const aria = control.getAttribute?.("aria-label");
  if (aria) return shortLabel(aria);
  if (control.matches?.("select")) {
    const selected = control.selectedOptions?.[0]?.textContent || control.value;
    return shortLabel(selected || "список");
  }
  const text = control.textContent || control.getAttribute?.("placeholder") || control.getAttribute?.("name") || control.id || control.className;
  return shortLabel(text || control.tagName || "элемент");
}

function inferContract(control, page, type = "click") {
  const label = controlLabel(control);
  const lower = label.toLowerCase();
  const action = control?.dataset?.action || "";
  const newKind = control?.dataset?.new || "";
  const format = control?.dataset?.format || "";
  const engineeringView = control?.dataset?.view || "";

  if (page.id === "page-1" && (control?.type === "submit" || lower.includes("войти"))) {
    return { expected: "проверить 1/1 → создать авторскую сессию → открыть PAGE 2A · ВЫБОР ФОРМАТА", target_page: "page-2" };
  }
  if (format) {
    return { expected: `выбрать формат «${format}» → открыть библиотеку проектов этого типа на PAGE 2B`, target_page: "page-2" };
  }
  if (lower.includes("форматы")) {
    return { expected: "закрыть библиотеку текущего формата → вернуться на PAGE 2A · ВЫБОР ФОРМАТА", target_page: "page-2" };
  }
  if (newKind) {
    return { expected: `создать новый проект типа «${newKind}» → новая карточка должна появиться в текущей библиотеке PAGE 2B`, target_page: "page-2", verify: "project-count" };
  }
  if (action === "open" || lower.includes("развернуть")) {
    return { expected: "записать active_project → загрузить snapshot → открыть PAGE 3A · ПРОИЗВЕДЕНИЕ ЦЕЛИКОМ", target_page: "page-3" };
  }
  if (action === "rename" || lower === "изменить") {
    return { expected: "изменить название выбранной карточки и остаться в библиотеке проектов PAGE 2B", target_page: "page-2" };
  }
  if (action === "duplicate" || lower.includes("дублировать")) {
    return { expected: "создать отдельную копию проекта → новая карточка должна появиться в PAGE 2B", target_page: "page-2", verify: "project-count" };
  }
  if (action === "build" || lower.includes("собрать")) {
    return { expected: "собрать текущий snapshot проекта и выдать экспорт/результат без смены страницы", target_page: page.id };
  }
  if (action === "delete" || lower === "удалить") {
    return { expected: "запросить подтверждение → удалить проект → обновить библиотеку PAGE 2B", target_page: "page-2", verify: "project-count" };
  }
  if (engineeringView) {
    const viewNames = { whole: "произведение целиком", scenes: "конструктор сцен", characters: "база персонажей", comic: "comic storyboard", sound: "sound engineering", video: "video pipeline" };
    return { expected: `переключить инженерный workspace → ${viewNames[engineeringView] || engineeringView}; данные проекта должны остаться теми же`, target_page: "page-3" };
  }
  if (lower.includes("под капотом")) {
    return { expected: "открыть инженерный drawer: модели, память, media backend, TRACE, звук и диагностика", target_page: page.id };
  }
  if (lower.includes("редактировать по сценам")) {
    return { expected: "переключить PAGE 3A → PAGE 3B и показать карту сцен + редактируемую структуру", target_page: "page-3" };
  }
  if (lower.includes("мои проекты")) {
    return { expected: "синхронизировать активный snapshot → открыть PAGE 2A/2B проектов", target_page: "page-2" };
  }
  if (lower === "выйти") {
    return { expected: "закрыть авторскую сессию → открыть PAGE 1 · ОБЛОЖКА + АВТОРИЗАЦИЯ", target_page: "page-1" };
  }
  if (lower.includes("подключить модель")) {
    return { expected: "проверить выбранного агента контрольным запросом → показать READY либо точную ошибку", target_page: page.id };
  }
  if (lower.includes("локальная модель")) {
    return { expected: "показать локальный каталог моделей и runtime-состояние", target_page: page.id };
  }
  if (lower.includes("внешний агент")) {
    return { expected: "показать настройки внешнего агента/preset без сохранения API-ключа", target_page: page.id };
  }
  if (lower.includes("сохранить текущий внешний агент")) {
    return { expected: "сохранить preset внешнего агента без API-ключа и добавить кнопку preset", target_page: page.id };
  }
  if (lower.includes("отправить") && page.id === "page-3") {
    return { expected: "отправить запрос активному агенту → получить ответ → обновить произведение или показать ошибку", target_page: page.id };
  }
  if (lower.includes("аудио") || lower.includes("mp3") || lower.includes("расшифров")) {
    return { expected: "выбрать аудио → локальный STT → получить расшифровку → показать её в SOUND ENGINEERING", target_page: page.id };
  }
  if (lower.includes("микрофон") || lower.includes("записать") || lower.includes("диктовать")) {
    return { expected: "получить доступ к микрофону → записать звук → STT → показать текст или точную ошибку", target_page: page.id };
  }
  if (lower.includes("проверить") && page.label.includes("SOUND")) {
    return { expected: "озвучить тестовую фразу выбранным постоянным голосовым профилем персонажа", target_page: page.id };
  }
  if (lower.includes("создать иллюстрацию") || lower.includes("создать доработанную")) {
    return { expected: "собрать canon-aware арт-промпт → вызвать image backend → показать кадр либо точную ошибку", target_page: page.id };
  }
  if (control?.matches?.("summary")) {
    return { expected: "развернуть или свернуть выбранную панель", target_page: page.id };
  }
  if (control?.matches?.("select")) {
    return { expected: type === "change" ? `применить выбранное значение «${label}» и обновить связанное состояние` : "открыть список вариантов", target_page: page.id };
  }
  if (control?.matches?.('input[type="checkbox"]')) {
    return { expected: "переключить параметр и применить новое состояние", target_page: page.id };
  }
  if (control?.matches?.("a")) {
    return { expected: "открыть ссылку или скачать связанный результат", target_page: page.id };
  }
  return { expected: `выполнить действие «${label}» → интерфейс должен подтвердить результат или показать ошибку`, target_page: page.id };
}

function uiSnapshot() {
  const page = pageState();
  return {
    page: page.label,
    page_id: page.id,
    page_trace_id: page.traceId,
    project_count: document.querySelectorAll(".project-card").length,
    workspace_visible: Boolean(document.querySelector(".workspace-shell")),
    author_hub_visible: Boolean(document.getElementById("bookcraft-author-hub") && !document.getElementById("bookcraft-author-hub").hidden),
    runtime_status: shortLabel(document.querySelector(".bookcraft-runtime-state")?.textContent || ""),
    error_visible: Boolean(document.querySelector(".error-box, .auth-error:not(:empty), .sound-status.error")),
  };
}

function rememberPending(record) {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(record)); }
  catch { /* trace state must not block UI */ }
}

function readPending() {
  try { return JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null"); }
  catch { return null; }
}

function clearPending() {
  sessionStorage.removeItem(PENDING_KEY);
}

function registerAction(control, type = "click") {
  const page = pageState();
  const contract = inferContract(control, page, type);
  const id = actionId();
  const before = uiSnapshot();
  const label = controlLabel(control);
  const record = {
    action_id: id,
    started_at: nowIso(),
    page: page.label,
    page_id: page.id,
    page_trace_id: page.traceId,
    control: label,
    control_action: control?.dataset?.action || control?.dataset?.new || control?.dataset?.format || control?.dataset?.view || type,
    expected: contract.expected,
    target_page: contract.target_page,
    before_project_count: before.project_count,
  };

  postTrace(`action.${type}`, record);

  if (contract.target_page && contract.target_page !== page.id) {
    rememberPending(record);
    return;
  }

  window.setTimeout(() => {
    const after = uiSnapshot();
    let result = `${after.page}; обработчик выполнен`;
    if (contract.verify === "project-count") {
      const delta = after.project_count - before.project_count;
      result = `карточек проектов: было ${before.project_count}, стало ${after.project_count}, изменение ${delta >= 0 ? "+" : ""}${delta}`;
    } else if (after.page_trace_id !== before.page_trace_id) {
      result = `переход подтверждён: ${before.page} → ${after.page}`;
    }
    postTrace("action.observed", {
      action_id: id,
      page: after.page,
      page_id: after.page_id,
      page_trace_id: after.page_trace_id,
      control: label,
      expected: contract.expected,
      result,
      elapsed_ms: Date.now() - Date.parse(record.started_at),
    });
  }, 650);
}

function resolvePendingForPage(page) {
  const pending = readPending();
  if (!pending?.action_id) return;
  if (pending.target_page === page.id) {
    postTrace("action.ready", {
      action_id: pending.action_id,
      control: pending.control,
      expected: pending.expected,
      result: `открыта ${page.label}`,
      page: page.label,
      page_id: page.id,
      page_trace_id: page.traceId,
      elapsed_ms: Math.max(0, Date.now() - Date.parse(pending.started_at || nowIso())),
    });
    clearPending();
    return;
  }

  const age = Date.now() - Date.parse(pending.started_at || nowIso());
  if (age > 5000) {
    postTrace("action.stuck", {
      action_id: pending.action_id,
      control: pending.control,
      expected: pending.expected,
      result: `ожидалась ${pending.target_page}, но сейчас ${page.label}`,
      page: page.label,
      page_id: page.id,
      page_trace_id: page.traceId,
      elapsed_ms: age,
    });
    clearPending();
  }
}

function ensurePageBadge(page) {
  const traceRoot = document.getElementById("bookcraft-live-trace");
  if (!traceRoot) return;
  let badge = traceRoot.querySelector(".ui-page-trace-badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.className = "ui-page-trace-badge";
    badge.style.cssText = "margin:0 12px 9px;padding:7px 9px;border-radius:9px;background:rgba(92,121,196,.11);border:1px solid rgba(110,150,230,.18);color:#b9cae5;font-weight:700;letter-spacing:.03em";
    const diagnosis = traceRoot.querySelector(".trace-diagnosis");
    diagnosis?.insertAdjacentElement("beforebegin", badge);
  }
  badge.textContent = page.label;
}

function prettifyTraceRows() {
  const rows = document.querySelectorAll("#bookcraft-live-trace .trace-event");
  for (const row of rows) {
    if (row.dataset.uiActionPretty === "1") continue;
    let event = null;
    try { event = JSON.parse(row.title || "null"); }
    catch { event = null; }
    if (!event) continue;
    const name = String(event.event || "");
    const strong = row.querySelector("strong");
    if (!strong) continue;
    if (name === "ui.action.click") strong.textContent = `КЛИК «${event.control || "элемент"}» → ожидалось: ${event.expected || "изменение интерфейса"}`;
    else if (name === "ui.action.change") strong.textContent = `ИЗМЕНЕНО «${event.control || "элемент"}» → ожидалось: ${event.expected || "новое состояние"}`;
    else if (name === "ui.action.ready") strong.textContent = `ГОТОВО «${event.control || "действие"}» → ${event.result || event.page || "результат подтверждён"}`;
    else if (name === "ui.action.observed") strong.textContent = `ФАКТ «${event.control || "действие"}» → ${event.result || "состояние проверено"}`;
    else if (name === "ui.action.stuck") { strong.textContent = `НЕ РАЗВЕРНУЛОСЬ «${event.control || "действие"}» → ${event.result || event.expected || "нет ожидаемого результата"}`; row.dataset.kind = "error"; }
    else if (name === "ui.page.enter") strong.textContent = `СТРАНИЦА → ${event.page || "неизвестно"}`;
    else continue;
    row.dataset.uiActionPretty = "1";
  }
}

export function mountUiActionTrace() {
  let lastTraceId = "";
  const scanPage = () => {
    const page = pageState();
    ensurePageBadge(page);
    prettifyTraceRows();
    resolvePendingForPage(page);
    if (page.traceId !== lastTraceId && page.id !== "boot") {
      lastTraceId = page.traceId;
      const previous = sessionStorage.getItem(PAGE_STATE_KEY) || "";
      sessionStorage.setItem(PAGE_STATE_KEY, page.traceId);
      postTrace("page.enter", { page: page.label, page_id: page.id, page_trace_id: page.traceId, previous_page_trace_id: previous });
    }
  };

  document.addEventListener("click", (event) => {
    const control = event.target?.closest?.("button,a,summary,select,input[type=checkbox],input[type=file]");
    if (!control) return;
    registerAction(control, "click");
  }, true);

  document.addEventListener("change", (event) => {
    const control = event.target;
    if (!control?.matches?.("select,input[type=checkbox]")) return;
    registerAction(control, "change");
  }, true);

  const observer = new MutationObserver(scanPage);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "open", "class", "data-engineering-view", "data-selected"] });
  window.setInterval(scanPage, 900);
  scanPage();
}

export const UI_ACTION_TRACE_KEYS = { pending: PENDING_KEY, page: PAGE_STATE_KEY };
