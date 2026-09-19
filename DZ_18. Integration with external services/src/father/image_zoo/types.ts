export type ImageModelKind =
  | "text_to_image"
  | "image_edit"
  | "layered_edit"
  | "identity_adapter"
  | "control_adapter";

export type ImageModelTier = "starter" | "standard" | "heavy";

export interface ImageModelSpec {
  id: string;
  displayName: string;
  kind: ImageModelKind;
  tier: ImageModelTier;
  repoId: string;
  runtime: "comfyui" | "diffusers";
  license: string;
  enabledByDefault: boolean;
  recommendedFor: string[];
  personaUse: string[];
  notes: string[];
}
