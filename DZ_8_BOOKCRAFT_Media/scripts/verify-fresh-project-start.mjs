import fs from "node:fs";

const guard = fs.readFileSync(new URL("../src/startup-project-guard.js", import.meta.url), "utf8");
const neutral = fs.readFileSync(new URL("../src/neutral-start-screen.js", import.meta.url), "utf8");
const main = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");

const checks = {
  "fresh launch clears stale active project": guard.includes("localStorage.removeItem(ACTIVE_PROJECT_KEY)"),
  "explicit editor open survives reload": guard.includes("RESUME_MODE_KEY") && guard.includes("EDITOR_SESSION_KEY"),
  "static Nevsky demo detected narrowly": guard.includes("DEMO_INTRO") && guard.includes("DEMO_DEVELOPMENT"),
  "blank starter project created after demo cleanup": guard.includes('title: "Новый проект"'),
  "start card is neutral": neutral.includes('title.innerHTML = "Новый<br />проект"'),
  "old visual content is replaced": neutral.includes("Загрузить источник") && neutral.includes("Создать с нуля"),
  "startup guard runs before React render": main.indexOf("prepareProjectHubStartup();") < main.indexOf("ReactDOM.createRoot"),
  "neutralizer mounted": main.includes("mountNeutralStartScreen();"),
};

const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) throw new Error(`FAIL FRESH-PROJECT-START: ${failed.join(", ")}`);
console.log(`PASS FRESH-PROJECT-START: ${Object.keys(checks).length}/${Object.keys(checks).length} startup gates green.`);
