const ACTIVE_PROJECT_KEY = "bookcraft.author.active-project.v1";
const PROJECTS_KEY = "bookcraft.author.projects.v1";
const WORKING_PROJECT_KEY = "bookcraft.mvp.project.v1";
const LEGACY_SAVED_PROJECT_KEY = "bookcraft.saved.project.v1";
const RESUME_MODE_KEY = "bookcraft.author.resume-mode.v1";
const EDITOR_SESSION_KEY = "bookcraft.author.editor-session.v1";
const MIGRATION_KEY = "bookcraft.author.projects.migrated.v1";
const TRACE_API = "http://127.0.0.1:8018/api/trace/ui-event";

const DEMO_INTRO = "В 2147 году Невский проспект засыпал ровно в полночь";
const DEMO_DEVELOPMENT = "Лея спустилась под Неву вместе с Капитаном";

function readJson(storage, key, fallback = null) {
  try {
    return JSON.parse(storage.getItem(key) || "null") ?? fallback;
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

function trace(event, data = {}) {
  fetch(TRACE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, source: "startup-project-guard", data }),
  }).catch(() => {});
}

function isStaticNevskyDemoSnapshot(snapshot) {
  const intro = String(snapshot?.script?.introduction || "");
  const development = String(snapshot?.script?.development || "");
  return intro.includes(DEMO_INTRO) && development.includes(DEMO_DEVELOPMENT);
}

function blankProject() {
  const timestamp = nowIso();
  const id = `project-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
  return {
    id,
    owner: "1",
    title: "Новый проект",
    kind: "book",
    mode: "book",
    status: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
    snapshot: {
      version: 1,
      mode: "book",
      genre: "Фантастика",
      script: { introduction: "", development: "", finale: "" },
      messages: [{ role: "assistant", text: "Новый проект создан. Добавьте рассказ, книгу или идею." }],
      referenceMode: "original",
      sources: [],
      characterProfiles: [],
      savedAt: timestamp,
    },
    pipeline: { source: "todo", structure: "todo", inspired: "todo", comic: "todo", video: "todo" },
  };
}

function retireStaticDemo() {
  const projects = readJson(localStorage, PROJECTS_KEY, []);
  const list = Array.isArray(projects) ? projects : [];
  const filtered = list.filter((project) => !isStaticNevskyDemoSnapshot(project?.snapshot));
  const working = readJson(localStorage, WORKING_PROJECT_KEY);
  const saved = readJson(localStorage, LEGACY_SAVED_PROJECT_KEY);
  const removedWorking = isStaticNevskyDemoSnapshot(working);
  const removedSaved = isStaticNevskyDemoSnapshot(saved);
  const removedProjects = list.length - filtered.length;

  if (removedWorking) localStorage.removeItem(WORKING_PROJECT_KEY);
  if (removedSaved) localStorage.removeItem(LEGACY_SAVED_PROJECT_KEY);
  if (removedProjects) writeJson(localStorage, PROJECTS_KEY, filtered);

  if (removedWorking || removedSaved || removedProjects) {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
    sessionStorage.removeItem(EDITOR_SESSION_KEY);
    sessionStorage.removeItem(RESUME_MODE_KEY);
    // Не даём legacy-migrator снова воскресить именно удалённый встроенный demo.
    localStorage.setItem(MIGRATION_KEY, "1");

    const remaining = readJson(localStorage, PROJECTS_KEY, []);
    if (!Array.isArray(remaining) || remaining.length === 0) {
      writeJson(localStorage, PROJECTS_KEY, [blankProject()]);
    }
    trace("project.static-demo.retired", {
      removed_projects: removedProjects,
      removed_working: removedWorking,
      removed_saved: removedSaved,
    });
  }
}

function freshLaunchShouldOpenHub() {
  const activeId = localStorage.getItem(ACTIVE_PROJECT_KEY) || "";
  const resumeMode = sessionStorage.getItem(RESUME_MODE_KEY) || "";
  const editorSession = sessionStorage.getItem(EDITOR_SESSION_KEY) || "";

  if (activeId && ["book", "video"].includes(resumeMode)) {
    sessionStorage.setItem(EDITOR_SESSION_KEY, activeId);
    trace("project.editor.explicit-open", { project_id: activeId, mode: resumeMode });
    return;
  }

  if (activeId && editorSession === activeId) {
    return;
  }

  if (activeId) {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
    trace("project.startup.hub", { previous_active_project_id: activeId, reason: "fresh-launch" });
  }
}

export function prepareProjectHubStartup() {
  retireStaticDemo();
  freshLaunchShouldOpenHub();
}

export function mountProjectHubNavigationGuard() {
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button");
    if (!button) return;
    const label = String(button.textContent || "").trim();
    if (/^Мои проекты$/i.test(label) || /^Выйти$/i.test(label)) {
      sessionStorage.removeItem(EDITOR_SESSION_KEY);
    }
  }, true);
}

export const STARTUP_PROJECT_GUARD_KEYS = {
  editorSession: EDITOR_SESSION_KEY,
};
