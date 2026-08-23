import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GENRES, M1_DEMO, M1_WORLD } from "../src/m1-contract.js";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const launcherSource = await readFile(
  new URL("./start-book-studio.ps1", import.meta.url),
  "utf8",
);
const demoRunbook = await readFile(
  new URL("../DEMO_RUNBOOK.md", import.meta.url),
  "utf8",
);

const results = [];
async function check(level, name, test) {
  try {
    await test();
    results.push({ level, name, status: "PASS" });
    console.log(`PASS ${level}: ${name}`);
  } catch (error) {
    results.push({ level, name, status: "FAIL", error: error.message });
    console.error(`FAIL ${level}: ${name}\n  ${error.message}`);
    process.exitCode = 1;
  }
}

await check("MIN", "формальный dropdown хранит и показывает один из 5 жанров", () => {
  assert.equal(GENRES.length, 5);
  assert.equal(new Set(GENRES).size, 5);
  assert.match(appSource, /const \[genre, setGenre\] = useState\(initialProject\?\.genre \|\| GENRES\[0\]\)/);
  assert.match(appSource, /value=\{genre\}/);
  assert.match(appSource, /onChange=\{\(event\) => setGenre\(event\.target\.value\)\}/);
  assert.match(appSource, /(?:Текущий жанр:|Активен:)[\s\S]{0,80}\{genre\}/);
  for (const genre of GENRES) assert.ok(demoRunbook.includes(genre), `нет жанра ${genre} в сценарии записи`);
  assert.match(demoRunbook, /Текущий жанр/);
  assert.match(demoRunbook, /state/i);
});

await check("MED", "локальная генерация обновляет три редактируемые части", () => {
  for (const field of ["introduction", "development", "finale"]) {
    assert.ok(appSource.includes(field), `нет поля ${field}`);
  }
  assert.match(appSource, /const endpoint = isLocal[\s\S]{0,80}\? "\/llm-api\/v1\/chat\/completions"/);
  assert.match(appSource, /setScript\(result\.script\)/);
  assert.match(appSource, /setScript\(\(current\) => \(\{ \.\.\.current, \[key\]: event\.target\.value \}\)\)/);
  assert.match(appSource, /book:[\s\S]*video:/);
  assert.match(appSource, /function normalizeScriptPayload/);
  assert.match(appSource, /async function callModelCompletion/);
  assert.match(appSource, /controller\.abort\(\)/);
  assert.match(appSource, /Формат ответа был исправлен автоматически/);
  assert.match(appSource, /исходный сценарий сохранён/);
});

await check("MED", "универсальный Model Gateway не сохраняет ключи", () => {
  assert.match(appSource, /Локальная модель/);
  assert.match(appSource, /Внешний агент/);
  assert.match(appSource, /OpenAI-compatible Chat Completions/);
  assert.match(appSource, /type="password"/);
  assert.match(appSource, /apiKey: ""/);
  assert.doesNotMatch(appSource, /localStorage\.setItem\([^)]*apiKey/i);
  assert.match(appSource, /const LOCAL_MODELS = \[/);
  assert.match(appSource, /MythoMax-L2-13B/);
  assert.match(appSource, /Подключить модель/);
  assert.match(appSource, /READY · модель подключена/);
  assert.match(appSource, /GigaChat API · api\.giga\.chat/);
  assert.match(appSource, /GigaChat-2-Max/);
  assert.match(appSource, /GigaChat-3-Ultra/);
  assert.match(appSource, /"\/giga-cloud\/v1\/chat\/completions"/);
  assert.match(appSource, /Временный токен на 30 минут/);
});

await check("MAX", "демо-мир ограничен четырьмя героями и тремя событиями", () => {
  assert.equal(M1_WORLD.title, "Невский после полуночи");
  assert.equal(M1_WORLD.characters.length, 4);
  assert.equal(M1_WORLD.events.length, 3);
  assert.equal(M1_WORLD.events.filter((event) => event.status === "generated").length, 1);
  assert.equal(M1_WORLD.source, "static-demo");
  assert.equal(M1_WORLD.extractionStatus, "not-implemented");
  assert.equal(M1_DEMO.characters.length, 4);
  assert.equal(M1_DEMO.script.finale, "");
  assert.ok(M1_DEMO.idea.length > 40);
  assert.match(appSource, /function loadM1Demo\(\)/);
  assert.match(appSource, /setIdea\(M1_DEMO\.idea\)/);
  assert.match(launcherSource, /npm\.cmd test/);
  assert.match(launcherSource, /Test-LlmAnswer/);
  assert.match(launcherSource, /READY FOR DEMO/);
  assert.match(launcherSource, /Test-TcpPort 1234/);
  assert.match(launcherSource, /Test-TcpPort 5173/);
  assert.match(demoRunbook, /статическ/i);
  assert.match(demoRunbook, /не является автоматическим извлечением/i);
  assert.match(demoRunbook, /локального GigaChat/i);
  const forbidden = ["neo4j", "langchain", "pgvector", "chromadb"];
  const dependencies = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }).map((name) => name.toLowerCase());
  for (const name of forbidden) assert.ok(!dependencies.includes(name), `раннее расширение: ${name}`);
  assert.doesNotMatch(appSource, /(api[_-]?key|secret)\s*[:=]\s*["'][^"']{12,}["']/i);
});

if (!process.exitCode) {
  console.log(`\nM1 acceptance: ${results.length}/${results.length} checks green.`);
}
