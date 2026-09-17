# 2026-09-13 — Formal design baseline and variants register

## TASK
Формально завести комплект проектной документации для ALINA Knowledge Factory, чтобы текущие решения и альтернативы можно было менять без потери истории и причин.

## ORIGIN_CLASS
`PROJECT_DECISION`

## CREATED

- `DZ_17/design/README.md`
- `DZ_17/design/DESIGN_BASELINE.md`
- `DZ_17/design/DESIGN_VARIANTS_REGISTER.md`
- `DZ_17/design/DESIGN_CHANGE_CONTROL.md`
- `DZ_17/design/DESIGN_DECISION_RECORD_TEMPLATE.md`

## UPDATED

- `DZ_17/DOCUMENTATION_INDEX.md`

## DESIGN PRINCIPLE

```text
CURRENT BASELINE != FINAL TRUTH
```

Текущий вариант разрешено менять после исследований, benchmark, полигона, security review или изменения требований. Изменения не переписывают историю молча: прежний вариант остаётся `SUPERSEDED/REJECTED/DEFERRED`, новый получает собственный ID/решение.

## INITIAL BASELINE

Зафиксированы как текущие выбранные позиции:

- IDEF0 как верхняя функциональная master-модель;
- BPMN для последовательности, ролей и возвратов;
- C4 для software architecture;
- semantic/structural boundaries раньше fixed-size chunking;
- Claim ↔ Evidence ↔ Source graph;
- minimal sufficient evidence RAG;
- language-neutral canonical knowledge + localized projections;
- evidence + polygon + Security Review для Algorithm Knowledge;
- разделение Data Plane / Control Plane;
- versioned immutable parameters;
- PostgreSQL + pgvector + graph projection как текущий practical baseline;
- RDF/OWL/SHACL как deferred/research option, а не обязательное ядро первой версии.

## VALIDATION
Документы являются design governance, а не production code. Следующая проверка — использовать DDR и Variants Register при первом реальном изменении data model/architecture и убедиться, что схема изменения не создаёт лишней бюрократии.

## NEXT
Спроектировать canonical Knowledge/Data Model: `Source / Structure / Claim / Evidence / Concept / Method / Algorithm / Implementation / Benchmark / SecurityDecision` и их связи.
