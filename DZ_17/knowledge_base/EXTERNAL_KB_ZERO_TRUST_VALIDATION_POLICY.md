# ALINA / FATHER — External Knowledge Base Zero-Trust Validation Policy

Status: `MANDATORY / PROJECT_DECISION`

## 1. Главный принцип

ALINA обязана уметь **построить предметную базу знаний с нуля**, опираясь на первичные/допустимые источники, методики, стандарты и проверяемые процедуры.

Готовая внешняя Knowledge Base, ontology, graph, RAG corpus, набор embeddings, prompt pack, taxonomy или mapping **не считается истиной по умолчанию**.

```text
EXTERNAL KB
!= TRUSTED KB
!= CANONICAL KB
```

Любая найденная готовая база первоначально получает статус:

```text
EXTERNAL_CANDIDATE / UNVERIFIED
```

и помещается в карантинный аналитический контур до независимой проверки.

## 2. Что ALINA обязана понимать для каждого объекта знания

Для каждого узла, связи, веса, score, confidence, порога, правила и mapping ALINA должна уметь ответить:

```text
WHAT IS IT?
WHY DOES IT EXIST?
WHERE DID IT COME FROM?
WHICH SOURCE SUPPORTS IT?
HOW WAS IT EXTRACTED?
WHICH METHOD CREATED IT?
WHO/WHAT REVIEWED IT?
WHICH VERSION CREATED IT?
WHAT DOES THE WEIGHT MEAN?
HOW WAS THE WEIGHT CALCULATED?
IS THE WEIGHT MEASURED, INFERRED OR EXPERT-SET?
WHAT COUNTER-EVIDENCE EXISTS?
WHAT WOULD INVALIDATE IT?
```

Если эти вопросы не имеют проверяемого ответа, объект не может автоматически считаться trusted/verified.

## 3. Узлы

Каждый node обязан иметь минимум:

```text
node_id
node_type
canonical_identity
origin_class
source_refs[]
source_locators[]
creation_method
creation_method_version
created_by
created_at
review_status
confidence_breakdown
lifecycle_status
```

Node без provenance — candidate, а не знание.

## 4. Рёбра

Каждое edge обязано иметь:

```text
edge_id
from_node
to_node
relation_type
evidence_refs[]
relation_basis
extraction_or_inference_method
confidence_breakdown
review_status
```

Edge без evidence — hypothesis/proposed relation.

Связь `RELATED_TO` не должна использоваться вместо более точной связи, если её можно установить.

## 5. Веса

Запрещён один универсальный непонятный `weight`.

Вес обязан иметь тип:

```text
confidence
authority
source_quality
relevance
evidence_strength
importance
centrality
freshness
legal_force
risk
cost
latency
quality
replication_strength
```

Для каждого weight обязательны:

```text
weight_type
value
scale
method_id
method_version
input_factors
source_or_benchmark_refs
calibration_status
measured_at
actor/model
review_status
```

Происхождение веса обязательно классифицируется:

```text
SOURCE_REQUIREMENT
BENCHMARK_MEASURED
TELEMETRY_MEASURED
SCIENTIFIC_EVIDENCE
EXPERT_ESTIMATE
PROJECT_DECISION
INFERENCE
OPERATOR_OVERRIDE
```

Неизвестный origin веса => вес не должен влиять на high-impact decision без review.

## 6. Zero-Base Reconstruction как контроль

Для значимого домена ALINA должна уметь выполнить blind reconstruction без использования готовой целевой KB.

```text
MINIMAL SEED
→ PRIMARY SOURCE DISCOVERY
→ SOURCE/CAPTURE
→ STRUCTURE
→ CLAIMS/EVIDENCE
→ ENTITIES
→ RELATIONS
→ WEIGHTS FROM EXPLICIT METHODS
→ CANDIDATE GRAPH
→ FREEZE
```

Только после freeze разрешается открыть внешнюю/каноническую KB и сравнить результаты.

## 7. Проверка найденной готовой базы знаний

Pipeline:

```text
FOUND EXTERNAL KB
→ QUARANTINE
→ IDENTIFY FORMAT / OWNER / LICENSE / VERSION
→ HASH / CAPTURE
→ INVENTORY NODES / EDGES / WEIGHTS / ONTOLOGY
→ TRACE SOURCES
→ CHECK SOURCE LOCATORS
→ CHECK LOGIC OF RELATIONS
→ CHECK WEIGHT ORIGINS
→ CHECK TEMPORAL VALIDITY
→ CHECK DUPLICATES / MERGES
→ CHECK CONTRADICTIONS
→ CHECK MISSING EVIDENCE
→ ZERO-BASE SAMPLE RECONSTRUCTION
→ COMPARE
→ REVIEW
→ IMPORT ONLY ACCEPTED OBJECTS
```

Готовая KB не импортируется целиком только потому, что она известная/популярная/опубликована.

## 8. Типы результатов сравнения

```text
MATCH
EXTERNAL_ONLY_VALID
CANONICAL_ONLY_VALID
CONFLICT
UNSUPPORTED_EXTERNAL_NODE
UNSUPPORTED_EXTERNAL_EDGE
UNKNOWN_WEIGHT_ORIGIN
WEIGHT_METHOD_MISMATCH
STALE_RECORD
INVALID_VERSION
ONTOLOGY_MISMATCH
DUPLICATE_ENTITY
BAD_MERGE
MISSING_COUNTER_EVIDENCE
SOURCE_LOCATOR_FAILURE
```

## 9. Logic validation

ALINA обязана проверять не только наличие source URL, но и логику вывода.

Пример:

```text
Source A says X
Source B says Y
External KB edge says X CAUSES Y
```

Наличие двух источников не доказывает causal edge. ALINA должна проверить, есть ли основание именно для `CAUSES`, а не только `RELATED_TO`.

Отдельно проверяются:
- directionality;
- causality;
- applicability;
- temporal order;
- scope;
- jurisdiction;
- version compatibility;
- entity identity;
- source independence;
- contradictory evidence.

## 10. External KB promotion states

```text
DISCOVERED
→ QUARANTINED
→ PARSED
→ PROVENANCE_CHECKED
→ LOGIC_CHECKED
→ ZERO_BASE_COMPARED
→ REVIEWED
→ PARTIALLY_ACCEPTED / ACCEPTED / REJECTED
```

Нельзя переходить напрямую `DISCOVERED → ACCEPTED`.

## 11. Частичный импорт

По умолчанию предпочтителен частичный import:

```text
external object
→ candidate
→ validate
→ map to canonical identity
→ reuse existing object OR create reviewed new object
```

Не переносить внешний ID как canonical identity без identity resolution.

## 12. Контроль утечки готового ответа

Blind benchmark должен гарантировать, что аналитические роли не получают:
- target graph edges;
- target weights;
- target conclusions;
- target requirement mappings;
- target causal explanations;
- expected answer labels.

Допустимы общая методология, инструменты поиска и правила проверки.

## 13. Self-improvement

Если внешняя KB содержит более качественный объект, ALINA не копирует его молча. Она создаёт Improvement Proposal:

```text
CURRENT STATE
EXTERNAL CANDIDATE
EVIDENCE
WHY BETTER
WEIGHT/RELATION METHOD DIFFERENCE
EXPECTED BENEFIT
RISKS
TEST PLAN
ROLLBACK
```

После A/B / replay / benchmark и Human/Senior gate объект может быть принят.

## 14. Acceptance

Политика считается реализованной, если на тестовой внешней KB система умеет:

1. поместить её в quarantine;
2. построить inventory;
3. показать provenance coverage;
4. найти nodes без source basis;
5. найти edges без evidence;
6. найти weights без documented method;
7. выполнить blind reconstruction по выборке;
8. сравнить reconstructed vs external graph;
9. объяснить каждый mismatch;
10. импортировать только прошедшие review объекты;
11. не загрязнить canonical KB rejected/candidate knowledge;
12. сохранить полный trace решения.

## 15. Инвариант ALINA

ALINA должна быть способна сказать не только:

> «В базе есть узел X с весом 0.84»

а:

> «Узел X был получен из источников A/B, связь подтверждается фрагментами A:§3 и B:§7, weight_type=evidence_strength, значение 0.84 рассчитано методом weighted-evidence-v2 из таких-то факторов, calibration_status=verified, есть такое-то counter-evidence; поэтому объект допускается в таком статусе».

Если эта трасса отсутствует, знание считается непроверенным.
