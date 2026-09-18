# P0 Acceptance Checklist — ALINA Knowledge Factory

P0 cannot be marked complete until all items are true.

- [ ] Current repo architecture inventoried.
- [ ] Current `osint_kb` inventory captured.
- [ ] REUSE/EXTEND/NEW matrix exists for all proposed persistent entities.
- [ ] No second canonical source/document/graph registry created.
- [ ] ALINA role/profile v2 created as a new version, preserving v1.
- [ ] Source/Capture contracts executable.
- [ ] SHA-256 dedup executable and tested.
- [ ] PDF detector distinguishes text/scanned/mixed/broken cases.
- [ ] Deterministic extraction path works before OCR fallback.
- [ ] OCR adapter records confidence/uncertain regions/engine version.
- [ ] Page-addressable provenance survives extraction.
- [ ] Text quality metrics persisted.
- [ ] External KB enters quarantine by default.
- [ ] External nodes/edges/weights cannot become canonical without validation.
- [ ] Weight origin/method/version contract implemented.
- [ ] Prompt-injection-in-document test exists.
- [ ] Provenance-loss test exists.
- [ ] Idempotent rerun test exists.
- [ ] Audit/trace stores model/prompt/schema/method versions and durations.
- [ ] Candidate state is isolated from VERIFIED/production state.
- [ ] `DEVELOPMENT_JOURNAL.md` updated.
- [ ] `PHYSICAL_MAP.md` updated.
- [ ] One-command or documented executable acceptance path exists.
- [ ] Acceptance report shows PASS/FAIL per gate.

Pilot fixture: 152-FZ source/capture may be used to prove P0 mechanics, but expected graph/relations/weights must not be leaked into Zero-Base benchmark context.
