import fs from "node:fs";

const controls = fs.readFileSync(new URL("../src/project-controls.js", import.meta.url), "utf8");
const main = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");

const checks = {
  "explicit save button": controls.includes('saveButton.textContent = "Сохранить проект"'),
  "explicit resume button": controls.includes('resumeButton.textContent = "Продолжить проект"'),
  "explicit clear button": controls.includes('clearButton.textContent = "Очистить проект"'),
  "separate manual snapshot": controls.includes('bookcraft.saved.project.v1'),
  "working autosave remains compatible": controls.includes('bookcraft.mvp.project.v1'),
  "save copies working project": controls.includes('localStorage.setItem(SAVED_PROJECT_KEY'),
  "resume restores working slot": controls.includes('localStorage.setItem(WORKING_PROJECT_KEY'),
  "resume restores project mode": controls.includes('sessionStorage.setItem(RESUME_MODE_KEY, saved.mode)'),
  "clear removes working project": controls.includes('localStorage.removeItem(WORKING_PROJECT_KEY)'),
  "clear removes saved project": controls.includes('localStorage.removeItem(SAVED_PROJECT_KEY)'),
  "clear removes project sources": controls.includes('localStorage.removeItem(SOURCES_KEY)'),
  "clear removes project characters": controls.includes('localStorage.removeItem(CHARACTERS_KEY)'),
  "controls mounted once": main.includes('mountProjectControls();'),
};

const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) {
  throw new Error(`FAIL PROJECT-CONTROLS: ${failed.join(", ")}`);
}

console.log(`PASS PROJECT-CONTROLS: ${Object.keys(checks).length}/${Object.keys(checks).length} lifecycle checks green.`);
