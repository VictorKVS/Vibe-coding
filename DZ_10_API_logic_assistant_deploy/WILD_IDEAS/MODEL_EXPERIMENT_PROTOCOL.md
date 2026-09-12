# Alina Model Experiment Protocol

Status: `MVP / evaluation contract`

## Goal

Select models **per agent and task class**, not declare one universal model winner.

The same model can be strong for one role and inefficient or unreliable for another.

## Experiment unit

One experiment keeps constant:

- agent role;
- prompt id/version;
- retrieved knowledge/context;
- task class;
- user query / eval case;
- output constraints.

Only the model selection changes.

This makes the comparison useful. If prompt, KB and model all change at once, the result cannot be attributed to the model.

## Selection order

### Gate 1 — eligibility

Before quality scoring, eliminate models that violate a hard requirement:

- provider is unavailable;
- required privacy/data-boundary condition is not met;
- required tool/API capability is unavailable;
- context/output contract cannot be satisfied;
- unacceptable operational or licensing constraint.

### Gate 2 — professional task quality

Evaluate against the case rubric. Examples:

- instruction adherence;
- fact / hypothesis / unknown separation;
- evidence discipline;
- preservation of user authority;
- completeness without unnecessary invention;
- correct use of retrieved knowledge;
- safe behavior with conflicting or missing evidence;
- role boundary discipline.

### Gate 3 — operational characteristics

Only among quality-acceptable candidates compare:

- latency;
- input/output token usage when provider reports it;
- provider errors / timeouts;
- stability across repeated runs;
- configured monetary cost when an explicitly maintained current rate table exists.

Do not invent cost from memory or stale pricing. Until a rate source is configured, store token usage rather than fake currency estimates.

## Metrics

Minimum experiment record:

```text
experiment_id
case_id
agent_id
prompt_id
prompt_version
knowledge_refs
model_selection
provider
model
started_at
latency_ms
usage
response
rubric_result
reviewer
notes
```

Useful aggregate metrics after enough runs:

- rubric pass rate;
- critical failure count;
- hallucination / unsupported-claim count;
- evidence-discipline pass rate;
- instruction-adherence pass rate;
- p50 / p95 latency;
- tokens per accepted answer;
- provider error rate;
- regression rate vs current model.

## Review modes

### Human review

Preferred for early experiments and material creative/professional cases.

### Rule-based checks

Use deterministic checks for properties such as required JSON shape, required references, forbidden strings, agent id, or citation presence.

### LLM-as-judge

May be used as a **secondary signal**, never the sole promotion authority for material model changes. Judge model/version, rubric and known biases must be recorded.

## Promotion

Model policy moves through:

`CANDIDATE → EVALUATED → REVIEWED → STAGING → ACTIVE`

A new model does not replace the active model merely because one demo answer looked better.

Promotion needs:

- representative eval cases for the target agent/task;
- no unresolved critical regression;
- comparison against the current active candidate;
- explicit reason for the change;
- rollback target.

## A/B rule

When two models are both acceptable, keep both as candidates and collect more evidence instead of forcing a false winner.

## Current local lab

Open:

`http://127.0.0.1:3000/model-lab`

(or the port printed by `npm run dev`).

The page never starts paid experiments automatically. A run happens only after the user selects models and presses the compare button.

## Initial experiment dataset

`knowledge/zoo/model-eval-cases.json`

The first set covers:

- Alina orchestration;
- research/evidence discipline;
- KB conflict handling;
- Prompt Engineering;
- narrative continuity;
- skeptical architecture review;
- insufficient evidence;
- profession modeling before KB/RAG.

## North Star

> Replace models freely, but replace them through reproducible evidence rather than taste, hype or one impressive answer.
