# ALINA Knowledge Factory — Design Change Control

Version: `0.1`  
Status: `ACTIVE`

## 1. Назначение

Документ задаёт минимальный порядок изменения проектных решений. Цель — не бюрократия, а сохранение причин, альтернатив, влияния и истории.

## 2. Когда требуется формальное изменение

Change Record обязателен, если изменение затрагивает хотя бы одно из:

- IDEF0/BPMN/C4 master-схемы;
- canonical knowledge/data model;
- security boundary;
- algorithm lifecycle;
- RAG policy;
- storage identity/dedup policy;
- versioning/provenance;
- runtime authority/permissions;
- обязательные параметры/invariants;
- интерфейсы между подсистемами;
- Definition of Done.

Мелкие редакционные правки отдельного решения не требуют.

## 3. Минимальный Change Record

```text
change_id
requested_at
requested_by
origin_class
problem
current_baseline
proposed_change
alternatives_considered
reason
expected_benefit
risks
security_impact
data_model_impact
process_impact
api_impact
migration_required
benchmark_required
polygon_required
reviewers
status
decision
supersedes
```

## 4. Порядок

```text
PROBLEM / NEW EVIDENCE
        ↓
CHANGE PROPOSAL
        ↓
IMPACT ANALYSIS
        ↓
VARIANT REGISTER UPDATE
        ↓
PROTOTYPE / BENCHMARK / POLYGON if needed
        ↓
SECURITY REVIEW if affected
        ↓
DECISION
        ↓
BASELINE UPDATE
        ↓
DEPENDENT DOCS / SCHEMAS / CODE
        ↓
DEVELOPMENT JOURNAL
```

## 5. Правило обратимости

До production migration предпочтительны изменения, которые можно откатить без потери canonical knowledge.

Нельзя:

```text
переписать старое решение и удалить историю
```

Нужно:

```text
old = SUPERSEDED
new = SELECTED
supersedes = old_id
```

## 6. Impact matrix

При каждом существенном изменении проверяем:

| Слой | Проверка |
|---|---|
| IDEF0 | изменилась ли функция / ICOM |
| BPMN | изменился ли поток/роль/эскалация |
| Data model | изменились ли canonical objects/relations |
| C4 | нужен ли новый сервис/контейнер/компонент |
| API | изменился ли контракт |
| Security | изменилась ли trust/authority boundary |
| Polygon | нужны ли новые regression/adversarial scenarios |
| KB | нужна ли новая версия знания/метода/алгоритма |
| Runtime | нужна ли миграция/config change |
| UI | нужно ли новое состояние/контроль |

## 7. Решение без доказательства

Иногда на ранней стадии нужно выбрать вариант до benchmark. Это допустимо, но статус должен быть честным:

```text
SELECTED + expert_estimate
```

После испытаний:

```text
VALIDATED + BENCHMARK_MEASURED
```

или решение пересматривается.

## 8. Security veto

ИБ может поставить `SECURITY_HOLD` на внедрение изменения, но не имеет права молча переписать предметное проектное решение. Причина и affected objects фиксируются явно.

## 9. Минимальный принцип проекта

```text
CHANGE FAST
BUT NEVER CHANGE SILENTLY
```
