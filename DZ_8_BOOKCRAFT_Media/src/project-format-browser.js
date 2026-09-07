const TRACE_API = "http://127.0.0.1:8018/api/trace/ui-event";
const FORMAT_KEY = "bookcraft.project.format-filter.v1";

const FORMATS = [
  { id: "story", label: "Рассказ", icon: "✦", desc: "Короткая форма: текст → сцены → комикс → ролик" },
  { id: "book", label: "Книга", icon: "▤", desc: "Роман, повесть или сборник с общей базой знаний" },
  { id: "comic", label: "Комикс", icon: "▦", desc: "Storyboard, кадры, постоянные герои и реплики" },
  { id: "video", label: "Видео", icon: "▶", desc: "Сцены, шоты, озвучка, субтитры и монтаж" },
];

function trace(event, data = {}) {
  fetch(TRACE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, source: "project-format-browser", data }),
  }).catch(() => {});
}

function injectStyles() {
  if (document.getElementById("bookcraft-format-browser-style")) return;
  const style = document.createElement("style");
  style.id = "bookcraft-format-browser-style";
  style.textContent = `
    .bookcraft-format-browser{margin:4px 0 20px;padding:18px;border:1px solid rgba(255,255,255,.09);border-radius:20px;background:linear-gradient(140deg,rgba(40,35,70,.5),rgba(12,25,35,.48))}
    .bookcraft-format-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:14px}
    .bookcraft-format-head h2{margin:0;font-size:22px}.bookcraft-format-head p{margin:4px 0 0;color:#8798b0;font-size:12px}
    .bookcraft-format-grid{display:grid;grid-template-columns:repeat(4,minmax(160px,1fr));gap:10px}
    .bookcraft-format-card{min-height:118px;text-align:left;border:1px solid rgba(255,255,255,.11);border-radius:16px;padding:14px;background:rgba(255,255,255,.035);color:#eef4fb;cursor:pointer;transition:.18s ease}
    .bookcraft-format-card:hover,.bookcraft-format-card.active{transform:translateY(-2px);border-color:rgba(125,185,255,.4);background:rgba(95,125,210,.10)}
    .bookcraft-format-card i{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:rgba(145,120,235,.13);font-style:normal;font-size:18px;margin-bottom:10px}
    .bookcraft-format-card b{display:block;font-size:14px;margin-bottom:4px}.bookcraft-format-card span{display:block;color:#8191a7;font-size:10px;line-height:1.45}
    .bookcraft-format-back{display:none;border:1px solid rgba(255,255,255,.12);border-radius:9px;padding:7px 9px;background:rgba(255,255,255,.05);color:#e8eef8;cursor:pointer}
    .bookcraft-format-browser[data-selected="1"] .bookcraft-format-grid{display:none}.bookcraft-format-browser[data-selected="1"] .bookcraft-format-back{display:inline-flex}
    .bookcraft-format-browser[data-selected="1"]{padding:12px 14px}.bookcraft-format-browser[data-selected="1"] .bookcraft-format-head{margin:0;align-items:center}
    @media(max-width:900px){.bookcraft-format-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:540px){.bookcraft-format-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function cardKind(card) {
  const small = String(card.querySelector("header small")?.textContent || "").toLowerCase();
  if (small.includes("рассказ")) return "story";
  if (small.includes("комикс")) return "comic";
  if (small.includes("видео")) return "video";
  if (small.includes("книга")) return "book";
  return "book";
}

function applyFilter(shell, format) {
  const browser = shell.querySelector(".bookcraft-format-browser");
  const grid = shell.querySelector(".project-grid");
  const intro = shell.querySelector(".author-toolbar .intro");
  if (!browser || !grid || !intro) return;
  const meta = FORMATS.find((item) => item.id === format);
  if (!meta) return;

  sessionStorage.setItem(FORMAT_KEY, format);
  browser.dataset.selected = "1";
  browser.querySelector(".bookcraft-format-head h2").textContent = `Проекты · ${meta.label}`;
  browser.querySelector(".bookcraft-format-head p").textContent = meta.desc;
  grid.style.display = "grid";
  for (const card of grid.querySelectorAll(".project-card")) {
    card.style.display = cardKind(card) === format ? "block" : "none";
  }

  for (const button of shell.querySelectorAll(".author-toolbar [data-new]")) {
    button.style.display = button.dataset.new === format ? "inline-flex" : "none";
  }
  const visibleNew = shell.querySelector(`.author-toolbar [data-new="${format}"]`);
  if (visibleNew) visibleNew.textContent = `+ Новый ${meta.label.toLowerCase()}`;

  intro.querySelector("h1").textContent = `${meta.label}: проекты`;
  intro.querySelector("p").textContent = "Продолжить, развернуть, переработать, собрать или создать новый проект.";
  trace("page.project-format.projects", { page: `PAGE 2B · ПРОЕКТЫ · ${meta.label.toUpperCase()}`, format });
}

function showFormats(shell) {
  const browser = shell.querySelector(".bookcraft-format-browser");
  const grid = shell.querySelector(".project-grid");
  const intro = shell.querySelector(".author-toolbar .intro");
  if (!browser || !grid || !intro) return;
  sessionStorage.removeItem(FORMAT_KEY);
  browser.dataset.selected = "0";
  browser.querySelector(".bookcraft-format-head h2").textContent = "Что создаём?";
  browser.querySelector(".bookcraft-format-head p").textContent = "Выберите тип проекта — затем откроется его библиотека.";
  grid.style.display = "none";
  for (const button of shell.querySelectorAll(".author-toolbar [data-new]")) button.style.display = "none";
  intro.querySelector("h1").textContent = "Мои проекты";
  intro.querySelector("p").textContent = "Рассказ · книга · комикс · видео — отдельные инженерные рабочие пространства.";
  trace("page.project-format.ready", { page: "PAGE 2A · ВЫБОР ФОРМАТА" });
}

function buildBrowser(shell) {
  if (shell.querySelector(".bookcraft-format-browser")) return;
  const toolbar = shell.querySelector(".author-toolbar");
  if (!toolbar) return;
  const browser = document.createElement("section");
  browser.className = "bookcraft-format-browser";
  browser.dataset.selected = "0";
  browser.innerHTML = `
    <div class="bookcraft-format-head">
      <div><h2>Что создаём?</h2><p>Выберите тип проекта — затем откроется его библиотека.</p></div>
      <button class="bookcraft-format-back" type="button">← Форматы</button>
    </div>
    <div class="bookcraft-format-grid"></div>`;
  const holder = browser.querySelector(".bookcraft-format-grid");
  for (const format of FORMATS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bookcraft-format-card";
    button.dataset.format = format.id;
    button.innerHTML = `<i>${format.icon}</i><b>${format.label}</b><span>${format.desc}</span>`;
    button.addEventListener("click", () => applyFilter(shell, format.id));
    holder.appendChild(button);
  }
  browser.querySelector(".bookcraft-format-back").addEventListener("click", () => showFormats(shell));
  toolbar.insertAdjacentElement("afterend", browser);

  const saved = sessionStorage.getItem(FORMAT_KEY);
  if (FORMATS.some((item) => item.id === saved)) applyFilter(shell, saved);
  else showFormats(shell);
}

export function mountProjectFormatBrowser() {
  injectStyles();
  const scan = () => {
    const shell = document.querySelector("#bookcraft-author-hub .author-shell");
    if (!shell || shell.closest("#bookcraft-author-hub")?.hidden) return;
    buildBrowser(shell);
  };
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan();
}
