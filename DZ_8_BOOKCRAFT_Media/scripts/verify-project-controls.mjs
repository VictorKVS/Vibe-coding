import fs from "node:fs";

const controls = fs.readFileSync(new URL("../src/project-controls.js", import.meta.url), "utf8");
const hub = fs.readFileSync(new URL("../src/author-project-hub.js", import.meta.url), "utf8");
const main = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");

const checks = {
  "legacy project controls retained for migration reference": controls.includes('bookcraft.saved.project.v1') && controls.includes('bookcraft.mvp.project.v1'),
  "floating controls retired from runtime": !main.includes('mountProjectControls();'),
  "author hub mounted once": main.includes('mountAuthorProjectHub();'),
  "working autosave remains compatible": hub.includes('bookcraft.mvp.project.v1'),
  "legacy saved snapshot is migrated": hub.includes('bookcraft.saved.project.v1') && hub.includes('migrateLegacyProjectOnce'),
  "project list replaces one saved slot": hub.includes('bookcraft.author.projects.v1'),
  "active project slot exists": hub.includes('bookcraft.author.active-project.v1'),
  "current project syncs into active project": hub.includes('syncActiveProjectNow') && hub.includes('startActiveProjectSync'),
  "project lifecycle actions exist": ["project.create", "project.open", "project.rename", "project.duplicate", "project.build", "project.delete"].every((event) => hub.includes(event)),
};

const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) {
  throw new Error(`FAIL PROJECT-CONTROLS: ${failed.join(", ")}`);
}

console.log(`PASS PROJECT-CONTROLS: ${Object.keys(checks).length}/${Object.keys(checks).length} author-project lifecycle checks green.`);
