import fs from "node:fs";

const trace = fs.readFileSync(new URL("../src/ui-action-trace.js", import.meta.url), "utf8");
const main = fs.readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const observed = fs.readFileSync(new URL("../backend/observed_router_app.py", import.meta.url), "utf8");

const checks = {
  "page 1 login identified": trace.includes('PAGE 1 · ВХОД АВТОРА'),
  "page 2 projects identified": trace.includes('PAGE 2 · МОИ ПРОЕКТЫ'),
  "page 3 editor identified": trace.includes('PAGE 3 · РЕДАКТОР ПРОЕКТА'),
  "every click captured": trace.includes('document.addEventListener("click"'),
  "select changes captured": trace.includes('document.addEventListener("change"'),
  "expected outcome recorded": trace.includes('expected: contract.expected'),
  "open project expects editor": trace.includes('загрузить snapshot проекта → открыть PAGE 3'),
  "pending navigation survives reload": trace.includes('sessionStorage.setItem(PENDING_KEY'),
  "successful transition traced": trace.includes('postTrace("action.ready"'),
  "stuck transition traced": trace.includes('postTrace("action.stuck"'),
  "trace panel shows all actions": trace.includes('filter.checked = false'),
  "UI action trace mounted": main.includes('mountUiActionTrace();'),
  "server UI trace endpoint exists": observed.includes('@app.post("/api/trace/ui-event")'),
  "server redacts sensitive fields": observed.includes('token|key|secret|password|authorization|prompt|manuscript|text'),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) throw new Error(`FAIL UI-ACTION-TRACE: ${failed.join(", ")}`);

console.log(`PASS UI-ACTION-TRACE: ${Object.keys(checks).length}/${Object.keys(checks).length} action-observability gates green.`);
