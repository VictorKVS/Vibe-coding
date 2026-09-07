import fs from "node:fs";

const trace = fs.readFileSync(new URL("../src/ui-action-trace.js", import.meta.url), "utf8");
const feed = fs.readFileSync(new URL("../src/ui-action-feed.js", import.meta.url), "utf8");
const main = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const observed = fs.readFileSync(new URL("../backend/observed_router_app.py", import.meta.url), "utf8");

const checks = {
  "page 1 cover login identified": trace.includes('PAGE 1 · ОБЛОЖКА + АВТОРИЗАЦИЯ'),
  "page 2 format identified": trace.includes('PAGE 2A · ВЫБОР ФОРМАТА'),
  "page 2 project library identified": trace.includes('PAGE 2B ·'),
  "page 3 whole work identified": trace.includes('PAGE 3A · ПРОИЗВЕДЕНИЕ ЦЕЛИКОМ'),
  "page 3 scene constructor identified": trace.includes('PAGE 3B · КОНСТРУКТОР СЦЕН'),
  "every click captured": trace.includes('document.addEventListener("click"'),
  "select changes captured": trace.includes('document.addEventListener("change"'),
  "expected outcome recorded": trace.includes('expected: contract.expected'),
  "open project expects whole work": trace.includes('загрузить snapshot → открыть PAGE 3A · ПРОИЗВЕДЕНИЕ ЦЕЛИКОМ'),
  "format transition expected": trace.includes('открыть библиотеку проектов этого типа на PAGE 2B'),
  "engineering view transition expected": trace.includes('переключить инженерный workspace'),
  "pending navigation survives reload": trace.includes('sessionStorage.setItem(PENDING_KEY'),
  "successful transition traced": trace.includes('postTrace("action.ready"'),
  "stuck transition traced": trace.includes('postTrace("action.stuck"'),
  "subpage identity traced": trace.includes('page_trace_id'),
  "UI action trace mounted": main.includes('mountUiActionTrace();'),
  "UI action feed mounted": main.includes('mountUiActionFeed();') && feed.includes('ДЕЙСТВИЯ UI'),
  "server UI trace endpoint exists": observed.includes('@app.post("/api/trace/ui-event")'),
  "server redacts sensitive fields": observed.includes('token|key|secret|password|authorization|prompt|manuscript|text'),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) throw new Error(`FAIL UI-ACTION-TRACE: ${failed.join(", ")}`);

console.log(`PASS UI-ACTION-TRACE: ${Object.keys(checks).length}/${Object.keys(checks).length} action-observability gates green.`);
