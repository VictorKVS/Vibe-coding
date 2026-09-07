const AUTH_PERSIST_KEY = "bookcraft.auth.remember.v1";
const AUTH_SESSION_KEY = "bookcraft.auth.session.v1";
const PROJECTS_KEY = "bookcraft.author.projects.v1";
const ACTIVE_PROJECT_KEY = "bookcraft.author.active-project.v1";
const WORKING_PROJECT_KEY = "bookcraft.mvp.project.v1";
const LEGACY_SAVED_PROJECT_KEY = "bookcraft.saved.project.v1";
const SOURCES_KEY = "bookcraft.sources";
const CHARACTERS_KEY = "bookcraft.characters";
const RESUME_MODE_KEY = "bookcraft.author.resume-mode.v1";
const MIGRATION_KEY = "bookcraft.author.projects.migrated.v1";
const TRACE_API = "http://127.0.0.1:8018/api/trace/ui-event";

const DEMO_USER = "1";
const DEMO_PASSWORD = "1";

function readJson(storage, key, fallback = null) {
  try {
    const value = JSON.parse(storage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storage, key, value) {
  storage.setItem(key, JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix = "project") {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function validSnapshot(snapshot) {
  return snapshot?.version === 1 && ["book", "video"].includes(snapshot.mode) && snapshot.script;
}

function blankSnapshot(mode = "book") {
  return {
    version: 1,
    mode,
    genre: "Фантастика",
    script: { introduction: "", development: "", finale: "" },
    messages: [
      { role: "assistant", text: "Новый проект создан. Расскажите, что будем делать." },
    ],
    referenceMode: "original",
    sources: [],
    characterProfiles: [],
    savedAt: nowIso(),
  };
}

function kindMeta(kind) {
  const values = {
    story: { label: "Рассказ", mode: "book", icon: "✦" },
    book: { label: "Книга", mode: "book", icon: "▤" },
    comic: { label: "Комикс", mode: "book", icon: "▦" },
    video: { label: "Видео", mode: "video", icon: "▶" },
  };
  return values[kind] || values.book;
}

function normalizeProject(project) {
  const meta = kindMeta(project?.kind);
  const createdAt = project?.createdAt || nowIso();
  return {
    id: project?.id || uid(),
    owner: DEMO_USER,
    title: String(project?.title || "Без названия").trim() || "Без названия",
    kind: project?.kind || "book",
    mode: project?.mode || meta.mode,
    status: project?.status || "draft",
    createdAt,
    updatedAt: project?.updatedAt || createdAt,
    snapshot: validSnapshot(project?.snapshot) ? project.snapshot : blankSnapshot(project?.mode || meta.mode),
    pipeline: {
      source: project?.pipeline?.source || "todo",
      structure: project?.pipeline?.structure || "todo",
      inspired: project?.pipeline?.inspired || "todo",
      comic: project?.pipeline?.comic || "todo",
      video: project?.pipeline?.video || "todo",
    },
  };
}

function loadProjects() {
  const value = readJson(localStorage, PROJECTS_KEY, []);
  return Array.isArray(value) ? value.map(normalizeProject) : [];
}

function saveProjects(items) {
  writeJson(localStorage, PROJECTS_KEY, items.map(normalizeProject));
}

function currentAuth() {
  return readJson(localStorage, AUTH_PERSIST_KEY) || readJson(sessionStorage, AUTH_SESSION_KEY);
}

async function trace(event, data = {}) {
  try {
    await fetch(TRACE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, source: "author-project-hub", data }),
    });
  } catch {
    // Observability must never block local project work.
  }
}

function migrateLegacyProjectOnce() {
  if (localStorage.getItem(MIGRATION_KEY) === "1") return;
  const projects = loadProjects();
  const working = readJson(localStorage, WORKING_PROJECT_KEY);
  const saved = readJson(localStorage, LEGACY_SAVED_PROJECT_KEY);
  const snapshot = validSnapshot(working) ? working : validSnapshot(saved) ? saved : null;
  if (snapshot && projects.length === 0) {
    projects.push(normalizeProject({
      title: "Импортированный текущий проект",
      kind: snapshot.mode === "video" ? "video" : "book",
      mode: snapshot.mode,
      snapshot,
      pipeline: { source: snapshot.sources?.length ? "ready" : "todo" },
    }));
    saveProjects(projects);
  }
  localStorage.setItem(MIGRATION_KEY, "1");
}

function formatDate(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function downloadJson(filename, payload) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function syncActiveProjectNow() {
  const activeId = localStorage.getItem(ACTIVE_PROJECT_KEY);
  if (!activeId) return;
  const snapshot = readJson(localStorage, WORKING_PROJECT_KEY);
  if (!validSnapshot(snapshot)) return;
  const projects = loadProjects();
  const index = projects.findIndex((item) => item.id === activeId);
  if (index < 0) return;
  projects[index] = normalizeProject({
    ...projects[index],
    mode: snapshot.mode,
    snapshot,
    updatedAt: nowIso(),
  });
  saveProjects(projects);
}

function openProject(project) {
  const normalized = normalizeProject(project);
  syncActiveProjectNow();
  localStorage.setItem(ACTIVE_PROJECT_KEY, normalized.id);
  writeJson(localStorage, WORKING_PROJECT_KEY, normalized.snapshot);
  if (Array.isArray(normalized.snapshot.sources)) writeJson(localStorage, SOURCES_KEY, normalized.snapshot.sources);
  if (Array.isArray(normalized.snapshot.characterProfiles)) writeJson(localStorage, CHARACTERS_KEY, normalized.snapshot.characterProfiles);
  sessionStorage.setItem(RESUME_MODE_KEY, normalized.mode);
  trace("project.open", { project_id: normalized.id, kind: normalized.kind, mode: normalized.mode });
  window.location.reload();
}

function injectStyles() {
  if (document.getElementById("bookcraft-author-hub-style")) return;
  const style = document.createElement("style");
  style.id = "bookcraft-author-hub-style";
  style.textContent = `
    #bookcraft-author-hub{position:fixed;inset:0;z-index:10050;background:radial-gradient(circle at 15% 15%,rgba(82,70,150,.24),transparent 32%),radial-gradient(circle at 85% 80%,rgba(28,140,130,.18),transparent 34%),#0b101a;color:#eef3fb;font:14px/1.45 Inter,system-ui,sans-serif;overflow:auto}
    #bookcraft-author-hub[hidden]{display:none!important}.author-shell{width:min(1220px,calc(100% - 36px));margin:0 auto;padding:34px 0 56px}.author-brand{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}.author-brand strong{font-size:18px;letter-spacing:.08em}.author-brand span{color:#7990ad;font-size:12px}.author-login{width:min(430px,calc(100% - 32px));margin:10vh auto;padding:28px;border:1px solid rgba(255,255,255,.11);border-radius:22px;background:rgba(17,24,40,.88);box-shadow:0 28px 80px rgba(0,0,0,.34)}.author-login h1{margin:0 0 4px;font-size:28px}.author-login p{margin:0 0 20px;color:#97a8bf}.author-login label{display:block;margin:12px 0;color:#aebbd0}.author-login input[type=text],.author-login input[type=password]{width:100%;box-sizing:border-box;margin-top:6px;padding:12px 13px;border-radius:11px;border:1px solid rgba(255,255,255,.14);background:#0e1522;color:#fff}.author-login .remember{display:flex;gap:8px;align-items:center}.author-login button,.author-toolbar button,.project-card button{border:1px solid rgba(255,255,255,.13);border-radius:10px;background:rgba(255,255,255,.065);color:#f2f5fb;padding:9px 11px;cursor:pointer}.author-login button{width:100%;margin-top:12px;background:linear-gradient(90deg,#4b61c7,#337f92);font-weight:700}.author-login .auth-error{min-height:20px;color:#ff9ca4;margin-top:8px}.author-toolbar{display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;margin-bottom:18px}.author-toolbar .intro{margin-right:auto}.author-toolbar h1{margin:0;font-size:30px}.author-toolbar p{margin:5px 0 0;color:#8fa2bb}.author-toolbar button.primary{border-color:rgba(93,198,150,.45);background:rgba(55,160,115,.14)}.project-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px}.project-card{border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:17px;background:linear-gradient(160deg,rgba(34,31,63,.82),rgba(12,24,34,.88));box-shadow:0 14px 40px rgba(0,0,0,.2)}.project-card header{display:flex;align-items:flex-start;gap:12px}.project-icon{width:42px;height:42px;border-radius:12px;background:rgba(134,116,225,.15);display:grid;place-items:center;font-size:21px}.project-card h3{margin:0;font-size:18px}.project-card header small{display:block;color:#8698b0;margin-top:3px}.project-pipeline{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin:15px 0}.project-pipeline span{padding:7px 5px;border-radius:8px;background:rgba(255,255,255,.045);color:#77879d;text-align:center;font-size:9px}.project-pipeline span[data-state=ready]{color:#9ce4bd;background:rgba(76,184,126,.1)}.project-actions{display:flex;gap:7px;flex-wrap:wrap}.project-actions button.open{border-color:rgba(95,180,255,.38)}.project-actions button.delete{border-color:rgba(255,100,110,.3);color:#ffb4ba}.project-meta{display:flex;justify-content:space-between;margin-top:12px;color:#778ba5;font-size:10px}.empty-projects{grid-column:1/-1;padding:38px;border:1px dashed rgba(255,255,255,.14);border-radius:18px;text-align:center;color:#8fa0b6}.author-top-nav{display:flex;gap:7px;align-items:center;margin-left:auto}.author-top-nav button{border:1px solid rgba(255,255,255,.12);border-radius:9px;padding:7px 9px;background:rgba(255,255,255,.05);color:#dce7f6;cursor:pointer;font-size:12px}
    @media(max-width:720px){.author-shell{width:min(100% - 20px,1220px);padding-top:18px}.project-grid{grid-template-columns:1fr}.project-pipeline{grid-template-columns:repeat(3,1fr)}}
  `;
  document.head.appendChild(style);
}

function buildRoot() {
  let root = document.getElementById("bookcraft-author-hub");
  if (root) return root;
  root = document.createElement("div");
  root.id = "bookcraft-author-hub";
  document.body.appendChild(root);
  return root;
}

function renderLogin(root) {
  root.hidden = false;
  root.innerHTML = `
    <div class="author-login">
      <div class="author-brand"><strong>BOOK·CRAFT</strong><span>AUTHOR WORKSPACE</span></div>
      <h1>Вход автора</h1>
      <p>Локальный демо-контур. Проекты остаются на этом компьютере.</p>
      <form>
        <label>Логин<input name="login" type="text" value="1" autocomplete="username" /></label>
        <label>Пароль<input name="password" type="password" value="1" autocomplete="current-password" /></label>
        <label class="remember"><input name="remember" type="checkbox" checked /> Запомнить меня на этом компьютере</label>
        <button type="submit">Войти</button>
        <div class="auth-error" role="alert"></div>
      </form>
    </div>`;
  root.querySelector("form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const login = String(form.get("login") || "");
    const password = String(form.get("password") || "");
    const remember = form.get("remember") === "on";
    if (login !== DEMO_USER || password !== DEMO_PASSWORD) {
      root.querySelector(".auth-error").textContent = "Неверный логин или пароль.";
      trace("auth.login.error", { user: login || "empty", reason: "invalid-credentials" });
      return;
    }
    const auth = { user: DEMO_USER, signedInAt: nowIso(), demo: true };
    localStorage.removeItem(AUTH_PERSIST_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    writeJson(remember ? localStorage : sessionStorage, remember ? AUTH_PERSIST_KEY : AUTH_SESSION_KEY, auth);
    trace("auth.login.ready", { user: DEMO_USER, remember });
    migrateLegacyProjectOnce();
    renderDashboard(root);
  });
}

function pipelineMarkup(project) {
  const steps = [
    ["source", "Источник"], ["structure", "Разбор"], ["inspired", "По мотивам"], ["comic", "Комикс"], ["video", "Видео"],
  ];
  return steps.map(([key, label]) => `<span data-state="${project.pipeline[key] || "todo"}">${label}</span>`).join("");
}

function renderDashboard(root) {
  if (!currentAuth()) {
    renderLogin(root);
    return;
  }
  migrateLegacyProjectOnce();
  syncActiveProjectNow();
  root.hidden = false;
  const projects = loadProjects();
  root.innerHTML = `
    <div class="author-shell">
      <div class="author-brand"><strong>BOOK·CRAFT</strong><span>АВТОР · ${DEMO_USER}</span></div>
      <div class="author-toolbar">
        <div class="intro"><h1>Мои проекты</h1><p>Источник → структура → новое произведение → комикс → видео</p></div>
        <button data-new="story" class="primary">+ Рассказ</button>
        <button data-new="book" class="primary">+ Книга</button>
        <button data-new="comic">+ Комикс</button>
        <button data-new="video">+ Видео</button>
        <button data-action="logout">Выйти</button>
      </div>
      <div class="project-grid"></div>
    </div>`;
  const grid = root.querySelector(".project-grid");
  if (!projects.length) {
    grid.innerHTML = `<div class="empty-projects">Проектов пока нет. Создайте рассказ или книгу — они появятся здесь.</div>`;
  }
  for (const project of projects.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))) {
    const meta = kindMeta(project.kind);
    const card = document.createElement("article");
    card.className = "project-card";
    card.dataset.projectId = project.id;
    card.innerHTML = `
      <header><div class="project-icon">${meta.icon}</div><div><h3></h3><small>${meta.label} · ${project.status === "draft" ? "черновик" : project.status}</small></div></header>
      <div class="project-pipeline">${pipelineMarkup(project)}</div>
      <div class="project-actions">
        <button class="open" data-action="open">Развернуть</button>
        <button data-action="rename">Изменить</button>
        <button data-action="duplicate">Дублировать</button>
        <button data-action="build">Собрать</button>
        <button class="delete" data-action="delete">Удалить</button>
      </div>
      <div class="project-meta"><span>обновлён ${formatDate(project.updatedAt)}</span><span>${project.id.slice(0, 12)}</span></div>`;
    card.querySelector("h3").textContent = project.title;
    card.querySelector('[data-action="open"]')?.addEventListener("click", () => openProject(project));
    card.querySelector('[data-action="rename"]')?.addEventListener("click", () => {
      const next = window.prompt("Название проекта", project.title)?.trim();
      if (!next || next === project.title) return;
      const all = loadProjects();
      const item = all.find((candidate) => candidate.id === project.id);
      if (!item) return;
      item.title = next;
      item.updatedAt = nowIso();
      saveProjects(all);
      trace("project.rename", { project_id: project.id });
      renderDashboard(root);
    });
    card.querySelector('[data-action="duplicate"]')?.addEventListener("click", () => {
      const all = loadProjects();
      const copy = normalizeProject({ ...project, id: uid(), title: `${project.title} — копия`, createdAt: nowIso(), updatedAt: nowIso() });
      all.push(copy);
      saveProjects(all);
      trace("project.duplicate", { source_project_id: project.id, project_id: copy.id });
      renderDashboard(root);
    });
    card.querySelector('[data-action="build"]')?.addEventListener("click", () => {
      syncActiveProjectNow();
      const fresh = loadProjects().find((candidate) => candidate.id === project.id) || project;
      downloadJson(`bookcraft-${project.id}.project.json`, { schema: "bookcraft-project/v1", exportedAt: nowIso(), project: fresh });
      trace("project.build", { project_id: project.id, format: "bookcraft-project/v1" });
    });
    card.querySelector('[data-action="delete"]')?.addEventListener("click", () => {
      if (!window.confirm(`Удалить проект «${project.title}»?`)) return;
      const next = loadProjects().filter((candidate) => candidate.id !== project.id);
      saveProjects(next);
      if (localStorage.getItem(ACTIVE_PROJECT_KEY) === project.id) {
        localStorage.removeItem(ACTIVE_PROJECT_KEY);
        localStorage.removeItem(WORKING_PROJECT_KEY);
      }
      trace("project.delete", { project_id: project.id });
      renderDashboard(root);
    });
    grid.appendChild(card);
  }

  for (const button of root.querySelectorAll("[data-new]")) {
    button.addEventListener("click", () => {
      const kind = button.dataset.new;
      const meta = kindMeta(kind);
      const title = window.prompt(`Название · ${meta.label}`, `Новый ${meta.label.toLowerCase()}`)?.trim();
      if (!title) return;
      const project = normalizeProject({ title, kind, mode: meta.mode, snapshot: blankSnapshot(meta.mode) });
      const all = loadProjects();
      all.push(project);
      saveProjects(all);
      trace("project.create", { project_id: project.id, kind, mode: meta.mode });
      renderDashboard(root);
    });
  }

  root.querySelector('[data-action="logout"]')?.addEventListener("click", () => {
    syncActiveProjectNow();
    localStorage.removeItem(AUTH_PERSIST_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
    trace("auth.logout", { user: DEMO_USER });
    renderLogin(root);
  });
}

function resumeModeIfNeeded() {
  const mode = sessionStorage.getItem(RESUME_MODE_KEY);
  if (!["book", "video"].includes(mode)) return;
  sessionStorage.removeItem(RESUME_MODE_KEY);
  let attempts = 0;
  const clickMode = () => {
    const cards = Array.from(document.querySelectorAll(".choice-card"));
    const target = cards[mode === "video" ? 1 : 0];
    if (target) {
      target.click();
      return;
    }
    attempts += 1;
    if (attempts < 50) window.setTimeout(clickMode, 80);
  };
  window.setTimeout(clickMode, 80);
}

function injectHeaderNavigation(root) {
  const scan = () => {
    const header = document.querySelector(".workspace-header, .brand-row");
    if (!header || header.querySelector(".author-top-nav")) return;
    const nav = document.createElement("div");
    nav.className = "author-top-nav";
    const projects = document.createElement("button");
    projects.type = "button";
    projects.textContent = "Мои проекты";
    projects.addEventListener("click", () => {
      syncActiveProjectNow();
      trace("project.hub.open", { active_project_id: localStorage.getItem(ACTIVE_PROJECT_KEY) || "" });
      renderDashboard(root);
    });
    const logout = document.createElement("button");
    logout.type = "button";
    logout.textContent = "Выйти";
    logout.addEventListener("click", () => {
      syncActiveProjectNow();
      localStorage.removeItem(AUTH_PERSIST_KEY);
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
      trace("auth.logout", { user: DEMO_USER });
      renderLogin(root);
    });
    nav.append(projects, logout);
    header.appendChild(nav);
  };
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan();
}

function startActiveProjectSync() {
  let lastRaw = localStorage.getItem(WORKING_PROJECT_KEY) || "";
  window.setInterval(() => {
    const activeId = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (!activeId) return;
    const raw = localStorage.getItem(WORKING_PROJECT_KEY) || "";
    if (!raw || raw === lastRaw) return;
    lastRaw = raw;
    syncActiveProjectNow();
  }, 750);
}

export function mountAuthorProjectHub() {
  injectStyles();
  const root = buildRoot();
  migrateLegacyProjectOnce();
  injectHeaderNavigation(root);
  startActiveProjectSync();

  if (!currentAuth()) {
    renderLogin(root);
    return;
  }

  const activeId = localStorage.getItem(ACTIVE_PROJECT_KEY);
  const active = activeId ? loadProjects().find((item) => item.id === activeId) : null;
  if (!active) {
    renderDashboard(root);
    return;
  }

  root.hidden = true;
  resumeModeIfNeeded();
}

export const AUTHOR_PROJECT_KEYS = {
  projects: PROJECTS_KEY,
  active: ACTIVE_PROJECT_KEY,
  authPersistent: AUTH_PERSIST_KEY,
  authSession: AUTH_SESSION_KEY,
};
