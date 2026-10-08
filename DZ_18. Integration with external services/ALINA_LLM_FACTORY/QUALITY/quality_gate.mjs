import fs from "node:fs";

const file = process.argv[2];

if (!file || !fs.existsSync(file)) {
  console.error("FAIL: PRODUCT.json not found");
  process.exit(2);
}

const data = JSON.parse(fs.readFileSync(file, "utf8"));
const product = String(data.product ?? "");
const lower = product.toLowerCase();

const checks = [];

function check(name, passed, detail = "") {
  checks.push({ name, passed, detail });
}

check(
  "minimum_length",
  product.length >= 1500,
  `length=${product.length}`
);

check(
  "email_subject",
  /subject|тема письма|тема:/i.test(product)
);

check(
  "email_body",
  /email body|текст письма|уважаем|здравствуйте|dear /i.test(product)
);

check(
  "call_to_action",
  /call to action|cta|призыв к действию|зарегистрир|оставьте заявку|visit our website/i.test(product)
);

check(
  "campaign_objective",
  /campaign objective|цель кампании|цель рекламной кампании/i.test(product)
);

check(
  "target_audience",
  /target audience|целевая аудитория/i.test(product)
);

check(
  "channels",
  /proposed channels|каналы продвижения|каналы и тактики/i.test(product)
);

check(
  "advertising_copy",
  /sample advertising copy|рекламный текст|рекламное объявление/i.test(product)
);

check(
  "measurement",
  /measurement criteria|метрики|показатели эффективности|kpi/i.test(product)
);

const unsupported = [
  /free trial/i,
  /бесплатн\w* пробн/i,
  /\bleading platform\b/i,
  /лидирующ\w* платформ/i,
  /join (the |our )?community/i
];

const flagged = unsupported
  .filter(pattern => pattern.test(product))
  .map(pattern => pattern.source);

check(
  "unsupported_promises",
  flagged.length === 0,
  flagged.join(", ")
);

const confidence = Number(data.confidence);

check(
  "confidence_not_perfect",
  Number.isFinite(confidence) &&
  confidence >= 0 &&
  confidence < 100,
  `confidence=${data.confidence}`
);

const issues = checks.filter(item => !item.passed);

console.log("");
console.log("=== ALINA-BOOK QUALITY GATE ===");
console.log("FILE:", file);

for (const item of checks) {
  console.log(
    item.passed ? "PASS" : "FAIL",
    item.name,
    item.detail
  );
}

console.log("");
console.log("CHECKS:", checks.length);
console.log("FAILED:", issues.length);
console.log(
  "RESULT:",
  issues.length === 0 ? "QUALITY PASS" : "QUALITY FAIL"
);

process.exit(issues.length === 0 ? 0 : 1);