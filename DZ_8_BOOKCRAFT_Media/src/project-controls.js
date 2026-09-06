const WORKING_PROJECT_KEY = "bookcraft.mvp.project.v1";
const SAVED_PROJECT_KEY = "bookcraft.saved.project.v1";
const SOURCES_KEY = "bookcraft.sources";
const CHARACTERS_KEY = "bookcraft.characters";
const RESUME_MODE_KEY = "bookcraft.resume.mode";

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function validProject(project) {
  return project?.version === 1 && ["book", "video"].includes(project.mode) && project.script;
}

function formatSavedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function injectStyles() {
  if (document.getElementById("bookcraft-project-controls-style")) return;
  const style = document.createElement("style");
  style.id = "bookcraft-project-controls-style";
  style.textContent = `
    .bookcraft-project-controls {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px;
      border-radius: 16px;
      background: rgba(13, 18, 30, .94);
      border: 1px solid rgba(255,255,255,.13);
      box-shadow: 0 18px 48px rgba(0,0,0,.32);
      backdrop-filter: blur(16px);
      font: 13px/1.2 Inter, system-ui, sans-serif;
    }
    .bookcraft-project-controls button {
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 10px;
      padding: 9px 11px;
      background: rgba(255,255,255,.07);
      color: #f5f7fb;
      cursor: pointer;
      white-space: nowrap;
    }
    .bookcraft-project-controls button:hover:not(:disabled) { background: rgba(255,255,255,.13); }
    .bookcraft-project-controls button:disabled { opacity: .42; cursor: not-allowed; }
    .bookcraft-project-controls .project-save { border-color: rgba(105, 214, 154, .42); }
    .bookcraft-project-controls .project-resume { border-color: rgba(108, 174, 255, .42); }
    .bookcraft-project-controls .project-clear { border-color: rgba(255, 111, 111, .42); }
    .bookcraft-project-controls .project-control-status {
      max-width: 190px;
      color: #aab4c7;
      padding: 0 4px;
      font-size: 11px;
    }
    @media (max-width: 900px) {
      .bookcraft-project-controls { left: 10px; right: 10px; bottom: 10px; flex-wrap: wrap; }
      .bookcraft-project-controls .project-control-status { flex-basis: 100%; max-width: none; }
    }
  `;
  document.head.appendChild(style);
}

function tryResumeMode() {
  const mode = sessionStorage.getItem(RESUME_MODE_KEY);
  if (!["book", "video"].includes(mode)) return;
  sessionStorage.removeItem(RESUME_MODE_KEY);

  let attempts = 0;
  const openSavedMode = () => {
    const buttons = Array.from(document.querySelectorAll(".choice-card"));
    const index = mode === "book" ? 0 : 1;
    if (buttons[index]) {
      buttons[index].click();
      return;
    }
    attempts += 1;
    if (attempts < 30) window.setTimeout(openSavedMode, 100);
  };
  window.setTimeout(openSavedMode, 100);
}

export function mountProjectControls() {
  if (document.getElementById("bookcraft-project-controls")) return;
  injectStyles();

  const root = document.createElement("div");
  root.id = "bookcraft-project-controls";
  root.className = "bookcraft-project-controls";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "project-save";
  saveButton.textContent = "Сохранить проект";

  const resumeButton = document.createElement("button");
  resumeButton.type = "button";
  resumeButton.className = "project-resume";
  resumeButton.textContent = "Продолжить проект";

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "project-clear";
  clearButton.textContent = "Очистить проект";

  const status = document.createElement("span");
  status.className = "project-control-status";

  function refreshStatus(message = "") {
    const saved = readJson(SAVED_PROJECT_KEY);
    resumeButton.disabled = !validProject(saved);
    if (message) {
      status.textContent = message;
      return;
    }
    status.textContent = validProject(saved)
      ? `Сохранение: ${formatSavedAt(saved.manualSavedAt || saved.savedAt) || "есть"}`
      : "Сохранённого проекта нет";
  }

  saveButton.addEventListener("click", () => {
    saveButton.disabled = true;
    status.textContent = "Сохраняю…";
    document.activeElement?.blur?.();
    window.setTimeout(() => {
      const working = readJson(WORKING_PROJECT_KEY);
      if (!validProject(working)) {
        saveButton.disabled = false;
        refreshStatus("Нет открытого проекта для сохранения");
        return;
      }
      const snapshot = { ...working, manualSavedAt: new Date().toISOString() };
      try {
        localStorage.setItem(SAVED_PROJECT_KEY, JSON.stringify(snapshot));
        refreshStatus(`Проект сохранён · ${formatSavedAt(snapshot.manualSavedAt)}`);
      } catch {
        refreshStatus("Ошибка сохранения проекта");
      }
      saveButton.disabled = false;
    }, 500);
  });

  resumeButton.addEventListener("click", () => {
    const saved = readJson(SAVED_PROJECT_KEY);
    if (!validProject(saved)) {
      refreshStatus("Сохранённый проект не найден");
      return;
    }
    localStorage.setItem(WORKING_PROJECT_KEY, JSON.stringify(saved));
    if (Array.isArray(saved.sources)) localStorage.setItem(SOURCES_KEY, JSON.stringify(saved.sources));
    if (Array.isArray(saved.characterProfiles)) localStorage.setItem(CHARACTERS_KEY, JSON.stringify(saved.characterProfiles));
    sessionStorage.setItem(RESUME_MODE_KEY, saved.mode);
    window.location.reload();
  });

  clearButton.addEventListener("click", () => {
    if (!window.confirm("Очистить текущий и сохранённый проект? Это действие нельзя отменить.")) return;
    localStorage.removeItem(WORKING_PROJECT_KEY);
    localStorage.removeItem(SAVED_PROJECT_KEY);
    localStorage.removeItem(SOURCES_KEY);
    localStorage.removeItem(CHARACTERS_KEY);
    sessionStorage.removeItem(RESUME_MODE_KEY);
    window.location.reload();
  });

  root.append(saveButton, resumeButton, clearButton, status);
  document.body.appendChild(root);
  refreshStatus();
  tryResumeMode();
}

export const PROJECT_CONTROL_KEYS = {
  working: WORKING_PROJECT_KEY,
  saved: SAVED_PROJECT_KEY,
};
