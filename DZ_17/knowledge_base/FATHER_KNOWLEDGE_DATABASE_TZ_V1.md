# FATHER Knowledge Database — техническое задание v1

Status: `PROJECT_DECISION / DATABASE CONTRACT / EVOLVING`

## 1. Назначение

Настоящее ТЗ задаёт единый обязательный контракт базы данных FATHER для нормативных документов, книг, научных статей, инженерных материалов, OSINT-источников, методов, алгоритмов, экспериментов, доказательств, графа знаний, RAG и пользовательского рабочего слоя.

FATHER не должен превращаться в набор независимых баз. Основной принцип:

```text
ONE CANONICAL OBJECT
→ ONE CANONICAL ID
→ ONE SOURCE OF TRUTH
→ MANY DOMAIN VIEWS / AGENTS / UIs
→ ZERO SILENT DUPLICATION
```

Текущая рабочая PostgreSQL БД `osint_kb` является предпочтительной физической основой. Новые функции добавляются аддитивно после inventory и mapping существующих таблиц. Запрещается создавать параллельный канонический реестр, если эквивалентный объект уже существует.

## 2. Классы знания

База обязана различать минимум три класса знания:

```text
REGULATORY TRUTH
что юридически действует / обязательно

SCIENTIFIC EVIDENCE
что утверждается и подтверждается исследованиями

ENGINEERING KNOWLEDGE
как практически реализовать метод / контроль / систему
```

Дополнительно поддерживаются:

```text
OSINT / THREAT INTELLIGENCE
PROJECT DECISIONS
BENCHMARK MEASUREMENTS
INFERENCES
HYPOTHESES
USER WORKSPACE DATA
```

Закон, книга и научная статья не являются взаимозаменяемыми источниками. Книга или статья не создаёт юридическую обязанность. Научное утверждение не становится фактом только потому, что оно опубликовано. Проектное решение не должно маскироваться под внешний источник.

## 3. Обязательные инварианты

1. `Claim != Fact`.
2. `Observation != Fact`.
3. `Hypothesis != Fact`.
4. `Inference != primary evidence`.
5. Знание без provenance не может автоматически получить статус `VERIFIED`.
6. Старые версии источников, записей и связей не перезаписываются.
7. Исправления Human/Senior создают новую версию или решение review, а не стирают историю.
8. Merge сущностей выполняется явно и обратимо.
9. Противоречия не удаляются автоматически.
10. Graph является проекцией канонических объектов, а не вторым источником истины.
11. Embedding является поисковым индексом, а не каноническим знанием.
12. Пользовательские заметки никогда не изменяют текст исходного документа.
13. Каждый значимый вывод должен иметь проверяемый evidence map.
14. Любая мутация KB должна иметь actor, reason, trace и время записи.
15. Внешний источник должен иметь стабильный source identity и версионируемые captures/versions.

## 4. Логические контуры БД

Физические schema names уточняются после inventory; логически система должна поддерживать следующие контуры:

```text
SOURCE / PROVENANCE
REGULATORY
RESEARCH / SCIENCE
KNOWLEDGE / ONTOLOGY
ENGINEERING / METHODS
GRAPH
OSINT
RAG / SEARCH INDEX
REVIEW / GOVERNANCE
WORKBENCH
BENCHMARK / EXPERIMENT
AUDIT / TRACE
```

Существующие таблицы `normative.*`, `osint.*`, `public.agents`, `public.rag_contexts` и другие должны переиспользоваться там, где они уже выполняют нужную функцию.

## 5. Source Registry

Каждый внешний источник должен иметь единственную каноническую карточку Source.

Минимальные поля:

```text
source_id
type
title
subtitle
authors[]
organizations[]
publisher
journal_or_conference
isbn
doi
arxiv_id
pmid
standard_number
document_number
canonical_uri
acquisition_uri
language
jurisdiction
publication_date
edition_or_version
license_or_access_status
source_status
origin_class
created_at
updated_at
```

Типы источников минимум:

```text
LAW
REGULATION
ORDER
STANDARD
BOOK
BOOK_CHAPTER
SCIENTIFIC_ARTICLE
PREPRINT
CONFERENCE_PAPER
THESIS
DATASET
OFFICIAL_DOCUMENTATION
WEB_SOURCE
CODE_REPOSITORY
BENCHMARK
INTERNAL_DOCUMENT
OSINT_SOURCE
```

`registered` означает только наличие библиографической записи и не означает, что текст получен, проверен или разобран.

## 6. Capture / оригинал

Один Source может иметь множество физических captures.

```text
SOURCE
  ↓
CAPTURE 1 PDF
CAPTURE 2 HTML
CAPTURE 3 ODT
CAPTURE 4 corrected scan
```

Capture хранит:

```text
capture_id
source_id
sha256
mime_type
size_bytes
storage_ref
acquired_at
acquisition_uri
parser_status
security_status
encoding
ocr_status
metadata
```

Дубликаты по SHA-256 не создают новый юридический/библиографический Source. Они могут фиксироваться как повторный capture только при необходимости трассировки.

Полные тексты закрытых/лицензионных книг и стандартов не должны автоматически попадать в Git. Git содержит только разрешённые метаданные и наши производные структурированные записи.

## 7. Версии источника

Source и его версия разделяются.

### Книга

```text
BOOK
  ↓
EDITION 1
EDITION 2
EDITION 3
```

### Научная статья

```text
PREPRINT
  ↓
ACCEPTED MANUSCRIPT
  ↓
PUBLISHED VERSION
  ↓
CORRECTION / ERRATUM
  ↓
RETRACTION / SUPERSESSION
```

### Нормативный документ

```text
DOCUMENT
  ↓
VERSION / EDITION
  ↓
valid_from / valid_to
```

Обязательные поля SourceVersion / PublicationVersion:

```text
version_id
source_id
version_kind
version_label
published_at
valid_from
valid_to
recorded_at
retired_at
verification_status
status
supersedes_version_id
source_capture_id
content_sha256
metadata
```

История не удаляется.

## 8. Специальные статусы научных публикаций

Для научных источников должны поддерживаться минимум:

```text
PREPRINT
UNDER_REVIEW
ACCEPTED
PEER_REVIEWED
PUBLISHED
CORRECTED
RETRACTED
SUPERSEDED
WITHDRAWN
UNKNOWN
```

Retraction не удаляет публикацию из БД. Она остаётся доступной для истории и анализа, но не должна автоматически использоваться как обычное подтверждающее evidence.

## 9. Структура документа

Каждый Capture/Version должен разбираться в стабильную иерархию структурных узлов:

```text
document
part
chapter
section
subsection
article
part_of_article
clause
subclause
paragraph
item
definition
table
figure
example
appendix
bibliography
```

Минимальный контракт StructureNode / Fragment:

```text
fragment_id
version_id
parent_fragment_id
fragment_type
ordinal
canonical_key
locator
heading
text_content
text_sha256
page_from
page_to
char_from
char_to
is_atomic
recorded_at
metadata
```

Фиксированные chunks по N токенов не являются канонической структурой. Они могут создаваться только как производный runtime index.

## 10. Stable Source Locator

Любое SOURCE_DERIVED знание обязано ссылаться на точное место в источнике.

Поддерживаются:

```text
книга: edition + chapter + section + page + fragment_id
статья: version + section + page/paragraph + fragment_id
ГОСТ: edition + section/clause/table/appendix
закон: document_version + article/part/clause/paragraph
код: repository + commit SHA + path + symbol
benchmark: test_id + dataset_version + run_id
web: canonical URI + capture hash + locator
```

Дополнительно для устойчивого re-anchor после обновления могут храниться:

```text
selected_text
text_hash
start_offset
end_offset
surrounding_context_hash
```

## 11. Книги

Для книги обязательно хранить:

```text
book_source_id
work_title
authors
edition
isbn
publisher
year
language
license/access
capture refs
```

Из книги извлекаются не только chunks, а единицы знания:

```text
CONCEPT
DEFINITION
PRINCIPLE
CLAIM
METHOD
ALGORITHM
FORMULA
DECISION_CRITERION
CONTROL
METRIC
FAILURE_MODE
EXAMPLE
LIMITATION
IMPLEMENTATION_OPTION
```

Каждая такая запись имеет точный source locator и собственную формулировку проекта там, где это необходимо.

## 12. Научные статьи

Карточка scientific publication должна поддерживать:

```text
research_question
hypotheses[]
study_design
method_refs[]
dataset_refs[]
sample_description
experiment_refs[]
metrics[]
results[]
limitations[]
conclusions[]
references[]
peer_review_status
replication_status
data_availability
code_availability
conflict_of_interest
funding
```

Эти поля не должны заполняться выдуманными значениями. Неизвестное хранится как `null / UNKNOWN / pending_verification`.

## 13. Claim как основная аналитическая единица

Научная и аналитическая БД должна хранить утверждения отдельно от документа.

```text
SOURCE VERSION
    ↓
FRAGMENT
    ↓
CLAIM
    ↓
EVIDENCE
```

Минимальный Claim:

```text
claim_id
claim_type
statement_normalized
statement_original_or_locator_ref
subject_ref
predicate
object_ref
source_fragment_id
origin_class
status
confidence_profile_id
created_at
```

Типы Claim минимум:

```text
DESCRIPTIVE
CAUSAL
COMPARATIVE
QUANTITATIVE
NORMATIVE
DEFINITIONAL
PREDICTIVE
METHOD_EFFECTIVENESS
LIMITATION
```

## 14. Evidence

Claim и evidence разделяются.

EvidenceLink хранит:

```text
evidence_link_id
claim_id
evidence_object_type
evidence_object_id
relation_type
source_fragment_id
strength_profile_id
independence_group_id
status
review_status
created_at
```

Типы связей минимум:

```text
SUPPORTS
CONTRADICTS
PARTIALLY_SUPPORTS
REFINES
REPLICATES
FAILS_TO_REPLICATE
USES_DATASET
USES_METHOD
CITES
EXTENDS
```

LLM output сам по себе не считается независимым evidence.

## 15. Научная независимость доказательств

База должна позволять обнаруживать псевдо-независимые подтверждения.

Например, две статьи могут:

```text
использовать один dataset
использовать одну benchmark выборку
иметь общих авторов
цитировать один исходный experiment
использовать одну и ту же модель / pipeline
```

Для этого вводятся связи authorship, dataset usage, method usage, lineage и `independence_group_id`.

Количество публикаций не равно количеству независимых доказательств.

## 16. Dataset

Dataset является отдельным каноническим объектом:

```text
dataset_id
name
version
publisher/owner
canonical_uri
license
created_at
sample_size
schema_ref
quality_profile
known_biases
security/classification
hash_or_manifest
status
```

Научная статья, метод, experiment и benchmark ссылаются на dataset ID, а не копируют его описание.

## 17. Method и Algorithm

Авторский метод и реализация FATHER должны различаться.

```text
SOURCE IDEA
→ METHOD
→ IMPLEMENTATION OPTION
→ ALGORITHM CANDIDATE
→ APPROVED ALGORITHM VERSION
```

Method:

```text
method_id
name
version
problem
applicability
inputs
outputs
steps
assumptions
limitations
source_refs
status
```

Algorithm:

```text
algorithm_id
method_id
version
implementation_origin
inputs
outputs
steps
branch_conditions
dependencies
controls
metrics
failure_modes
security_implications
reversibility
status
supersedes
```

## 18. Experiment / Benchmark

Для проверки научных или инженерных утверждений FATHER должен хранить эксперименты как отдельные воспроизводимые записи.

```text
experiment_id
experiment_type
hypothesis_refs[]
method_version
algorithm_version
model_version
dataset_version
parameters
hardware/runtime
started_at
finished_at
metrics
raw_result_refs
result_summary
limitations
status
trace_id
```

Поддерживаются:

```text
A/B
A/B/C
Champion/Challenger
Shadow
Canary
Replay
Benchmark
Regression
Counterfactual
```

Результат benchmark создаёт `BENCHMARK_MEASURED` evidence только в пределах зафиксированной конфигурации.

## 19. Confidence / Quality

Запрещается хранить единственный непрозрачный «AI score» как истину.

Оценки разлагаются минимум на:

```text
source_quality
provenance_quality
study_design_quality
extraction_reliability
cross_source_agreement
replication_status
method_transparency
data_availability
code_availability
counter_evidence_penalty
missing_data_penalty
recency/freshness
```

Для нормативных источников отдельно:

```text
source_authority
legal_status
verification_freshness
```

`confidence != authority != importance != legal_force != relevance`.

Каждый профиль оценки имеет `method_id`, `method_version` и список факторов.

## 20. Contradiction

Противоречие — самостоятельный объект, а не флаг для удаления одной записи.

```text
contradiction_id
claim_a_id
claim_b_id
contradiction_type
scope
possible_explanations[]
method_difference_refs[]
dataset_difference_refs[]
unresolved_questions[]
status
review_status
created_at
resolved_at
```

Возможное объяснение причины противоречия до review имеет `origin_class = INFERENCE` или `HYPOTHESIS`.

## 21. Concept / Definition / Ontology

Понятия хранятся отдельно от их определений.

```text
CONCEPT
  ├─ DEFINITION from Source A
  ├─ DEFINITION from Source B
  └─ PROJECT NORMALIZED DEFINITION
```

Нельзя молча заменять несовпадающие определения одним текстом.

Definition содержит:

```text
definition_id
concept_id
source_fragment_id
text_or_summary
scope
valid_from/valid_to if applicable
status
```

Связи онтологии минимум:

```text
IS_A
PART_OF
INSTANCE_OF
SAME_AS
POSSIBLY_SAME_AS
DEFINED_BY
RELATED_TO
DEPENDS_ON
```

## 22. Regulatory Layer

Существующий `normative.documents` остаётся каноническим реестром нормативных документов.

Связь:

```text
DOCUMENT
→ DOCUMENT_VERSION
→ DOCUMENT_FRAGMENT
→ REQUIREMENT
→ CONTROL
→ SYSTEM
→ RESPONSIBLE ROLE
→ EVIDENCE REQUIREMENT
```

Юридические даты и время знания разделяются:

```text
VALID TIME:
published_at
adopted_at
effective_from
effective_to
repealed_at

SYSTEM / KNOWLEDGE TIME:
recorded_at
verified_at
retired_at
```

Юридический статус и freshness проверки нельзя смешивать.

Допустимые legal statuses минимум:

```text
DRAFT
ADOPTED_NOT_EFFECTIVE
EFFECTIVE
PARTIALLY_EFFECTIVE
AMENDED
SUSPENDED
REPEALED
SUPERSEDED
EXPIRED
UNKNOWN_NEEDS_VERIFICATION
```

## 23. Связь нормативки с наукой и инженерией

База должна поддерживать трассу:

```text
LAW / STANDARD
→ REQUIREMENT
→ CONTROL
→ METHOD
→ ALGORITHM
→ SCIENTIFIC EVIDENCE
→ BENCHMARK
→ IMPLEMENTATION
→ ACTUAL TELEMETRY
```

При этом Scientific Evidence объясняет эффективность/свойства способа реализации, но не заменяет юридическое основание требования.

## 24. Responsibility

Ответственность нельзя генерировать из предположений.

```text
NORM
→ DUTY
→ ORGANIZATIONAL ROLE
→ EXPLICIT BASIS
→ CONTROL OF EXECUTION
→ EVIDENCE
→ RESPONSIBILITY
```

Explicit basis может быть:

```text
law
regulation
internal order
job description
contract
approved policy
```

В общей KB хранится роль. Конкретный человек при необходимости подтягивается из защищённого организационного каталога.

## 25. Knowledge Object lifecycle

Общий lifecycle:

```text
CANDIDATE
→ TESTING
→ VERIFIED
→ ACTIVE
→ STALE
→ SUPERSEDED
→ REJECTED
```

Для technology/method evolution дополнительно:

```text
EMERGING
CHALLENGER
CHAMPION
LEGACY
DEPRECATED
```

Автоматическое повышение `CANDIDATE -> VERIFIED` LLM-моделью запрещено.

## 26. Relations / Graph

Каноническая relation хранится как отдельная типизированная запись с evidence и статусом.

Основные node types:

```text
SOURCE
SOURCE_VERSION
FRAGMENT
DOCUMENT
REQUIREMENT
CLAIM
CONCEPT
DEFINITION
ENTITY
METHOD
ALGORITHM
DATASET
EXPERIMENT
BENCHMARK
THREAT
CONTROL
ASSET
SYSTEM
SCENARIO
HYPOTHESIS
CONTRADICTION
EVIDENCE
DECISION
PERSON
ORGANIZATION
EVENT
LOCATION
```

Основные edge types:

```text
DERIVED_FROM
CITES
SUPPORTS
CONTRADICTS
REPLICATES
USES_DATASET
USES_METHOD
DEFINES
REQUIRES
IMPLEMENTS
APPLIES_TO
PART_OF
SUPERSEDES
EXTENDS
EVIDENCES
RELATED_TO
DEPENDS_ON
MITIGATES
CAUSES
AFFECTS
CONTROLS
VIOLATES
SATISFIES
INSTANCE_OF
SAME_AS
POSSIBLY_SAME_AS
```

Edge без evidence/review остаётся `PROPOSED/HYPOTHESIS`.

## 27. Graph projection

Graph Node/Edge не должен содержать единственную копию фактов.

```text
CANONICAL TABLES
      ↓ projection
GRAPH NODE / EDGE
      ↓
visualization / traversal / analytics
```

Удаление или перестроение projection не должно уничтожать каноническое знание.

## 28. RAG / Embeddings

RAG индекс строится только поверх канонических source fragments и knowledge objects.

Embedding хранит минимум:

```text
embedding_id
object_or_fragment_id
model_id
model_version
dimension
content_hash
embedding
created_at
```

Если content_hash изменился, старый embedding не считается актуальным.

RAG ответ обязан возвращать references на source/fragment/version, а не только similarity score.

Permanent chunk не должен становиться новым Source или Fact.

## 29. User Workbench

Пользовательские данные отделены от канонического текста.

Поддерживаются:

```text
annotation
note
tag
question
task_hint
user relation
review proposal
```

Visibility:

```text
PRIVATE
TEAM
ORGANIZATION
KB_CANDIDATE
```

KB_CANDIDATE не становится knowledge object без review.

Для fragment link обязательны:

```text
from_fragment_id
to_document_id OR to_fragment_id
relation_type
reason
created_by
status
reviewed_by
created_at
reviewed_at
```

## 30. Citation graph

Для книг и научных статей должна строиться отдельная проекция citation graph:

```text
PUBLICATION A
  ├─ CITES → PUBLICATION B
  ├─ SUPPORTS → CLAIM C
  ├─ CONTRADICTS → CLAIM D
  ├─ EXTENDS → METHOD E
  └─ USES_DATASET → DATASET F
```

Цитата обязана вести к конкретной версии публикации и, если возможно, к fragment locator.

## 31. Provenance

Для любого SOURCE_DERIVED объекта обязательны:

```text
record_id
origin_class
source_ref
source_version_ref
source_fragment_ref
source_locator
acquisition_uri
accessed_at
source_file_path if local
source_hash_sha256 if local
created_by
review_status
record_status
supersedes
```

Origin classes минимум:

```text
SOURCE_DERIVED
PROJECT_DECISION
ASSISTANT_PROPOSAL
HUMAN_DECISION
BENCHMARK_MEASURED
INFERENCE
HYPOTHESIS
```

## 32. Review / Governance

Любое высокозначимое изменение проходит ReviewDecision.

```text
review_id
object_type
object_id
object_version
reviewer
reviewer_role
decision
reason
evidence_refs
created_at
```

Решения:

```text
APPROVE
REJECT
REQUEST_CHANGES
DEFER
```

Нельзя физически удалять отвергнутую гипотезу, если она участвовала в предыдущих решениях; она переводится в статус REJECTED.

## 33. Audit / Trace

Система должна хранить внешний проверяемый trace, а не скрытые рассуждения модели.

Audit Event:

```text
event_id
occurred_at
actor
actor_role
action
object_type
object_id
object_version
reason
trace_id
before_hash
after_hash
model_id/model_version if applicable
prompt_version if applicable
code_commit_sha if applicable
details
```

Для критических audit relations UPDATE/DELETE запрещается; исправление создаётся новым event.

## 34. Time model

Для важных объектов применяется bitemporal-compatible модель:

```text
OBSERVED_AT
VALID_FROM
VALID_TO
RECORDED_AT
RETIRED_AT
```

Это позволяет отвечать на два разных вопроса:

```text
Что было истинно/действовало на дату X?
Что FATHER знал и когда это было записано/проверено?
```

## 35. Dedup / identity resolution

Перед созданием канонического объекта выполняется:

```text
SEARCH EXISTING
↓
FOUND?
├─ YES → LINK / EXTEND / NEW VERSION
└─ NO  → CREATE CANDIDATE
```

Технический SHA-256 подтверждает одинаковые bytes, но не юридическую или библиографическую идентичность.

Для identity используются типизированные ключи:

```text
legal: authority + type + number + date + title
book: normalized title + authors + edition + ISBN
article: DOI; fallback title + authors + venue + year
standard: issuer + standard number + edition/year
code: repo + commit + path/symbol
dataset: canonical id + version
```

Неуверенный merge создаёт `POSSIBLY_SAME_AS`, а не silent merge.

## 36. Security / Classification

Каждый Source/Object при необходимости имеет classification:

```text
PUBLIC
INTERNAL
RESTRICTED
SECRET
```

Search/RAG/API обязаны фильтровать данные по RBAC до формирования контекста модели.

Секреты, credentials, персональные данные и защищённые локальные пути не должны попадать в публичные Git projections.

## 37. Git и PostgreSQL

PostgreSQL хранит оперативное каноническое состояние.

Git хранит:

```text
DDL / migrations
schemas / contracts
policies
reviewed metadata
sanitized manifests
approved projections
acceptance tests
```

Git не является полным backup БД и не должен автоматически хранить закрытые originals, raw operational DB или credentials.

## 38. Запрет на параллельные truth stores

Перед созданием новой таблицы разработчик обязан проверить текущий inventory.

Если уже есть таблица, выполняющая функцию объекта, используется:

```text
EXTEND
MAP
ADD VERSION TABLE
ADD PROJECTION
```

а не создаётся независимая копия.

Например:

```text
normative.documents remains canonical document registry
```

## 39. API требования

API чтения KB должен уметь возвращать:

```text
canonical object
version
status
provenance
source locators
relations
review status
confidence breakdown
time validity
```

Для RAG/LLM ответ дополнительно должен включать evidence map.

Write API должен быть разделён по операциям:

```text
create candidate
propose relation
submit review
approve/reject
create new version
retire/supersede
add annotation
```

Generic unrestricted UPDATE канонических записей не допускается.

## 40. Research Workbench

Плановый `/research-workbench` работает поверх этого DB-contract и должен поддерживать:

```text
левая панель: books / papers / standards / datasets
центр: оригинальный текст/структура
справа: claims / evidence / methods / contradictions / citations / notes
```

При выделении фрагмента:

```text
Заметка
Метка
Создать Claim
Создать Definition
Связать
Подтверждает
Противоречит
Создать задачу
```

Любая созданная пользователем аналитическая связь сначала является proposal.

## 41. Legal Workbench

`/legal-workbench` использует тот же Knowledge Core и нормативный слой:

```text
full official text
revision footnotes
old/new
applicability
requirements
roles
controls
templates
evidence
notes
relations
history
```

## 42. Alina / Agents

Агенты не владеют копиями базы. Они получают:

```text
COMMON FOUNDATION
+ ROLE PROFILE
+ DOMAIN PROFILE
+ TASK CONTEXT
+ authorized RAG package
```

Алина обязана уметь объяснить ответ через:

```text
WHAT
SOURCE / LOCATOR
EVIDENCE FOR
EVIDENCE AGAINST
METHOD
ALTERNATIVES
GAPS
CONFIDENCE
REVIEW STATUS
```

## 43. Knowledge Evolution Engine

База должна поддерживать closed loop:

```text
KNOWLEDGE
→ TECHNOLOGY / SCIENCE WATCH
→ NEW EVIDENCE
→ NEW WEIGHTS / QUALITY PROFILE
→ CHALLENGER
→ EXPERIMENT
→ IMPACT ESTIMATE
→ MIGRATION PROPOSAL
→ CANARY
→ MIGRATE
→ OBSERVE
→ EXPECTED vs ACTUAL
→ UPDATE KNOWLEDGE
```

Promotion:

```text
SHADOW → CHALLENGER → CANARY → CHAMPION
```

Promotion в production требует policy/human gate.

## 44. Watch / Change Detection

База должна поддерживать события изменения:

```text
source_change
new_source_version
amendment
retraction
correction
repeal
source_disappeared
verification_stale
conflicting_source
new_replication
failed_replication
benchmark_regression
```

Каждое событие должно иметь impact analysis на связанные objects.

## 45. Impact Analysis

Impact должен проходить по графу:

```text
SOURCE CHANGE
→ CLAIM / REQUIREMENT
→ METHOD / CONTROL
→ ALGORITHM / SYSTEM
→ DOCUMENT / TEMPLATE
→ RESPONSIBLE ROLE
→ RISK / DECISION
```

Результат должен содержать список затронутых объектов, severity, confidence, evidence и рекомендованные действия.

## 46. Data Quality

Для данных KB должны контролироваться:

```text
completeness
uniqueness
consistency
provenance coverage
locator coverage
version coverage
hash coverage
review coverage
freshness
orphan rate
contradiction rate
unresolved candidate rate
```

Отдельно считать качество извлечения parser/LLM и качество самого источника.

## 47. Обязательные проверки целостности

Acceptance SQL должен проверять минимум:

```text
no orphan versions
no orphan fragments
no orphan source links
no orphan claims
no orphan evidence links
no duplicate current versions where prohibited
no multiple canonical IDs for strict identities
no VERIFIED source-derived record without provenance
no ACTIVE retracted evidence as normal support
no graph edge without canonical endpoint
no stale embedding with mismatched content_hash
```

## 48. Нефункциональные требования

БД должна обеспечивать:

- PostgreSQL как основной transactional store;
- транзакционные migrations;
- foreign keys там, где возможны строгие связи;
- typed statuses через CHECK/lookup tables;
- индексы по canonical IDs, source/version, locator, status, timestamps;
- JSONB только для расширяемой metadata, а не вместо основных нормализованных полей;
- GIN/FTS для текстового поиска;
- vector index только как производный retrieval layer;
- read-only views для безопасных UI projections;
- auditability;
- backup/restore;
- migrations idempotent where practical;
- dry-run/read-only acceptance перед production writes.

## 49. Этапы реализации

### P0 — уже начато

```text
existing osint_kb inventory
normative versioning
fragments
changes
workbench annotations/links
152-FZ canonical ingestion
```

### P1 — Source / Research Core

```text
unified Source/Capture/Version mapping
books + editions
scientific publications + versions
source fragments
citations
claims
evidence links
```

### P2 — Knowledge / Science Graph

```text
concepts
definitions
methods
datasets
contradictions
replication links
typed graph projection
```

### P3 — Engineering / Validation

```text
algorithms
experiments
benchmarks
quality/confidence profiles
telemetry
Knowledge Evolution Engine
```

### P4 — Product integration

```text
Research Workbench
Legal Workbench real DB API
Operator Console impact alerts
Alina grounded RAG
Watch services
```

## 50. Definition of Done БД v1

База считается соответствующей первому полному ТЗ, когда:

1. существует один канонический Source Registry;
2. Source поддерживает captures и versions;
3. книги поддерживают editions;
4. научные статьи поддерживают publication lifecycle и retraction;
5. документы имеют structure/fragments и stable locators;
6. Claims отделены от Facts и Sources;
7. Evidence типизировано и связано с exact fragments;
8. Dataset является отдельным versioned object;
9. Methods/Algorithms отделяют авторское знание от проектной реализации;
10. Contradictions сохраняются и анализируются;
11. confidence разложен по факторам;
12. graph является projection канонических objects;
13. RAG возвращает source/version/locator;
14. user annotations отделены от canonical knowledge;
15. нормативный time-machine работает;
16. scientific citation graph работает;
17. audit/trace позволяет восстановить происхождение каждого значимого вывода;
18. rejected/retracted/superseded записи не стираются;
19. нет параллельных truth stores;
20. acceptance tests проверяют referential integrity и provenance coverage;
21. RBAC ограничивает доступ до формирования RAG context;
22. изменение источника может построить impact graph;
23. Alina может показать evidence map, alternatives, gaps и review status;
24. все migrations проходят backup → inventory → review → apply → acceptance → snapshot;
25. документация, физическая карта и development journal синхронизированы с фактической схемой.

## 51. Связанные обязательные документы

Это ТЗ не заменяет, а объединяет и делает обязательными правила из:

```text
ANALYST_KB_SPEC.md
FATHER_ANALYST_FOUNDATION.md
PROVENANCE_AND_STORAGE_POLICY.md
SOURCE_ACQUISITION_AND_EXTRACTION_PLAN.md
FATHER_NORMATIVE_DATA_MODEL_V1.md
PHYSICAL_MAP.md
DECISION_AND_TRAINING_FRAMEWORK.md
```

При конфликте физическая реализация не должна автоматически выбирать один вариант. Конфликт фиксируется как архитектурный вопрос/Decision Record и проходит review.
