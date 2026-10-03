export type PromptStage = "draft" | "candidate" | "production" | "retired";

export interface PromptVariable {
  name: string;
  description: string;
  required: boolean;
  example?: string;
}

export interface PromptEvalCase {
  id: string;
  name: string;
  input: Record<string, unknown>;
  expected: string[];
  forbidden: string[];
}

export interface PromptVersion {
  promptId: string;
  version: string;
  stage: PromptStage;
  ownerAgentId: string;
  objective: string;
  systemPrompt: string;
  variables: PromptVariable[];
  outputContract: string;
  factualPolicy: string[];
  safetyPolicy: string[];
  evalCaseIds: string[];
  createdAt: string;
  changelog: string;
}

export interface PromptDefinition {
  id: string;
  name: string;
  domain: string;
  description: string;
  activeVersion: string;
  versions: PromptVersion[];
}

export interface PromptEvalResult {
  promptId: string;
  version: string;
  caseId: string;
  passed: boolean;
  score?: number;
  notes: string[];
}
