const TRACE_API = "http://127.0.0.1:8018/api/trace/ui-event";

function trace(event, data = {}) {
  fetch(TRACE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, source: "cover-login-enhancer", data }),
  }).catch(() => {});
}

function injectStyles() {
  if (document.getElementById("bookcraft-cover-login-style")) return;
  const style = document.createElement("style");
  style.id = "bookcraft-cover-login-style";
  style.textContent = `
    #bookcraft-author-hub:has(.author-login) .author-login {
      margin: 7vh max(4vw, 28px) 7vh auto;
      width: min(420px, calc(100% - 32px));
      position: relative;
      z-index: 2;
    }
    .bookcraft-cover-copy {
      position: fixed;
      inset: 0 48% 0 0;
      z-index: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: clamp(34px, 7vw, 110px);
      pointer-events: none;
    }
    .bookcraft-cover-copy .cover-kicker {
      color: #83c9ff;
      letter-spacing: .18em;
      font-size: 11px;
      font-weight: 750;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .bookcraft-cover-copy h1 {
      font-size: clamp(42px, 6vw, 86px);
      line-height: .92;
      margin: 0;
      letter-spacing: -.045em;
      max-width: 760px;
    }
    .bookcraft-cover-copy h1 em {
      display: block;
      color: #9a8df3;
      font-style: normal;
      font-weight: 650;
    }
    .bookcraft-cover-copy > p {
      max-width: 640px;
      color: #9fb1c8;
      font-size: clamp(15px, 1.5vw, 19px);
      line-height: 1.6;
      margin: 22px 0 28px;
    }
    .bookcraft-cover-capabilities {
      display: grid;
      grid-template-columns: repeat(2, minmax(180px, 1fr));
      gap: 10px;
      max-width: 650px;
    }
    .bookcraft-cover-capabilities article {
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 14px;
      padding: 14px;
      background: rgba(255,255,255,.035);
      backdrop-filter: blur(12px);
    }
    .bookcraft-cover-capabilities b { display:block; margin-bottom:4px; color:#edf4ff; font-size:13px; }
    .bookcraft-cover-capabilities span { color:#7f91a9; font-size:11px; line-height:1.45; }
    @media (max-width: 980px) {
      .bookcraft-cover-copy { position:relative; inset:auto; padding:42px 24px 10px; }
      #bookcraft-author-hub:has(.author-login) .author-login { margin: 20px auto 50px; }
      .bookcraft-cover-copy h1 { font-size:46px; }
    }
    @media (max-width: 620px) {
      .bookcraft-cover-capabilities { grid-template-columns:1fr; }
    }
  `;
  document.head.appendChild(style);
}

function enhanceLogin() {
  const hub = document.getElementById("bookcraft-author-hub");
  const login = hub?.querySelector(".author-login");
  if (!hub || !login || hub.querySelector(".bookcraft-cover-copy")) return;

  const cover = document.createElement("section");
  cover.className = "bookcraft-cover-copy";
  cover.innerHTML = `
    <div class="cover-kicker">Narrative Engineering Studio</div>
    <h1>BOOK·CRAFT <em>конструктор историй</em></h1>
    <p>Проектируйте рассказ или роман как инженерную систему: от исходного текста и канона до сцен, комикса, озвучки и видеоролика.</p>
    <div class="bookcraft-cover-capabilities">
      <article><b>Разобрать произведение</b><span>Главы, сцены, герои, реплики, места, события и связи.</span></article>
      <article><b>Сохранить канон</b><span>Одни и те же персонажи, внешность, характер и история от начала до конца.</span></article>
      <article><b>Создать по мотивам</b><span>Новые ветки сюжета с контролем источника, версии и отличий от канона.</span></article>
      <article><b>Комикс → видео</b><span>Сцена → биты → кадры → storyboard → озвучка → ролик.</span></article>
    </div>`;
  hub.prepend(cover);
  trace("page.cover.ready", { page: "PAGE 1 · ОБЛОЖКА + АВТОРИЗАЦИЯ" });
}

export function mountCoverLoginEnhancer() {
  injectStyles();
  const observer = new MutationObserver(enhanceLogin);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  enhanceLogin();
}
