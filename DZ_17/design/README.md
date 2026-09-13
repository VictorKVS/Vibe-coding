# ALINA Knowledge Factory — комплект проектной документации

Статус: `ACTIVE DESIGN SET`  
Версия комплекта: `0.1`  
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
