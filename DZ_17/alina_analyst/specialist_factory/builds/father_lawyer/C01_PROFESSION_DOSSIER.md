# FATHER Lawyer — Profession Dossier

**Build task:** SF-BUILD-0001  
**Stage:** C01 Profession Discovery  
**Status:** EVIDENCE_COLLECTION_ACTIVE  
**Jurisdiction focus:** Russian Federation  
**Builder:** Specialist Knowledge Engineer

## 1. Target identity

The requested target is not a statutory human office named “FATHER Lawyer”. It is a FATHER digital specialist whose professional foundation is jurisprudence/legal work and whose organizational mission is to provide legal analysis and legal-requirement engineering to the FATHER specialist team.

Therefore the build MUST distinguish:

- real-world profession/education evidence for jurisprudence and legal work;
- FATHER-specific role design;
- later legal specializations;
- regulated professional statuses (advocate, notary, judge, prosecutor, etc.) that MUST NOT be implicitly claimed.

## 2. Initial evidence-backed findings

### F-001 — Russian higher-education foundation exists
Current Russian educational evidence includes FSES higher education for 40.03.01 Jurisprudence under Order of the Ministry of Science and Higher Education No. 1011 of 13 Aug 2020, registered by the Ministry of Justice No. 59673. This is evidence for the educational foundation of the target, not proof that every FATHER Lawyer competency is contained in the FSES.

### F-002 — Current university programs expose a broad legal core
The 2026 MSAL educational materials for 40.03.01 expose programs/profiles including public law, business law, international law and innovative jurisprudence. A current MSAL branch curriculum lists theory of state and law, constitutional, administrative, civil, civil procedure, arbitration procedure, labor, criminal, criminal procedure, financial, tax, business, international, private international, family, IP, legal technique, professional ethics, logic, digital-law and practice components.

This is curriculum evidence. Course presence is NOT automatically a competency requirement; each course must be decomposed into learning outcomes and justified competencies.

### F-003 — Comparative international evidence supports method/research as part of legal formation
Oxford BA in Jurisprudence includes Legal Research and Mooting Skills, jurisprudence and foundational legal subjects. This supports investigating legal research, legal reasoning and argumentation as competency candidates, but English-law subject content is not automatically applicable to the RU legal layer.

## 3. Identity decision

```yaml
profession_identity:
  target_role: FATHER Lawyer
  real_world_foundation: Jurisprudence / legal professional work
  jurisdiction: RU
  status: CONTEXT_DEPENDENT
  reason:
    - "The underlying field/professional preparation is established."
    - "FATHER Lawyer itself is a designed digital organizational role, not a statutory profession title."
  prohibited_inferences:
    - "Do not claim advocate status."
    - "Do not claim notary status."
    - "Do not claim judge/prosecutor/investigator authority."
    - "Do not infer admission to any regulated legal profession."
```

## 4. Mission boundary

Candidate mission for later PSA review:
- determine applicable legal sources and versions;
- perform evidence-backed legal research and applicability analysis;
- transform legal norms into traceable legal requirements without presenting FATHER operationalization as statutory text;
- maintain legal currentness/change impact;
- supply specialist-specific Legal Requirement Packs;
- identify uncertainty/conflict and escalate when authority or evidence is insufficient.

These are FATHER DESIGN CANDIDATES until C02/C03 evidence and PSA review.

## 5. Required next evidence

C02 must collect and classify:
1. current Russian FSES and relevant official educational requirements;
2. current Russian university curricula and learning outcomes from multiple independent programs;
3. evidence about actual legal work/task classes and, where applicable, qualification requirements;
4. legal research / legal writing / interpretation methodology sources;
5. professional ethics evidence by applicable role;
6. comparative international curricula only as comparative evidence;
7. evidence separating general lawyer competence from regulated special legal statuses.

## 6. Open questions / UNKNOWN

- Whether a single current Russian professional standard exists that appropriately represents the general “lawyer” target: UNKNOWN; must not be invented.
- Exact specialization taxonomy for FATHER Lawyer: UNVERIFIED.
- Exact competency map: pending C02-C04.
- Exact curriculum/learning graph: pending C05.
- Which legal sources must be resident vs on-demand: pending knowledge/source planning.

## 7. C01 gate

C01 may advance to C02 evidence collection because the underlying professional/educational domain is established while the FATHER-specific role is explicitly marked as designed and context-dependent. No qualification claim is made.
