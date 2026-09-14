# FATHER Document → Knowledge → Algorithm Pipeline

Status: `SELECTED / EVOLVING`
Origin class: `PROJECT_DECISION`

## 1. Цель

Этот процесс фиксирует полный путь документа от поступления до предложения изменений в канонической Knowledge Base.

```text
DOCUMENT
→ REGISTER
→ READ/PARSE
→ TRANSLATE IF REQUIRED
→ METADATA + PROVENANCE
→ STRUCTURE
→ IDEAS
→ IDEA-BOUNDARY CHUNKS
→ KNOWLEDGE OBJECTS
→ METHODS
→ ALGORITHMS
→ POSITIVE/NEGATIVE SCENARIOS
→ REALIZATION CONDITIONS
→ VALIDATION/SECURITY
→ REVIEW
→ CANONICAL KB
```

Ни один автоматический этап не может сам назначить `approved/production`.

## 2. Stage contracts

### K0 RECEIVE

Input: PDF/DOCX/HTML/TXT/image/audio/video/URL or registered source.

Output:
- intake event;
- tentative source type;
- storage/access decision;
- task/trace id.

Gate: файл/источник доступен для законной обработки.

### K1 REGISTER + PROVENANCE

Действия:
- поиск существующего Source;
- hash/dedup Capture;
- регистрация title/version/date/URI/language только если наблюдаемы;
- фиксация acquisition/storage refs;
- `security_status=SECURITY_UNREVIEWED` для нового Capture.

Output: `Source + Capture`.

Gate: source/capture IDs, hash и provenance записаны.

### K2 READ / PARSE

Действия:
- выбрать parser по типу;
- извлечь адресуемые фрагменты;
- сохранить физические страницы/позиции/таймкоды;
- зафиксировать ошибки/пустые страницы/непрочитанные участки.

Output: `SourceSpan[]`.

Gate: есть адресуемый текст/наблюдения или явный parser failure.

### K3 LANGUAGE / TRANSLATION GATE

```text
source language suitable?
├─ yes → K4
└─ no  → ROLE-TRANSLATOR
          → terminology RAG
          → translation projection
          → translation QA
          → K4
```

Оригинальные SourceSpan остаются неизменными. Перевод — LocalizedText/derived projection.

### K4 STRUCTURE RECONSTRUCTION

Иерархия по типу документа:

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
list/table/figure/example/appendix
```

Сначала deterministic rules, затем semantic assistance для неоднозначных границ.

Output: `StructureProposal` (`PROPOSED / INFERENCE`).

Gate: достаточная coverage для семантического анализа; низкоуверенные границы помечены.

### K5 IDEA DETECTION

Обход структуры по порядку. Для каждого региона анализируется поток SourceSpan.

Состояние:

```text
NO_IDEA
→ OPEN_IDEA
→ EXTEND_IDEA
→ CLOSE_IDEA
→ NEXT_IDEA
```

IdeaCandidate обязан иметь точные `span_refs` и причины открытия/закрытия границы.

### K6 IDEA-BOUNDARY SEGMENTATION

Чанк формируется не по `N tokens`, а по закрытой смысловой единице.

Разрешено:
- одна идея на несколько абзацев/страниц;
- несколько идей внутри одного StructureNode;
- runtime overlap для retrieval.

Запрещено:
- считать фиксированное окно канонической единицей знания;
- терять provenance при сжатии контекста.

Output: `IdeaChunk[]` derived from IdeaCandidate + SourceSpan refs.

### K7 KNOWLEDGE CLASSIFICATION

Каждая идея классифицируется в ноль/один/несколько объектов:

```text
Concept
Claim
Evidence
Principle
Method
Control
Metric
FailureMode
Hypothesis
Contradiction
OpenQuestion
```

Gate: `origin_class`, source refs, status=candidate.

### K8 METHOD / ALGORITHM ENGINEERING

Для MethodCandidate:

```text
SOURCE-DERIVED METHOD
→ applicability
→ alternatives
→ implementation options
→ AlgorithmCandidate
```

AlgorithmCandidate содержит:
- objective;
- inputs/outputs;
- preconditions;
- ordered steps;
- branches/state changes;
- dependencies;
- controls/metrics;
- failure modes;
- rollback/observability.

Отдельно сравниваются deterministic/existing-service/LLM/custom варианты.

### K9 SCENARIO ENGINEERING

Минимальный набор по применимости:

```text
POSITIVE
NOMINAL
NEGATIVE
DEGRADED
ADVERSARIAL
ROLLBACK
```

Положительный сценарий доказывает достижение цели при ожидаемых условиях.
Негативный — ищет неверные данные, отсутствующие зависимости, ошибочные предположения, resource exhaustion и другие failure paths.
Adversarial — проверяет злонамеренное воздействие там, где оно имеет смысл.

### K10 REALIZATION CONDITIONS

Условия хранятся отдельно и проверяемо:

```text
REQUIRED
SUFFICIENT
ENVIRONMENT
RESOURCE
DATA
LEGAL
SECURITY
QUALITY
DEPENDENCY
STOP
REVIEW
```

Каждое условие имеет проверку/метрику. Порог допускается только с source requirement, benchmark или явным Human/Project Decision.

### K11 VALIDATION

Параллельно:

```text
Provenance Validator
Security Reviewer
Socrates / Counter-evidence
QA / schema validator
```

Проверяются:
- dangling refs;
- invented locators;
- duplicate canonical key;
- contradictions;
- simpler alternatives;
- negative/adversarial coverage;
- data/control plane separation;
- security gate;
- insufficient evidence.

### K12 SYNTHESIS / CHANGESET

Главный Аналитик собирает результаты без удаления разногласий.

Output:

```text
ChangeSet
EvidenceMap
ScenarioSet
RealizationConditions
OpenQuestions
ReviewPackage
```

### K13 REVIEW / PUBLISH

```text
candidate
→ reviewed
→ verified/approved only by authorized gate
→ production only after required polygon + security decision
```

Supersede создаёт новую версию; destructive rewrite проверенного знания запрещён.

## 3. Пять потоков исполнения

После K1/K2 данные читаются совместно пятью дорожками:

| Stream | Задача | Основные выходы |
|---|---|---|
| S1 | Source + Structure | provenance defects, StructureProposal |
| S2 | Ideas + Semantics | IdeaCandidate, IdeaChunk, claims/concepts |
| S3 | Methods + Algorithms | MethodCandidate, implementation options, AlgorithmCandidate |
| S4 | Negative + Security | counter-evidence, negative/adversarial scenarios, security findings |
| S5 | Provenance + Telemetry + Quality | trace, metrics, review defects, production statistics |

Зависимости не отменяют параллелизм: S3 может начинать обработку уже закрытых IdeaCandidate, не ожидая завершения всей книги; S4 может проверять каждый появившийся AlgorithmCandidate; S5 работает непрерывно.

## 4. Event-driven orchestration

События:

```text
SOURCE_REGISTERED
CAPTURE_PARSED
TRANSLATION_REQUIRED
TRANSLATION_READY
STRUCTURE_PROPOSED
IDEA_OPENED
IDEA_CLOSED
KNOWLEDGE_CANDIDATE_CREATED
METHOD_CANDIDATE_CREATED
ALGORITHM_CANDIDATE_CREATED
SCENARIO_SET_READY
REALIZATION_CONDITIONS_READY
VALIDATION_FAILED
REVIEW_REQUIRED
CHANGESET_READY
REVIEW_DECIDED
```

Каждое событие содержит `run_id, trace_id, object_ids, source_refs, actor/role, model/prompt/schema versions, status, duration`.

## 5. Fail-safe rules

- parser failure не маскируется пустым текстом;
- translation failure не подменяется пересказом;
- StructureProposal не становится canonical без review;
- IdeaCandidate с низкой уверенностью не удаляется, а получает `needs_review`;
- алгоритм без preconditions/failure modes не проходит K9;
- алгоритм без negative scenario не проходит K11, если негативный сценарий применим;
- `SECURITY_HOLD/REJECTED` блокирует publish/delivery;
- RAG text не имеет write path к control plane;
- timeout отдельной роли переводит объект в retry/review, а не стирает результаты других потоков.

## 6. Производственная статистика

Система собирает:

```text
items/min
pages/min
ideas/min
algorithms/min
parallel_wall_ms
per-role duration
queue wait
retry rate
rework rate
review correction rate
throughput pass/cumulative
```

Сравнение с 1 потоком и ETA публикуются только после измеренного baseline. До этого значения `null` с причиной.

## 7. Definition of Done orchestration

Оркестрация считается реализованной для этапа, только если есть одновременно:

```text
contract
+ executable path
+ trace
+ persisted output
+ failure behavior
+ test
+ review/security gate where required
```

Наличие схемы или prompt без исполнимого пути считается `DESIGNED`, а не `IMPLEMENTED`.
