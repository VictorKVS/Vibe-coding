const RECENT_TRACE_API = "http://127.0.0.1:8018/api/trace/recent?limit=240";

function short(value, max = 150) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function isUiAction(event) {
  const name = String(event?.event || "");
  return name.startsWith("ui.action.") || name === "ui.page.enter" || name.startsWith("ui.auth.") || name.startsWith("ui.project.");
}

function eventLine(event) {
  const name = String(event.event || "");
  if (name === "ui.action.click") return `КЛИК «${short(event.control || "элемент", 70)}»`;
  if (name === "ui.action.change") return `ИЗМЕНЕНО «${short(event.control || "элемент", 70)}»`;
  if (name === "ui.action.ready") return `ГОТОВО «${short(event.control || "действие", 70)}»`;
  if (name === "ui.action.observed") return `ФАКТ «${short(event.control || "действие", 70)}»`;
  if (name === "ui.action.stuck") return `НЕ РАЗВЕРНУЛОСЬ «${short(event.control || "действие", 70)}»`;
  if (name === "ui.page.enter") return `СТРАНИЦА → ${short(event.page || event.page_id || "неизвестно", 90)}`;
  if (name.startsWith("ui.auth.")) return `AUTH → ${name.replace("ui.auth.", "")}`;
  if (name.startsWith("ui.project.")) return `PROJECT → ${name.replace("ui.project.", "")}`;
  return short(name, 100);
}

function ensureFeed(traceRoot) {
  let feed = traceRoot.querySelector(".ui-action-feed");
  if (feed) return feed;

  feed = document.createElement("section");
  feed.className = "ui-action-feed";
  feed.innerHTML = `
    <header class="ui-action-feed-head"><strong>ДЕЙСТВИЯ UI</strong><small>клик → ожидание → факт</small></header>
    <div class="ui-action-feed-events"><span class="ui-action-empty">Пока нет действий.</span></div>
  `;
  feed.style.cssText = "margin:0 12px 10px;border:1px solid rgba(135,110,235,.18);border-radius:11px;background:rgba(90,68,180,.07);overflow:hidden";
  const head = feed.querySelector(".ui-action-feed-head");
  head.style.cssText = "display:flex!important;flex-direction:row!important;justify-content:space-between!important;padding:8px 10px!important;border:0!important;background:rgba(120,95,210,.07)";
  head.querySelector("small").style.cssText = "color:#8f9fba;font-size:10px";
  const events = feed.querySelector(".ui-action-feed-events");
  events.style.cssText = "max-height:220px;overflow:auto;padding:4px 10px 8px";

  const modelEvents = traceRoot.querySelector(".trace-events");
  modelEvents?.insertAdjacentElement("beforebegin", feed);

  const filter = traceRoot.querySelector('[data-action="models-only"]');
  if (filter) {
    filter.checked = true;
    const label = filter.closest("label");
    if (label) {
      for (const node of Array.from(label.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) node.textContent = " модели/агенты";
      }
    }
  }
  return feed;
}

function renderFeed(feed, events) {
  const holder = feed.querySelector(".ui-action-feed-events");
  if (!holder) return;
  holder.replaceChildren();
  const relevant = events.filter(isUiAction).slice(-18).reverse();
  if (!relevant.length) {
    const empty = document.createElement("span");
    empty.className = "ui-action-empty";
    empty.textContent = "Пока нет действий.";
    holder.appendChild(empty);
    return;
  }

  for (const event of relevant) {
    const row = document.createElement("div");
    row.className = "ui-action-feed-row";
    const isError = String(event.event || "").includes("stuck") || String(event.event || "").includes("error");
    row.style.cssText = `padding:7px 0;border-top:1px solid rgba(255,255,255,.055);${isError ? "color:#ffb0b7" : "color:#d7e1f0"}`;

    const top = document.createElement("div");
    top.style.cssText = "display:flex;gap:8px;align-items:baseline";
    const time = document.createElement("time");
    time.textContent = new Date(event.timestamp || Date.now()).toLocaleTimeString("ru-RU");
    time.style.cssText = "color:#718198;font-size:10px;min-width:54px";
    const title = document.createElement("strong");
    title.textContent = eventLine(event);
    title.style.cssText = "font-size:11px;font-weight:650";
    top.append(time, title);
    row.appendChild(top);

    if (event.expected) {
      const expected = document.createElement("div");
      expected.textContent = `должно: ${short(event.expected, 190)}`;
      expected.style.cssText = "margin:3px 0 0 62px;color:#b9aef1;font-size:10px";
      row.appendChild(expected);
    }
    if (event.result) {
      const result = document.createElement("div");
      result.textContent = `факт: ${short(event.result, 190)}`;
      result.style.cssText = `margin:2px 0 0 62px;font-size:10px;color:${isError ? "#ff9fa8" : "#9edebd"}`;
      row.appendChild(result);
    }
    holder.appendChild(row);
  }
}

async function refresh() {
  const traceRoot = document.getElementById("bookcraft-live-trace");
  if (!traceRoot) return;
  const feed = ensureFeed(traceRoot);
  try {
    const response = await fetch(RECENT_TRACE_API);
    if (!response.ok) return;
    const payload = await response.json();
    renderFeed(feed, Array.isArray(payload?.events) ? payload.events : []);
  } catch {
    // Trace viewer must not affect the editor.
  }
}

export function mountUiActionFeed() {
  const observer = new MutationObserver(() => {
    const traceRoot = document.getElementById("bookcraft-live-trace");
    if (traceRoot) ensureFeed(traceRoot);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setInterval(refresh, 1100);
  refresh();
}
