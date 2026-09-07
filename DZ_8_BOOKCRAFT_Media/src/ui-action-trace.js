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
    body: JSON.stringify({
      event,
      source: "ui-action-trace",
      data,
    }),
  }).catch(() => null);
}

function pageState() {
  const hub = document.getElementById("bookcraft-author-hub");
  if (hub && !hub.hidden) {
    if (hub.querySelector(".author-login")) {
      return { id: "page-1", number: 1, name: "ВХОД АВТОРА", label: "PAGE 1 · ВХОД АВТОРА" };
    }
    if (hub.querySelector(".project-grid")) {
      return { id: "page-2", number: 2, name: "МОИ ПРОЕКТЫ", label: "PAGE 2 · МОИ ПРОЕКТЫ" };
    }
  }
  if (document.querySelector(".workspace-shell")) {
    return { id: "page-3", number: 3, name: "РЕДАКТОР ПРОЕКТА", label: "PAGE 3 · РЕДАКТОР ПРОЕКТА" };
  }
  if (document.querySelector(".start-shell")) {
    return { id: "page-0", number: 0, name: "СТАРТОВЫЙ СЛОЙ", label: "PAGE 0 · СТАРТОВЫЙ СЛОЙ" };
  }
  return { id: "boot", number: -1, name: "ЗАГРУЗКА", label: "BOOT · ЗАГРУЗКА" };
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

  if (page.id === "page-1" && (control?.type === "submit" || lower.includes("войти"))) {
    return { expected: "проверить 1/1 → создать авторскую сессию → открыть PAGE 2 · МОИ ПРОЕКТЫ", target_page: "page-2" };
  }
  if (newKind) {
    return { expected: `создать новый проект типа «${newKind}» → новая карточка должна появиться на PAGE 2`, target_page: "page-2", verify: "project-count" };
  }
  if (action === "open" || lower.includes("развернуть")) {
    return { expected: "записать active_project → загрузить snapshot проекта → открыть PAGE 3 · РЕДАКТОР ПРОЕКТА", target_page: "page-3" };
  }
  if (action === "rename" || lower === "изменить") {
    return { expected: "изменить название выбранной карточки проекта и остаться на PAGE 2", target_page: "page-2" };
  }
  if (action === "duplicate" || lower.includes("дублировать")) {
    return { expected: "создать отдельную копию проекта → новая карточка должна появиться на PAGE 2", target_page: "page-2", verify: "project-count" };
  }
  if (action === "build" || lower.includes("собрать")) {
    return { expected: "собрать текущий snapshot проекта и выдать экспорт/результат сборки без смены страницы", target_page: page.id };
  }
  if (action === "delete" || lower === "удалить") {
    return { expected: "запросить подтверждение → удалить выбранный проект → обновить список PAGE 2", target_page: "page-2", verify: "project-count" };
  }
  if (lower.includes("мои проекты")) {
    return { expected: "синхронизировать активный snapshot → открыть PAGE 2 · МОИ ПРОЕКТЫ", target_page: "page-2" };
  }
  if (lower === "выйти") {
    return { expected: "закрыть авторскую сессию → открыть PAGE 1 · ВХОД АВТОРА", target_page: "page-1" };
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
    return { expected: "отправить запрос активному агенту → получить ответ → обновить сценарий или показать ошибку", target_page: page.id };
  }
  if (lower.includes("загрузить mp3") || lower.includes("расшифровать")) {
    return { expected: "выбрать аудиофайл → отправить в STT → добавить расшифровку в команду", target_page: page.id };
  }
  if (lower.includes("диктовать") || lower.includes("микрофон")) {
    return { expected: "получить доступ к микрофону → записать аудио → STT → добавить текст", target_page: page.id };
  }
  if (lower.includes("создать иллюстрацию") || lower.includes("создать доработанную")) {
    return { expected: "создать арт-промпт → вызвать выбранный image backend → показать кадр либо точную ошибку", target_page: page.id };
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
    project_count: document.querySelectorAll(".project-card").length,
    workspace_visible: Boolean(document.querySelector(".workspace-shell")),
    author_hub_visible: Boolean(document.getElementById("bookcraft-author-hub") && !document.getElementById("bookcraft-author-hub").hidden),
    runtime_status: shortLabel(document.querySelector(".bookcraft-runtime-state")?.textContent || ""),
    error_visible: Boolean(document.querySelector(".error-box, .auth-error:not(:empty)")),
  };
}

function rememberPending(record) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(record));
  } catch {
    // Trace state must not block the UI.
  }
}

function readPending() {
  try {
    return JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null");
  } catch {
    return null;
  }
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
    control: label,
    control_action: control?.dataset?.action || control?.dataset?.new || type,
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
    let result = `${after.page}; обработчик выполнен, переход страницы не ожидался`;
    if (contract.verify === "project-count") {
      const delta = after.project_count - before.project_count;
      result = `карточек проектов: было ${before.project_count}, стало ${after.project_count}, изменение ${delta >= 0 ? "+" : ""}${delta}`;
    }
    postTrace("action.observed", {
      action_id: id,
      page: after.page,
      page_id: after.page_id,
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
      elapsed_ms: age,
    });
    clearPending();
  }
}

function ensurePageBadge(page) {
  const trace = document.getElementById("bookcraft-live-trace");
  if (!trace) return;

  let badge = trace.querySelector(".ui-page-trace-badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.className = "ui-page-trace-badge";
    badge.style.cssText = "margin:0 12px 9px;padding:7px 9px;border-radius:9px;background:rgba(92,121,196,.11);border:1px solid rgba(110,150,230,.18);color:#b9cae5;font-weight:700;letter-spacing:.03em";
    const diagnosis = trace.querySelector(".trace-diagnosis");
    diagnosis?.insertAdjacentElement("beforebegin", badge);
  }
  badge.textContent = page.label;

  const filter = trace.querySelector('[data-action="models-only"]');
  if (filter && filter.dataset.uiActionsEnabled !== "1") {
    filter.dataset.uiActionsEnabled = "1";
    filter.checked = false;
    const label = filter.closest("label");
    if (label) {
      for (const node of Array.from(label.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) node.textContent = " все действия + модели";
      }
    }
  }
}

function prettifyTraceRows() {
  const rows = document.querySelectorAll("#bookcraft-live-trace .trace-event");
  for (const row of rows) {
    if (row.dataset.uiActionPretty === "1") continue;
    let event = null;
    try {
      event = JSON.parse(row.title || "null");
    } catch {
      event = null;
    }
    if (!event) continue;
    const name = String(event.event || "");
    const strong = row.querySelector("strong");
    if (!strong) continue;

    if (name === "ui.action.click") {
      strong.textContent = `КЛИК «${event.control || "элемент"}» → ожидалось: ${event.expected || "изменение интерфейса"}`;
    } else if (name === "ui.action.change") {
      strong.textContent = `ИЗМЕНЕНО «${event.control || "элемент"}» → ожидалось: ${event.expected || "новое состояние"}`;
    } else if (name === "ui.action.ready") {
      strong.textContent = `ГОТОВО «${event.control || "действие"}» → ${event.result || event.page || "результат подтверждён"}`;
    } else if (name === "ui.action.observed") {
      strong.textContent = `ФАКТ «${event.control || "действие"}» → ${event.result || "состояние проверено"}`;
    } else if (name === "ui.action.stuck") {
      strong.textContent = `НЕ РАЗВЕРНУЛОСЬ «${event.control || "действие"}» → ${event.result || event.expected || "нет ожидаемого результата"}`;
      row.dataset.kind = "error";
    } else if (name === "ui.page.enter") {
      strong.textContent = `СТРАНИЦА → ${event.page || "неизвестно"}`;
    } else {
      continue;
    }
    row.dataset.uiActionPretty = "1";
  }
}

export function mountUiActionTrace() {
  let lastPageId = "";

  const scanPage = () => {
    const page = pageState();
    ensurePageBadge(page);
    prettifyTraceRows();
    resolvePendingForPage(page);

    if (page.id !== lastPageId && page.id !== "boot") {
      lastPageId = page.id;
      const previous = sessionStorage.getItem(PAGE_STATE_KEY) || "";
      sessionStorage.setItem(PAGE_STATE_KEY, page.id);
      postTrace("page.enter", {
        page: page.label,
        page_id: page.id,
        previous_page_id: previous,
      });
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
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "open", "class"] });
  window.setInterval(scanPage, 900);
  scanPage();
}

export const UI_ACTION_TRACE_KEYS = {
  pending: PENDING_KEY,
  page: PAGE_STATE_KEY,
};
