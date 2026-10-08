export type ModelKind = "llm" | "reasoning" | "coder" | "embedding" | "reranker" | "vision";
export type ModelTier = "lite" | "standard" | "heavy";

export interface LocalModelSpec {
  id: string;
  displayName: string;
  kind: ModelKind;
  tier: ModelTier;
  provider: "huggingface";
  repoId: string;
  format: "gguf" | "safetensors";
  quantization?: string;
  approximateDownloadGb?: number;
  recommendedFor: string[];
  agentIds: string[];
  runtime: "llama.cpp" | "transformers" | "sentence-transformers";
  openAiCompatible: boolean;
  license: string;
  enabledByDefault: boolean;
  notes: string[];
}
