export type AgePreset =
  | "child_6_9"
  | "child_10_12"
  | "teen_13_17"
  | "young_adult_18_29"
  | "adult_30_49"
  | "mature_50_64"
  | "senior_65_plus";

export interface PersonaSpec {
  id: string;
  name: string;
  presentation: "female" | "male";
  agePreset: AgePreset;
  identityAnchor: {
    faceDescription: string;
    hair: string;
    bodyBuild?: string;
    distinctiveFeatures: string[];
    negativeIdentityConstraints: string[];
  };
  personality: {
    traits: string[];
    communicationStyle: string;
  };
  visualDefaults: {
    wardrobe: string[];
    accessories: string[];
    allowedStyles: string[];
  };
  voice?: {
    provider: string;
    voiceId?: string;
    description?: string;
  };
}
