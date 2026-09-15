# FATHER Knowledge Watch — Operator Console Acceptance v0.1

Status: `PROTOTYPE / OPERATOR TEST`  
Route: `/operator-console`

## Goal

Проверить, может ли оператор под когнитивной нагрузкой быстро понять событие Knowledge Core и выбрать безопасное следующее действие, не открывая БД, SQL или полный граф.

## Core operator SLA

- **≤ 3 секунд** — понять, есть ли критическая проблема.
- **≤ 10 секунд** — понять, что произошло и что затронуто.
- **≤ 30 секунд** — выбрать безопасное следующее действие.

Если сценарий не укладывается в эти пределы, интерфейс считается слишком сложным и должен быть упрощён.

## Modes

### NORMAL
Полный аналитический контекст: очередь событий, timeline, сравнение, evidence, impact, action.

### LOAD
Повышенная нагрузка: ограниченная очередь и меньше второстепенных деталей.

### STRESS
Только Critical/High, крупные элементы, главное действие и impact. Никаких длинных таблиц по умолчанию.

## Prototype scenarios

### S1 — Legal change
`152-ФЗ: обнаружена новая редакция`

Оператор должен определить:
1. это юридически значимое изменение;
2. затронуты зависимые requirements/controls/policies;
3. auto-publish должен быть заблокирован до review;
4. безопасное действие — impact analysis + legal review.

### S2 — Technology challenger
`Graph+Vector RAG обошёл retrieval-v2`

Оператор должен определить:
1. production ещё не переключён;
2. challenger выиграл shadow benchmark;
3. безопасное действие — canary, а не немедленная миграция;
4. champion остаётся rollback target.

### S3 — Stale knowledge
`Узел знания давно не перепроверялся`

Оператор должен отличить:
- `FALSE` от `STALE`;
- truth confidence от freshness;
- revalidation от удаления/отклонения знания.

### S4 — New evidence
`Добавлены новые подтверждающие данные`

Оператор должен увидеть, что evidence повышает confidence, но не требует production-change.

## A/B usability test

### Variant A — NORMAL first
Оператор получает полный экран.

### Variant B — STRESS first
Оператор сразу получает только Critical/High и NEXT SAFE ACTION.

Для каждого сценария фиксировать:

```text
operator_id
variant
mode
scenario_id
started_at
critical_detected_at
meaning_understood_at
decision_at
decision
correct_next_action
opened_compare
opened_evidence
opened_action
reversed_decision
operator_confidence_1_5
stress_1_5
notes
```

## Primary metrics

```text
T_detect      = critical_detected_at - started_at
T_understand  = meaning_understood_at - started_at
T_decide      = decision_at - started_at
Decision accuracy
Unsafe-action rate
Decision reversal rate
Evidence-open rate
Compare-open rate
Operator confidence
Reported stress
```

## Acceptance gates

Prototype passes operator MVP when, across representative scenarios:

- median `T_detect ≤ 3s` for Critical alerts;
- median `T_understand ≤ 10s`;
- median `T_decide ≤ 30s`;
- unsafe-action rate = 0 for legal Critical scenarios;
- operators distinguish `STALE` from `FALSE`;
- operators choose `CANARY` before migration for unproven challengers;
- every consequential action exposes rollback consequence before execution.

## Safety invariant

The prototype UI has **no production mutation API**. Decision buttons only simulate operator workflow state. Real write actions will later require:

```text
proposal
→ review
→ confirmation
→ audit event
→ controlled action
→ post-action verification
```

## Next integration

After usability validation:

1. connect Knowledge Watch alerts to FATHER DB;
2. persist operator decisions to `audit.events` / `review.decisions`;
3. connect Compare Center to versioned nodes/edges/weights;
4. connect legal alerts to Legal Temporal Engine;
5. connect experiment alerts to Experiment Engine;
6. add real telemetry for A/B operator usability testing.
