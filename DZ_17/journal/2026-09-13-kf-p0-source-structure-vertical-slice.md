# 2026-09-13 — Knowledge Factory P0 vertical slice: Source → Capture → SourceSpan

## TASK
Перейти от проектной модели ALINA Knowledge Factory к первому исполняемому вертикальному срезу на реальном PDF.

## WHAT IMPLEMENTED

```text
PDF
↓ local extractor
Source + Capture + SHA-256
↓
Document Structure root
↓
page-addressable SourceSpan records
↓
/api/v1/kf/ingest
↓
local P0 repository
↓
/api/v1/kf/trace
```

## FILES

```text
DZ_17/app/lib/knowledge-factory/types.ts
DZ_17/app/lib/knowledge-factory/repository.ts
DZ_17/app/app/api/v1/kf/ingest/route.ts
DZ_17/app/app/api/v1/kf/sources/route.ts
DZ_17/app/app/api/v1/kf/trace/route.ts
DZ_17/app/scripts/ingest-pdf-kf.mjs
DZ_17/app/scripts/ingest-pdf-from-downloads.ps1
DZ_17/app/.gitignore
DZ_17/app/package.json
DZ_17/app/app/api/health/route.ts
```

## STORAGE
P0 runtime store is local-only:

```text
DZ_17/app/runtime/knowledge-factory/
├── sources/
├── captures/
├── structure/
├── spans/
├── indexes/
└── events.jsonl
```

Temporary extraction artifacts:

```text
DZ_17/app/runtime/knowledge-factory-import/
```

Both paths are ignored by Git.

## IMPORTANT DESIGN LIMIT
At this stage the importer does **not pretend to know chapters/sections**. It creates:

```text
StructureNode(document)
+ SourceSpan(page=1..N)
```

and marks the document:

```text
structure_status = RAW_PAGE_MAP_ONLY
next_stage = A2_STRUCTURE_RECONSTRUCTION
```

Chapter/section/article/paragraph reconstruction belongs to A2 and will be implemented separately. This prevents heuristic page boundaries from becoming false canonical semantic structure.

## DEDUP
Capture hash is SHA-256. Re-ingesting the same file returns the existing capture instead of writing a second physical/source-span copy in the P0 store.

## SECURITY
Client input cannot self-approve a Capture. The repository forces every newly ingested capture to:

```text
security_status = SECURITY_UNREVIEWED
```

Security approval will require the separate Security Gate; it cannot be asserted by an ingest request.

## ORIGIN CLASS
`PROJECT_DECISION`.

## REVIEW STATUS
`implemented / CI + local runtime validation pending`.

## NEXT
1. Run `Getting to Yes` through the P0 ingest.
2. Inspect Source/Capture/SourceSpan trace.
3. Implement A2 Structure Reconstructor (chapter/section/subsection/paragraph proposals with provenance).
4. Only after A2 validation proceed to A3 Claim/Concept extraction.
