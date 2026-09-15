# CODEX EXECUTION ORDER — ALINA Knowledge Factory + FATHER Model Zoo

## P-1 Paper-design alignment — mandatory before material implementation
1. Read `FATHER_DZ17_INTEGRATION_CONTRACT.md`.
2. Read canonical FATHER paper-pipeline, S00-S59, role/process KB and dual-site contracts from `KNOWLEDGE_CORE` feature branch.
3. Map current DZ_17 artifacts/code to S00-S59.
4. Map ALINA roles/processes/artifacts to canonical IDs.
5. Produce missing design decisions as `DESIGN_GAP`, not assumptions.
6. Produce Model Zoo component map, data flow, trust/security boundary, state machines and test-oracle package.
7. Produce Inference Capacity Planner specification for OTUS DZ-17.
8. Confirm which streams have enough evidence to approach S50 and which remain blocked.

## P0 Foundations
9. Inventory repo + real `osint_kb`.
10. Produce KEEP/EXTEND/RENAME_VIEW/NEW matrix.
11. Version ALINA role/profile to v2.
12. Establish Role KB + Process KB logical mapping without duplicate databases.
13. Implement Source/Capture intake only where paper contract is accepted.
14. Implement PDF text/scanned/mixed/broken detection.
15. Implement deterministic extraction + OCR fallback adapter.
16. Persist extraction quality/provenance/trace.
17. Implement external KB quarantine and weight-origin contracts.
18. Add tests and P0 acceptance runner.
19. Update journal and physical map.

## P1 Knowledge creation
20. Structure reconstruction.
21. Semantic segmentation.
22. Typed knowledge object extraction.
23. Entity resolution.
24. Typed relation discovery with evidence.
25. Typed weight provenance/calibration.
26. Candidate graph + contradiction/gap engine.
27. Link knowledge objects to canonical Role KB and S00-S59 Process KB profiles.

## P2 Autonomous research
28. Related-source discovery.
29. Regulatory/citation timeline reconstruction.
30. Blind Zero-Base reconstruction.
31. External KB logic validation.
32. Freeze/unblind comparison.
33. Generate method/case/counterexample candidates from validated evidence.

## P3 Specialist engineering + Model Zoo
34. Build/version Prompt Registry by role/process/capability.
35. Build/version RAG profiles and frozen evidence packages.
36. Build model/provider/capability registries.
37. Implement data-class/security/provider routing policy.
38. Implement materiality/risk router.
39. Implement champion execution.
40. Implement blind challenger execution where justified.
41. Implement deterministic evidence/schema/domain verifiers.
42. Implement independent judge where justified.
43. Implement human authority gate and decision packet.
44. Implement telemetry, audit, fallback/retry/timeout/circuit policies.
45. Implement A/B, Champion/Challenger, Replay/Regression evaluation.
46. Implement role/process capability maturity feedback to ALINA.

## P4 OTUS DZ-17 capacity vertical slice
47. Implement deterministic VRAM/parameter/precision calculation model.
48. Model KV-cache/context/concurrency assumptions explicitly.
49. Add quantization scenarios.
50. Add FlashAttention/vLLM/continuous-batching applicability model.
51. Add time-versioned cloud GPU catalog adapter for Yandex Cloud / Cloud.ru / AWS / Azure.
52. Separate provider facts, engineering assumptions, estimates and measured benchmarks.
53. Rank feasible deployment candidates against SLO/cost/security constraints.
54. Produce Inference Calculator / Decision Packet with assumptions and UNKNOWNs.
55. Add reproducible benchmark/eval path without presenting estimates as measurements.

## P5 Continuous improvement
56. Self-analysis of quality/cost/latency/rework.
57. Improvement proposal cards.
58. Human approval gate.
59. Before/after measurement.
60. Controlled promotion/rollback.
61. Project lesson → ALINA candidate knowledge → review/eval → canonical Role/Process KB update.

## Stop rules

Do not skip a phase gate by implementing a visually complete UI over unverified backend behavior.

If a material component is missing the required paper design, tests/oracles, authority or evidence, stop that implementation stream and record `DESIGN_GAP`.

Code must not become the specification by accident.
