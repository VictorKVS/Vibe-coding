# ALINA Analyst Core — индекс проектной документации

## 1. Генеральные документы

| Документ | Назначение |
|---|---|
| `ANALYST_CORE_TZ.md` | Генеральное техническое задание Universal Analyst Core |
| `ANALYST_CORE_P0.md` | P0 Implementation Specification |
| `ANALYST_ZOO_CAPACITY.md` | Расчёт CPU/GPU/RAM, Tool Zoo/Analysis Zoo и параллельности |
| `C4_ARCHITECTURE.md` | C4 Context / Container / Component / Deployment |
| `API_CONTRACTS.md` | API и контракты передачи данных между компонентами |
| `SYSTEM_PROMPT_ALINA.md` | Базовый системный контракт ALINA |
| `METHODOLOGY_AND_STANDARDS.md` | Мастер-перечень стандартов, методик и литературы |
| `DATABASE_STORAGE_AND_GIT_SNAPSHOT_POLICY.md` | Где и как хранится operational KB в PostgreSQL, защита БД, versioned nodes/edges/weights, безопасный Git snapshot и backup policy |
| `DEVELOPMENT_JOURNAL.md` | Журнал разработки: что изменено/придумано, источник, физические пути, review и результат |
| `CONTROL_PLANE_ACCEPTANCE.md` | Acceptance-досье живого Admin/ИБ Control Plane: права, физические пути, runtime enforcement, commits и CI evidence |
| `LEGAL_IB_INTAKE_ACCEPTANCE.md` | Acceptance-досье one-by-one legal/IB document intake |

## 2. Формальный комплект проектирования

| Документ | Назначение |
|---|---|
| `design/README.md` | Точка входа, уровни проектирования, статусы и связь с IDEF0/BPMN/C4 |
| `design/DESIGN_BASELINE.md` | Текущая выбранная проектная база ALINA Knowledge Factory; допускает управляемую эволюцию |
| `design/DESIGN_VARIANTS_REGISTER.md` | Реестр альтернатив, гипотез, выбранных/отложенных/отклонённых вариантов |
| `design/DESIGN_CHANGE_CONTROL.md` | Минимальный formal change-control для изменения baseline |
| `design/DESIGN_DECISION_RECORD_TEMPLATE.md` | Шаблон DDR для решений, меняющих baseline или выбирающих вариант |

Правило комплекта:

```text
CURRENT BASELINE != FINAL TRUTH

варианты можно менять,
но изменение должно быть версионным,
сохранять историю и impact analysis.
```

## 3. Process documentation

| Документ | Нотация/тип |
|---|---|
| `processes/README.md` | Карта процессов и нормативная база |
| `processes/PROCESS_CATALOG.md` | Реестр M/P/S/SEC процессов |
| `processes/IDEF0_MODEL.md` | IDEF0 A-0 / A0 / ICOM |
| `processes/BPMN_MAIN_PROCESS.md` | BPMN 2.0 логика основного процесса / swimlanes |
| `processes/STATUS_AND_INCIDENTS.md` | State machine / event model / ошибки / эскалация |
| `processes/ROLE_PANELS_AND_RBAC.md` | Ролевые панели / RBAC / separation of duties |
| `processes/AI_SECURITY_PROCESS.md` | Процессы защиты AI, моделей, KB и данных |
| `processes/KB_AND_MODEL_LIFECYCLE.md` | Lifecycle KB / Domain Profile / Models / Routing |
| `processes/RACI_AND_KPI.md` | RACI / KPI / SLA/SLO / производственная статистика |
| `processes/LEGAL_DOCUMENT_INTAKE.md` | One-by-one intake юридических/ИБ документов, identity, routing, dedup и fail-safe |

## 4. Схемы и машинные контракты

| Артефакт | Назначение |
|---|---|
| `schemas/candidate-knowledge-package.schema.json` | Контракт пакета для GPT Senior Analyst |
| `schemas/domain-profile.schema.json` | Общий контракт Domain Profile |
| `profiles/narrative.v1.json` | Первый Domain Profile |
| `openapi/analyst-core.v1.yaml` | OpenAPI Analyst Core |
| `postgres/knowledge_factory_v0.sql` | Не-деструктивный PostgreSQL baseline: Source/Capture/knowledge/graph/nodes/edges/versioned weights/audit/git_export |
| `postgres/security_hardening_v0.sql` | PostgreSQL group roles, grants/revokes и backup-role boundary без паролей в Git |

## 5. Universal / Analyst Meta Knowledge Base

| Артефакт | Назначение |
|---|---|
| `knowledge_base/README.md` | Назначение общего FOUNDATION и текущей Analyst Meta-KB |
| `knowledge_base/ANALYST_KB_SPEC.md` | Логическая модель, классы знаний, аналитический цикл и правила объяснимости |
| `knowledge_base/PROVENANCE_AND_STORAGE_POLICY.md` | Обязательные provenance/source locator/origin class, хранение и запрет дублей |
| `knowledge_base/PHYSICAL_MAP.md` | **Физическая карта: где лежит каждый слой, реестр, профиль, код и материалы** |
| `knowledge_base/SOURCE_ACQUISITION_AND_EXTRACTION_PLAN.md` | План получения и разбора ГОСТ/ISO/книг/официальных источников |
| `knowledge_base/source_registry.v1.json` | Единый библиографический реестр ГОСТ/ISO/W3C/NIST/OWASP/MITRE и книг |
| `knowledge_base/analyst_method_cards.v1.json` | Машиночитаемые карточки методов Analyst |
| `knowledge_base/trace_contract.v1.json` | Контракт аудируемого trace `input → method → evidence → checks → output` |
| `knowledge_base/open_access_library.v1.json` | Реестр открытых легальных материалов |
| `knowledge_base/algorithm_decision_card.schema.json` | Схема карточки алгоритмического решения |
| `knowledge_base/materials/README.md` | Зарезервированное физическое место originals/extracts/indexes |
| `knowledge_base/domains/legal_ib/document_registry.v1.json` | Git-реестр identity юридических/нормативных документов ИБ до DB cutover; затем reviewed projection из PostgreSQL |

Общее знание хранится один раз и наследуется профилями:

```text
UNIVERSAL FOUNDATION KB
methods / standards / algorithms / controls / metrics
              ↓ reference/inherit
ROLE PROFILE
              ↓
DOMAIN / TECH PROFILE
              ↓
PROJECT / TASK CONTEXT
```

Предметные KB отделены от методического FOUNDATION:

```text
FOUNDATION / META-KB
methods / standards / algorithms / controls / metrics
              ↓
         ALINA AGENT
              ↑
DOMAIN KB
facts / claims / entities / relations / events / hypotheses
```

## 6. PostgreSQL и Git snapshot

Operational storage после controlled cutover:

```text
PostgreSQL
├── kf          Source/Capture/Span/Knowledge/Graph/Weights
├── audit       append-only events + snapshot manifests
└── git_export  только PUBLIC + git_export_allowed projection
```

Git хранит не полный DB dump, а:

```text
postgres/*.sql
DATABASE_STORAGE_AND_GIT_SNAPSHOT_POLICY.md
database_snapshots/current/*
database_snapshots/SNAPSHOT_HISTORY.jsonl
```

Full dump остаётся LOCAL_ONLY / protected и не коммитится в публичный Git.

Команды из `DZ_17/app`:

```powershell
npm run db:inventory
npm run db:snapshot -- -Reason "описание законченного изменения"
npm run db:snapshot -- -Reason "описание законченного изменения" -Commit
```

## 7. Связь уровней документации

```text
IDEA / PRODUCT GOAL
        ↓
DESIGN BASELINE / VARIANTS / DDR
        ↓
ANALYST_CORE_TZ
        ↓
IDEF0 / BPMN
        ↓
KNOWLEDGE / DATA MODEL
        ↓
POSTGRES DDL / SECURITY / SNAPSHOT POLICY
        ↓
C4_ARCHITECTURE
        ↓
METHODOLOGY_AND_STANDARDS
        ↓
UNIVERSAL FOUNDATION / META-KB
        ↓
PROVENANCE POLICY / SOURCE REGISTRY / PHYSICAL MAP
        ↓
API_CONTRACTS / OPENAPI
        ↓
JSON SCHEMAS / DOMAIN PROFILES
        ↓
P0 IMPLEMENTATION
        ↓
CODE / TESTS / TELEMETRY
        ↓
ACCEPTANCE RECORDS
        ↓
DEVELOPMENT_JOURNAL
```

## 8. Правило актуальности

Изменение бизнес-процесса, аналитического метода или KB считается завершённым только если синхронно обновлены, где применимо:

1. `DESIGN_BASELINE.md` / `DESIGN_VARIANTS_REGISTER.md` / DDR, если затронуто проектное решение;
2. процессная карта/IDEF0/BPMN;
3. API contract;
4. JSON Schema / PostgreSQL migration;
5. Domain Profile;
6. Method Card / Meta-KB;
7. `source_registry.v1.json`, если появился новый внешний источник;
8. точный source locator для `SOURCE_DERIVED`;
9. `PHYSICAL_MAP.md`, если появился/перемещён физический файл;
10. UI/process-state representation;
11. tests;
12. telemetry/event model;
13. security controls;
14. acceptance evidence для исполняемого контура;
15. DB snapshot manifest / Git-safe projection для законченного DB batch;
16. changelog/version;
17. `DEVELOPMENT_JOURNAL.md` с причиной, origin class, путями и review status.

## 9. Правило происхождения данных

Нельзя писать «взято из ГОСТа/ISO/книги», пока не зафиксированы:

```text
source_ref
source_version_or_year
source_locator
acquisition_uri
accessed_at
source_file_path + SHA-256   # если оригинал существует локально
extraction_note_path
review_status
```

Если точный locator не проверен, запись остаётся `draft / pending_verification`.

## 10. Следующий этап реализации

```text
Safe inventory existing PostgreSQL
→ mapping existing schemas/tables → kf.*
→ backup
→ apply isolated kf/audit/git_export schemas
→ migrate/reconcile current JSON registries
→ acceptance counts + hashes
→ operational DB cutover
→ document/legal structure extraction
→ nodes/edges/weights with append-only version history
→ Git-safe snapshots after completed batches
```

UI должен визуализировать фактические действия backend и показывать проверяемое обоснование каждого вывода, а не декоративный прогресс и не скрытую внутреннюю цепочку рассуждений модели.
