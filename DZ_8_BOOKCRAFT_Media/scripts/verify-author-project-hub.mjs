import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hub = fs.readFileSync(path.join(root, "src", "author-project-hub.js"), "utf8");
const main = fs.readFileSync(path.join(root, "src", "main.jsx"), "utf8");

const checks = {
  "author hub mounted": main.includes("mountAuthorProjectHub") && main.includes("./author-project-hub.js"),
  "legacy floating controls removed from main": !main.includes("mountProjectControls"),
  "demo login 1/1": hub.includes('const DEMO_USER = "1"') && hub.includes('const DEMO_PASSWORD = "1"'),
  "password is not persisted": !/setItem\([^\n]*password/i.test(hub) && !/writeJson\([^\n]*password/i.test(hub),
  "remembered auth stores session marker": hub.includes("AUTH_PERSIST_KEY") && hub.includes("AUTH_SESSION_KEY"),
  "project list exists": hub.includes("PROJECTS_KEY") && hub.includes("Мои проекты"),
  "legacy project migration": hub.includes("migrateLegacyProjectOnce") && hub.includes("Импортированный текущий проект"),
  "project actions": ["Развернуть", "Изменить", "Дублировать", "Собрать", "Удалить"].every((value) => hub.includes(value)),
  "project kinds": ["story", "book", "comic", "video"].every((value) => hub.includes(value)),
  "project pipeline": ["Источник", "Разбор", "По мотивам", "Комикс", "Видео"].every((value) => hub.includes(value)),
  "project trace events": ["auth.login.ready", "project.create", "project.open", "project.rename", "project.duplicate", "project.build", "project.delete"].every((value) => hub.includes(value)),
  "active project sync": hub.includes("syncActiveProjectNow") && hub.includes("startActiveProjectSync"),
};

const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) {
  console.error("FAIL AUTHOR PROJECT HUB:", failed.join(", "));
  process.exit(1);
}

console.log(`PASS AUTHOR PROJECT HUB: ${Object.keys(checks).length}/${Object.keys(checks).length} gates green`);
