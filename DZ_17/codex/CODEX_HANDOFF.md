# Codex handoff — ALINA Knowledge Factory

Codex should execute the ALINA Knowledge Factory master task from the feature branch.

## Start here

1. Read `DZ_17/codex/CODEX_MASTER_TASK_ALINA_KNOWLEDGE_FACTORY.md`.
2. Read `DZ_17/codex/alina-knowledge-factory.task.json`.
3. Read all mandatory policies referenced by the manifest.
4. Inventory the repository and `osint_kb` before writing migrations.
5. Produce `REUSE / EXTEND / NEW` mapping before creating any persistent entity.

## Non-negotiable design rules

- ALINA must be able to build a KB from zero.
- External/found KB is untrusted by default and must pass quarantine, provenance, logic, weight-origin and Zero-Base validation.
- Every node, edge and weight must be explainable from evidence + method + version.
- LLM output is not independent evidence.
- Candidate/reconstruction objects cannot silently contaminate verified canonical state.
- PostgreSQL `osint_kb` remains canonical operational state.
- No production/verified promotion without required review/human gate.
- 152-FZ is the first end-to-end benchmark, not a hard-coded answer set.

## First implementation milestone

Implement P0 only before proceeding:

- repo/DB inventory;
- architecture reconciliation;
- ALINA role/profile v2;
- source/capture contract;
- PDF text/scan/mixed detection;
- deterministic text extraction + OCR fallback adapter;
- quality metrics;
- external KB quarantine contract;
- trace/audit;
- tests;
- Development Journal + Physical Map update.

Do not mark P0 implemented until there is an executable acceptance path.
