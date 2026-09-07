const RUNTIME_API = "http://127.0.0.1:8018/api/models/runtime";
const SWITCH_API = "http://127.0.0.1:8018/api/models/switch";
const CATALOG_API = "/llm-api/v1/models";

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function fetchRuntime() {
  const response = await fetch(RUNTIME_API, { method: "GET" });
  if (!response.ok) return { models: [] };
  return readJson(response);
}

async function fetchCatalog() {
  const response = await fetch(CATALOG_API, { method: "GET" });
  if (!response.ok) return [];
  const payload = await readJson(response);
  return Array.isArray(payload?.data) ? payload.data : [];
}

function ensureStatusNode(select) {
  let node = select.parentElement?.querySelector(".bookcraft-runtime-state");
  if (node) return node;
  node = document.createElement("div");
  node.className = "bookcraft-runtime-state";
  node.setAttribute("role", "status");
  node.style.cssText = [
    "margin-top:8px",
    "padding:9px 11px",
    "border:1px solid rgba(110,180,255,.25)",
    "border-radius:10px",
    "background:rgba(26,35,55,.55)",
    "font-size:12px",
    "line-height:1.35",
    "color:#b8c7db",
  ].join(";");
  select.insertAdjacentElement("afterend", node);
  return node;
}

function setStatus(select, text, kind = "info") {
  const node = ensureStatusNode(select);
  node.textContent = text;
  node.dataset.kind = kind;
  node.style.borderColor = kind === "error"
    ? "rgba(255,100,100,.5)"
    : kind === "ready"
      ? "rgba(100,220,155,.5)"
      : "rgba(110,180,255,.25)";
  node.style.color = kind === "error" ? "#ffb2b2" : kind === "ready" ? "#a9efc8" : "#b8c7db";
}

async function refreshOptionLabels(select) {
  const [catalog, runtime] = await Promise.all([fetchCatalog(), fetchRuntime()]);
  const loadedIds = new Set(
    (runtime?.models || [])
      .filter((item) => item?.loaded)
      .map((item) => String(item.id)),
  );
  const byId = new Map(catalog.map((item) => [String(item.id), item]));

  for (const option of Array.from(select.options)) {
    const id = option.value;
    if (id === "auto") {
      option.textContent = "AUTO — маршрутизатор";
      continue;
    }
    const item = byId.get(id);
    const display = item?.bookcraft?.display_name || id;
    option.textContent = loadedIds.has(id)
      ? `${display} — В ПАМЯТИ`
      : `${display} — на диске`;
  }

  const loaded = (runtime?.models || []).filter((item) => item?.loaded);
  if (select.value === "auto") {
    const active = loaded.map((item) => item.display_name || item.id).join(", ");
    setStatus(
      select,
      active
        ? `AUTO выбран. Сейчас в памяти: ${active}. При следующем запросе Router может переключить модель.`
        : "AUTO выбран. Router загрузит подходящую модель при следующем запросе.",
      "info",
    );
  }
}

async function switchSelectedModel(select) {
  const selected = select.value;
  if (!selected || selected === "auto") {
    await refreshOptionLabels(select);
    return;
  }

  setStatus(select, `ВЫБРАНА: ${selected}. Загружаю в память LM Studio…`, "info");
  const response = await fetch(SWITCH_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": globalThis.crypto?.randomUUID?.() || `bookcraft-switch-${Date.now()}`,
    },
    body: JSON.stringify({ model: selected }),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    const detail = payload?.detail || `HTTP ${response.status}`;
    setStatus(select, `LOAD FAILED · выбрана ${selected} · ${detail}`, "error");
    await refreshOptionLabels(select);
    // Важно: выбранное значение не меняем. Пользователь должен видеть,
    // какую именно модель он попытался активировать.
    return;
  }

  setStatus(
    select,
    `READY · ВЫБРАНА И В ПАМЯТИ: ${payload.model || selected} · ${payload.state || "loaded"}`,
    "ready",
  );
  await sleep(250);
  await refreshOptionLabels(select);
}

function findLocalModelSelect() {
  const gateway = document.querySelector(".model-gateway");
  if (!gateway) return null;
  const selects = Array.from(gateway.querySelectorAll("select"));
  return selects.find((select) => Array.from(select.options).some((option) => option.value === "auto")) || null;
}

function wireSelect(select) {
  if (select.dataset.bookcraftRuntimeWired === "1") return;
  select.dataset.bookcraftRuntimeWired = "1";
  select.addEventListener("change", () => {
    // Даём React сначала сохранить controlled value.
    window.setTimeout(() => switchSelectedModel(select), 0);
  });
  refreshOptionLabels(select).catch(() => {
    setStatus(select, "Не удалось получить runtime-состояние LM Studio.", "error");
  });
}

export function mountModelRuntimeControls() {
  let lastSelect = null;
  const scan = () => {
    const select = findLocalModelSelect();
    if (!select) return;
    if (select !== lastSelect) {
      lastSelect = select;
      wireSelect(select);
    }
  };

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan();

  window.setInterval(() => {
    const select = findLocalModelSelect();
    if (select) refreshOptionLabels(select).catch(() => {});
  }, 5000);
}
