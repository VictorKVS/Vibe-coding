# CODEX MASTER TASK — ALINA Knowledge Factory / FATHER

Status: `READY_FOR_IMPLEMENTATION`
Owner: `FATHER / ALINA`
Execution target: `Codex`
Primary branch: `feature/father-knowledge-operator-console`

## 0. Mission

Перестроить ALINA из набора аналитических ролей в **универсальную фабрику баз знаний для FATHER и его агентов**.

ALINA должна уметь самостоятельно, начиная с сырого материала, создать проверяемую, версионируемую, трассируемую предметную Knowledge Base, пригодную для RAG/LLM/агентов, а затем измерять качество этой KB и предлагать человеку улучшения с объяснением причин, рисков, ожидаемого эффекта и evidence.

ALINA одновременно выполняет функции:

1. Source/Document Intake Engineer.
2. PDF/Text Recognition Engineer.
3. Knowledge Engineer.
4. Research/Regulatory Analyst.
5. Ontology/Knowledge Graph Engineer.
6. RAG Engineer.
7. Prompt Engineer.
8. Evaluation/Benchmark Engineer.
9. A/B / Champion-Challenger Experiment Engineer.
10. Knowledge Base Maintainer.
11. Self-Improvement Analyst.
12. Human Decision Support system.

ALINA не имеет права самостоятельно объявлять высокорисковые изменения production/verified без разрешённого Human/Senior gate.

---

## 1. Не создавать второй стек

Реализация обязана переиспользовать существующие FATHER contracts и PostgreSQL `osint_kb`.

Обязательные существующие источники архитектуры:

- `DZ_17/knowledge_base/FATHER_KNOWLEDGE_DATABASE_TZ_V1.md`
- `DZ_17/knowledge_base/FATHER_ANALYST_FOUNDATION.md`
- `DZ_17/knowledge_base/ZERO_BASE_ANALYST_RECONSTRUCTION.md`
- `DZ_17/knowledge_base/ANALYST_KB_SPEC.md`
- `DZ_17/knowledge_base/PROVENANCE_AND_STORAGE_POLICY.md`
- `DZ_17/knowledge_base/SOURCE_ACQUISITION_AND_EXTRACTION_PLAN.md`
- `DZ_17/knowledge_base/DECISION_AND_TRAINING_FRAMEWORK.md`
- `DZ_17/METHODOLOGY_AND_STANDARDS.md`
- `DZ_17/processes/FATHER_DOCUMENT_KNOWLEDGE_PIPELINE.md`
- `DZ_17/profiles/analyst.v1.json`
- `DZ_17/rag/analyst-zoo.v1.json`
- `DZ_17/orchestration/father-analyst-pipeline.v1.json`
- `DZ_17/prompts/analyst-zoo.v1.md`
- `DZ_17/schemas/candidate-knowledge-package.schema.json`
- `DZ_17/openapi/analyst-core.v1.yaml`

Главный инвариант:

```text
ONE CANONICAL OBJECT
→ ONE CANONICAL ID
→ ONE SOURCE OF TRUTH
→ MANY VIEWS / RAG PROJECTIONS / AGENTS
→ NO PARALLEL CANONICAL DATABASE
```

---

## 2. Эталонный пилот: 152-ФЗ

Первым benchmark/acceptance corpus является Федеральный закон №152-ФЗ «О персональных данных».

Использовать его не как заранее готовый граф ответов, а в двух режимах:

### A. Production ingest path

```text
source/capture
→ parse/OCR
→ canonical text
→ versions
→ fragments
→ provenance
→ links
→ requirements
→ graph projection
→ RAG
→ workbench
```

### B. Blind Zero-Base Reconstruction

Аналитик получает только минимальный seed:

```text
number = 152-ФЗ
published/adopted date = 27.07.2006
title = О персональных данных
jurisdiction = RU
```

До freeze результата запрещено выдавать ей готовые canonical graph edges, готовые requirement mappings, готовые причинные выводы и готовый timeline.

Она обязана сама:

1. найти первичные источники;
2. восстановить первоначальную редакцию;
3. найти изменяющие акты;
4. построить chronology/version timeline;
5. определить изменения `было → стало`;
6. найти связанные нормативные акты;
7. классифицировать связи;
8. извлечь требования;
9. найти официально заявленные причины изменений, если они существуют;
10. отделить официальный rationale от inference/hypothesis;
11. построить candidate graph;
12. заморозить результат;
13. только затем выполнить unblind comparison с canonical KB.

Canonical KB не считается автоматически правильной: расхождение может означать ошибку Аналитика или дефект canonical KB.

---

## 3. End-to-end ALINA Knowledge Factory

Нужен исполнимый pipeline:

```text
RAW MATERIAL
    ↓
INTAKE / SECURITY / LICENSE GATE
    ↓
SOURCE + CAPTURE + SHA-256
    ↓
FORMAT DETECTION
    ↓
TEXT EXTRACTION / OCR / LAYOUT
    ↓
QUALITY GATE
    ↓
STRUCTURE RECONSTRUCTION
    ↓
SEMANTIC SEGMENTATION
    ↓
CONCEPT / CLAIM / EVIDENCE / METHOD / REQUIREMENT
    ↓
ENTITY + RELATION RESOLUTION
    ↓
TIMELINE / VERSION / HIERARCHY
    ↓
CONTRADICTIONS / GAPS / COUNTER-EVIDENCE
    ↓
KNOWLEDGE GRAPH CANDIDATE
    ↓
RAG INDEX / RETRIEVAL PROJECTION
    ↓
GPT / SENIOR REVIEW
    ↓
CANONICAL KB CHANGESET
    ↓
HUMAN GATE
    ↓
VERIFIED / APPROVED
    ↓
MONITOR / BENCHMARK / A-B / IMPROVE
```

Каждый переход обязан иметь `run_id`, `trace_id`, inputs, outputs, model/prompt/schema versions, timings, errors, evidence refs и review status.

---

## 4. PDF / OCR / распознавание

ALINA должна автоматически определять тип PDF:

```text
TEXT PDF
SCANNED PDF
MIXED PDF
BROKEN/ENCRYPTED PDF
```

### Digital text PDF

Извлекать текст с сохранением:
- page number;
- reading order;
- headings;
- tables;
- footnotes where possible;
- images/figures refs;
- coordinates when extractor supports them.

### Scanned / mixed PDF

OCR допускается только когда нормальный text extraction не даёт достаточного результата.

OCR pipeline должен сохранять:

```text
page image
ocr text
confidence
bounding boxes when available
language/model/version
uncertain regions
manual-review flags
```

Нельзя молча подменять нечитаемый фрагмент придуманным текстом.

### Text Quality Gate

Минимум:

```text
coverage
empty-page ratio
ocr confidence
encoding quality
heading recovery
reading-order quality
table extraction quality
character anomaly rate
```

При неудовлетворительном качестве результат остаётся `CANDIDATE / NEEDS_REVIEW`.

---

## 5. Source discovery and document acquisition

ALINA должна уметь по исходному документу находить дополнительные источники и документы.

Для нормативного домена:
- акты, на которые документ ссылается;
- акты, которые его изменяют;
- акты, которые он изменяет/отменяет;
- подзаконные акты реализации;
- документы регуляторов;
- официальные разъяснения;
- документы об ответственности;
- обязательные требования;
- будущие редакции;
- historical predecessors.

Для науки/книг:
- bibliography/citations;
- DOI/arXiv/PMID/ISBN;
- cited/citing works where accessible;
- datasets;
- replications;
- corrections/retractions;
- competing research.

Новый найденный документ проходит тот же Source/Capture pipeline, а не вставляется в KB ссылкой без проверки.

---

## 6. Hierarchy reconstruction

ALINA должна строить и проверять иерархию.

Нормативные документы:

```text
document
→ version
→ part/chapter/section
→ article
→ part
→ clause
→ subclause
→ paragraph/item
```

Книги:

```text
work
→ edition
→ part
→ chapter
→ section/subsection
→ paragraph/table/figure/example
```

Научные статьи:

```text
work
→ version(preprint/accepted/published/correction/retraction)
→ abstract
→ research question
→ method
→ dataset/sample
→ experiment
→ result
→ limitation
→ conclusion
→ references
```

Структурная гипотеза LLM не может silently overwrite deterministic/verified structure.

---

## 7. Knowledge extraction

Из сырого материала ALINA создаёт не только chunks, а semantic knowledge objects:

```text
Concept
Definition
Claim
Observation
Evidence
CounterEvidence
VerifiedFactCandidate
Hypothesis
Contradiction
Requirement
Control
Method
Algorithm
Metric
FailureMode
Dataset
Experiment
Benchmark
Decision
OpenQuestion
```

Permanent fixed-size chunks не являются каноническим знанием.

Каждый объект содержит:
- canonical/candidate ID;
- origin_class;
- source/capture/version refs;
- exact source locator/span;
- extraction method/model/prompt version;
- confidence breakdown;
- review status;
- lifecycle status;
- supersedes/derived relations when applicable.

---

## 8. Relation discovery / graph construction

ALINA должна самостоятельно строить typed relations только с evidence.

Минимальный vocabulary:

```text
CITES
REFERENCES
AMENDS
SUPERSEDES
REPEALS
IMPLEMENTS
DETAILS
CLARIFIES
DEFINES
REQUIRES
APPLIES_TO
EXEMPTS
SUPPORTS
CONTRADICTS
EVIDENCES
REPLICATES
FAILS_TO_REPLICATE
USES_DATASET
IMPLEMENTS_METHOD
MITIGATES
AFFECTS
DEPENDS_ON
ESTABLISHES_LIABILITY_FOR
RELATED_TO
```

`RELATED_TO` использовать только если более точную связь доказать нельзя.

Edge без evidence = hypothesis/proposed relation, не verified relation.

---

## 9. Regulatory history / causality

Для законов и нормативных актов ALINA должна строить:

```text
PRE-HISTORY
→ ORIGINAL ACT
→ AMENDING ACT #1
→ VERSION #2
→ ...
→ CURRENT EFFECTIVE VERSION
→ ADOPTED FUTURE CHANGES
```

Для каждой поправки:

```text
WHAT CHANGED
BY WHICH ACT
PUBLICATION DATE
EFFECTIVE DATE
OLD TEXT
NEW TEXT
OFFICIAL STATED RATIONALE (if found)
INFERRED PURPOSE (separately marked)
AFFECTED REQUIREMENTS
AFFECTED CONTROLS/SYSTEMS/DOCUMENTS
```

Причина не может быть придумана. Статусы:

```text
CONFIRMED_FACT
OFFICIAL_STATED_RATIONALE
INFERENCE
HYPOTHESIS
NOT_ESTABLISHED
```

---

## 10. RAG Engineer responsibilities

ALINA должна проектировать, обслуживать и улучшать RAG каждого агента.

RAG является projection/search layer, не source of truth.

Функции:

1. retrieval profiles per role/domain;
2. hybrid retrieval;
3. exact locator retrieval;
4. graph-assisted retrieval;
5. version/as-of filtering;
6. source authority filtering;
7. counter-evidence retrieval;
8. contradiction-aware context;
9. minimal sufficient context;
10. runtime overlap only;
11. provenance-preserving context packages;
12. benchmark retrieval sets.

Каждый RAG response package обязан сохранять:

```text
query
retrieved object IDs
source spans
ranking features
excluded items/reasons
prompt version
retrieval config version
model route
latency
result/review metrics
```

---

## 11. Prompt Engineer responsibilities

ALINA должна вести versioned Prompt Registry для ролей FATHER.

Каждый prompt имеет:

```text
prompt_id
role_id
version
status
objective
inputs
outputs/schema
hard constraints
retrieval contract
failure handling
source refs / project decision refs
benchmark results
created_by
reviewed_by
supersedes
```

LLM не имеет права тихо менять production prompt.

Изменение prompt проходит:

```text
PROPOSAL
→ TEST
→ A/B or CHAMPION/CHALLENGER
→ REVIEW
→ HUMAN APPROVAL when required
→ PROMOTION
```

---

## 12. A/B / Experiment Engine

ALINA должна уметь сравнивать:

- prompt A vs B;
- RAG config A vs B;
- chunking/segmentation strategy;
- embedding model/index;
- reranker;
- model route;
- extraction algorithm;
- ontology/mapping rule;
- confidence formula;
- pipeline stage implementation.

Поддержать режимы:

```text
A/B
A/B/C
Champion/Challenger
Shadow
Replay
Canary
Regression
```

Эксперимент обязан содержать:

```text
experiment_id
hypothesis
baseline
challenger
controlled variables
dataset/benchmark version
metrics
sample size / coverage
results
error analysis
cost/latency
security impact
winner/no-winner
review decision
```

Нельзя объявлять улучшение по единичному красивому примеру.

---

## 13. Metrics

Собирать метрики минимум по слоям.

### OCR / extraction
- text coverage;
- OCR confidence;
- page failure rate;
- layout recovery;
- table recovery.

### Knowledge extraction
- precision/recall on verified benchmark where available;
- source-locator correctness;
- hallucinated-locator rate;
- claim/evidence correctness;
- relation type correctness;
- duplicate rate;
- contradiction recall.

### RAG
- retrieval recall/precision;
- exact-source hit rate;
- unsupported-answer rate;
- counter-evidence retrieval rate;
- context size;
- latency;
- cost.

### Agent result
- reviewer acceptance rate;
- correction rate;
- rework rate;
- evidence completeness;
- trace completeness;
- benchmark score.

### Production
- pages/min;
- objects/min;
- documents/pass;
- cumulative throughput;
- retry rate;
- queue wait;
- per-role duration;
- parallel wall time.

Сравнение с 1 потоком и ETA публиковать только при достаточной телеметрии.

---

## 14. GPT / Senior final validation

Отдельный reviewer должен проверять готовый пакет, а не участвовать в создании того же результата без разделения ролей.

Review package:

```text
WHAT WAS BUILT
SOURCE MAP
PROVENANCE
STRUCTURE
CLAIMS / EVIDENCE
RELATIONS
CONTRADICTIONS
MISSING DATA
ALTERNATIVES
ZERO-BASE RESULT when applicable
BENCHMARK RESULTS
SECURITY FINDINGS
PROPOSED CHANGESET
```

GPT/Senior Reviewer выдаёт:

```text
APPROVE
APPROVE_WITH_CORRECTIONS
REWORK
REJECT
HUMAN_DECISION_REQUIRED
```

Review не делает destructive rewrite результата; correction versioned.

---

## 15. Self-improvement loop

ALINA обязана анализировать собственную эффективность и предлагать улучшения.

Она может предложить:
- новый parser/OCR engine;
- другую segmentation method;
- новый prompt;
- другой RAG policy;
- новый reranker/embedding;
- изменение ontology;
- дополнительный validator;
- изменение model routing;
- новую метрику;
- новый benchmark;
- автоматизацию ручного этапа.

Каждое предложение человеку:

```text
PROBLEM
EVIDENCE
CURRENT METRICS
PROPOSED CHANGE
WHY IT MAY HELP
EXPECTED BENEFIT
RISKS
COST/COMPLEXITY
HOW TO TEST
ROLLBACK
CONFIDENCE
SOURCE / BENCHMARK BASIS
```

ALINA не может сама повышать предложение до production без policy gate.

После утверждения человек видит:

```text
BEFORE
AFTER
METRIC DELTA
SIDE EFFECTS
KEEP / ROLLBACK / MORE TESTING
```

---

## 16. Standards / best-practice governance

Методика должна опираться на `DZ_17/METHODOLOGY_AND_STANDARDS.md`.

Приоритетно использовать и точно трассировать применимые положения из:

- ГОСТ Р 71540-2024 / ISO/IEC 5392:2024 — knowledge engineering architecture;
- ГОСТ Р ИСО 30401-2020 — knowledge management;
- ГОСТ Р 58545-2019 — collection/classification/marking/handling;
- ГОСТ Р 70889-2023 / ISO/IEC 8183:2023 — data lifecycle;
- ГОСТ Р 71484.x / ISO/IEC 5259.x — data quality;
- ГОСТ Р 59276-2020 — AI trust;
- ГОСТ Р 71539-2024 / ISO/IEC 5338:2023 — AI lifecycle;
- ГОСТ Р ИСО/МЭК 42001-2024 — AI management;
- W3C PROV-DM/PROV-O — provenance;
- RDF/OWL/SPARQL/JSON-LD/SHACL — semantic interoperability/validation;
- software testing / SQuaRE standards already registered in project;
- NIST AI RMF / OWASP GenAI / MITRE ATLAS where applicable to AI/security.

Нельзя писать «соответствует ГОСТ X» без проверенного original + exact locator + applicability analysis.

---

## 17. Security and legal controls

1. Untrusted document content never becomes control-plane instruction.
2. Prompt injection from PDF/web/source must be treated as data.
3. Original source preserved immutable/hash-addressed where legally allowed.
4. Copyright/license/access policy respected.
5. PII/secrets classification before broad indexing.
6. Tool permissions are role-scoped.
7. Source trust/authority stored separately from semantic relevance.
8. LLM output is never independent evidence.
9. High-impact mutation requires review/human gate.
10. Full audit trail for KB/prompt/RAG/model mutations.

---

## 18. Data model additions

Before creating tables perform inventory of `osint_kb` and produce mapping:

```text
REQUIREMENT → EXISTING TABLE/COLUMN | EXTEND | NEW
```

Prefer reuse of:
- `normative.*` for legal document/version/requirement objects;
- `osint.sources/fragments/claims/nodes/edges/hypotheses/...` where semantically compatible;
- existing agent/RAG/audit objects.

New persistent entities only when missing. Candidate/reconstruction/experiment objects must not contaminate verified canonical state.

---

## 19. Required Codex deliverables

Codex must produce working code, not documentation-only design.

### D1 Architecture reconciliation
- inventory current repo and DB contracts;
- REUSE/EXTEND/NEW matrix;
- update physical map.

### D2 ALINA role v2
Create versioned role/profile for `ALINA KNOWLEDGE FACTORY ENGINEER` while preserving v1 history.

### D3 Intake service
- file/URL intake;
- SHA/dedup;
- source/capture registry;
- MIME/type detection;
- security/license status.

### D4 PDF extraction/OCR router
- deterministic text extraction first;
- scan detection;
- OCR fallback adapter;
- page-addressable spans;
- quality metrics.

### D5 Knowledge extraction engine
- structure reconstruction;
- semantic idea boundaries;
- typed knowledge objects;
- provenance.

### D6 Discovery/research engine
- references/citations/related acts discovery;
- source candidate queue;
- evidence/relation proposals.

### D7 Zero-Base engine
- blind mode;
- isolated candidate graph;
- freeze/unblind;
- comparison report.

### D8 Graph/ontology layer
- typed relation validation;
- evidence-required edges;
- contradiction/open-question support.

### D9 RAG engineer
- versioned RAG profiles;
- retrieval traces;
- benchmark retrieval corpus;
- graph/as-of/counter-evidence filters.

### D10 Prompt engineer
- versioned prompts;
- prompt benchmark;
- protected promotion workflow.

### D11 Experiment engine
- A/B + Champion/Challenger + Shadow/Replay/Regression;
- metrics and result registry.

### D12 GPT/Senior review gate
- independent reviewer package;
- corrections/rework;
- human-required decisions.

### D13 Self-improvement engine
- detect bottlenecks/quality defects;
- generate improvement proposal cards;
- human approval;
- measured before/after.

### D14 UI
Extend FATHER UI with at least:
- Knowledge Factory run monitor;
- source/capture view;
- OCR/parse quality;
- structure/claims/evidence;
- graph candidate;
- Zero-Base status;
- reviewer defects;
- RAG/prompt experiment dashboard;
- improvement proposal inbox.

### D15 Pilot 152-FZ
Run the complete pipeline on 152-FZ and produce reproducible acceptance dossier.

---

## 20. Implementation order

### P0 — safety + foundations
1. repo/DB inventory;
2. role/profile v2;
3. schemas/contracts;
4. source/capture/intake;
5. parser/OCR quality gate;
6. trace/audit;
7. tests.

### P1 — knowledge creation
8. structure;
9. semantic segmentation;
10. claims/evidence/concepts/requirements;
11. relation discovery;
12. candidate graph;
13. contradiction/gap engine.

### P2 — autonomous research
14. source discovery;
15. normative timeline;
16. citation/relation expansion;
17. Zero-Base reconstruction.

### P3 — agent engineering
18. RAG engineering;
19. prompt engineering;
20. benchmark corpus;
21. A/B engine;
22. GPT/Senior review.

### P4 — continuous improvement
23. self-analysis;
24. improvement proposals;
25. human approval workflow;
26. before/after telemetry;
27. controlled promotion/rollback.

---

## 21. Test requirements

Tests required at minimum:

- duplicate file SHA;
- same document/different capture;
- broken PDF;
- scan-only PDF;
- mixed PDF;
- OCR uncertain page;
- malformed encoding;
- duplicate canonical entity;
- conflicting definition;
- unsupported claim;
- edge without evidence;
- invalid source locator;
- future legal edition separation;
- blind-mode leakage test;
- Zero-Base freeze/unblind test;
- retrieval regression;
- prompt A/B deterministic fixture;
- reviewer disagreement;
- failed human gate;
- rollback;
- prompt injection inside document;
- provenance loss attempt;
- idempotent rerun.

No feature is `IMPLEMENTED` without executable test/acceptance path.

---

## 22. Acceptance criteria

ALINA Knowledge Factory v1 is accepted when a new, previously unseen document can be supplied and the system can:

1. register it without duplicate canonical objects;
2. extract/OCR text with page provenance;
3. show quality defects;
4. reconstruct hierarchy;
5. create semantic knowledge candidates;
6. find/source related documents;
7. create evidence-backed typed relations;
8. preserve contradictions and missing data;
9. build a candidate graph;
10. build a RAG projection without treating embedding as truth;
11. answer with exact provenance;
12. pass independent GPT/Senior review;
13. propose a canonical KB ChangeSet;
14. require Human gate where policy requires it;
15. run blind Zero-Base reconstruction without canonical leakage;
16. compare reconstruction with canonical/reference result;
17. execute at least one RAG or prompt A/B experiment;
18. show measured before/after metrics;
19. produce at least one evidence-based improvement proposal;
20. preserve full audit/trace/version history.

### 152-FZ acceptance extension

For 152-ФЗ additionally:
- canonical current text/version trace;
- article hierarchy;
- historical amendment timeline;
- future edition separation;
- related-act discovery;
- requirement candidates;
- reason/rationale classification;
- blind candidate graph;
- unblind comparison report;
- no publication as VERIFIED before official verification gate.

---

## 23. Codex execution rules

1. Work incrementally on the feature branch; small reviewable commits.
2. Never delete historical project knowledge to simplify implementation.
3. No destructive DB migration without explicit approval.
4. PostgreSQL remains canonical operational state; Git stores reviewed schema/contracts/sanitized manifests, not a DB dump.
5. Do not silently change existing ALINA v1 behavior; version contracts.
6. Keep `SOURCE_DERIVED / INFERENCE / HYPOTHESIS / PROJECT_DECISION / BENCHMARK_MEASURED` separate.
7. No invented benchmark numbers.
8. No claims of standard/legal compliance without source locator evidence.
9. Update `DEVELOPMENT_JOURNAL.md` for each significant architecture/KB change.
10. Update `PHYSICAL_MAP.md` for new persistent artifacts.
11. Report `what improved / how / priority` after each milestone.
12. Production speedup/ETA only from measured telemetry.

---

## 24. Final product definition

ALINA is complete for this milestone when it can act as:

> **Knowledge Base Factory + Knowledge Engineer + Research Analyst + Prompt Engineer + RAG Engineer + Evaluation Engineer + Continuous Improvement Advisor for FATHER agents.**

It must be able to turn legally/ethically processable raw material into a reviewable knowledge system, prove where every important assertion came from, test alternative prompt/RAG/knowledge-engineering strategies, learn from reviewer corrections, and propose evidence-based improvements to a human without silently self-promoting those changes.
