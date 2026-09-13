# ALINA Knowledge Factory — комплект проектной документации

Статус: `ACTIVE DESIGN SET`  
Версия комплекта: `0.2`  
Дата основания: `2026-09-13`

## Назначение

Этот каталог является формальной точкой входа в проектирование ALINA Knowledge Factory. Он не заменяет уже существующие IDEF0/BPMN/C4/KB-документы, а связывает их в управляемый проектный baseline и хранит варианты решений, которые могут меняться по мере исследований, прототипирования, испытаний и Security Review.

Главное правило:

```text
CURRENT BASELINE != FINAL TRUTH
```

Любое решение может быть изменено, если появились:

- новые требования;
- более сильные научные или нормативные основания;
- результаты полигона/benchmark;
- security finding;
- ограничения реализации;
- лучший вариант архитектуры.

Но изменение должно быть версионным, объяснимым и не уничтожать историю прежнего решения.

## Канонический комплект

| Документ | Роль |
|---|---|
| `DESIGN_BASELINE.md` | текущая согласованная проектная база: что считаем действующим вариантом на данный момент |
| `DESIGN_VARIANTS_REGISTER.md` | реестр альтернатив, гипотез и отложенных вариантов |
| `DESIGN_CHANGE_CONTROL.md` | правила изменения baseline и перевода вариантов между состояниями |
| `DESIGN_DECISION_RECORD_TEMPLATE.md` | шаблон формального проектного решения / ADR-подобной карточки |
| `CANONICAL_KNOWLEDGE_DATA_MODEL.md` | каноническая модель Source/Structure/Claim/Evidence/Method/Algorithm/Validation/Delivery |
| `postgres/knowledge_factory_v0.sql` | первая PostgreSQL P0-проекция модели данных; design DDL, не production migration |

## Связанные канонические документы

Проектный комплект ссылается на существующие документы и не копирует их содержание:

```text
../processes/IDEF0_MODEL.md
../processes/BPMN_MAIN_PROCESS.md
../C4_ARCHITECTURE.md
../API_CONTRACTS.md
../knowledge_base/ANALYST_KB_SPEC.md
../knowledge_base/DECISION_AND_TRAINING_FRAMEWORK.md
../knowledge_base/PROVENANCE_AND_STORAGE_POLICY.md
../processes/AI_SECURITY_PROCESS.md
../knowledge_base/algorithm_decision_card.schema.json
../DEVELOPMENT_JOURNAL.md
```

## Уровни проектирования

```text
L0  PRODUCT / PURPOSE
L1  IDEF0 FUNCTIONAL MODEL
L2  BPMN PROCESS MODEL
L3  KNOWLEDGE / DATA MODEL
L4  C4 SOFTWARE ARCHITECTURE
L5  API + SCHEMAS
L6  RUNTIME / POLYGON / SECURITY
L7  IMPLEMENTATION
```

Текущий прогресс:

```text
L0  fixed enough for P0
L1  global A-0/A1..A9 selected
L2  existing BPMN requires alignment with A1..A9
L3  canonical data model v0.1 selected
L4  C4 requires alignment with new Knowledge Factory blocks
L5  API/contracts require extension for Claim/Evidence/Algorithm lifecycle
L6  process/security design exists; executable polygon/firewall pending
L7  translation/model gateway exists; Knowledge Factory backend pending
```

Изменение нижнего уровня не должно молча менять верхний смысл. Изменение верхнего уровня требует impact analysis нижележащих документов.

## Статусы

Для baseline/вариантов используются состояния:

```text
PROPOSED
UNDER_REVIEW
SELECTED
DEFERRED
REJECTED
SUPERSEDED
EXPERIMENTAL
VALIDATED
```

`SELECTED` означает только «используем как текущий проектный вариант», а не «доказано навсегда».

## Следующий проектный шаг

После фиксации L3 следующий обязательный шаг — синхронизировать процессный и программный слой:

```text
BPMN A1..A9
→ C4 containers/components
→ API resources/contracts
→ JSON Schemas
→ P0 backend repository/services
```

До этого DDL остаётся design artifact и не применяется автоматически к production/local DB.
