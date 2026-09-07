const PRESETS_KEY = "bookcraft.external.agent.presets.v1";
const SOURCE_KEY = "bookcraft.agent.source.v1";

const BUILTIN_PRESETS = [
  {
    id: "builtin-gigachat",
    name: "GigaChat API",
    protocol: "gigachat",
    endpoint: "https://api.giga.chat/v1/chat/completions",
    model: "GigaChat-2",
    builtin: true,
  },
  {
    id: "builtin-openai-compatible",
    name: "OpenAI-compatible",
    protocol: "openai-compatible",
    endpoint: "",
    model: "",
    builtin: true,
  },
];

function readUserPresets() {
  try {
    const value = JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item) => item && item.id && item.name).slice(0, 12) : [];
  } catch {
    return [];
  }
}

function writeUserPresets(items) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(items.slice(0, 12)));
}

function allPresets() {
  return [...BUILTIN_PRESETS, ...readUserPresets()];
}

function presetSignature(presets = allPresets()) {
  return JSON.stringify(
    presets.map((item) => ({
      id: item.id,
      name: item.name,
      protocol: item.protocol || "",
      endpoint: item.endpoint || "",
      model: item.model || "",
      builtin: Boolean(item.builtin),
    })),
  );
}

function nativeSetValue(element, value) {
  if (!element) return;
  const prototype = element instanceof HTMLSelectElement
    ? HTMLSelectElement.prototype
    : element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  if (!(element instanceof HTMLSelectElement)) {
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function sourceButtons(gateway) {
  const buttons = Array.from(gateway.querySelectorAll(".model-source-switch button"));
  return {
    local: buttons.find((button) => /локальн/i.test(button.textContent || "")) || buttons[0] || null,
    external: buttons.find((button) => /внешн/i.test(button.textContent || "")) || buttons[1] || null,
  };
}

function isExternalMode(gateway) {
  return Boolean(gateway.querySelector(".external-agent-grid"));
}

function findField(gateway, labelNeedle) {
  const labels = Array.from(gateway.querySelectorAll(".external-agent-grid label"));
  const label = labels.find((item) => (item.textContent || "").toLowerCase().includes(labelNeedle.toLowerCase()));
  return label?.querySelector("input, select, textarea") || null;
}

function currentExternalConfig(gateway) {
  return {
    agent: findField(gateway, "какой внешний агент")?.value?.trim() || "",
    protocol: findField(gateway, "протокол")?.value || "openai-compatible",
    endpoint: findField(gateway, "endpoint")?.value?.trim() || "",
    model: findField(gateway, "модель")?.value?.trim() || "",
  };
}

async function waitForExternalGrid(gateway, attempts = 30) {
  for (let index = 0; index < attempts; index += 1) {
    if (gateway.querySelector(".external-agent-grid")) return true;
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
  return false;
}

async function applyPreset(gateway, preset, status) {
  const buttons = sourceButtons(gateway);
  if (!isExternalMode(gateway)) {
    buttons.external?.click();
    if (!(await waitForExternalGrid(gateway))) {
      status.textContent = "Не удалось открыть панель внешнего агента.";
      status.dataset.kind = "error";
      return;
    }
  }

  localStorage.setItem(SOURCE_KEY, "external");
  status.textContent = `Переключаю на: ${preset.name}…`;
  status.dataset.kind = "loading";

  nativeSetValue(findField(gateway, "какой внешний агент"), preset.name);
  nativeSetValue(findField(gateway, "протокол"), preset.protocol || "openai-compatible");
  await new Promise((resolve) => window.setTimeout(resolve, 80));

  const endpoint = findField(gateway, "endpoint");
  if (endpoint && preset.endpoint) nativeSetValue(endpoint, preset.endpoint);

  const model = findField(gateway, "модель");
  if (model && preset.model) nativeSetValue(model, preset.model);

  status.textContent = preset.protocol === "gigachat"
    ? `Внешний агент выбран: ${preset.name}. Вставьте временный API-токен и нажмите «Подключить модель».`
    : preset.endpoint
      ? `Внешний агент выбран: ${preset.name}. Проверьте модель и API-ключ.`
      : `Режим ${preset.name}: укажите endpoint, model и API-ключ, затем сохраните как свой пресет.`;
  status.dataset.kind = "ready";
}

function buildSwitcher(gateway) {
  const existing = gateway.querySelector(".bookcraft-agent-switcher");
  if (existing) return existing;

  const root = document.createElement("section");
  root.className = "bookcraft-agent-switcher";
  root.innerHTML = `
    <div class="agent-switcher-head">
      <strong>AGENT SWITCHER</strong>
      <span>локальные модели + внешние агенты</span>
    </div>
    <div class="agent-switcher-presets"></div>
    <div class="agent-switcher-actions">
      <button type="button" data-action="save">Сохранить текущий внешний агент</button>
      <button type="button" data-action="remove">Удалить мой пресет</button>
      <span class="agent-switcher-status" role="status"></span>
    </div>
  `;

  root.style.cssText = [
    "margin:12px 0",
    "padding:12px",
    "border:1px solid rgba(120,175,255,.22)",
    "border-radius:14px",
    "background:rgba(19,28,44,.56)",
  ].join(";");

  const sourceSwitch = gateway.querySelector(".model-source-switch");
  sourceSwitch?.insertAdjacentElement("afterend", root);
  return root;
}

function renderPresetButtons(gateway, root, force = false) {
  const holder = root.querySelector(".agent-switcher-presets");
  const status = root.querySelector(".agent-switcher-status");
  if (!holder || !status) return;

  const presets = allPresets();
  const signature = presetSignature(presets);
  if (!force && holder.dataset.signature === signature) return;

  // Set the guard before changing child nodes. MutationObserver may fire as a
  // consequence of replaceChildren(), and the next scan must become a no-op.
  holder.dataset.signature = signature;
  holder.replaceChildren();
  holder.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin:9px 0";

  const localButton = document.createElement("button");
  localButton.type = "button";
  localButton.textContent = "Локальные модели";
  localButton.dataset.kind = "local";
  localButton.addEventListener("click", () => {
    sourceButtons(gateway).local?.click();
    localStorage.setItem(SOURCE_KEY, "local");
    status.textContent = "Локальный режим: выберите AUTO или конкретную модель ниже.";
    status.dataset.kind = "ready";
  });
  holder.appendChild(localButton);

  for (const preset of presets) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = preset.name;
    button.dataset.presetId = preset.id;
    button.dataset.builtin = preset.builtin ? "1" : "0";
    button.addEventListener("click", () => applyPreset(gateway, preset, status));
    holder.appendChild(button);
  }

  for (const button of holder.querySelectorAll("button")) {
    button.style.cssText = [
      "border:1px solid rgba(255,255,255,.14)",
      "border-radius:10px",
      "padding:8px 10px",
      "background:rgba(255,255,255,.06)",
      "color:#e9eef7",
      "cursor:pointer",
    ].join(";");
  }
}

function wireActions(gateway, root) {
  if (root.dataset.wired === "1") return;
  root.dataset.wired = "1";
  const status = root.querySelector(".agent-switcher-status");
  const save = root.querySelector('[data-action="save"]');
  const remove = root.querySelector('[data-action="remove"]');

  if (status) {
    status.style.cssText = "display:block;margin-top:8px;color:#aebbd0;font-size:12px";
  }

  save?.addEventListener("click", () => {
    if (!isExternalMode(gateway)) {
      sourceButtons(gateway).external?.click();
      status.textContent = "Сначала заполните внешний агент, затем сохраните его пресет.";
      return;
    }
    const config = currentExternalConfig(gateway);
    if (!config.endpoint && config.protocol !== "gigachat") {
      status.textContent = "Для сохранения внешнего агента сначала укажите endpoint.";
      status.dataset.kind = "error";
      return;
    }
    const name = window.prompt("Название пресета внешнего агента", config.agent || "Мой внешний агент")?.trim();
    if (!name) return;
    const items = readUserPresets();
    const id = `user-${Date.now()}`;
    items.push({ id, name, ...config, builtin: false });
    writeUserPresets(items);
    renderPresetButtons(gateway, root, true);
    status.textContent = `Пресет «${name}» сохранён. API-ключ не сохранялся.`;
    status.dataset.kind = "ready";
  });

  remove?.addEventListener("click", () => {
    const items = readUserPresets();
    if (!items.length) {
      status.textContent = "Пользовательских пресетов пока нет.";
      return;
    }
    const name = window.prompt(`Какой пресет удалить?\n${items.map((item) => item.name).join("\n")}`)?.trim();
    if (!name) return;
    const next = items.filter((item) => item.name.toLowerCase() !== name.toLowerCase());
    if (next.length === items.length) {
      status.textContent = `Пресет «${name}» не найден.`;
      status.dataset.kind = "error";
      return;
    }
    writeUserPresets(next);
    renderPresetButtons(gateway, root, true);
    status.textContent = `Пресет «${name}» удалён.`;
    status.dataset.kind = "ready";
  });
}

function restoreSource(gateway) {
  if (gateway.dataset.sourceRestored === "1") return;
  gateway.dataset.sourceRestored = "1";
  const wanted = localStorage.getItem(SOURCE_KEY);
  if (wanted === "external") {
    window.setTimeout(() => sourceButtons(gateway).external?.click(), 50);
  }
}

export function mountAgentSwitcher() {
  let currentGateway = null;
  const scan = () => {
    const gateway = document.querySelector(".model-gateway");
    if (!gateway) return;
    if (gateway !== currentGateway) currentGateway = gateway;
    const root = buildSwitcher(gateway);
    renderPresetButtons(gateway, root);
    wireActions(gateway, root);
    restoreSource(gateway);
  };

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan();
}

export const AGENT_SWITCHER_KEYS = {
  presets: PRESETS_KEY,
  source: SOURCE_KEY,
};
