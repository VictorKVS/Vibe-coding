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

## 2. Процессная документация

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

## 4. Связь уровней документации

```text
IDEA / PRODUCT GOAL
        ↓
ANALYST_CORE_TZ
        ↓
C4_ARCHITECTURE
        ↓
PROCESS MAP / IDEF0 / BPMN
        ↓
API_CONTRACTS / OPENAPI
        ↓
JSON SCHEMAS / DOMAIN PROFILES
        ↓
P0 IMPLEMENTATION
        ↓
CODE / TESTS / TELEMETRY
```

## 5. Правило актуальности

Изменение бизнес-процесса считается завершённым только если синхронно обновлены, где применимо:

1. процессная карта/IDEF0/BPMN;
2. API contract;
3. JSON Schema;
4. Domain Profile;
5. UI/process-state representation;
6. tests;
7. telemetry/event model;
8. security controls;
9. changelog/version.

## 6. Следующий этап реализации

Следующий слой после документации:

```text
Process Event API
→ Live Process Board
→ Role Panels
→ Admin Operations Dashboard
→ AI Security Dashboard
→ KB Explorer
→ Real Tool/Analysis Zoo events
```

UI должен визуализировать именно фактические события backend, а не рисовать декоративный прогресс.
