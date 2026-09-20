# FATHER Local AI Hardware Profile

Source: local Windows diagnostics, 2026-09-20.

## Hardware

- CPU: Intel Core i5-10400F
- CPU cores / threads: 6 / 12
- RAM: 31.84 GB
- Free RAM during check: 16.43 GB
- Primary AI GPU: NVIDIA GeForce RTX 3060
- VRAM: 12,288 MiB
- Free VRAM during check: 11,338 MiB
- NVIDIA driver: 595.95
- Secondary legacy GPU: AMD Radeon HD 6700 Series
- Models drive: G:
- Free space during check: ~690 GB
- Python: 3.10.11

Important: Win32_VideoController reported RTX 3060 AdapterRAM incorrectly. Use nvidia-smi as the source of truth for NVIDIA VRAM.

## Installed Model Zoo

- Ministral 3 3B Instruct Q4_K_M
- Ministral 3 8B Instruct Q4_K_M
- Ministral 3 14B Reasoning Q4_K_M
- Qwen3 Embedding 0.6B
- Qwen3 Reranker 0.6B

Total measured model size: 16.76 GB.

## Runtime policy

### Ministral 3B

Initial policy:

```text
GPU offload: full
context: 4096
role: router / classification / short transforms
```

Keep only if benchmark proves useful latency/resource savings over 8B.

### Ministral 8B

Initial policy:

```text
GPU offload: full
context: 4096–8192 after benchmark
role: general / creative / Persona / Scene
```

Expected to fit comfortably on RTX 3060 12 GB in Q4.

### Ministral 14B Reasoning

Initial policy:

```text
GPU offload: try full first
context: 4096 for first benchmark
role: Analyst / Prompt Engineer / QA / Security
```

If VRAM pressure occurs:

1. reduce context;
2. reduce parallel slots;
3. reduce GPU-offloaded layers;
4. allow CPU+GPU hybrid inference.

Do not replace the model before testing hybrid inference.

### RAG models

Qwen3 Embedding 0.6B and Qwen3 Reranker 0.6B run as a separate Python service.

They should not remain permanently loaded on GPU while a large GGUF model is benchmarking unless the benchmark explicitly tests simultaneous operation.

## Next gates

1. install/detect llama.cpp;
2. verify backend device;
3. verify PyTorch/CUDA;
4. verify sentence-transformers;
5. benchmark 3B / 8B / 14B;
6. benchmark embedding + reranker;
7. choose resident vs on-demand model policy.
