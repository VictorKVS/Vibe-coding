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
| `profiles/narrative.v1.json` | Первый Domain Profile |
| `openapi/analyst-core.p0.yaml` | OpenAPI P0 |

## 4. Analyst Meta Knowledge Base

| Артефакт | Назначение |
|---|---|
| `knowledge_base/README.md` | Назначение и структура Meta-KB самой аналитической системы |
| `knowledge_base/ANALYST_KB_SPEC.md` | Логическая модель, классы знаний, аналитический цикл и правила объяснимости |
| `knowledge_base/source_registry.v1.json` | Реестр ГОСТ/ISO/W3C/NIST/OWASP/MITRE и книг |
| `knowledge_base/analyst_method_cards.v1.json` | Машиночитаемые карточки методов Analyst |
| `knowledge_base/trace_contract.v1.json` | Контракт аудируемого trace `input → method → evidence → checks → output` |

Meta-KB отделена от предметных баз знаний:

```text
ANALYST META-KB
methods / standards / algorithms / controls / metrics
              ↓
         ALINA ANALYST
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
ANALYST META-KB
        ↓
API_CONTRACTS / OPENAPI
        ↓
JSON SCHEMAS / DOMAIN PROFILES
        ↓
P0 IMPLEMENTATION
        ↓
CODE / TESTS / TELEMETRY
```

## 6. Правило актуальности

Изменение бизнес-процесса или аналитического метода считается завершённым только если синхронно обновлены, где применимо:

1. процессная карта/IDEF0/BPMN;
2. API contract;
3. JSON Schema;
4. Domain Profile;
5. Analyst Method Card / Meta-KB;
6. UI/process-state representation;
7. tests;
8. telemetry/event model;
9. security controls;
10. changelog/version.

## 7. Следующий этап реализации

Следующий слой после Meta-KB:

```text
Meta-KB Loader
→ Method Registry API
→ Analyst Planner
→ KB Query / Evidence Retrieval
→ Trace Event API
→ Senior Review Package
→ Experience Store
→ Live Analyst Trace in UI
```

UI должен визуализировать фактические действия backend и показывать проверяемое обоснование каждого вывода, а не декоративный прогресс и не скрытую внутреннюю цепочку рассуждений модели.
