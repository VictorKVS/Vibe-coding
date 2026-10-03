import { localModelRegistry, modelsForAgent } from "./registry";
import type { LocalModelSpec } from "./types";

export type RoutingIntent =
  | "fast"
  | "general"
  | "reasoning"
  | "research"
  | "prompt_engineering"
  | "qa"
  | "security"
  | "embedding"
  | "reranking"
  | "coding";

export interface ModelRoute {
  intent: RoutingIntent;
  primaryModelId: string;
  fallbackModelIds: string[];
  reason: string;
}

const routes: Record<RoutingIntent, ModelRoute> = {
  fast: {
    intent: "fast",
    primaryModelId: "MODEL-MINISTRAL-3B-INSTRUCT-Q4",
    fallbackModelIds: ["MODEL-MINISTRAL-8B-INSTRUCT-Q4"],
    reason: "Cheap routing, classification and transforms.",
  },
  general: {
    intent: "general",
    primaryModelId: "MODEL-MINISTRAL-8B-INSTRUCT-Q4",
    fallbackModelIds: ["MODEL-MINISTRAL-14B-REASONING-Q4"],
    reason: "Default general/creative local model.",
  },
  reasoning: {
    intent: "reasoning",
    primaryModelId: "MODEL-MINISTRAL-14B-REASONING-Q4",
    fallbackModelIds: ["MODEL-MINISTRAL-8B-INSTRUCT-Q4"],
    reason: "Hard reasoning and structured critique.",
  },
  research: {
    intent: "research",
    primaryModelId: "MODEL-MINISTRAL-14B-REASONING-Q4",
    fallbackModelIds: ["MODEL-MINISTRAL-8B-INSTRUCT-Q4"],
    reason: "Research synthesis requires stronger reasoning.",
  },
  prompt_engineering: {
    intent: "prompt_engineering",
    primaryModelId: "MODEL-MINISTRAL-14B-REASONING-Q4",
    fallbackModelIds: ["MODEL-MINISTRAL-8B-INSTRUCT-Q4"],
    reason: "Prompt design and eval need reasoning plus consistency.",
  },
  qa: {
    intent: "qa",
    primaryModelId: "MODEL-MINISTRAL-14B-REASONING-Q4",
    fallbackModelIds: ["MODEL-MINISTRAL-8B-INSTRUCT-Q4"],
    reason: "Quality criticism and contract checking.",
  },
  security: {
    intent: "security",
    primaryModelId: "MODEL-MINISTRAL-14B-REASONING-Q4",
    fallbackModelIds: [],
    reason: "Fail-closed security review uses the strongest local reasoner.",
  },
  embedding: {
    intent: "embedding",
    primaryModelId: "MODEL-QWEN3-EMBED-06B",
    fallbackModelIds: [],
    reason: "Default multilingual local embedding model.",
  },
  reranking: {
    intent: "reranking",
    primaryModelId: "MODEL-QWEN3-RERANK-06B",
    fallbackModelIds: [],
    reason: "Dedicated second-stage relevance scorer.",
  },
  coding: {
    intent: "coding",
    primaryModelId: "MODEL-QWEN3-CODER-30B-A3B",
    fallbackModelIds: ["MODEL-MINISTRAL-14B-REASONING-Q4"],
    reason: "Heavy coder when installed; reasoning model remains fallback.",
  },
};

export function routeModel(intent: RoutingIntent): LocalModelSpec | undefined {
  const route = routes[intent];
  return localModelRegistry.find((model) => model.id === route.primaryModelId);
}

export function getModelRoute(intent: RoutingIntent): ModelRoute {
  return routes[intent];
}

export function routeAgent(agentId: string): LocalModelSpec[] {
  return modelsForAgent(agentId);
}

export const modelRoutes = routes;
