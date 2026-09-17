# Alina Zoo Maturity Roadmap

The Zoo is promoted by evidence, not by adding more agents or models.

`ZM0 → ZM1 → ZM2 → ZM3 → ZM4 → ZM5`

## ZM0 — Smoke / Reproducible Harness

Prove the mechanics first: Quest Arena starts, a single model completes a quest, trace is present, the JSON run is durable, and CI is green.

No claim of professional quality is allowed at this level.

## ZM1 — Single-Model Professional Baseline

Compare at least two real models on the same professional quest. Repeat runs because one good answer is not evidence of stability.

Output: baseline per model/role/task family.

## ZM2 — Critic Pair

Add `Draft → Critic → Revision` and compare it against ZM1 single-model baselines.

Question: does the critic create a reviewed quality gain large enough to justify extra latency/usage?

## ZM3 — Diversity + Synthesis

Two models solve independently; a synthesis model compares them and must preserve material disagreement.

Question: does diversity reveal useful alternatives or merely create more text?

## ZM4 — Role-Specialized Pipeline

Research, Specialist, Reviewer and Synthesis may use different models. Zoo RAG, prompt versions, knowledge refs and authority boundaries are part of the evaluation.

Question: can a heterogeneous team outperform simpler compositions on a bounded professional task family?

## ZM5 — Bounded Production Candidate

No universal winner. A bounded composition is eligible only after repeated representative quests, adversarial cases, independent strict review, regression checks, latency/usage evidence and rollback planning.

## Promotion discipline

A higher level does not erase lower-level evidence. If a ZM4 pipeline fails a basic ZM1 professional quest, the system is not mature merely because it has more agents.

Automatic score never promotes a level. Strict review and evidence gates do.

Machine-readable gates: `knowledge/zoo/maturity-levels.json`.
