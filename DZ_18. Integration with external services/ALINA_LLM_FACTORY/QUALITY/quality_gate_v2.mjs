import fs from "node:fs";
import path from "node:path";

const [productFile, inputFile, reportFile] = process.argv.slice(2);

if (!productFile || !fs.existsSync(productFile)) {
  console.error("PRODUCT_FILE_MISSING");
  process.exit(2);
}

const output = JSON.parse(fs.readFileSync(productFile, "utf8").replace(/^\uFEFF/, ""));
const input = inputFile && fs.existsSync(inputFile)
  ? JSON.parse(fs.readFileSync(inputFile, "utf8").replace(/^\uFEFF/, ""))
  : {};

const raw = String(output.product ?? "");
let structured = null;

function normalizeJsonStringControls(source) {
  let result = "";
  let insideString = false;
  let escaped = false;

  for (const char of source) {
    if (insideString) {
      if (escaped) {
        result += char;
        escaped = false;
        continue;
      }

      if (char === "\\") {
        result += char;
        escaped = true;
        continue;
      }

      if (char === '"') {
        insideString = false;
        result += char;
        continue;
      }

      if (char === "\n") {
        result += "\\n";
        continue;
      }

      if (char === "\r") {
        result += "\\r";
        continue;
      }

      if (char === "\t") {
        result += "\\t";
        continue;
      }

      result += char;
      continue;
    }

    if (char === '"') {
      insideString = true;
    }

    result += char;
  }

  return result;
}

try {
  structured = JSON.parse(raw.replace(/^\uFEFF/, ""));
} catch {
  try {
    structured = JSON.parse(
      normalizeJsonStringControls(raw.replace(/^\uFEFF/, ""))
    );
  } catch {
    structured = null;
  }
}

const checks = [];

function check(id, passed, details = "") {
  checks.push({
    id,
    passed: Boolean(passed),
    details
  });
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function contains(pattern) {
  return pattern.test(raw);
}

function field(...keys) {
  let current = structured;

  for (const key of keys) {
    if (!current || typeof current !== "object") return undefined;
    current = current[key];
  }

  return current;
}

function present(value) {
  if (hasText(value)) return true;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

function section(keys, pattern) {
  return present(field(...keys)) || contains(pattern);
}

const task = String(input.task ?? "");
const expected = String(input.expected_product ?? "");

const isMarketingEmail =
  /рекламн|кампани|marketing|campaign/i.test(task + " " + expected) &&
  /email|письм/i.test(task + " " + expected);

check("product_exists", raw.trim().length > 0);

if (isMarketingEmail) {
  check(
    "campaign_objective",
    section(["campaign", "objective"], /цель кампании|campaign objective/i)
  );

  check(
    "target_audience",
    section(["campaign", "target_audience"], /целевая аудитория|target audience/i)
  );

  check(
    "key_messages",
    section(["campaign", "key_messages"], /ключевые сообщения|key messages/i)
  );

  check(
    "promotion_channels",
    section(["campaign", "channels"], /каналы продвижения|promotion channels|proposed channels/i)
  );

  check(
    "advertising_texts",
    (
      Array.isArray(field("campaign", "advertising_texts")) &&
      field("campaign", "advertising_texts").filter(hasText).length >= 2
    ) ||
    /рекламный текст\s*1[\s\S]+рекламный текст\s*2/i.test(raw)
  );

  check(
    "measurement",
    section(["campaign", "metrics"], /метрики|kpi|measurement criteria/i)
  );

  check(
    "email_subject",
    section(["email", "subject_line"], /тема письма|subject:/i)
  );

  check(
    "email_preview",
    section(["email", "preview_text"], /прехедер|превью письма|preview text/i)
  );

  check(
    "email_body",
    section(["email", "body"], /текст письма|email body/i)
  );

  check(
    "email_cta",
    section(["email", "call_to_action"], /призыв к действию|call to action|cta/i)
  );

  check(
    "email_closing",
    section(["email", "closing"], /с уважением|best regards/i)
  );
}

const taskCyrillic = /[А-Яа-яЁё]/.test(task);

const cyrillic = (raw.match(/[А-Яа-яЁё]/g) ?? []).length;
const latin = (raw.match(/[A-Za-z]/g) ?? []).length;

if (taskCyrillic) {
  check(
    "russian_language",
    cyrillic > latin,
    `cyrillic=${cyrillic}, latin=${latin}`
  );
}

const unsupportedPatterns = [
  /\bfree trial\b/i,
  /бесплатн\w*\s+пробн/i,
  /\bleading platform\b/i,
  /лидирующ\w*\s+платформ/i,
  /\bjoin (the |our )?community\b/i
];

const sourceFacts = JSON.stringify(input).toLowerCase();

const unsupported = unsupportedPatterns
  .filter(pattern =>
    pattern.test(raw) && !pattern.test(sourceFacts)
  )
  .map(pattern => pattern.source);

check(
  "unsupported_claims",
  unsupported.length === 0,
  unsupported.join(", ")
);

const confidence = output.confidence;

check(
  "confidence_valid",
  typeof confidence === "number" &&
  Number.isFinite(confidence) &&
  confidence >= 0 &&
  confidence <= 100,
  `confidence=${confidence}`
);

const failed = checks.filter(item => !item.passed);

const report = {
  schema_version: "2.0",
  product_file: path.resolve(productFile),
  product_length: raw.length,
  structured_product: structured !== null,
  task_type: isMarketingEmail ? "marketing_email" : "generic",
  technical_status: "TECHNICAL_SUCCESS",
  quality_status: failed.length === 0 ? "QUALITY_PASS" : "QUALITY_FAIL",
  checks,
  failed_count: failed.length
};

console.log("");
console.log("=== ALINA-BOOK QUALITY GATE V2 ===");

for (const item of checks) {
  console.log(
    item.passed ? "PASS" : "FAIL",
    item.id,
    item.details
  );
}

console.log("");
console.log("RESULT:", report.quality_status);
console.log("FAILED:", failed.length);

if (reportFile) {
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(
    reportFile,
    JSON.stringify(report, null, 2),
    "utf8"
  );
  console.log("REPORT:", reportFile);
}

process.exit(failed.length === 0 ? 0 : 1);