# 2026-09-14 — A2 Book Structure Proposal v0.1

## TASK
После успешного реального прогона `Getting to Yes` перейти от page-addressable SourceSpan к первому исполнимому A2 Structure Reconstruction.

## INPUT EVIDENCE
Реальный источник уже прошёл:

```text
PDF → 204 pages → 202 text pages → 204 SourceSpan → A1 ingest → trace ledger
```

Runtime source/capture IDs наблюдаемого прогона:

```text
SRC-73008F2752E21C96
CAP-73008F2752E21C96
```

## IMPLEMENTED

```text
DZ_17/app/scripts/reconstruct-book-structure.mjs
DZ_17/app/scripts/reconstruct-book-structure.ps1
DZ_17/app/app/api/v1/kf/structure/route.ts
DZ_17/app/scripts/knowledge-factory-sidecar.mjs
```

New public contract:

```text
POST /api/v1/kf/structure
GET  /api/v1/kf/structure?capture_id=<CAP-ID>
```

The sidecar persists proposals under:

```text
runtime/knowledge-factory/structure-proposals/<CAP-ID>.json
```

This path is local runtime and remains ignored by Git.

## A2 SAFETY MODEL

A2 output is deliberately stored as:

```text
status = PROPOSED
origin_class = INFERENCE
```

It does **not** overwrite canonical `structure/<CAP-ID>.json` and therefore cannot silently convert heuristic heading detection into verified source structure.

## HEURISTIC PASS v1

The first deterministic pass:

1. reads persisted SourceSpan through the public source trace API;
2. calculates repeated short lines and suppresses likely running headers/footers;
3. detects explicit `PART`, `CHAPTER`, `APPENDIX`, numbered chapter/section patterns and a small front-matter vocabulary;
4. deduplicates repeated heading candidates;
5. builds a coarse hierarchy and page ranges;
6. stores diagnostics and confidence per node;
7. traces all steps with one `KF-A2-*` trace ID.

This pass is intentionally conservative. It does not claim complete semantic section reconstruction.

## UNRESOLVED

```text
semantic section boundaries
false-positive / false-negative heading review
cross-page heading joins
model-assisted second pass
human/senior review
promotion PROPOSED → reviewed/canonical structure
```

## CI
The DZ-17 workflow now performs:

```text
sidecar health
→ app health
→ source API
→ synthetic A1 ingest
→ synthetic A2 structure proposal
→ structure proposal readback
→ trace verification
```

and separately runs `node --check` on the sidecar and A2 reconstructor.

## ORIGIN_CLASS
`PROJECT_DECISION` for architecture and storage contract; generated structure records themselves use `INFERENCE` until reviewed.

## NEXT STEP
Run A2 against `SRC-73008F2752E21C96`, inspect the proposed hierarchy against the source pages, record precision/recall defects, then add the second semantic/model-assisted reconstruction pass before A3 Claim/Concept extraction.
