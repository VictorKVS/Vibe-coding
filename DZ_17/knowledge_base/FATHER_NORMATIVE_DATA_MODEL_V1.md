# FATHER Normative Data Model v1

Status: `PROTOTYPE -> DB INTEGRATION`

## Purpose

Connect the current `/legal-workbench` UX to the existing `osint_kb` PostgreSQL database without creating a second source of truth.

Canonical document registry remains:

```text
normative.documents
```

The new layer adds:

```text
document
  -> document_versions
     -> document_fragments
        -> fragment_changes
        -> annotations
        -> tags
        -> fragment_links
```

## Core invariants

1. Existing `normative.documents` is reused, not duplicated.
2. Old legal text is never overwritten.
3. Every displayed full-text version can be traced to source URL/hash/capture reference.
4. `verified_at` and `verification_status` are separate from legal validity.
5. User notes never modify canonical legal text.
6. A link is typed and reviewable; it is not silently promoted to legal truth.
7. Historical queries use effective time (`effective_from/effective_to`) rather than today's state.
8. Workbench actions are auditable.

## Time model

`document_versions` stores two kinds of time:

```text
LEGAL / VALID TIME
published_at
adopted_at
effective_from
effective_to
repealed_at

SYSTEM / KNOWLEDGE TIME
recorded_at
retired_at
verified_at
```

This lets FATHER answer both:

- `What law was effective on 2025-01-01?`
- `What did our knowledge base know/verify at that time?`

## Central reader

The center pane reads one `document_version` and renders ordered `document_fragments`.

Typical fragment hierarchy:

```text
document
-> chapter
-> article
-> part
-> clause
-> paragraph
-> item
```

Every fragment has a stable key inside its version and can be referenced directly by notes, links and changes.

## Changes and footnotes

A document-level event lives in:

```text
normative.document_change_events
```

Exact text changes live in:

```text
normative.fragment_changes
```

This gives the UI:

```text
old_fragment -> CHANGED -> new_fragment
old_fragment -> REPEALED
NULL         -> ADDED -> new_fragment
```

The workbench can therefore render inline legal footnotes:

```text
what changed
what was before
what is now
which act changed it
when it becomes effective
what organizational objects are affected
```

## Notes and tags

User annotations live in `workbench.annotations`.

Visibility levels:

```text
PRIVATE
TEAM
ORGANIZATION
KB_CANDIDATE
```

A note promoted toward the knowledge base is still only a candidate until the normal review pipeline approves it.

Default tags:

```text
IMPORTANT -> Важно
REVIEW    -> Проверить
ACTION    -> Выполнить
QUESTION  -> Вопрос
```

## Document links

`workbench.fragment_links` starts with the safe and most useful relation set:

```text
RELATED_TO
CLARIFIES
IMPLEMENTS
BASED_ON
CONTRADICTS
EVIDENCES
APPLIES_TO
REQUIRES
SUPERSEDES
```

The user should not manually draw the graph.

UX flow:

```text
select exact paragraph
-> choose "Заметки"
-> choose target document or target fragment
-> choose relation type
-> add reason
-> create PROPOSED link
-> optional review
-> APPROVED link becomes graph projection
```

## Integration with requirements

After the source/version/fragment layer is populated, the next pass binds existing `normative.requirements` to exact fragments. We should add this only after checking real requirement rows and mappings in `osint_kb`.

Target path:

```text
DOCUMENT
-> VERSION
-> FRAGMENT
-> REQUIREMENT
-> CONTROL
-> SYSTEM
-> RESPONSIBLE ROLE
-> EVIDENCE
```

## Legal responsibility rule

FATHER must not invent responsibility.

A responsibility statement must point to an explicit basis such as:

```text
law / regulation
internal order
job description
contract
approved organizational policy
```

Knowledge Core stores the role. A real person's identity should come from a protected organizational directory when needed.

## Initial real corpus

Recommended first reference set:

```text
152-FZ
187-FZ
PP RF 1119
PP RF 127
FSTEC 17
FSTEC 21
FSTEC 235
FSTEC 239
FSB 378
```

For each document the first acceptance target is:

```text
canonical document row
+ at least one verified version
+ full text
+ parsed hierarchy
+ fragment hashes
+ source/provenance
+ effective dates
+ revision chain when available
```

## Files

Migration:

```text
DZ_17/postgres/father_normative_workbench_v1.sql
```

Read-only acceptance:

```text
DZ_17/postgres/father_normative_workbench_v1_acceptance.sql
```

## Deployment order

```text
1. BACKUP osint_kb
2. npm run db:inventory
3. compare inventory with previous snapshot
4. review migration SQL
5. run migration against a test copy / local osint_kb
6. run acceptance SQL
7. confirm existing document/requirement counts did not fall
8. snapshot schema
9. only then load first real document version
10. connect /legal-workbench read API
```
