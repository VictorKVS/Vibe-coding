# FATHER DZ-17 Integration Contract

Status: `AUTHORITATIVE_HANDOFF / DESIGN_GATED`
Owner: `FATHER`
Execution target: `Codex`
Knowledge reconstruction owner: `ALINA`
Branch: `feature/father-knowledge-operator-console`

## 1. Three linked workstreams

```text
A. FATHER PAPER DESIGN
   S00-S59 / documents / diagrams / methods / tests / gates
              ↓ authorizes
B. ALINA KNOWLEDGE FACTORY
   source → evidence → knowledge → role/process KB → eval
              ↓ supplies context to
C. CODEX MODEL ZOO IMPLEMENTATION
   registry → routing → RAG/evidence → models → verifier → judge → telemetry → tests
```

No stream may bypass another.

## 2. External canonical design authority

Repository: `VictorKVS/KNOWLEDGE_CORE`
Branch: `feature/father-artifact-factory`

Codex must read and obey at minimum:

- `father/factory/paper-pipeline/FATHER_PAPER_PIPELINE_ALGORITHM.md`
- `father/factory/paper-pipeline/FATHER_PAPER_PIPELINE.yaml`
- `father/factory/paper-pipeline/ANALYSIS_FIRST_ENGINEERING_POLICY.md`
- `father/factory/paper-pipeline/ALGORITHM_DESIGN_STANDARD.md`
- `father/factory/paper-pipeline/ARTIFACT_DEPENDENCY_MATRIX.yaml`
- `father/factory/paper-pipeline/GATE_AUTHORITY_MATRIX.yaml`
- `father/factory/paper-pipeline/EXCEPTION_REWORK_MODEL.yaml`
- `father/factory/paper-pipeline/AUTOMATION_ACTIVATION_GATE.yaml`
- `father/factory/visual-workbench-spec/01_STATION_CATALOG_S00_S59.md`
- `father/factory/visual-workbench-spec/backend-spec/13_ROLE_AND_PROCESS_KB_ARCHITECTURE.md`
- `father/factory/visual-workbench-spec/backend-spec/14_ROLE_PROCESS_KB_REGISTRY.yaml`
- `father/factory/visual-workbench-spec/backend-spec/16_PROFESSIONAL_METHOD_ARTIFACT_CHAIN.md`
- `father/factory/visual-workbench-spec/backend-spec/17_ROLE_ARTIFACT_HANDOFF_REGISTRY.yaml`
- `father/factory/visual-workbench-spec/10_DUAL_SITE_ALINA_FATHER_WORKFLOW.md`

These are referenced, not copied into a second canonical truth set.

## 3. DESIGN_GAP rule

If a material implementation choice is not determined by approved paper design, Codex MUST NOT silently choose it.

Create a DESIGN_GAP record containing:

- station/artifact;
- missing decision;
- affected requirements;
- alternatives;
- risk of guessing;
- proposed owner;
- requested paper artifact/ADR.

Only reversible non-material implementation details may be chosen locally with rationale.

## 4. ALINA mission

ALINA must build FATHER knowledge from zero, not paraphrase an answer database.

Canonical chain:

```text
SOURCE
→ CAPTURE / VERSION
→ SOURCE SPAN
→ ATOMIC ITEM
→ CONCEPT / CLAIM / REQUIREMENT / METHOD / ALGORITHM / CASE / FAILURE MODE
→ RELATIONS
→ REVIEW
→ CANONICAL KNOWLEDGE OBJECT
→ ROLE KB / PROCESS KB mappings
→ RAG projection
```

Every canonical FATHER role receives a logical Role KB profile. Every S00-S59 station receives a logical Process KB profile. Knowledge is stored once and mapped many-to-many.

## 5. One database

Operational canonical DB is exactly `osint_kb`.

Forbidden by default:

- `father_db`;
- `alina_db`;
- duplicate `knowledge_factory` DB;
- one vector store per role/agent;
- complete duplicate `kf.*` knowledge mirror.

Before DDL, inventory actual `osint_kb` and classify proposed structures as `KEEP / EXTEND / RENAME_VIEW / NEW`.

## 6. Model Zoo chain Codex must assemble

```text
TASK / STATION REQUEST
→ INPUT SNAPSHOT
→ DATA CLASSIFICATION / AUTHORITY
→ CAPABILITY REQUIREMENTS
→ MODEL REGISTRY
→ MATERIALITY / RISK ROUTER
→ RAG + FROZEN EVIDENCE BUNDLE
→ PROMPT + SCHEMA VERSION
→ CHAMPION
→ BLIND CHALLENGERS when justified
→ DETERMINISTIC VERIFIERS
→ INDEPENDENT JUDGE when justified
→ QUALITY + SECURITY GATES
→ DECISION PACKET
→ AUTHORIZED HUMAN GATE where required
→ AUDIT / TELEMETRY / LEARNING SIGNALS
```

Required modules include model/provider registry, capability profiles, data-class policy, router, prompt registry, RAG registry, evidence resolver, context builder, champion/challengers, evidence verifier, schema/domain validators, independent judge, human authority gate, fallback/retry/circuit policy, security tool boundary, telemetry, eval/experiment engine, capacity planner, audit and rollback/promotion policy.

Raw LLM output never writes canonical truth directly.

## 7. OTUS DZ-17 mapping

Official DZ-17 topics are integrated as a reusable `Inference Capacity Planner` for the Model Zoo:

- VRAM calculation;
- quantization impact;
- FlashAttention;
- vLLM;
- continuous batching;
- GPU-instance selection for GPT-oss across Yandex Cloud / Cloud.ru / AWS / Azure;
- Inference Calculator artifact.

The planner must distinguish deterministic formulas, engineering assumptions, measured benchmarks, provider facts and model-assisted estimates. Estimated throughput must never be labeled measured.

External provider price/availability facts require source + observed_at/as_of + region + currency + snapshot/version.

## 8. Paper-station mapping

Minimum mapping:

- S01-S07: source/provenance/gaps;
- S13-S15: compliance/data/security constraints;
- S24-S29: security/functional/NFR/acceptance requirements;
- S30-S32: feasibility/TCO/PoC;
- S33-S39: architecture options/trade-offs/ADR;
- S40-S47: detailed Model Zoo/component/API/data/IAM/deployment/observability/sizing/threat design;
- S48: complete tests/oracles before code;
- S49: implementation plan;
- S50: PRE-CODE EVIDENCE GATE;
- S51+: implementation and verification.

If a material component has not passed S50, Codex stops that stream and reports DESIGN_GAP.

## 9. Dual-site result

ALINA site = Knowledge Factory:

```text
Roles
Processes
Methods/Algorithms
Sources
Cases/Counterexamples
Evals/Certification
Security Training
Gaps/Conflicts/Stale
Promotion Review
```

FATHER site = Project Design Workbench:

```text
Projects
S00-S59 Lifecycle Canvas
Artifacts
Requirements
Security
Architecture
Data
Tests
Decisions/Gates
Trace/Impact
History/Baselines
```

Both use the same canonical IDs and `osint_kb` state.

## 10. Pre-implementation deliverables from Codex

Before material implementation, Codex must produce:

- Model Zoo component map;
- Model Zoo data flow;
- security/trust boundary model;
- state machines;
- test oracles;
- Inference Capacity Planner specification;
- ALINA/FATHER shared ID and API boundary;
- role/process/artifact handoff map;
- `DESIGN_GAPS.md`;
- trace matrix `Sxx → requirement → module → test → owner`.

Only after the applicable paper gate may code be marked implementation work.

## 11. Definition of done

The integrated DZ-17 task is not done merely when a UI runs.

Done requires:

- ALINA can construct a traceable KB from sources with zero-base controls;
- Role KB and Process KB mappings exist without duplicated truth;
- Model Zoo chain is placed against paper-design stations and authority rules;
- capacity/inference planner satisfies DZ-17 as a reusable FATHER module;
- tests and security gates exist;
- every material output has evidence/provenance/version;
- no second canonical database is created;
- ALINA and FATHER sites resolve the same canonical IDs;
- design gaps are explicit instead of being guessed away.
