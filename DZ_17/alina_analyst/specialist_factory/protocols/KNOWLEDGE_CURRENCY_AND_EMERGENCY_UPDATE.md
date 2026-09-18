# Specialist Knowledge Currency & Emergency Update Protocol

**ID:** SF-PROTOCOL-KNOWLEDGE-CURRENCY-001  
**Constitution:** P8, P8.1  
**Status:** baseline

## Daily/start-of-work cycle
```text
START
→ load specialist + canonical KB versions
→ check watched sources since last successful check
→ detect changed/new/withdrawn sources
→ quarantine candidates
→ validate identity/version/currentness/authority/applicability
→ impact graph
→ update candidate knowledge
→ review/promotion gate
→ targeted regression
→ release new KB/specialist state
→ READY
```

A no-change check is recorded. The system SHOULD use source metadata, hashes and change markers where available rather than repeatedly reprocessing unchanged corpora.

## Impact targets
At minimum evaluate: knowledge units, requirements, methods, algorithms, competencies, learning graph, specialist interfaces, active tasks, prior decisions, generated artifacts, exams/benchmarks and qualification states.

## Emergency path
A verified critical change may arrive between normal cycles:
```text
EVENT → verify primary/authoritative source
→ classify severity/applicability
→ identify affected graph
→ mark old knowledge STALE/REVIEW_REQUIRED/INVALIDATED where justified
→ safety hold if continued use is unsafe/non-compliant
→ notify affected specialists/tasks
→ emergency operationalization
→ independent/authorized review
→ targeted regression
→ emergency release
→ scheduled full follow-up review
```

Emergency speed never converts an unverified claim into canonical truth.

## Required event record
```yaml
knowledge_change_event:
  id: ""
  detected_at: ""
  source_identity: ""
  old_version: ""
  new_version: ""
  verification_status: ""
  severity: INFO | NORMAL | HIGH | CRITICAL
  applicability: []
  affected_specialists: []
  affected_knowledge_units: []
  affected_algorithms: []
  affected_tasks: []
  affected_decisions: []
  safety_hold: false
  actions: []
  regression: PENDING | PASS | FAIL
  release_status: QUARANTINED | REVIEW | RELEASED | REJECTED
```
