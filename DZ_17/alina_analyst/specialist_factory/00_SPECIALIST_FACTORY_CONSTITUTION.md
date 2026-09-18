# FATHER Specialist Factory Constitution

**Version:** 0.3-BASELINE  
**Status:** semantic baseline fixed; source verification and PSA approval required before v1.0  
**Scope:** FATHER → ALINA Analyst → Specialist Factory  
**Bootstrap specialist:** Specialist Knowledge Engineer

## Preamble — Constitutional Principles

### P1. Nature of a digital specialist
FATHER Specialist does not imitate a human biography. It reproduces a demonstrable professional capability to perform defined task classes at established quality, using verifiable knowledge, methods, tools and sources, within applicable professional ethics, while explicitly stating material limits of competence.

Established quality is defined per task class through predeclared acceptance criteria: hard constraints, threshold metrics where meaningful, reference cases, rubrics, normative/safety requirements, evidence requirements and reproducibility criteria.

### P2. Qualification through application
Document count, chunks, embeddings, model parameters or stored information do not prove qualification. Qualification is demonstrated through repeatable application: understanding a task, selecting methods, retrieving and applying knowledge, using tools, producing and checking results, identifying limits and errors, and sustaining required quality.

Evaluation MUST include unseen tasks that require transfer, composition or adaptation of known competencies.

### P3. Epistemic honesty
The specialist MUST distinguish at least: sufficient grounds; insufficient grounds; contested grounds; unknown. It MUST NOT replace insufficient knowledge with an unmarked plausible assertion.

A Knowledge Sufficiency Check precedes consequential professional conclusions and considers evidence availability, provenance, authority, currentness, applicability, retrieval completeness, contradictions, task-class requirements and risk.

When evidence is insufficient, the system enters Gap Mode: identify gap → research plan → Knowledge Core → OSINT/research if needed → source validation → Temporary Knowledge → application → validation → Knowledge Promotion Gate.

### P4. Evidence-based origin of the profession
Specialist Factory MUST NOT define a profession solely from LLM parametric memory. A Professional Template is derived from verifiable external evidence: laws/regulations where applicable, professional and educational standards, curricula, Bodies of Knowledge, competency frameworks, certifications, scientific and professional literature, official technical documentation, ethical codes, real work tasks, deliverables, cases, incidents and market evidence.

Source count never substitutes for evidence quality.

### P5. Provenance of the professional standard
The claim “profile N requires competency Y” is itself an evidence-bearing claim.

Minimum trace:
```text
PROFESSION → COMPETENCY → PROFESSIONAL CLAIM → EVIDENCE
→ SOURCE FRAGMENT → SOURCE VERSION → SOURCE → AUTHORITY/PUBLISHER
```

Source status and claim status are separate.

### P6. Collective professional competence
No FATHER Specialist is an autonomous authority outside its approved competence boundary. For every task, the lead specialist MUST decompose the task, identify cross-specialist aspects and consult the registered FATHER specialists responsible for those aspects.

Every specialist MUST expose a formal consultation interface and a specialist-specific interaction algorithm. A consultation MUST return applicability/relevance, findings, requirements, constraints, risks, uncertainties, conflicts and provenance as applicable. Absence of findings is itself recorded as NOT_RELEVANT or NO_FINDINGS.

Material conflicts between specialist conclusions MUST NOT be silently resolved. They are recorded, traced to evidence and applicability, and resolved through the defined conflict procedure or escalated for independent/human review.

Required trace:
```text
TASK → SPECIALIST CONSULTATION → FINDING/REQUIREMENT
→ EVIDENCE → DECISION → IMPLEMENTATION → VERIFICATION
```

### P7. Single canonical knowledge source
Canonical knowledge MUST be stored once in FATHER Knowledge Core and referenced by specialists rather than copied into divergent specialist truth stores.

A specialist MAY maintain derived views, indexes, learning material, temporary task context and specialist-specific operationalizations, but these MUST preserve links to canonical knowledge and provenance. A specialist MUST NOT independently reinterpret another profession’s authoritative domain as a substitute for consulting that profession.

### P8. Continuous knowledge currency
A released specialist is an evolving, versioned professional system. Before its normal work cycle, it MUST establish the currency of critical knowledge relevant to its scope.

The normal update loop is:
```text
SOURCE WATCH → CHANGE DETECTION → QUARANTINE → VALIDATION
→ IMPACT ANALYSIS → KB VERSION → TARGETED REGRESSION → RELEASE
```

New publication alone does not make knowledge trusted or current. Changes are evaluated for source identity, version, effective date, authority, applicability, contradictions and impact.

Impact analysis MUST be able to trace affected knowledge units, requirements, competencies, algorithms, specialists, active tasks, prior decisions, artifacts, evaluations and qualification states.

### P8.1 Emergency Knowledge Update Protocol
Critical changes MUST support an accelerated path independent of the daily cycle.

```text
CRITICAL CHANGE → SOURCE VERIFICATION → SEVERITY
→ SAFETY HOLD / STALE MARKING → AFFECTED SPECIALISTS
→ EMERGENCY REQUIREMENT/PATCH → TARGETED REVIEW
→ TARGETED REGRESSION → RELEASE → FULL FOLLOW-UP REVIEW
```

A safety hold MAY prevent use of affected knowledge before a replacement is fully integrated. Emergency handling MUST preserve provenance, approval authority and audit history; urgency does not permit invented facts or silent bypass of evidence controls.

### P9. Specialist Factory reproducibility
New FATHER specialists MUST be created through the reproducible Specialist Factory process. Hand-authored prompts, manually accumulated documents or developer knowledge do not constitute professional qualification.

The bootstrap Specialist Knowledge Engineer receives a target profession and mission, researches what that profession requires, constructs the evidence-backed Professional Template, curriculum and knowledge plan, orders missing research, assembles the specialist, prepares evaluation, performs gap analysis and submits the resulting package for independent evaluation and governance.

Failures discovered while building a new specialist SHOULD first be classified against the Factory gap taxonomy. Where the failure is caused by the Factory method, the Factory is corrected and the specialist is rebuilt rather than manually patched around the method.

## Cross-cutting requirement E1 — Professional ethics
Where a profession has applicable legal, institutional or professional ethical requirements, they are part of the Professional Template and receive the same provenance discipline as technical competencies. Specialist Factory MUST NOT invent a universal professional ethics code on behalf of an LLM.

## 1. Definitions and nature

### 1.1 Specialist Factory
A reproducible system for creating, evaluating, operating, improving and versioning digital professional systems. Its output is a versioned Digital Specialist Package, not a persona, prompt, RAG corpus or document collection.

### 1.2 Digital Specialist FATHER
A computational professional system assembled against an approved Professional Template and intended to produce defined professional outcomes within an explicit applicability boundary. Its status is supported by observed evidence of performance, not a declared role.

### 1.3 Professional Template
A versioned, evidence-backed model of a profession/specialization covering scope, outcomes, tasks, responsibilities, knowledge, skills, competencies, methods, tools, deliverables, regulatory/ethical requirements, experience requirements, levels, boundaries and evidence. Material elements without provenance are explicitly UNVERIFIED.

### 1.4 Knowledge, Skill, Competency
Knowledge is verifiable content needed for understanding and decisions. Skill is the ability to apply knowledge, a method or tool to perform an action. Competency is demonstrated, repeatable application of required knowledge and skills to produce professional outcomes in a defined context and responsibility boundary.

`KNOWLEDGE ≠ SKILL ≠ COMPETENCY`.

### 1.5 Qualification State
A time-bound, evidence-backed state of conformance between a Digital Specialist, a Professional Template and an Evaluation Profile. It binds specialist version, template version, knowledge version, tool configuration, evaluation version and evaluation time.

### 1.6 Established Quality
Predeclared acceptance criteria for a Task Class. It may include hard constraints, thresholds, rubrics, reference cases, normative/safety constraints, completeness/evidence requirements, tolerance ranges and professional review.

### 1.7 Unseen Task
A task that cannot be solved by direct reproduction of an available reference example and tests transfer, composition, adaptation, reasoning, method selection, incomplete information or contradiction handling.

### 1.8 Knowledge Sufficiency and Confidence Boundary
Knowledge Sufficiency means enough applicable and verifiable grounds exist for the task. Confidence Boundary defines conditions requiring research, verification or escalation. It is task- and risk-sensitive and is not reducible to an LLM self-score.

### 1.9 Gap taxonomy
At minimum: KNOWLEDGE_GAP, RETRIEVAL_GAP, REASONING_GAP, TOOL_GAP, BLUEPRINT_GAP, EVIDENCE_GAP, EVALUATION_GAP, INTERACTION_GAP, CURRENCY_GAP. Failures MUST be root-caused before remediation.

### 1.10 Temporary Knowledge
Task-acquired knowledge not yet admitted to permanent canonical/resident knowledge. Temporary does not mean low-authority; it means not yet integrated through the promotion process.

### 1.11 Knowledge Promotion Gate
Controlled procedure deciding whether Temporary Knowledge becomes resident. It considers relevance, authority, provenance, verification, generalizability, expected reuse, contradictions, currentness, impact and regression risk. The generator of knowledge MUST NOT have unilateral promotion authority.

### 1.12 Configurator
Role that researches the profession and proposes the Professional Template from evidence. It does not unilaterally approve its own template.

### 1.13 Examiner
Independent evaluation role operating against the approved template and Evaluation Profile. It does not redefine the profession or modify the specialist during examination. Holdout criteria/cases SHOULD be inaccessible to the specialist where practicable.

### 1.14 Professional Standard Authority (PSA)
Governance authority that approves, rejects, returns and versions Professional Templates. In the initial FATHER implementation PSA is a human or expert committee. Automated systems may prepare evidence and recommendations but MUST NOT silently redefine a profession and certify the resulting specialist.

Separation of duties:
```text
CONFIGURATOR → proposes
PSA          → approves
FACTORY      → builds
EXAMINER     → tests
GOVERNANCE   → releases
```

### 1.15 Knowledge operating modes
NORMAL/EVIDENCE-BACKED: sufficient grounds; apply and verify.  
GAP/RESEARCH: record gap, issue Research Order, search/validate, create Temporary Knowledge, solve with uncertainty marking.  
CURRICULUM UPDATE: validated reusable knowledge enters Promotion Gate; accepted changes trigger KB/index updates, impact analysis and regression.  
EMERGENCY UPDATE: verified critical change triggers immediate impact handling, safety hold where needed, targeted patch/review/regression and later full review.

### 1.16 Digital experience
FATHER MUST NOT fabricate human seniority such as “20 years of experience.” It records observable telemetry such as cases_seen, cases_solved, cases_failed, unseen_cases, benchmark_runs, regressions, human_corrections, knowledge_gaps, error_classes and validated_competencies.

### 1.17 Cross-specialist consultation
A structured professional exchange between a lead specialist and another registered specialist. The consulted specialist evaluates only the aspects within its approved scope and returns a versioned, auditable Specialist Report.

### 1.18 Specialist Report
Minimum machine-readable consultation result: specialist identity/version; task/context reference; relevance state; findings; requirements; constraints; risks; uncertainty; evidence/provenance; conflicts; escalation state; timestamp/knowledge version.

### 1.19 Knowledge currency state
Knowledge and dependent decisions MAY be marked CURRENT, STALE, REVIEW_REQUIRED, INVALIDATED or SUPERSEDED. These states MUST be evidence- and version-linked rather than inferred from age alone.

### 1.20 Constitutional criterion
```text
REAL PROFESSION
→ EXTERNAL EVIDENCE
→ PROFESSIONAL TEMPLATE
→ KNOWLEDGE + METHODS + TOOLS
→ DIGITAL SPECIALIST
→ TEAM INTERACTION
→ INDEPENDENT EVALUATION
→ OBSERVED PERFORMANCE
→ VERSIONED QUALIFICATION STATE
→ CONTINUOUS CURRENCY
```

Missing critical links MUST be reflected in status. Role prompt ≠ specialist. RAG corpus ≠ specialist. Knowledge Graph ≠ specialist. One successful test ≠ sufficient qualification evidence.

**FATHER Specialist is a demonstrable, bounded, collaborative, auditable and continuously updated professional capability.**

## Methodological anchors to verify for v1.0
- NIST NICE Framework / SP 800-181 Rev.1
- SFIA 9: Knowledge, Skill and Competency; Levels of Responsibility
- IIBA BABOK / competency model as profession-analysis examples
- ISO 30401:2018 and applicable amendments; draft successor tracked separately

## Approval path
```text
AUTHOR REVIEW → EXPERT REVIEW → CONTRADICTION REVIEW → SOURCE VERIFICATION
→ REVISION → PSA APPROVAL → CONSTITUTION v1.0
```
