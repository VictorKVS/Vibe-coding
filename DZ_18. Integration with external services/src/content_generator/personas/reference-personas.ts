import type { PersonaSpec } from "./types";

export const referencePersonas: PersonaSpec[] = [
  {
    id: "F-01",
    name: "Алина — ведущая",
    presentation: "female",
    agePreset: "adult_30_49",
    identityAnchor: {
      faceDescription: "consistent adult female presenter identity",
      hair: "medium-length neat hair",
      bodyBuild: "average",
      distinctiveFeatures: ["calm attentive expression", "professional presenter appearance"],
      negativeIdentityConstraints: ["do not change identity between scenes"],
    },
    personality: {
      traits: ["calm", "clear", "attentive"],
      communicationStyle: "professional and explanatory",
    },
    visualDefaults: {
      wardrobe: ["business casual"],
      accessories: [],
      allowedStyles: ["editorial", "corporate", "educational"],
    },
  },
  {
    id: "M-01",
    name: "Михаил — эксперт",
    presentation: "male",
    agePreset: "adult_30_49",
    identityAnchor: {
      faceDescription: "consistent adult male expert identity",
      hair: "short neat hair",
      bodyBuild: "average",
      distinctiveFeatures: ["focused expression", "professional expert appearance"],
      negativeIdentityConstraints: ["do not change identity between scenes"],
    },
    personality: {
      traits: ["focused", "confident", "precise"],
      communicationStyle: "concise and analytical",
    },
    visualDefaults: {
      wardrobe: ["business casual"],
      accessories: [],
      allowedStyles: ["editorial", "corporate", "technical"],
    },
  },
];
