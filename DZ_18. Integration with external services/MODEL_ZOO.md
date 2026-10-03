# FATHER Model Zoo

## Principle

One agent is not one model.

Agents are roles and contracts. Models are replaceable compute backends.

```text
Agent
  ↓
Model Policy
  ↓
Model Router
  ├── fast local
  ├── reasoning local
  ├── coder local
  ├── embedding
  ├── reranker
  └── cloud fallback
```

## Starter pack

### Lite

- Ministral 3 3B Instruct Q4_K_M — router / cheap transformations.
- Qwen3 Embedding 0.6B — local multilingual RAG.
- Qwen3 Reranker 0.6B — local reranking.

### Standard

Adds:

- Ministral 3 8B Instruct Q4_K_M — general creative/persona/scene model.
- Ministral 3 14B Reasoning Q4_K_M — Prompt Engineer / QA / reasoning.

### Heavy

Adds:

- Qwen3 Embedding 4B — higher-quality retrieval benchmark candidate.
- Qwen3-Coder-30B-A3B-Instruct — repository coding and large-context code tasks.

## Default agent routing

| Agent | Default model |
|---|---|
| Content Director | Ministral 3B Instruct |
| ALINA Analyst | Ministral 14B Reasoning |
| Prompt Engineer | Ministral 14B Reasoning |
| Persona Director | Ministral 8B Instruct |
| Scene Director | Ministral 8B Instruct |
| Newsletter Producer | Ministral 8B Instruct |
| Podcast Producer | Ministral 8B Instruct |
| Video Producer | Ministral 8B Instruct |
| QA Critic | Ministral 14B Reasoning |
| Security Reviewer | Ministral 14B Reasoning |
| RAG embeddings | Qwen3 Embedding 0.6B |
| RAG reranking | Qwen3 Reranker 0.6B |

Cloud models remain escalation/fallback providers and are not coupled to agent identity.

## Download

PowerShell:

```powershell
cd "G:\1\Vibe coding\Vibe-coding-router\DZ_18. Integration with external services"

# ~small starter pack
.\DOWNLOAD_MODELS.ps1 -Tier lite

# recommended initial zoo
.\DOWNLOAD_MODELS.ps1 -Tier standard

# large experimental pack
.\DOWNLOAD_MODELS.ps1 -Tier heavy
```

Do not commit downloaded model weights to Git.

The local `models/` folder must stay ignored.
