# 2026-09-13 — Canonical Knowledge Data Model v0.1

## TASK
Перейти от глобальной IDEF0-схемы ALINA Knowledge Factory к первой исполнимой канонической модели данных.

## RESULT

Созданы/обновлены:

```text
DZ_17/design/CANONICAL_KNOWLEDGE_DATA_MODEL.md
DZ_17/design/postgres/knowledge_factory_v0.sql
DZ_17/design/DESIGN_BASELINE.md -> v0.2
DZ_17/design/DESIGN_VARIANTS_REGISTER.md -> v0.2
DZ_17/design/README.md -> v0.2
```

## CURRENT SELECTED MODEL

```text
SOURCE PLANE
Source → Capture → StructureNode → SourceSpan

KNOWLEDGE PLANE
Concept / Claim / Evidence / Method / Algorithm / Control / Metric

VALIDATION PLANE
ReviewDecision / BenchmarkRun / ScenarioRun / SecurityDecision

DELIVERY PLANE
EvidenceSynthesis / LocalizedText / DerivedIndex / RuntimeContext
```

P0 storage decision:

```text
PostgreSQL + pgvector
+ strict identity/provenance/security columns
+ typed canonical KnowledgeObject
+ explicit graph edges
+ JSONB for still-evolving subtype fields
```

## WHY

Полностью generic JSON store не даёт достаточных invariants для provenance/security/versioning. Отдельная жёсткая SQL-схема для каждого типа знания сейчас преждевременно заморозит онтологию. Выбран гибридный P0 вариант.

## SECURITY

Предметный `status` отделён от `security_status`. Approved runtime parameters алгоритма вынесены в `AlgorithmRuntimeConfig`, к которому RAG/data plane не имеет write path.

## MEMORY

Source text хранится один раз через SourceSpan. Permanent overlap chunks не создаются. EvidenceSynthesis хранит компактную свёртку и ссылки на исходные Evidence, не заменяя их.

## ORIGIN_CLASS
`PROJECT_DECISION`.

## REVIEW STATUS
`design_selected / runtime_validation_pending`

## NEXT STEP
Синхронизировать BPMN A1..A9, C4 containers/components и API resources с новой L3 data model; затем реализовать P0 backend repository/service layer и прогнать реальный документ через Source → Structure → Claim/Evidence trace.
