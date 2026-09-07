import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const main = fs.readFileSync(path.join(root, "src", "main.jsx"), "utf8");
const trace = fs.readFileSync(path.join(root, "src", "live-trace-panel.js"), "utf8");
const observed = fs.readFileSync(path.join(root, "backend", "observed_router_app.py"), "utf8");
const launcher = fs.readFileSync(path.join(root, "START_BOOKCRAFT_MEDIA.ps1"), "utf8");

const checks = {
  "live trace mounted": main.includes("mountLiveTracePanel"),
  "trace recent polled": trace.includes("/api/trace/recent"),
  "runtime polled": trace.includes("/api/models/runtime"),
  "failure state polled": trace.includes("/api/models/failures"),
  "stuck diagnosis": trace.includes("ВЕРОЯТНО ЗАВИСЛО") && trace.includes("ИДЁТ ЗАГРУЗКА"),
  "model lifecycle labels": ["СМЕНА", "ВЫГРУЗКА", "ЗАГРУЗКА", "ПОДНЯТА", "FALLBACK"].every((x) => trace.includes(x)),
  "manual switch traced": observed.includes("llm.switch.request") && observed.includes("llm.switch.ready") && observed.includes("llm.switch.error"),
  "ui events traced": observed.includes("/api/trace/ui-event") && trace.includes("postUiTrace"),
  "observed router launched": launcher.includes("backend.observed_router_app:app"),
  "trace file advertised": launcher.includes("gateway-YYYYMMDD.jsonl"),
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error("FAIL LIVE TRACE:", failed.join(", "));
  process.exit(1);
}
console.log(`PASS LIVE TRACE: ${Object.keys(checks).length}/${Object.keys(checks).length} gates green`);
