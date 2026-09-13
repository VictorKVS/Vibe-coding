# ALINA Knowledge Factory — Canonical Knowledge Data Model

Version: `0.1`  
Status: `SELECTED / EVOLVING`  
Origin class: `PROJECT_DECISION`

## 1. Purpose

Этот документ фиксирует первую исполнимую модель данных Knowledge Factory. Она связывает IDEF0 A1–A9 с объектами хранения, provenance, evidence, алгоритмами, полигоном и Security Review.

Модель намеренно минимальна: она должна быть достаточно строгой для трассировки и достаточно гибкой для последующей переделки после реальных прогонов.

Главный принцип:

```text
SOURCE TEXT IS STORED ONCE
KNOWLEDGE IS REPRESENTED BY CANONICAL OBJECTS + EDGES + SOURCE LOCATORS
RUNTIME CONTEXT IS DERIVED, NOT STORED AS DUPLICATE CHUNKS
```

---

## 2. Four planes

```text
SOURCE PLANE
Source → Capture → StructureNode → SourceSpan

KNOWLEDGE PLANE
Concept / Claim / Method / Algorithm / Control / Metric / Evidence

VALIDATION PLANE
ReviewDecision / BenchmarkRun / ScenarioRun / SecurityDecision

DELIVERY PLANE
EvidenceSynthesis / LocalizedText / DerivedIndex / RuntimeContext
```

`DATA PLANE` и `CONTROL PLANE` не смешиваются. SourceSpan, RAG и model output не могут напрямую менять approved AlgorithmRuntimeConfig.

---

## 3. Core objects

### 3.1 Source

Логическая библиографическая/информационная единица.

Минимум:

```text
source_id
source_type
canonical_uri / acquisition_uri
bibliographic metadata
language
license/access metadata
status
created_at
```

Один Source может иметь несколько Capture.

### 3.2 Capture

Конкретно полученная версия Source.

```text
capture_id
source_id
captured_at
sha256
mime_type
size_bytes
storage_ref
parser_status
security_status
```

Дедупликация физического файла выполняется по content hash.

### 3.3 StructureNode

Восстановленная физическая/логическая структура документа.

Типы P0:

```text
document
part
chapter
section
subsection
article
clause
subclause
paragraph
list
list_item
table
figure
example
case
appendix
unknown
```

Иерархия задаётся `parent_id`, порядок — `ordinal`.

### 3.4 SourceSpan

Минимальный адресуемый участок источника.

```text
span_id
capture_id
structure_node_id
page_from/page_to
char_from/char_to
text_hash
text_ref or compact text
```

SourceSpan — единица provenance, а не обязательно RAG chunk.

---

## 4. Canonical knowledge object

Все знания имеют общий identity envelope:

```text
object_id
object_type
canonical_key
version
status
origin_class
security_status
title
payload
created_at
supersedes_id
```

P0 `object_type`:

```text
concept
claim
evidence
method
algorithm
control
metric
implementation_option
hypothesis
contradiction
open_question
evidence_synthesis
```

### Status

```text
draft
candidate
reviewed
verified
approved
production
deprecated
superseded
quarantined
rejected
```

### Origin class

Используется уже принятая классификация:

```text
SOURCE_DERIVED
PROJECT_DECISION
ASSISTANT_PROPOSAL
HUMAN_DECISION
BENCHMARK_MEASURED
INFERENCE
HYPOTHESIS
```

### Security status

```text
SECURITY_UNREVIEWED
SECURITY_APPROVED
SECURITY_RESTRICTED
SECURITY_HOLD
SECURITY_REJECTED
```

Предметный status и security_status независимы.

---

## 5. Typed semantics

### Claim

Проверяемое утверждение. Claim не становится Fact только потому, что его сформулировала модель или один автор.

### Evidence

Компактная карточка доказательства/контрдоказательства, ссылающаяся на SourceSpan и Claim.

Evidence хранит не копию статьи, а минимум:

```text
evidence_type
finding
conditions
population/context
effect if measured
limitations
quality/reliability attributes
```

### Concept

Каноническое понятие, к которому могут относиться Claims, Methods и Algorithms.

### Method

Повторяемая процедура решения класса задач.

### Algorithm

Исполняемое знание с усиленным lifecycle:

```text
DRAFT
→ EVIDENCE_BACKED
→ SANDBOX_TESTED
→ SECURITY_REVIEW
→ APPROVED
→ PRODUCTION
```

### ImplementationOption

Наш вариант применения Concept/Method/Algorithm. Не должен маскироваться под утверждение исходного автора.

---

## 6. Relations

Связи хранятся отдельно от объектов.

Минимальный vocabulary P0:

```text
defines
supports
contradicts
limits
refines
applies_to
implements
uses
requires
measured_by
checked_by
alternative_to
derived_from
part_of
related_to
supersedes
```

Каждая связь имеет:

```text
edge_id
from_object_id
relation_type
to_object_id
origin_class
confidence/status
source_ref if applicable
created_at
```

Нельзя молча удалять contradicting edge при появлении preferred conclusion.

---

## 7. Provenance

Любой verified/approved объект должен иметь путь:

```text
KnowledgeObject
→ ObjectSourceRef
→ SourceSpan
→ Capture
→ Source
```

или явно маркированный проектный путь:

```text
KnowledgeObject
→ DecisionRecord / BenchmarkRun / HumanDecision
```

`ObjectSourceRef` содержит роль фрагмента:

```text
supports
contradicts
limits
source_of_definition
method_basis
algorithm_step_basis
example
context
```

Алгоритм может иметь source refs на уровне всего объекта и отдельно по шагам.

---

## 8. Evidence synthesis and memory economy

Для high-degree Claim не отправляем все Evidence в active context.

```text
Claim
→ EvidenceSynthesis
→ strongest support / counter / limitation refs
→ Evidence cards on demand
→ exact SourceSpan on demand
→ neighboring structure on demand
→ full Capture only if required
```

EvidenceSynthesis содержит counts/summary/top refs и версию расчёта, но не заменяет исходные Evidence.

Permanent overlapping chunks запрещены baseline-ом. Runtime overlap строится из SourceSpan/StructureNode динамически.

---

## 9. Multilingual model

Canonical object не размножается по языкам.

```text
KnowledgeObject ALG-0017
├─ LocalizedText ru/title
├─ LocalizedText ru/explanation
├─ LocalizedText en/title
└─ LocalizedText en/explanation
```

`LocalizedText` хранит:

```text
object_id
field
language
text
translation_status
translator/model trace
source_language
```

Перевод — projection, а не новый Algorithm/Claim.

---

## 10. Algorithm control plane

Approved параметры алгоритма хранятся отдельно:

```text
AlgorithmRuntimeConfig
algorithm_id
algorithm_version
config_version
config_json
config_hash
status
approved_by
security_decision_id
valid_from
```

Retrieved text и user/model messages не имеют write path к этой таблице.

Изменение:

```text
ChangeRequest
→ analysis
→ new config/version
→ polygon regression
→ SecurityDecision
→ approval
```

---

## 11. Validation objects

### ReviewDecision

Предметная проверка знания.

### BenchmarkRun

Измерение эффективности Method/Algorithm на заданном workload.

### ScenarioRun

Один или набор polygon/what-if/adversarial сценариев.

### SecurityDecision

Независимое решение ИБ:

```text
allow
restrict
hold
reject
```

SecurityDecision не переписывает предметный объект, а управляет допуском.

---

## 12. Mapping to IDEF0

| IDEF0 | Основные data objects |
|---|---|
| A1 Source intake/security | Source, Capture, SecurityDecision |
| A2 Structure reconstruction | StructureNode, SourceSpan |
| A3 Semantic extraction | Claim, Concept, Hypothesis, Contradiction |
| A4 Prior art/evidence | Evidence, ObjectSourceRef, KnowledgeEdge, EvidenceSynthesis |
| A5 Methods/algorithms | Method, Algorithm, ImplementationOption, Control, Metric |
| A6 Polygon | BenchmarkRun, ScenarioRun |
| A7 Security review | SecurityDecision, AlgorithmRuntimeConfig |
| A8 Canonical KB/RAG | KnowledgeObject, LocalizedText, DerivedIndex |
| A9 Feedback/versioning | ReviewDecision, Correction, supersedes/version edges |

---

## 13. PostgreSQL P0 projection

Практический P0 baseline — PostgreSQL + pgvector + typed graph projection.

Таблицы первой очереди:

```text
kf_source
kf_capture
kf_structure_node
kf_source_span
kf_knowledge_object
kf_knowledge_edge
kf_object_source_ref
kf_localized_text
kf_review_decision
kf_security_decision
kf_benchmark_run
kf_scenario_run
kf_algorithm_runtime_config
```

`payload JSONB` используется для быстро меняющихся type-specific полей, пока модель не стабилизирована. Поля identity, provenance, version, status и security вынесены в строгие колонки.

Это сознательный компромисс P0: не замораживать ещё нестабильную онтологию в десятках таблиц, но не превращать всё в бесформенный JSON document store.

DDL: `postgres/knowledge_factory_v0.sql`.

---

## 14. Invariants P0

1. Один `Capture.sha256` не должен создавать дубликат физического original без явной причины.
2. Verified/approved KnowledgeObject обязан иметь provenance или Decision/Benchmark origin.
3. `security_status=SECURITY_HOLD|SECURITY_REJECTED` запрещает production delivery.
4. Algorithm `production` обязан иметь successful polygon artifact и approving SecurityDecision.
5. Runtime RAG не имеет права менять AlgorithmRuntimeConfig.
6. Contradiction/Evidence не удаляются при synthesis; synthesis только ссылается на них.
7. LocalizedText не создаёт новый canonical knowledge identity.
8. Supersede создаёт новую версию; destructive rewrite verified knowledge запрещён.

---

## 15. What is deliberately NOT fixed yet

Пока не фиксируем как окончательные:

- точную evidence-strength формулу;
- RDF/OWL representation;
- SHACL vs custom invariant engine;
- final object taxonomy;
- final graph engine;
- final embedding granularity;
- domain-specific Fact/Claim semantics;
- automatic merge thresholds.

Эти решения должны пройти реальные данные и полигон.
