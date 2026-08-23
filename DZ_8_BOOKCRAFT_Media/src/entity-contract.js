export const ENTITY_CONTRACT = Object.freeze({
  schemaVersion: "1.0.0",
  worldId: "BOOKCRAFT-WORLD-NEVSKY-001",
  sourceKind: "synthetic-demo",
  extractionStatus: "not-implemented",
  entityTypes: Object.freeze(["character", "place", "item", "organization"]),
  canonStatuses: Object.freeze(["DEMO_CANON", "DEMO_HYPOTHESIS"]),
  requiredFields: Object.freeze([
    "id",
    "type",
    "name",
    "properties",
    "provenance",
    "confidence",
    "canonStatus",
  ]),
});

const provenance = (note) => ({
  sourceId: "BOOKCRAFT-SOURCE-SYNTH-001",
  sourceKind: "synthetic-demo",
  creator: "BOOK.CRAFT team",
  note,
});

export const DEMO_ENTITIES = Object.freeze([
  {
    id: "NAV-CHAR-001",
    type: "character",
    name: "Архивариус",
    properties: {
      occupation: "хранитель городских архивов",
      age: 60,
      distinguishingFeature: "механический монокль",
    },
    provenance: provenance("Оригинальная сущность демо-мира; не извлечена из книги."),
    confidence: 1,
    canonStatus: "DEMO_CANON",
  },
  {
    id: "NAV-CHAR-002",
    type: "character",
    name: "Лея",
    properties: {
      occupation: "инженер связи",
      age: 27,
      goal: "найти пропавшего брата",
    },
    provenance: provenance("Оригинальная сущность демо-мира; не извлечена из книги."),
    confidence: 1,
    canonStatus: "DEMO_CANON",
  },
  {
    id: "NAV-CHAR-003",
    type: "character",
    name: "Капитан",
    properties: {
      occupation: "военный пилот",
      age: 40,
      unresolvedFact: "скрывает сведения о прежней экспедиции",
    },
    provenance: provenance("Оригинальная сущность демо-мира; не извлечена из книги."),
    confidence: 1,
    canonStatus: "DEMO_CANON",
  },
  {
    id: "NAV-CHAR-004",
    type: "character",
    name: "Незнакомец",
    properties: {
      occupation: "не установлена",
      distinguishingFeature: "полупрозрачная маска",
      role: "преследователь",
    },
    provenance: provenance("Роль намеренно неполна для проверки неизвестных свойств."),
    confidence: 0.6,
    canonStatus: "DEMO_HYPOTHESIS",
  },
  {
    id: "NAV-PLACE-001",
    type: "place",
    name: "Архив под Невой",
    properties: {
      environment: "затопленное подземное хранилище",
      access: "по меняющемуся маршруту",
    },
    provenance: provenance("Оригинальное место синтетического демо-мира."),
    confidence: 1,
    canonStatus: "DEMO_CANON",
  },
  {
    id: "NAV-PLACE-002",
    type: "place",
    name: "Ночной Невский 2147",
    properties: {
      environment: "центральная магистраль будущего Петербурга",
      activeTime: "после полуночи",
    },
    provenance: provenance("Фантастическое место; не описание реального объекта."),
    confidence: 1,
    canonStatus: "DEMO_CANON",
  },
  {
    id: "NAV-ITEM-001",
    type: "item",
    name: "Карта затопленного архива",
    properties: {
      function: "показывает маршрут к центральному залу",
      constraint: "маршрут меняется после удара часов",
    },
    provenance: provenance("Оригинальный предмет синтетического демо-мира."),
    confidence: 1,
    canonStatus: "DEMO_CANON",
  },
  {
    id: "NAV-ORG-001",
    type: "organization",
    name: "Служба ночных маршрутов",
    properties: {
      function: "контролирует закрытые воздушные и подземные маршруты",
      affiliation: "Капитан связан со службой, точный статус не утверждён",
    },
    provenance: provenance("Организация создана для демонстрации типа entity."),
    confidence: 0.7,
    canonStatus: "DEMO_HYPOTHESIS",
  },
]);

export function validateEntity(entity) {
  const errors = [];
  for (const field of ENTITY_CONTRACT.requiredFields) {
    if (!(field in entity)) errors.push(`missing:${field}`);
  }
  if (!/^NAV-(CHAR|PLACE|ITEM|ORG)-\d{3}$/.test(entity.id || "")) errors.push("invalid:id");
  if (!ENTITY_CONTRACT.entityTypes.includes(entity.type)) errors.push("invalid:type");
  if (typeof entity.name !== "string" || !entity.name.trim()) errors.push("invalid:name");
  if (!entity.properties || typeof entity.properties !== "object" || Array.isArray(entity.properties)) {
    errors.push("invalid:properties");
  }
  if (
    !entity.provenance
    || entity.provenance.sourceKind !== ENTITY_CONTRACT.sourceKind
    || typeof entity.provenance.sourceId !== "string"
    || !entity.provenance.sourceId
  ) {
    errors.push("invalid:provenance");
  }
  if (typeof entity.confidence !== "number" || entity.confidence < 0 || entity.confidence > 1) {
    errors.push("invalid:confidence");
  }
  if (!ENTITY_CONTRACT.canonStatuses.includes(entity.canonStatus)) errors.push("invalid:canonStatus");
  return errors;
}

export function validateEntityRegistry(entities) {
  const ids = new Set();
  return entities.flatMap((entity) => {
    const errors = validateEntity(entity).map((error) => `${entity.id || "NO-ID"}:${error}`);
    if (ids.has(entity.id)) errors.push(`${entity.id}:duplicate:id`);
    ids.add(entity.id);
    return errors;
  });
}
