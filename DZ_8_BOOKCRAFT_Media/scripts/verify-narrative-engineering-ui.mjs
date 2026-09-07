import fs from "node:fs";

const main = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const cover = fs.readFileSync(new URL("../src/cover-login-enhancer.js", import.meta.url), "utf8");
const formats = fs.readFileSync(new URL("../src/project-format-browser.js", import.meta.url), "utf8");
const engineering = fs.readFileSync(new URL("../src/narrative-engineering-ui.js", import.meta.url), "utf8");

const checks = {
  "cover mounted": main.includes("mountCoverLoginEnhancer();") && cover.includes("Narrative Engineering Studio"),
  "format browser mounted": main.includes("mountProjectFormatBrowser();") && formats.includes("Рассказ") && formats.includes("Комикс") && formats.includes("Видео"),
  "engineering workspace mounted": main.includes("mountNarrativeEngineeringUi();"),
  "five author views": ["whole", "scenes", "characters", "comic", "video"].every((id) => engineering.includes(`id: \"${id}\"`)),
  "underhood control": engineering.includes("⚙ Под капотом") && engineering.includes("AI / модели") && engineering.includes("Память / источники") && engineering.includes("Live TRACE"),
  "whole manuscript view": engineering.includes("MANUSCRIPT VIEW") && engineering.includes("engineering-whole-canvas"),
  "scene engineering view": engineering.includes("Карта сцен") && engineering.includes("текст → сцены → биты → кадры"),
  "video pipeline": engineering.includes("Video Engineering Pipeline") && engineering.includes("05 · Монтаж"),
  "technical panels hidden by default": engineering.includes("bookcraft-engineering-active .model-gateway") && engineering.includes("bookcraft-tech-reveal"),
  "engineering transitions traced": engineering.includes("page.engineering.view") && formats.includes("page.project-format.projects"),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) throw new Error(`FAIL NARRATIVE-ENGINEERING-UI: ${failed.join(", ")}`);
console.log(`PASS NARRATIVE-ENGINEERING-UI: ${Object.keys(checks).length}/${Object.keys(checks).length} engineering UI gates green.`);
