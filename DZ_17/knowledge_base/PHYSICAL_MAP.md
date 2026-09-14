# ALINA Knowledge Base — физическая карта

Цель этого файла — в одном месте показать **где именно физически лежат знания, реестры, схемы, профили, исходные материалы и код**, чтобы не искать их по репозиторию и не создавать дубликаты.

Статусы:

- `EXISTS` — путь уже существует в `main`;
- `PLANNED` — путь зарезервирован архитектурой, но содержимое ещё не создано;
- `LOCAL_ONLY` — рабочие оригиналы могут существовать на машине, но не должны автоматически попадать в Git.

---

## 1. Каноническая база знаний

| Статус | Физический путь | Что хранится | Source of Truth |
|---|---|---|---|
| EXISTS | `DZ_17/knowledge_base/README.md` | назначение и общая структура Meta/Universal KB | документация |
| EXISTS | `DZ_17/knowledge_base/ANALYST_KB_SPEC.md` | логическая модель знаний, методы, controls, metrics, trace | спецификация |
| EXISTS | `DZ_17/knowledge_base/FATHER_ANALYST_FOUNDATION.md` | FATHER-маршрут source → idea → algorithm → scenario → conditions | orchestration/knowledge foundation |
| EXISTS | `DZ_17/knowledge_base/source_registry.v1.json` | единый реестр ГОСТ/ISO/W3C/NIST/OWASP/MITRE/книг | **да, для библиографии источников** |
| EXISTS | `DZ_17/knowledge_base/analyst_method_cards.v1.json` | карточки аналитических методов и `source_refs` | да, для текущих Method Cards |
| EXISTS | `DZ_17/knowledge_base/trace_contract.v1.json` | контракт аудируемого trace | да, для trace contract |
| EXISTS | `DZ_17/knowledge_base/open_access_library.v1.json` | перечень легально доступных открытых материалов | реестр доступа |
| EXISTS | `DZ_17/knowledge_base/translation_terminology.v1.json` | единый реестр терминологии переводчика | **да, для translation terminology** |
| EXISTS | `DZ_17/knowledge_base/translation_memory.v1.json` | Translation Memory проверенных сегментов | **да, для TM структуры** |
| EXISTS | `DZ_17/knowledge_base/translation_benchmark.v1.json` | версия корпуса/метрик сравнения переводчиков | benchmark contract |
| EXISTS | `DZ_17/knowledge_base/algorithm_decision_card.schema.json` | схема карточки алгоритмического решения | schema source |
| EXISTS | `DZ_17/knowledge_base/DECISION_AND_TRAINING_FRAMEWORK.md` | правила выбора решений, обучения и review | методика проекта |
| EXISTS | `DZ_17/knowledge_base/ANALYST_PROFESSOR_ROLE.md` | роль старшего/профессорского Analyst | role specification |
| EXISTS | `DZ_17/knowledge_base/PROGRAMMER_AGENT_KB_LEVELS.md` | уровни KB специализации программиста | specialization example |
| EXISTS | `DZ_17/knowledge_base/SOURCE_ACQUISITION_AND_EXTRACTION_PLAN.md` | порядок сбора и разбора источников | acquisition plan |
| EXISTS | `DZ_17/knowledge_base/PROVENANCE_AND_STORAGE_POLICY.md` | правила происхождения, хранения, dedup и source locator | governance policy |
| EXISTS | `DZ_17/knowledge_base/PHYSICAL_MAP.md` | текущая физическая карта всей KB | **да, для местонахождения** |
| EXISTS | `DZ_17/knowledge_base/domains/legal_ib/README.md` | правила домена юридической/нормативной базы ИБ; доменный слой общей KB | domain contract |
| EXISTS | `DZ_17/knowledge_base/domains/legal_ib/document_registry.v1.json` | один канонический юридический документ → много Capture/редакций; полное название и реквизиты | **да, для legal/IB document identity** |

---

## 2. Где лежат общие стандарты и методология

| Статус | Путь | Назначение |
|---|---|---|
| EXISTS | `DZ_17/METHODOLOGY_AND_STANDARDS.md` | мастер-перечень стандартов, методик и литературы |
| EXISTS | `docs/TECHNOLOGY_REGISTRY.md` | человекочитаемый реестр уже отработанных технологий репозитория |
| EXISTS | `registry/technologies.json` | машиночитаемый реестр уже реализованных технологий |
| EXISTS | `registry/verify_registry.py` | проверка Technology Registry |

Эти файлы **не копируются** внутрь профилей агентов. Агенты должны ссылаться на канонические ID/пути.

---

## 3. Где лежат Domain Profiles и машинные схемы

| Статус | Путь | Назначение |
|---|---|---|
| EXISTS | `DZ_17/profiles/analyst.v1.json` | ROLE-ANALYST-FATHER: Главный Аналитик, zoo roles, 5-stream routing, gates |
| EXISTS | `DZ_17/profiles/narrative.v1.json` | первый Domain Profile для narrative |
| EXISTS | `DZ_17/profiles/translator.v1.json` | ROLE-TRANSLATOR: режимы exact/technical/reader, RAG и benchmark policy |
| EXISTS | `DZ_17/rag/analyst-zoo.v1.json` | retrieval policy для ролей Analyst Zoo |
| EXISTS | `DZ_17/orchestration/father-analyst-pipeline.v1.json` | машиночитаемый K0–K13 pipeline и 5 потоков |
| EXISTS | `DZ_17/prompts/analyst-zoo.v1.md` | prompt pack ролей Source/Structure/Idea/Algorithm/Scenario/Review |
| EXISTS | `DZ_17/schemas/candidate-knowledge-package.schema.json` | пакет кандидатов знаний для review |
| EXISTS | `DZ_17/schemas/domain-profile.schema.json` | общий контракт Domain Profile |
| EXISTS | `DZ_17/openapi/analyst-core.v1.yaml` | API Analyst Core |

План расширения без копирования общего ядра:

```text
DZ_17/profiles/
├── analyst.v1.json
├── narrative.v1.json
├── translator.v1.json
├── osint.v1.json                 # PLANNED
├── cybersecurity.v1.json         # PLANNED
├── regulatory.v1.json            # PLANNED
├── programming.v1.json           # PLANNED
└── engineering.v1.json           # PLANNED
```

Каждый профиль должен содержать только специализацию и ссылки на FOUNDATION, а не копии общих стандартов.

---

## 4. Где лежит код, использующий знания

| Статус | Путь | Назначение |
|---|---|---|
| EXISTS | `DZ_17/app/app/kb-analyst.tsx` | UI/logic текущего KB Analyst MVP |
| EXISTS | `DZ_17/app/app/api/llm/route.ts` | LLM provider/router layer + task `translation`; получает active prompt из canonical Prompt Registry |
| EXISTS | `DZ_17/app/lib/translator-rag.ts` | deterministic terminology retrieval + exact Translation Memory retrieval |
| EXISTS | `DZ_17/app/lib/runtime-policy.ts` | prompt/KB/model policy enforcement для runtime |
| EXISTS | `DZ_17/app/lib/prompt-registry.ts` | **единственный builtin source of truth системных prompt bodies + versioned runtime Prompt Store API** |
| EXISTS | `DZ_17/app/app/use-llm.ts` | клиентский LLM hook |
| EXISTS | `DZ_17/app/app/model-switcher.tsx` | UI выбора модели |
| EXISTS | `DZ_17/app/app/research-lab.tsx` | research UI |
| EXISTS | `DZ_17/app/app/narrative-lab.tsx` | narrative specialization UI |
| EXISTS | `DZ_17/app/scripts/run-with-models.mjs` | запуск локальных моделей вместе с приложением |
| EXISTS | `DZ_17/app/scripts/run-kf-5-streams.mjs` | фактический 5-поточный аналитический baseline и телеметрия |
| EXISTS | `DZ_17/app/scripts/run-father-orchestration.mjs` | исполнимый верхний orchestration pass |
| EXISTS | `DZ_17/app/scripts/configure-existing-model-zoo.ps1` | регистрация существующего FATHER_MODELS без копирования весов и назначение specialist routes |
| EXISTS | `DZ_17/app/scripts/extract-pdf-text.py` | page-addressable извлечение PDF для Knowledge Factory; не угадывает юридическое имя |
| EXISTS | `DZ_17/app/scripts/ingest-pdf-kf.mjs` | Source/Capture ingest + SHA-256; поддерживает stable `--source-id` и отдельный `--capture-id` |
| EXISTS | `DZ_17/app/scripts/lib/document-identity.mjs` | восстановление типа/органа/номера/даты/предмета/полного названия из текста документа с page evidence |
| EXISTS | `DZ_17/app/scripts/lib/legal-registry.mjs` | strict dedup: один юридический документ, несколько Capture; конфликт названий → review, не silent overwrite |
| EXISTS | `DZ_17/app/scripts/intake-downloads-one-by-one.mjs` | последовательная обработка Downloads по одному PDF и routing в legal/IB registry |
| EXISTS | `DZ_17/app/scripts/document-intake-selftest.mjs` | fixtures идентификации + one-document/many-captures/duplicate-SHA contract |
| EXISTS | `DZ_17/app/app/admin-security-console.tsx` | единый side-panel Control Center для Admin и ИБ/AI Security; модели, prompt workflow, KB, DB flags, RBAC, audit |
| EXISTS | `DZ_17/app/app/admin-security-console.css` | стили боковой шестерёнки и Control Center |
| EXISTS | `DZ_17/app/app/admin-prompt-editor.css` | стили защищённого versioned Prompt Editor |
| EXISTS | `DZ_17/app/app/api/admin/config/route.ts` | RBAC API: model/route/prompt/KB/DB mutations, privileged prompt read, audit events |
| EXISTS | `DZ_17/app/scripts/control-plane-smoke.mjs` | integration acceptance Admin/ИБ, runtime policies и prompt workflow |
| EXISTS | `DZ_17/app/app/neural-hud.tsx` | HUD + физическая точка монтирования кнопки `SYS` |

Код не является местом хранения канонического нормативного знания. Он должен получать правила из KB/профилей/контрактов. Исключение: `lib/prompt-registry.ts` является каноническим **runtime-конфигурационным источником** builtin prompt bodies, а не нормативной KB.

---

## 5. Где лежат процессы разработки и эксплуатации

| Статус | Путь | Назначение |
|---|---|---|
| EXISTS | `DZ_17/processes/README.md` | карта процессов |
| EXISTS | `DZ_17/processes/PROCESS_CATALOG.md` | каталог процессов |
| EXISTS | `DZ_17/processes/IDEF0_MODEL.md` | IDEF0 |
| EXISTS | `DZ_17/processes/BPMN_MAIN_PROCESS.md` | BPMN основного процесса |
| EXISTS | `DZ_17/processes/FATHER_DOCUMENT_KNOWLEDGE_PIPELINE.md` | подробный K0–K13 путь документа до ChangeSet/Review/Canonical KB |
| EXISTS | `DZ_17/processes/LEGAL_DOCUMENT_INTAKE.md` | последовательный one-by-one intake юридических/ИБ PDF, document identity, routing и fail-safe |
| EXISTS | `DZ_17/processes/KB_AND_MODEL_LIFECYCLE.md` | жизненный цикл KB/Domain Profile/models |
| EXISTS | `DZ_17/processes/RACI_AND_KPI.md` | роли и KPI |
| EXISTS | `DZ_17/processes/AI_SECURITY_PROCESS.md` | AI security process |
| EXISTS | `DZ_17/processes/ROLE_PANELS_AND_RBAC.md` | роли Admin/ИБ/Reviewer/User и матрица полномочий |
| EXISTS | `DZ_17/DEVELOPMENT_JOURNAL.md` | журнал архитектурных и KB-изменений |
| EXISTS | `DZ_17/CONTROL_PLANE_ACCEPTANCE.md` | проверяемое досье Control Plane |
| EXISTS | `DZ_17/LEGAL_IB_INTAKE_ACCEPTANCE.md` | досье Legal/IB Intake: решение, алгоритм, физические пути, commits, границы готовности |

---

## 6. Физическое место исходных ГОСТов, книг и других материалов

### В Git

Полные тексты стандартов и книг **не считаются находящимися в репозитории**, пока соответствующий файл действительно не добавлен законно и его путь не зарегистрирован.

Текущий `source_registry.v1.json` в основном содержит библиографические записи со статусом `registered`. Это не означает наличие оригинала.

### На локальной машине проекта

Зарезервированный рабочий путь:

```text
DZ_17/knowledge_base/materials/
├── README.md
├── originals/                    # LOCAL_ONLY
│   └── <SOURCE_ID>/
│       └── original.<ext>
├── extracts/                     # наши структурированные извлечения
│   └── <SOURCE_ID>/
│       ├── structure-map.md
│       ├── extraction-notes.md
│       └── knowledge-records.jsonl
└── indexes/                      # производные поисковые индексы
    └── <SOURCE_ID>/
```

Факт наличия локального оригинала должен отдельно фиксироваться в provenance:

```text
source_file_path
source_hash_sha256
acquisition_uri
accessed_at
```

Runtime Knowledge Factory дополнительно хранит производные исполнимые состояния:

```text
DZ_17/app/runtime/knowledge-factory/             # LOCAL_ONLY / ignored
├── sources/
├── captures/
├── structure/
├── spans/
├── structure-proposals/
├── parallel-runs/
└── father-runs/
```

`father-runs/` содержит отчёты верхнего orchestration pass и не является канонической KB.

### Runtime Legal / IB intake

Последовательный intake из локального Downloads хранит только рабочее состояние и локальные пути:

```text
DZ_17/app/runtime/legal-intake/                  # LOCAL_ONLY / ignored
├── intake-state.v1.json                         # что уже обработано/duplicate/needs_review
├── extracts/
│   └── <SHA16>.json                             # page text + PDF metadata
└── candidates/
    └── <SHA16>.json                             # full title, identity, evidence, routing, local path
```

Эти абсолютные локальные пути **не переносятся** в публичный canonical registry. Каноническая юридическая идентичность хранится в `knowledge_base/domains/legal_ib/document_registry.v1.json`; разные файлы/редакции одного документа добавляются как `captures[]`, а не как второй документ.

### Runtime Control Plane и Prompt Store

Отдельно от Knowledge Factory находятся изменяемые эксплуатационные состояния:

```text
DZ_17/app/runtime/                               # LOCAL_ONLY / ignored
├── config/
│   ├── admin-control.v1.json                    # model/prompt/KB/route/DB policy-state
│   └── prompt-store.v1.json                     # runtime prompt versions + active version
└── audit/
    └── admin-events.jsonl                       # append-only privileged-action ledger P0
```

Эти файлы **не являются второй KB** и не содержат копий ГОСТов/книг. Это runtime state. Builtin baseline prompt bodies хранятся в Git один раз в `DZ_17/app/lib/prompt-registry.ts`, а runtime `prompt-store.v1.json` содержит только версии/изменения относительно управляемого Prompt Registry.

---

## 7. Где хранится конкретное извлечённое знание

Правило:

```text
SOURCE REGISTRY
  ↓ source_ref
EXTRACTION NOTE
  ↓ exact locator
METHOD / CONCEPT / CONTROL / METRIC
  ↓ canonical ID
DOMAIN PROFILE / AGENT PROFILE
  ↓ reference only
RUNTIME CONTEXT
```

Для FATHER полный исполнимый маршрут выглядит так:

```text
Source/Capture
→ SourceSpan
→ StructureProposal
→ IdeaCandidate / IdeaChunk (planned runtime K5/K6)
→ KnowledgeCandidate
→ MethodCandidate
→ AlgorithmCandidate
→ ScenarioSet
→ RealizationConditions
→ Validation
→ ChangeSet
→ authorized ReviewDecision
→ CanonicalVersion
```

Для юридической базы ИБ физическая трасса начинается раньше с identity:

```text
Downloads filename (alias only)
→ SHA-256 Capture
→ extracted page text
→ document identity evidence
→ stable Source ID
→ knowledge-factory/sources + captures + spans
→ domains/legal_ib/document_registry.v1.json (PROPOSED)
→ official-status verification
→ article/clause requirements extraction
→ review
→ VERIFIED
```

Пример физической трассы будущей подтверждённой записи:

```text
STD-RU-71540-2024
↓
source_registry.v1.json
↓
materials/extracts/STD-RU-71540-2024/extraction-notes.md
↓
METHOD-PLAN-001
↓
analyst_method_cards.v1.json
↓
profiles/<domain>.v1.json references METHOD-PLAN-001
```

При этом текст метода хранится один раз.

---

## 8. Где смотреть «откуда это взялось»

Для любого объекта проверка идёт в таком порядке:

```text
1. Найти canonical ID.
2. Открыть запись объекта.
3. Найти source_ref / origin_class.
4. Открыть source_registry.v1.json или доменный canonical registry.
5. Проверить source version/status.
6. Открыть extraction note / document identity evidence.
7. Проверить source_locator / page evidence.
8. При наличии оригинала проверить path + SHA-256 локально.
9. Открыть DEVELOPMENT_JOURNAL.md / acceptance record и увидеть когда/зачем объект вошёл в систему.
```

Если один из шагов невозможен, запись нельзя считать полностью `verified`.

Для runtime-настройки дополнительно:

```text
1. Открыть CONTROL_PLANE_ACCEPTANCE.md.
2. Найти action/роль/physical path.
3. Проверить runtime/config/admin-control.v1.json или prompt-store.v1.json локально.
4. Проверить runtime/audit/admin-events.jsonl.
5. Проверить соответствующий CI acceptance run.
```

---

## 9. Запрет скрытых физических копий

Нельзя создавать новые каталоги вида:

```text
agent_x/standards/
agent_y/standards/
programmer/books/
analyst/books/
security/gost/
```

если там предполагается копирование тех же материалов.

Разрешается только:

```text
profile → references → canonical KB objects
```

Исключение — производный cache/runtime index, который должен быть явно помечен `derived` и восстанавливаем из канонической KB.
