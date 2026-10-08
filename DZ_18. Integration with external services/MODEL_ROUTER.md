# FATHER Model Router

## Current local routing

```text
FAST / ROUTER
    -> Ministral 3B Instruct Q4

GENERAL / CREATIVE
    -> Ministral 8B Instruct Q4
    -> fallback: 14B Reasoning

RESEARCH / PROMPT ENGINEERING / QA / SECURITY
    -> Ministral 14B Reasoning Q4
    -> fallback: 8B Instruct

RAG
    query/document
      -> Qwen3 Embedding 0.6B
      -> vector search
      -> Qwen3 Reranker 0.6B
      -> top context

CODING
    -> Qwen3-Coder 30B-A3B only when installed
    -> fallback: 14B Reasoning
```

## Principle

Agents do not own model weights.

The same model server may serve several Agent Zoo roles. The router chooses a model by intent, resource policy and availability.

## First acceptance benchmark

Before adding more LLMs, benchmark the installed standard pack.

### 8B general model

Tasks:
- persona description;
- scene generation;
- newsletter;
- podcast outline;
- rewrite;
- Russian instruction following.

### 14B reasoning model

Tasks:
- prompt critique;
- factual constraint check;
- compare two prompt versions;
- research synthesis;
- QA of generated content;
- security/provider review.

### RAG pair

Tasks:
- Russian semantic retrieval;
- mixed RU/EN queries;
- code/doc retrieval;
- reranking top-20 -> top-5.

Record:
- startup/load time;
- tokens/sec;
- peak RAM;
- peak VRAM;
- answer quality;
- repeatability;
- failure cases.

Do not add a new model unless it fills a measured gap.
