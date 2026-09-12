# Alina Agent Zoo + Knowledge Layer

Status: `MVP / governed registry`

## Goal

Turn Alina from one large system prompt into a controlled agentic system where every specialist has an explicit contract, knowledge scope, prompt version and evaluation path.

The word **Zoo** is a product metaphor. Architecturally it is an **Agent / Capability Registry + Router + Knowledge Layer + Prompt Registry + Evaluation Layer**.

## Core rule

Do not create an autonomous agent when a reusable skill or deterministic function is enough.

```text
User
  ↓
Alina Orchestrator
  ↓
Hard policy / explicit user choice
  ↓
Router
  ├─ Alina Orchestrator
  ├─ Research Analyst
  ├─ Knowledge Growth Analyst
  ├─ Prompt Engineer
  ├─ Narrative Architect
  └─ Skeptical Reviewer
  ↓
Zoo RAG
  ├─ agent registry
  ├─ tool knowledge
  ├─ prompt policy
  ├─ routing knowledge
  ├─ domain knowledge
  └─ evaluation cases
  ↓
Prompt assembly
  ↓
Existing LLM Gateway
  ↓
Trace: agent + promptVersion + knowledgeRefs + model + latency
```

## Why a registry instead of a swarm

A registry keeps each role bounded. Agents do not freely call every other agent. The orchestrator or explicit state transition controls delegation. This reduces duplicated responsibility, hidden prompt changes, context bloat and impossible-to-debug conversations.

## Initial Zoo

| Agent | Responsibility | May do | Must not do |
|---|---|---|---|
| `alina_orchestrator` | dialogue and coordination | clarify intent, select specialist, synthesize | silently change confirmed creative decisions |
| `research_analyst` | external/source research | separate facts/signals/hypotheses, identify sources | present weak source as fact |
| `knowledge_growth_analyst` | grow agent KB | source intake, provenance, gaps, contradictions, eval candidates | self-promote generated knowledge to verified truth |
| `prompt_engineer` | prompt/context engineering | draft/version prompts, propose evals, compare versions | silently promote prompt to production |
| `narrative_architect` | story/world/character structure | continuity, story DNA, alternatives | override user creative authority |
| `skeptical_reviewer` | adversarial QA | find hidden assumptions, counterexamples, missing evidence | rewrite the product merely by preference |

## Knowledge for the Zoo

The Zoo needs knowledge about **itself**, separate from story/project memory:

1. Agent catalog — capabilities, limits, handoffs, owners.
2. Tool catalog — what each tool does, permissions and failure modes.
3. Prompt catalog — prompt ids, versions, variables, environments and eval status.
4. Routing knowledge — examples and hard rules for selecting a specialist.
5. Policies — confirmation boundaries, provenance, safety and user authority.
6. Evaluation corpus — positive, negative and ambiguous routing/context cases.
7. Domain knowledge — story/research/product material retrieved only when needed.

## RAG policy

MVP uses a deterministic **metadata + lexical hybrid retriever**. This is deliberately simple and inspectable. A vector index can be added after an evaluation set proves that semantic retrieval improves recall without harming routing precision.

Retrieval is not authority. Every returned record keeps an id, kind, source and verification state.

## Prompt engineering policy

Prompts are versioned product artifacts, not strings hidden in route handlers.

A prompt change should follow:

`DRAFT → EVAL → REVIEW → STAGING → PRODUCTION`

MVP stores local prompt metadata and a professional Prompt Engineer contract. Future integration may sync these artifacts to an external prompt/context registry.

## Routing order

1. Hard policy / explicit agent request.
2. Deterministic capability rules.
3. Zoo RAG examples and metadata.
4. LLM routing only for ambiguous cases after evaluation exists.
5. If confidence is low: stay with Alina and ask one clarifying question.

## Observability contract

Every `/api/llm` response should make visible:

- `agentId`;
- `promptId` / `promptVersion`;
- `knowledgeRefs`;
- model/provider;
- task class;
- latency;
- routing reason.

## Anti-patterns

- agent explosion;
- every agent talking to every agent;
- one shared unlimited context;
- vector DB as source of truth;
- self-written prompt immediately becoming production prompt;
- generated knowledge silently becoming verified knowledge;
- routing without an evaluation corpus;
- prompt/version/model changes that cannot be reconstructed.

## Next maturity steps

### M1
- registry and local hybrid retrieval;
- Prompt Engineer agent;
- traceable routing integrated into LLM Gateway;
- deterministic eval corpus.

### M2
- prompt versions + environment promotion;
- offline routing/retrieval evaluator;
- story/domain KB with provenance;
- agent/tool permission matrix.

### M3
- optional embeddings/vector backend behind same retriever contract;
- stateful handoffs;
- online quality/latency/cost traces;
- regression gates before prompt/KB promotion.
