# Codex handoff — ALINA Knowledge Factory + FATHER Model Zoo

Codex must execute DZ-17 as an integrated FATHER work package, not as an isolated UI/homework implementation.

## Start here — mandatory order

1. Read `DZ_17/codex/FATHER_DZ17_INTEGRATION_CONTRACT.md`.
2. Read `DZ_17/codex/CODEX_MASTER_TASK_ALINA_KNOWLEDGE_FACTORY.md`.
3. Read `DZ_17/codex/alina-knowledge-factory.task.json`.
4. Read all mandatory policies referenced by the manifest.
5. Read the external canonical FATHER paper-design references listed in the integration contract from `VictorKVS/KNOWLEDGE_CORE`, branch `feature/father-artifact-factory`.
6. Inventory the repository and real PostgreSQL `osint_kb` before writing migrations.
7. Produce `KEEP / EXTEND / RENAME_VIEW / NEW` mapping before creating persistent structures.
8. Produce paper-design alignment and `DESIGN_GAPS.md` before material implementation.

## Responsibility split

```text
FATHER PAPER DESIGN
S00-S59 / artifacts / algorithms / tests / gates
        ↓
ALINA KNOWLEDGE FACTORY
source → evidence → methods → role/process KB → eval
        ↓
CODEX MODEL ZOO IMPLEMENTATION
registry → routing → RAG/evidence → models → verifier → judge → telemetry
```

Codex must not replace missing paper design with guesses.

## Non-negotiable design rules

- ALINA must be able to build a KB from zero.
- Every canonical specialist has a logical Role KB profile.
- Every S00-S59 station has a logical Process KB profile.
- Knowledge is stored once and mapped many-to-many; no per-role/per-process duplicate KB.
- External/found KB is untrusted by default and must pass quarantine, provenance, logic, weight-origin and Zero-Base validation.
- Every node, edge, method, algorithm and weight must be explainable from evidence + method/source + version.
- LLM output is not independent evidence.
- Candidate/reconstruction objects cannot silently contaminate verified canonical state.
- PostgreSQL `osint_kb` remains the single canonical operational database for FATHER/ALINA/OSINT/Security.
- No production/verified promotion without required review/human gate.
- No material Model Zoo component may cross S50 PRE-CODE EVIDENCE GATE without the required design/test package.
- Missing material design = `DESIGN_GAP`, not an implementation assumption.
- 152-FZ is the first end-to-end benchmark, not a hard-coded answer set.

## First milestone

Before expanding implementation, prove the design-aligned P0 foundation:

- repo/DB inventory;
- architecture reconciliation;
- ALINA role/profile v2;
- Role KB and Process KB logical mapping contract;
- source/capture contract;
- PDF text/scan/mixed detection;
- deterministic extraction + OCR fallback adapter;
- quality metrics;
- external KB quarantine contract;
- trace/audit;
- tests;
- Development Journal + Physical Map update;
- Model Zoo component/data/security/test design package;
- DZ-17 Inference Capacity Planner specification;
- explicit list of unresolved DESIGN_GAP items.

Do not mark P0 or the integrated DZ-17 task implemented until there is an executable acceptance path and the applicable paper-design gates are satisfied.
