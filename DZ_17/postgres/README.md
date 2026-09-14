# ALINA / FATHER PostgreSQL

## Current architecture decision

The existing `osint_kb` database is the preferred operational foundation for FATHER Knowledge Core.

Do **not** create a second independent document/knowledge truth store when an existing canonical table can be extended safely.

Current canonical domain tables include, among others:

```text
normative.documents
normative.requirements
normative.document_relations
normative.requirement_relations
osint.sources
osint.claims
osint.nodes
osint.edges
```

## Safe deployment order

```text
0. BACKUP EXISTING DB
1. npm run db:inventory
2. review database_snapshots/inventory-osint_kb/*
3. compare current inventory with the accepted baseline
4. map existing tables to FATHER canonical objects
5. review the additive migration to be applied
6. apply only the migration required for the current feature
7. run its read-only acceptance SQL
8. reconcile counts / hashes / referential integrity
9. run db:snapshot
10. connect application read path
11. enable controlled writes only after operator acceptance
```

## Normative Workbench v1

For the legal/normative navigator use:

```text
father_normative_workbench_v1.sql
father_normative_workbench_v1_acceptance.sql
```

This migration reuses `normative.documents` and adds:

```text
normative.document_versions
normative.document_fragments
normative.document_change_events
normative.fragment_changes

workbench.annotations
workbench.tags
workbench.annotation_tags
workbench.fragment_links
workbench.events
```

It is additive only: no existing table is dropped, renamed or truncated.

## knowledge_factory_v0.sql

`knowledge_factory_v0.sql` remains a design/baseline artifact for the original isolated `kf/audit/git_export` concept.

**Do not apply it blindly to `osint_kb`.** It includes a parallel Knowledge Factory model and requires the `vector` extension. Any concepts reused from it (provenance, versioned weights, audit, Git-safe projections) must be reconciled with the current `osint_kb` canonical model before deployment.

## Security hardening

`security_hardening_v0.sql` creates NOLOGIN group roles and grants/revokes. Review it against the actual deployed schemas before applying it. Passwords, LOGIN roles and connection strings are never stored in Git.

## Graph invariant

```text
node/edge = projection of canonical objects
weight = append-only version history
```

The graph is not a second source of truth. A link without evidence/review remains a proposal or hypothesis.

## Backup invariant

Git snapshot is not a full backup. Git contains only reviewed, sanitized projections/manifests. Full database backups and protected originals stay outside the public repository.
