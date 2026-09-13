# 2026-09-13 — Canonical Knowledge Data Model v0.1

## TASK
Перейти от глобальной IDEF0-схемы ALINA Knowledge Factory к первой исполнимой канонической модели данных и синхронизировать процесс/архитектуру.

## RESULT

Созданы/обновлены:

```text
DZ_17/design/CANONICAL_KNOWLEDGE_DATA_MODEL.md
DZ_17/design/postgres/knowledge_factory_v0.sql
DZ_17/design/DESIGN_BASELINE.md -> v0.2
DZ_17/design/DESIGN_VARIANTS_REGISTER.md -> v0.3
DZ_17/design/README.md -> v0.3
DZ_17/processes/BPMN_MAIN_PROCESS.md -> v0.2
DZ_17/C4_ARCHITECTURE.md -> v0.2
DZ_17/schemas/knowledge-factory-core.schema.json
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

P0 deployment decision:

```text
modular monolith
+ isolated PostgreSQL/object storage/llama.cpp/background workers
+ microservice split only after measured security/scale/SLO need
```

## WHY

Полностью generic JSON store не даёт достаточных invariants для provenance/security/versioning. Отдельная жёсткая SQL-схема для каждого типа знания сейчас преждевременно заморозит онтологию. Выбран гибридный P0 вариант.

Microservices на этом этапе добавили бы операционную сложность без измеренного выигрыша, поэтому C4 фиксирует логические границы, но не требует отдельного процесса для каждого блока.

## PROCESS ALIGNMENT

BPMN теперь покрывает IDEF0 A1–A9:

```text
A1 source/security
A2 structure
A3 semantic extraction
A4 prior-art/evidence
A5 method/algorithm
A6 polygon
A7 security review
A8 canonical KB/RAG
A9 feedback/versioning
```

Для обычного справочного Claim допускается сокращённый путь без algorithm polygon; для executable knowledge полный A5→A6→A7 обязателен.

## SECURITY

Предметный `status` отделён от `security_status`. Approved runtime parameters алгоритма вынесены в `AlgorithmRuntimeConfig`, к которому RAG/data plane не имеет write path.

C4 выделяет `Protected Control Store` как отдельную permission boundary. P0 он может быть отдельной PostgreSQL schema/role, но retrieval/model code не получает UPDATE/DELETE grant.

## MEMORY

Source text хранится один раз через SourceSpan. Permanent overlap chunks не создаются. EvidenceSynthesis хранит компактную свёртку и ссылки на исходные Evidence, не заменяя их.

## MACHINE CONTRACT

`schemas/knowledge-factory-core.schema.json` фиксирует первые machine-readable контракты для:

```text
Source
Capture
StructureNode
SourceSpan
KnowledgeObject
KnowledgeEdge
ObjectSourceRef
LocalizedText
SecurityDecision
```

## ORIGIN_CLASS
`PROJECT_DECISION`.

## REVIEW STATUS
`design_selected / runtime_validation_pending`

## NEXT STEP

```text
API_CONTRACTS v2 alignment
→ JSON schemas for commands/results
→ storage/repository interfaces
→ first vertical slice:
   PDF → Source/Capture → StructureNode/SourceSpan → Claim/Evidence → trace
→ tests
→ real Getting to Yes smoke-run
```
