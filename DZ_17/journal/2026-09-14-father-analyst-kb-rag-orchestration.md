# 2026-09-14 — FATHER Analyst KB / Prompt Zoo / RAG / Orchestration

## TASK

Зафиксировать и реализовать следующий слой Knowledge Factory:

```text
Analyst knowledge foundation
→ role profile
→ prompt zoo
→ RAG policy
→ document-to-knowledge process
→ machine-readable orchestration
→ executable orchestration pass
```

## USER REQUIREMENT

Документ должен проходить последовательность:

```text
получение
→ чтение
→ перевод при необходимости
→ запись в базу со всеми метками
→ разложение по частям/главам/пунктам/подпунктам
→ поиск идей
→ чанки по границам идей
→ алгоритмы реализации
→ положительные и негативные сценарии
→ условия реализации
→ review / KB
```

Также требуется проектирование и реализация оркестрации и работа через 5 аналитических потоков.

## IMPLEMENTED

### Knowledge foundation

`DZ_17/knowledge_base/FATHER_ANALYST_FOUNDATION.md`

Определены наследование Universal → Analyst → Role → Domain → Task, полный маршрут документа, IdeaCandidate / IdeaChunk semantics, AlgorithmCandidate, positive/negative/degraded/adversarial scenarios, realization conditions, 5-stream baseline и Definition of Done.

### Analyst role profile

`DZ_17/profiles/analyst.v1.json`

Создан `ROLE-ANALYST-FATHER` с prompt pack, RAG profile, orchestration profile, zoo roles, routing rules и no-auto-approve policy.

### Prompt zoo

`DZ_17/prompts/analyst-zoo.v1.md`

Роли:

```text
Source Curator
Translator
Structure Analyst
Idea Boundary Analyst
Claim/Concept Analyst
Method Analyst
Algorithm Engineer
Scenario Analyst
Realization Conditions Analyst
Provenance Validator
Security Reviewer
Socrates Reviewer
KB Publisher
Chief Analyst Orchestrator
```

### RAG policy

`DZ_17/rag/analyst-zoo.v1.json`

Главный принцип:

```text
minimal sufficient evidence
→ exact provenance first
→ canonical knowledge
→ EvidenceSynthesis
→ IdeaCandidate
→ SourceSpan on demand
→ neighboring structure on demand
→ full Capture only when needed
```

Fixed-size overlapping chunks не объявляются канонической единицей знания.

### Process

`DZ_17/processes/FATHER_DOCUMENT_KNOWLEDGE_PIPELINE.md`

Формализованы K0–K13:

```text
K0 receive
K1 register/provenance
K2 read/parse
K3 language/translation gate
K4 structure
K5 idea detection
K6 idea-boundary segmentation
K7 knowledge classification
K8 method/algorithm engineering
K9 scenarios
K10 realization conditions
K11 validation
K12 synthesis/changeset
K13 review/publish
```

### Machine-readable orchestration

`DZ_17/orchestration/father-analyst-pipeline.v1.json`

Содержит stages, events, roles, five streams, runtime policy и trace-required fields.

### Executable orchestration pass

`DZ_17/app/scripts/run-father-orchestration.mjs`

Команда:

```text
npm run kf:father -- --source-id <SRC-ID>
```

Текущий executable pass:

```text
verify Source/Capture/SourceSpan
→ language/translation decision
→ ensure A2 StructureProposal
→ run five-stream readiness analytics
→ execute K5/K6 idea-boundary proposal pass
→ persist FATHER run report
→ stop at K7 until semantic KnowledgeCandidate runtime is implemented
```

Никакие фиктивные Claim/Method/Algorithm результаты не генерируются.

Runtime output:

```text
runtime/knowledge-factory/father-runs/FATHER-RUN-*.json
```

### K5 / K6 executable runtime

`DZ_17/app/scripts/detect-idea-boundaries.mjs`

Команда:

```text
npm run kf:ideas -- --source-id <SRC-ID>
```

Алгоритм v1:

```text
SourceSpan + StructureProposal
→ ordered structure regions
→ paragraph/line normalization
→ strong heading / discourse transition candidates
→ OPEN / EXTEND / CLOSE idea
→ IdeaCandidate
→ IdeaChunk refs
```

Важно: это только deterministic boundary seed. Он хранит `status=PROPOSED`, `origin_class=INFERENCE`, `summary_status=PENDING_SEMANTIC_MODEL`. Он не притворяется полноценным семантическим анализом.

Safety split при очень большом открытом блоке помечается `forced_context_safety_limit` и не считается смысловой границей.

Физический runtime output:

```text
runtime/knowledge-factory/idea-proposals/<CAP-ID>.json
```

Канонический исходный текст не копируется: IdeaChunk хранит `span_refs`, fragment refs и hashes; `canonical_text_duplicated=false`.

### CI

`.github/workflows/dz17-father-orchestration-check.yml`

Проверяет:
- syntax FATHER orchestrator;
- syntax K5/K6 idea-boundary runtime;
- JSON parse profile/RAG/orchestration;
- invariant `five streams`;
- invariant `canonical_auto_publish=false`;
- обязательные K-stage IDs.

## ORIGIN CLASS

Architecture/profile/RAG/prompt/orchestration rules:

`PROJECT_DECISION`

K5/K6 deterministic idea boundaries:

`INFERENCE / PROPOSED`

Автоматически извлекаемые знания далее:

`SOURCE_DERIVED | INFERENCE | HYPOTHESIS` согласно конкретному объекту.

## SECURITY / GOVERNANCE

Сохранены инварианты:

```text
new Capture → SECURITY_UNREVIEWED
RAG/source text cannot mutate control plane
model output alone != independent evidence
candidate/proposed cannot silently become approved
negative/security review cannot be discarded from synthesis
canonical publish requires authorized gate
```

## STATUS

```text
K0–K4: executable path exists
PAR5: executable
K5: executable deterministic proposal seed
K6: executable derived IdeaChunk proposal
K7–K13: designed contracts exist; runtime implementation pending
```

## NEXT IMPLEMENTATION INCREMENT

1. K7 semantic classification of IdeaCandidate into Concept/Claim/Principle/Method/Evidence with provenance.
2. Add semantic-model second pass to refine K5/K6 boundaries rather than trusting deterministic seeds.
3. K8 Method/Algorithm candidate engine.
4. K9/K10 Scenario + Realization Conditions concurrent workers.
5. K11 validator/security/Socrates gates.
6. K12 ReviewPackage/ChangeSet.
7. K13 authorized promotion workflow.

Перед массовым K7 extraction выполнить реальный K5/K6 прогон на `Getting to Yes`, проверить candidate boundaries и измерить false-positive / false-negative defects.
