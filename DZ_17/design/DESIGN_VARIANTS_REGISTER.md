# ALINA Knowledge Factory — Design Variants Register

Version: `0.1`  
Status: `ACTIVE`

Этот документ хранит варианты проектных решений. Вариант не удаляется после отказа; меняется его статус и фиксируется причина.

## Статусы

```text
PROPOSED
UNDER_REVIEW
SELECTED
EXPERIMENTAL
VALIDATED
DEFERRED
REJECTED
SUPERSEDED
```

## Реестр

| ID | Тема | Вариант | Статус | Текущая позиция |
|---|---|---|---|---|
| DV-001 | Верхняя нотация | IDEF0 как master functional model | SELECTED | использовать для A-0/A0/A1..An |
| DV-002 | Исполняемый процесс | BPMN поверх IDEF0 | SELECTED | BPMN описывает роли, последовательность, возвраты и эскалацию |
| DV-003 | Software architecture | C4 | SELECTED | контейнеры/компоненты/deployment отдельно от функциональной модели |
| DV-004 | Сегментация | fixed-size chunks first | REJECTED | допускается только как технический runtime fallback |
| DV-005 | Сегментация | structure + semantic boundaries first | SELECTED | chapter/section/idea/method/algorithm имеют приоритет над char count |
| DV-006 | Evidence retrieval | full document into RAG | REJECTED | избыточно и увеличивает риск/контекст |
| DV-007 | Evidence retrieval | minimal sufficient evidence ladder | SELECTED | summary → evidence cards → source spans → full source on demand |
| DV-008 | Knowledge identity | отдельная KB на каждый язык | REJECTED | создаёт дубли |
| DV-009 | Knowledge identity | language-neutral canonical object + localized projections | SELECTED | основной подход |
| DV-010 | Algorithm lifecycle | evidence only | REJECTED | недостаточно для production knowledge |
| DV-011 | Algorithm lifecycle | evidence + polygon + security review | SELECTED | обязательный current baseline |
| DV-012 | Security | retrieved text may affect runtime instructions | REJECTED | hostile/untrusted data boundary |
| DV-013 | Security | separated data/control planes | SELECTED | hard-pinned config only through authorized versioned change |
| DV-014 | Storage | permanent overlapping chunks | REJECTED | overlap создаётся виртуально на runtime |
| DV-015 | Storage | canonical source spans + graph edges | SELECTED | source stored once, knowledge links by IDs |
| DV-016 | Knowledge store | PostgreSQL + pgvector + graph projection | SELECTED | current practical baseline |
| DV-017 | Knowledge store | RDF/OWL/SHACL as primary runtime model | DEFERRED | исследовать после working data model/polygon |
| DV-018 | Knowledge validation | SHACL-like invariant layer without full RDF migration | PROPOSED | перспективный промежуточный вариант |
| DV-019 | Evidence model | one summary per source copied into each idea | REJECTED | duplication |
| DV-020 | Evidence model | Claim ↔ Evidence ↔ Source graph | SELECTED | canonical relation model |
| DV-021 | Prior art | only current book/document | REJECTED | источник — один узел в более широкой knowledge history |
| DV-022 | Prior art | scientific/professional evidence expansion | SELECTED | prior art + support/contradiction/limits/refinement |
| DV-023 | Algorithm parameters | parameters embedded only in prompt/RAG | REJECTED | vulnerable to injection/tampering |
| DV-024 | Algorithm parameters | immutable/versioned control-plane parameters | SELECTED | LLM may propose but not mutate |
| DV-025 | Testing | happy-path benchmark only | REJECTED | недостаточно |
| DV-026 | Testing | scenario + what-if + adversarial polygon | SELECTED | expected production gate |

## Как добавлять новый вариант

Каждый новый вариант получает ID `DV-NNN` и минимум:

```text
problem
option
origin_class
status
benefits
costs
risks
dependencies
evidence_refs
benchmark_needed
security_impact
what_would_make_us_select_it
```

## Правило выбора

`SELECTED` не означает окончательность. Вариант может перейти:

```text
SELECTED
→ EXPERIMENTAL
→ VALIDATED
```

или:

```text
SELECTED
→ SUPERSEDED
```

если новый вариант показал лучшие результаты или изменились ограничения.
