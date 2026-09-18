# Cross-Specialist Consultation Protocol

**ID:** SF-PROTOCOL-CROSS-SPECIALIST-001  
**Constitution:** P6, P7, P8, P8.1  
**Status:** baseline

## Purpose
Make every FATHER specialist collaborate through explicit professional boundaries while preserving one canonical knowledge source and full provenance.

## Runtime
```text
TASK
→ lead specialist decomposition
→ broadcast relevance check to registered specialists
→ NOT_RELEVANT/NO_FINDINGS fast return OR deep consultation
→ Specialist Reports
→ conflict detection
→ evidence/applicability resolution or escalation
→ Requirement/Constraint Pack
→ lead specialist synthesis
→ verification
→ Decision Ledger
```

“Ask everyone” means every registered team specialist receives a relevance check. It does not mean every specialist performs a full expensive analysis.

## Required consultation response
```yaml
consultation:
  consultation_id: ""
  task_id: ""
  specialist_id: ""
  specialist_version: ""
  knowledge_version: ""
  relevance: RELEVANT | NOT_RELEVANT | UNKNOWN
  findings: []
  requirements: []
  constraints: []
  risks: []
  uncertainties: []
  evidence: []
  conflicts: []
  questions_for_other_specialists: []
  conclusion_status: SUPPORTED | PARTIAL | UNKNOWN | NO_FINDINGS
  escalation_required: false
```

## Conflict rule
Material disagreement MUST create a conflict record. The lead specialist cannot silently select a preferred answer. Resolution must compare scope, source authority/currentness, applicability, evidence and professional responsibility; unresolved material conflict is escalated.

## Per-specialist algorithms
Every released specialist package MUST contain an interaction matrix and a specific algorithm for each registered FATHER specialist role. The algorithm defines what to ask, what context to disclose, what output contract to expect, when to deepen consultation and how to consume the result.

## Audit
Persist consultation request, response, specialist/KB versions, evidence references, conflicts, resolution/escalation and the final decision reference.
