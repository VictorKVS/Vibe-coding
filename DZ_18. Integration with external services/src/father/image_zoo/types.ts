export type ImageModelKind =
  | "text_to_image"
  | "image_edit"
  | "inpainting"
  | "identity_adapter"
  | "control_adapter"
  | "segmentation"
  | "lighting"
  | "lora";

export type ImageModelTier = "starter" | "standard" | "heavy";
export type ImageModelSource = "local" | "candidate";

export interface ImageModelSpec {
  id: string;
  displayName: string;
  kind: ImageModelKind;
  tier: ImageModelTier;
  source: ImageModelSource;
  localFilename?: string;
  repoId?: string;
  runtime: "comfyui" | "diffusers";
  license: string;
  installed: boolean;
  enabledByDefault: boolean;
  recommendedFor: string[];
  personaUse: string[];
  notes: string[];
}
