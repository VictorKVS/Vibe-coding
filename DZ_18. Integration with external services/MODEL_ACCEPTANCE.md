# FATHER Model Zoo — Acceptance Plan

## Current status

Standard local pack is installed.

Expected local set:

- Ministral 3 3B Instruct Q4;
- Ministral 3 8B Instruct Q4;
- Ministral 3 14B Reasoning Q4;
- Qwen3 Embedding 0.6B;
- Qwen3 Reranker 0.6B.

No additional LLM or image model should be downloaded until the benchmark shows a measured gap.

## Gate 1 — Hardware

Run:

```powershell
.\CHECK_HARDWARE.ps1
```

Record:

- CPU;
- total/free RAM;
- GPU;
- VRAM;
- CUDA;
- PyTorch CUDA support;
- llama.cpp availability;
- free disk space.

## Gate 2 — Runtime smoke test

Run:

```powershell
.\SMOKE_MODEL_RUNTIME.ps1
```

This verifies:

- GGUF files exist;
- llama.cpp runtime availability;
- Python ML packages;
- RAG model folder integrity.

## Gate 3 — Real inference benchmark

Only after hardware/runtime are known.

### Ministral 3B

Use cases:
- routing;
- intent classification;
- format conversion;
- short summaries.

Decision:
- keep only if latency/resource saving vs 8B is meaningful.

### Ministral 8B

Use cases:
- persona;
- scenes;
- creative writing;
- newsletter;
- podcast drafts.

### Ministral 14B Reasoning

Use cases:
- ALINA Analyst;
- Prompt Engineer;
- QA Critic;
- Security Reviewer;
- difficult planning.

### Qwen3 Embedding + Reranker

Use cases:
- RU/EN retrieval;
- code/document search;
- top-k retrieval;
- rerank top-20 -> top-5.

## Metrics

For each generative model record:

```text
load_seconds
first_token_seconds
tokens_per_second
peak_ram_gb
peak_vram_gb
quality_score
instruction_following_score
russian_quality_score
repeatability
failure_notes
```

For RAG:

```text
embedding_docs_per_second
query_latency_ms
top_k_recall
rerank_latency_ms
top_5_quality
peak_ram_gb
peak_vram_gb
```

## Rule

A new model is admitted to Model Zoo only if it is measurably better at a required role or supplies a missing capability.
