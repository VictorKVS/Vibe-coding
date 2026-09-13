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
| `DEVELOPMENT_JOURNAL.md` | Журнал разработки: что изменено/придумано, источник, физические пути, review и результат |

## 2. Process documentation

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

## 3. Схемы и машинные контракты

| Артефакт | Назначение |
|---|---|
| `schemas/candidate-knowledge-package.schema.json` | Контракт пакета для GPT Senior Analyst |
| `schemas/domain-profile.schema.json` | Общий контракт Domain Profile |
| `profiles/narrative.v1.json` | Первый Domain Profile |
| `openapi/analyst-core.v1.yaml` | OpenAPI Analyst Core |

## 4. Universal / Analyst Meta Knowledge Base

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

## 5. Связь уровней документации

```text
IDEA / PRODUCT GOAL
        ↓
ANALYST_CORE_TZ
        ↓
C4_ARCHITECTURE
        ↓
PROCESS MAP / IDEF0 / BPMN
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
DEVELOPMENT_JOURNAL
```

## 6. Правило актуальности

Изменение бизнес-процесса, аналитического метода или KB считается завершённым только если синхронно обновлены, где применимо:

1. процессная карта/IDEF0/BPMN;
2. API contract;
3. JSON Schema;
4. Domain Profile;
5. Method Card / Meta-KB;
6. `source_registry.v1.json`, если появился новый внешний источник;
7. точный source locator для `SOURCE_DERIVED`;
8. `PHYSICAL_MAP.md`, если появился/перемещён физический файл;
9. UI/process-state representation;
10. tests;
11. telemetry/event model;
12. security controls;
13. changelog/version;
14. `DEVELOPMENT_JOURNAL.md` с причиной, origin class, путями и review status.

## 7. Правило происхождения данных

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

## 8. Следующий этап реализации

Следующий слой после документационного governance:

```text
Meta/Universal KB Loader
→ Source/Method Registry API
→ Analyst Planner
→ KB Query / Evidence Retrieval
→ Trace Event API
→ Senior Review Package
→ Experience Store
→ Live Analyst Trace in UI
→ Provenance + Dedup Validator
```

UI должен визуализировать фактические действия backend и показывать проверяемое обоснование каждого вывода, а не декоративный прогресс и не скрытую внутреннюю цепочку рассуждений модели.
