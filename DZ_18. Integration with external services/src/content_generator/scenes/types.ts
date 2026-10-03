export type SceneEmotion =
  | "neutral"
  | "friendly"
  | "focused"
  | "thinking"
  | "doubtful"
  | "concerned"
  | "surprised"
  | "confident"
  | "strict"
  | "explaining"
  | "happy";

export interface SceneSpec {
  id: string;
  personaId: string;
  order: number;
  purpose: string;
  emotion: SceneEmotion;
  emotionIntensity?: number;
  environment: string;
  timeOfDay?: string;
  season?: string;
  pose: string;
  action: string;
  wardrobe: string;
  props: string[];
  dialogue?: string;
  narration?: string;
  camera?: {
    shot?: string;
    angle?: string;
  };
  renderPrompt?: string;
}
