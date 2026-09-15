# START HERE — CODEX / DZ-17 / ALINA + FATHER

Repository: `VictorKVS/Vibe-coding`
Branch: `feature/father-knowledge-operator-console`

## Mission

Execute DZ-17 as the integrated FATHER work package.

Three linked streams:

```text
FATHER PAPER DESIGN
→ ALINA KNOWLEDGE FACTORY
→ CODEX MODEL ZOO IMPLEMENTATION
```

Do not replace missing paper design with assumptions. Material gaps are `DESIGN_GAP` and must be returned to FATHER design.

## Mandatory reading order

1. `DZ_17/codex/FATHER_DZ17_INTEGRATION_CONTRACT.md`
2. `DZ_17/codex/CODEX_HANDOFF.md`
3. `DZ_17/codex/CODEX_EXECUTION_ORDER.md`
4. `DZ_17/codex/CODEX_DO_NOT_SKIP.md`
5. `DZ_17/codex/alina-knowledge-factory.task.json`
6. `DZ_17/codex/CODEX_MASTER_TASK_ALINA_KNOWLEDGE_FACTORY.md`
7. all mandatory policies referenced by the manifest
8. external canonical FATHER design in `VictorKVS/KNOWLEDGE_CORE`, branch `feature/father-artifact-factory`, exactly as listed in the integration contract

## First action

Before changing material code:

1. inspect current branch/repository state;
2. inventory the existing DZ_17 implementation and actual `osint_kb` integration points;
3. map current artifacts/code to FATHER S00-S59;
4. produce `DZ_17/codex/DESIGN_GAPS.md`;
5. produce/update a trace matrix `Sxx → requirement → role → artifact → module → test → authority`;
6. identify which work is still paper design and which is authorized implementation;
7. report the proposed execution plan before making material architectural changes.

## Non-negotiable invariants

- one canonical operational database: `osint_kb`;
- no `father_db`, `alina_db`, duplicate Knowledge Factory DB or per-role DB;
- existing DB structures are reconciled using `KEEP / EXTEND / RENAME_VIEW / NEW` before DDL;
- ALINA builds knowledge from sources with provenance, Zero-Base controls, role/process KB mappings and review;
- every canonical role has a Role KB profile;
- every S00-S59 station has a Process KB profile;
- Model Zoo follows capability/risk/data-class routing, not global model ranking;
- raw LLM output never writes canonical truth directly;
- evidence bundle, verifier, judge and human authority gates are required where paper design says so;
- material product implementation cannot outrun S50 PRE-CODE EVIDENCE GATE;
- estimated performance is not measured performance;
- ALINA site and FATHER Design site share canonical IDs and `osint_kb` state.

## Expected first response from Codex

Return a concise report with:

```text
CURRENT STATE
FILES/COMPONENTS FOUND
S00-S59 MAPPING
DB RECONCILIATION STATUS
DESIGN GAPS
AUTHORIZED IMPLEMENTATION STREAMS
BLOCKED STREAMS
TEST/SECURITY GAPS
NEXT 10 ACTIONS
```

Do not merge branches or delete legacy structures unless explicitly instructed by the owner.
