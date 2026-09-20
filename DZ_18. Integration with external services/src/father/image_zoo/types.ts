export type ImageCapability =
  | "portrait"
  | "full_body"
  | "fashion"
  | "swimwear"
  | "adult_artistic_nude"
  | "anatomy_reference"
  | "expression_sheet"
  | "sticker_pack"
  | "comic"
  | "poster"
  | "identity_consistency"
  | "pose_control"
  | "inpainting"
  | "relighting";

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
  capabilities?: ImageCapability[];
  recommendedFor: string[];
  personaUse: string[];
  notes: string[];
}
