# ALINA Analyst Meta-KB — спецификация

## 1. Назначение

Meta-KB описывает **компетенцию самого Аналитика**: понятия, методы, критерии качества, процедуры проверки, требования к объяснимости, источники методологии и ограничения.

Предметные факты книги, OSINT-дела, ИБ-системы или нормативного корпуса сюда не записываются. Для них существуют отдельные Domain KB.

## 2. Логическая модель

```text
SOURCE
  │
  ├── supports ──> METHOD
  ├── defines ───> CONCEPT
  ├── requires ──> CONTROL
  └── measures ──> METRIC

METHOD
  ├── consumes ──> KNOWLEDGE_OBJECT_TYPE
  ├── produces ──> ANALYTICAL_OBJECT_TYPE
  ├── checked_by -> CONTROL
  ├── evaluated_by -> METRIC
  └── produces_trace -> TRACE_EVENT

VERIFIED_EXAMPLE
  ├── demonstrates -> METHOD
  ├── input -> KB RECORDS
  ├── local_result -> CANDIDATE
  ├── reviewer_result -> REVIEW
  └── correction -> EXPERIENCE RECORD
```

## 3. Базовые классы Meta-KB

### Source
Методический источник: ГОСТ/ISO/W3C/NIST/книга/статья/внутренний verified corpus.

### Concept
Формализованный термин: evidence, claim, fact, provenance, hypothesis, contradiction, confidence, source quality, entity, relation, event и т.д.

### Method
Повторяемая процедура анализа.

### Algorithm
Конкретный вычислительный алгоритм или семейство алгоритмов, реализующее часть Method.

### Control
Обязательное правило, ограничение или validator.

### Metric
Измеритель качества результата.

### Trace Event
Наблюдаемое действие Analyst, которое можно показать в UI и проверить.

### Verified Example
Проверенный пример `input → local result → senior review → correction → final`.

### Domain Extension
Дополнение общего ядра специальностью.

## 4. Базовые объекты предметной KB, которые понимает Analyst

```text
Source
Capture
Fragment
Observation
Entity
Claim
FactCandidate
VerifiedFact
Relation
Event
TimelineNode
Hypothesis
CounterEvidence
Contradiction
OpenQuestion
KnowledgeRecord
Review
Correction
```

## 5. Основной аналитический цикл

```text
1. Understand request
2. Build analysis plan
3. Retrieve relevant KB records
4. Check provenance and source quality
5. Normalize entities/terms/time
6. Compare claims and facts
7. Build/inspect relations and events
8. Detect contradictions and gaps
9. Generate competing hypotheses when needed
10. Search counter-evidence
11. Estimate confidence from explicit factors
12. Produce conclusion with evidence map
13. Propose KB changes
14. Send high-impact/uncertain items to Senior Review
15. Record decision and correction
```

## 6. Методическая матрица

| Шаг | Основная задача | Выход | Обязательная проверка |
|---|---|---|---|
| PLAN | разложить вопрос на проверяемые подзадачи | AnalysisPlan | scope/coverage |
| RETRIEVE | получить релевантные записи KB | EvidenceSet | provenance/recall |
| NORMALIZE | снять дубли/алиасы/форматы | NormalizedSet | no silent merge |
| COMPARE | сопоставить утверждения | ComparisonSet | source independence |
| CONTRADICTION | найти несовместимые утверждения | ContradictionSet | do not auto-resolve |
| HYPOTHESIS | построить альтернативные объяснения | HypothesisSet | counter-evidence |
| CONFIDENCE | оценить силу вывода | ConfidenceBreakdown | factors exposed |
| CONCLUDE | сформировать проверяемый вывод | Conclusion | evidence map |
| PROPOSE | предложить изменение KB | ChangeSet | no silent publish |
| REVIEW | независимая проверка | ReviewDecision | reviewer separation |

## 7. Confidence — не «число от LLM»

Confidence хранится как разложение факторов:

```json
{
  "overall": 0.78,
  "factors": {
    "source_quality": 0.90,
    "provenance_quality": 1.00,
    "cross_source_agreement": 0.82,
    "extraction_reliability": 0.88,
    "counter_evidence_penalty": 0.80,
    "missing_data_penalty": 0.75
  },
  "method": "weighted-v1"
}
```

Числа должны быть калиброваны на benchmark/verified corpus. Пока калибровки нет, score помечается `experimental`.

## 8. Объяснимость

Для каждого важного вывода пользователь должен получить не внутренние скрытые рассуждения модели, а проверяемый отчёт:

```text
WHAT
какой вывод сделан

BASED ON
какие KB records / source fragments использованы

METHOD
какая методика применена

FOR
что поддерживает вывод

AGAINST
что ему противоречит

ALTERNATIVES
какие версии рассмотрены

GAPS
чего не хватает

CONFIDENCE
из каких факторов сложена оценка

REVIEW
кто и как проверил
```

## 9. Правила, которые Analyst не может нарушать

1. Claim ≠ Fact.
2. Observation ≠ Fact.
3. Hypothesis ≠ Fact.
4. Knowledge without provenance cannot silently become verified.
5. Entity merge must be explicit and reversible.
6. Contradiction cannot be silently discarded.
7. Missing data must remain visible.
8. Model output alone is not independent evidence.
9. Senior/Human correction is versioned, not destructive.
10. Every KB mutation must have actor, cause, trace and version.

## 10. Domain Profiles

Общее аналитическое ядро одинаково, но профиль задаёт:

```text
ontology
required entity types
allowed relation types
evidence hierarchy
source quality rules
specialized methods
validators
confidence thresholds
model routes
review thresholds
```

Примеры:

```text
narrative
osint
cybersecurity
regulatory
engineering
finance
science
```

## 11. Experience Store

Главный механизм роста компетенции:

```text
INPUT
→ METHOD VERSION
→ LOCAL RESULT
→ SENIOR REVIEW
→ HUMAN REVIEW if any
→ CORRECTION
→ REASON CODE
→ FINAL RESULT
→ METRIC DELTA
```

Experience Store используется сначала для prompt/routing/rule/schema improvement; обучение/LoRA допускается только после накопления качественного размеченного корпуса.

## 12. Приёмка Meta-KB

Meta-KB должна позволять задать Аналитику вопрос и получить одновременно:

- вывод;
- evidence map;
- provenance;
- применённые методы;
- альтернативные версии;
- противоречия;
- gaps;
- confidence breakdown;
- trace действий;
- review status;
- proposed KB changes.
