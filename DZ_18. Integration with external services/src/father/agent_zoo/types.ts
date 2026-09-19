export type AgentStatus = "active" | "experimental" | "disabled";

export type AgentCapability =
  | "research"
  | "rag"
  | "prompt_engineering"
  | "content_generation"
  | "persona"
  | "scene"
  | "newsletter"
  | "podcast"
  | "video"
  | "qa"
  | "security";

export interface AgentSpec {
  id: string;
  name: string;
  role: string;
  description: string;
  status: AgentStatus;
  capabilities: AgentCapability[];
  promptIds: string[];
  toolIds: string[];
  knowledgeScopes: string[];
  accepts: string[];
  produces: string[];
  mayCallAgents: string[];
  restrictions: string[];
  ownerDomain: "alina_analyst" | "content_generator" | "shared" | "father";
}
