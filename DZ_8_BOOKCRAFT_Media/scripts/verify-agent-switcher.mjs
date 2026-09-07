import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const switcher = fs.readFileSync(path.join(root, "src", "agent-switcher.js"), "utf8");
const runtime = fs.readFileSync(path.join(root, "src", "model-runtime-controls.js"), "utf8");
const main = fs.readFileSync(path.join(root, "src", "main.jsx"), "utf8");

const checks = {
  "agent switcher mounted": main.includes("mountAgentSwitcher"),
  "local selection persisted": runtime.includes("bookcraft.local.model.selection.v1"),
  "local switch API called": runtime.includes("/api/models/switch"),
  "local failure does not reset choice": runtime.includes("LOAD FAILED") && !runtime.includes("select.value = \"auto\""),
  "external preset storage": switcher.includes("bookcraft.external.agent.presets.v1"),
  "external source persisted": switcher.includes("bookcraft.agent.source.v1"),
  "gigachat preset": switcher.includes("GigaChat API") && switcher.includes("https://api.giga.chat/v1/chat/completions"),
  "custom openai-compatible preset": switcher.includes("OpenAI-compatible"),
  "api key excluded from presets": !/apiKey\s*:/.test(switcher),
  "user can save and delete presets": switcher.includes("Сохранить текущий внешний агент") && switcher.includes("Удалить мой пресет"),
};

const failed = Object.entries(checks).filter(([, value]) => !value).map(([name]) => name);
if (failed.length) {
  console.error(`FAIL AGENT-SWITCHER: ${failed.join(", ")}`);
  process.exit(1);
}

console.log(`PASS AGENT-SWITCHER: ${Object.keys(checks).length}/${Object.keys(checks).length} gates green`);
