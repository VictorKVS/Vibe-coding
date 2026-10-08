import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const runnerPath = process.argv[2];
const testDir = process.argv[3];

const source = fs.readFileSync(runnerPath, "utf8");

const expected = [
  'execution.status === "success"',
  'return meta.status === "success"',
  'fs.existsSync(productFile)'
];

for (const fragment of expected) {
  assert.ok(
    source.includes(fragment),
    `Missing runner condition: ${fragment}`
  );
}

function accepted(outputDir, executionStatus) {
  const productFile = path.join(outputDir, "PRODUCT.json");

  return (
    executionStatus === "success" &&
    (() => {
      const metaPath = path.join(outputDir, "META.json");
      if (!fs.existsSync(metaPath)) return false;
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        return meta.status === "success";
      } catch {
        return false;
      }
    })() &&
    fs.existsSync(productFile)
  );
}

const cases = [
  ["success_with_product", "success", "success", true, true],
  ["skipped", "success", "SKIPPED_NOT_CONFIGURED", false, false],
  ["failed", "failed", "failed", false, false],
  ["success_without_product", "success", "success", false, false],
  ["invalid_meta", "success", "INVALID_JSON", true, false],
  ["success_after_skip", "success", "success", true, true]
];

let passed = 0;

for (const [name, executionStatus, metaStatus, hasProduct, expectedResult] of cases) {
  const outputDir = path.join(testDir, name);

  fs.mkdirSync(outputDir, { recursive: true });

  const metaPath = path.join(outputDir, "META.json");
  const productPath = path.join(outputDir, "PRODUCT.json");

  if (metaStatus === "INVALID_JSON") {
    fs.writeFileSync(metaPath, "{invalid", "utf8");
  } else {
    fs.writeFileSync(
      metaPath,
      JSON.stringify({ status: metaStatus }),
      "utf8"
    );
  }

  if (hasProduct) {
    fs.writeFileSync(
      productPath,
      JSON.stringify({ test: true }),
      "utf8"
    );
  }

  const actual = accepted(outputDir, executionStatus);

  assert.equal(
    actual,
    expectedResult,
    `Unexpected result: ${name}`
  );

  console.log(`PASS: ${name}`);
  passed++;
}

console.log("");
console.log(`TESTS PASSED: ${passed}/${cases.length}`);