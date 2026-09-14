# ALINA / FATHER Database Baseline — acceptance record

Дата: 2026-09-14

Origin class:

```text
HUMAN_DECISION + PROJECT_DECISION
```

## Findings before change

Repository inspection found:

1. `design/DESIGN_BASELINE.md` already selected `PostgreSQL + pgvector` as P0 storage and referenced `postgres/knowledge_factory_v0.sql`.
2. That referenced SQL file did not exist in `main` before this work.
3. `.env.example` already had server-side `DATABASE_URL`, `POSTGRES_URL`, `AUDIT_DATABASE_URL` placeholders.
4. Control Center only detected whether those variables were configured; it did not persist the Knowledge Factory into PostgreSQL.
5. Runtime Knowledge Factory was still file-backed under ignored `runtime/knowledge-factory/`.

Therefore the repository had the intended DB technology but not yet the concrete safe schema/cutover/backup contract.

## Implemented baseline

```text
EXISTING POSTGRESQL
├── existing schemas        untouched until inventory/mapping
├── kf                      ALINA canonical operational data
├── audit                   append-only event/snapshot records
└── git_export              PUBLIC + explicitly Git-allowed views only
```

### Canonical DB objects

```text
Source / Capture / StructureNode / SourceSpan
KnowledgeObject / ObjectSourceLink / KnowledgeRelation
GraphNode / GraphEdge
NodeWeightVersion / EdgeWeightVersion
Embedding
ReviewDecision
AuditEvent / SnapshotManifest
```

Weights are append-only/versioned. An old weight is never overwritten in place.

## Security baseline

- default classification: `internal`;
- default `git_export_allowed=false`;
- Git views require `classification=public AND git_export_allowed=true`;
- raw source text/local paths/embeddings are excluded from Git projection;
- public schema CREATE revoked;
- application/analyst/security/backup group roles separated;
- backup role reads only sanitized `git_export` + snapshot metadata;
- append-only trigger protects audit events and weight version histories;
- passwords/LOGIN roles are deliberately absent from Git;
- `.env.local`, dumps and local backup paths remain excluded from Git.

## Git duplication policy

Git is used as a **versioned reviewed projection**, not as the only disaster-recovery backup.

Every completed DB batch may produce:

```text
DZ_17/database_snapshots/current/schema.sql
DZ_17/database_snapshots/current/*.jsonl
DZ_17/database_snapshots/current/manifest.json
DZ_17/database_snapshots/SNAPSHOT_HISTORY.jsonl
```

Manifest contains reason, actor, counts and SHA-256.

Full custom-format dump is stored local-only:

```text
DZ_17/app/runtime/database-backups/
```

The dump itself is not committed to the public repository.

## Existing database inspection

The live user database cannot be inspected from Git because its connection string and schema dump are correctly absent from the repository.

A safe inventory path is now implemented:

```powershell
cd "G:\1\Vibe coding\Vibe-coding\DZ_17\app"
npm run db:inventory
```

It exports schema-only metadata and no table rows, credentials, host or login into:

```text
DZ_17/database_snapshots/inventory/
```

Only after that inventory should we map existing tables to `kf.*` and perform a migration/cutover.

## Physical files

```text
DZ_17/postgres/knowledge_factory_v0.sql
DZ_17/postgres/security_hardening_v0.sql
DZ_17/postgres/README.md
DZ_17/DATABASE_STORAGE_AND_GIT_SNAPSHOT_POLICY.md
DZ_17/database_snapshots/README.md
DZ_17/app/scripts/inventory-postgres.ps1
DZ_17/app/scripts/snapshot-postgres-to-git.ps1
DZ_17/app/.gitignore
DZ_17/app/package.json
.github/workflows/dz17-database-governance-check.yml
```

## Verification

Dedicated CI:

```text
workflow: DZ-17 Database Governance Check
run_id:   34812492039
commit:   599ac673fa95bc797ef7001e745d10b61931e5fb
result:   SUCCESS
```

CI validates:

```text
PowerShell syntax
required kf/audit/git_export schema markers
graph node/edge tables
append-only node/edge weight version tables
audit event/snapshot tables
Git export weight views
PostgreSQL security role markers
PUBLIC revoke marker
npm db:inventory / db:snapshot commands
full DB dump ignore rules
```

This CI proves the repository contract is internally consistent; it does **not** prove compatibility with the user's existing live database. That acceptance begins after `db:inventory` produces the actual existing schema inventory.

## Next gate

```text
LIVE DB INVENTORY
→ mapping existing tables
→ collision/conflict report
→ full protected backup
→ migration dry-run
→ apply isolated schemas
→ import/reconcile current Git registries
→ count/hash reconciliation
→ first Git-safe DB snapshot
→ cutover acceptance
```
