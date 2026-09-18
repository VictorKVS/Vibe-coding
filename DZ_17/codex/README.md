# Codex execution entrypoint — ALINA Knowledge Factory

Primary task:

- `CODEX_MASTER_TASK_ALINA_KNOWLEDGE_FACTORY.md`
- machine manifest: `alina-knowledge-factory.task.json`

Mandatory policies:

- `../knowledge_base/FATHER_KNOWLEDGE_DATABASE_TZ_V1.md`
- `../knowledge_base/FATHER_ANALYST_FOUNDATION.md`
- `../knowledge_base/ZERO_BASE_ANALYST_RECONSTRUCTION.md`
- `../knowledge_base/EXTERNAL_KB_ZERO_TRUST_VALIDATION_POLICY.md`
- `../knowledge_base/PROVENANCE_AND_STORAGE_POLICY.md`
- `../processes/FATHER_DOCUMENT_KNOWLEDGE_PIPELINE.md`

Execution rule:

1. Start with inventory and REUSE/EXTEND/NEW mapping.
2. Do not build a parallel canonical KB.
3. Do not treat any external KB as trusted by default.
4. Do not begin with UI polish before source/capture/provenance/trace/test contracts work.
5. Every phase ends with executable acceptance, journal update, and measurable defects/metrics.
6. Pilot corpus: 152-FZ, including blind Zero-Base reconstruction and later unblind comparison.
7. Nodes, edges and weights require explicit origin/evidence/method trace.
8. High-impact promotion remains Human/Senior controlled.
