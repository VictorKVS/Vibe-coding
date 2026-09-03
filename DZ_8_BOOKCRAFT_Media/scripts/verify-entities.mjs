import assert from "node:assert/strict";
import {
  DEMO_ENTITIES,
  ENTITY_CONTRACT,
  validateEntityRegistry,
} from "../src/entity-contract.js";
import { M1_DEMO, M1_WORLD } from "../src/m1-contract.js";

const results = [];
async function check(level, name, test) {
  try {
    await test();
    results.push({ level, name, status: "PASS" });
    console.log(`PASS ${level}-ENTITY: ${name}`);
  } catch (error) {
    results.push({ level, name, status: "FAIL", error: error.message });
    console.error(`FAIL ${level}-ENTITY: ${name}\n  ${error.message}`);
    process.exitCode = 1;
  }
}

await check("MIN", "контракт фиксирует четыре разрешённых типа и обязательные поля", () => {
  assert.equal(ENTITY_CONTRACT.schemaVersion, "1.0.0");
  assert.deepEqual(
    ENTITY_CONTRACT.entityTypes,
    ["character", "place", "item", "organization"],
  );
  for (const field of [
    "id",
    "type",
    "name",
    "properties",
    "provenance",
    "confidence",
    "canonStatus",
  ]) {
    assert.ok(ENTITY_CONTRACT.requiredFields.includes(field), `нет поля ${field}`);
  }
});

await check("MED", "восемь синтетических сущностей проходят строгую проверку", () => {
  assert.equal(DEMO_ENTITIES.length, 8);
  assert.deepEqual(validateEntityRegistry(DEMO_ENTITIES), []);
  assert.equal(new Set(DEMO_ENTITIES.map((entity) => entity.id)).size, DEMO_ENTITIES.length);
  for (const type of ENTITY_CONTRACT.entityTypes) {
    assert.ok(DEMO_ENTITIES.some((entity) => entity.type === type), `нет типа ${type}`);
  }
});

await check("MAX", "демо не выдаётся за автоматическое извлечение или внешний канон", () => {
  assert.equal(ENTITY_CONTRACT.sourceKind, "synthetic-demo");
  assert.equal(ENTITY_CONTRACT.extractionStatus, "not-implemented");
  assert.ok(DEMO_ENTITIES.every((entity) => entity.provenance.sourceKind === "synthetic-demo"));
  assert.ok(DEMO_ENTITIES.every((entity) => entity.canonStatus.startsWith("DEMO_")));
  assert.deepEqual(
    M1_DEMO.characters.map((character) => character.id),
    ["NAV-CHAR-001", "NAV-CHAR-002", "NAV-CHAR-003", "NAV-CHAR-004"],
  );
  assert.deepEqual(
    M1_WORLD.characters.map((character) => character.entityId),
    ["NAV-CHAR-001", "NAV-CHAR-002", "NAV-CHAR-003", "NAV-CHAR-004"],
  );
  const tampered = [...DEMO_ENTITIES, { ...DEMO_ENTITIES[0] }];
  assert.ok(validateEntityRegistry(tampered).some((error) => error.includes("duplicate:id")));
});

if (!process.exitCode) {
  console.log(`\nEntity contract acceptance: ${results.length}/${results.length} checks green.`);
}
