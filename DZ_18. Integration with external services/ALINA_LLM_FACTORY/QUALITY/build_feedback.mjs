import fs from "node:fs";
import path from "node:path";

const [reportPath, outputPath] = process.argv.slice(2);

if (!reportPath || !outputPath) {
  console.error("Usage: node build_feedback.mjs REPORT.json FEEDBACK.json");
  process.exit(2);
}

function readJson(file) {
  return JSON.parse(
    fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")
  );
}

const report = readJson(reportPath);

if (!Array.isArray(report.checks)) {
  throw new Error("Invalid quality report: checks missing");
}

const requirements = {
  promotion_channels:
    "Добавь конкретные каналы продвижения и тактику использования каждого канала.",

  advertising_texts:
    "Подготовь минимум два законченных рекламных текста, готовых к публикации.",

  measurement:
    "Добавь метрики оценки эффективности кампании без выдуманных числовых целей.",

  campaign_objective:
    "Сформулируй конкретную цель рекламной кампании.",

  target_audience:
    "Укажи целевую аудиторию и её основные потребности.",

  key_messages:
    "Подготовь ключевые сообщения кампании.",

  email_subject:
    "Добавь готовую тему email-письма.",

  email_preview:
    "Добавь готовый текст предпросмотра email-письма.",

  email_body:
    "Напиши полный текст email-письма.",

  email_cta:
    "Добавь понятный призыв к действию. Не придумывай ссылку.",

  email_closing:
    "Добавь завершение email-письма.",

  russian_language:
    "Сохрани русский язык исходного задания.",

  unsupported_claims:
    "Удали неподтверждённые рекламные обещания.",

  product_exists:
    "Создай готовый продукт по исходному заданию.",

  confidence_valid:
    "Укажи confidence числом от 0 до 100."
};

const failed = report.checks.filter(item => !item.passed);

const feedback = {
  schema_version: "1.0",
  source_quality_status: report.quality_status,
  task_type: report.task_type,
  failed_count: failed.length,
  missing_requirements: failed.map(item => ({
    id: item.id,
    instruction:
      requirements[item.id] ??
      `Исправь нарушение требования: ${item.id}`,
    details: item.details ?? ""
  })),
  preservation_rules: [
    "Сохрани все корректные части предыдущего продукта.",
    "Не сокращай уже подготовленные материалы.",
    "Исправляй только выявленные недостатки и связанные с ними ошибки.",
    "Не выдумывай цены, ссылки, скидки, показатели и возможности.",
    "Верни полный обновлённый продукт, а не список изменений.",
    "Не заявляй о полном качестве без повторной проверки."
  ],
  next_action:
    failed.length === 0
      ? "NO_REPAIR_NEEDED"
      : "REPAIR_REQUIRED"
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

fs.writeFileSync(
  outputPath,
  JSON.stringify(feedback, null, 2),
  "utf8"
);

console.log("=== ALINA-BOOK QUALITY FEEDBACK ===");
console.log("SOURCE STATUS:", report.quality_status);
console.log("MISSING REQUIREMENTS:", failed.length);
console.log("NEXT ACTION:", feedback.next_action);

for (const item of feedback.missing_requirements) {
  console.log("-", item.id);
  console.log(" ", item.instruction);
}

console.log("FEEDBACK FILE:", outputPath);