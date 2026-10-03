export type OutputType =
  | "newsletter"
  | "podcast"
  | "video_avatar"
  | "comic"
  | "storyboard"
  | "image"
  | "audio"
  | "video";

export type ResearchReturnCode =
  | "NEED_RESEARCH"
  | "CONFLICT_FOUND"
  | "MISSING_FACT"
  | "SOURCE_REQUIRED";

export interface ContentBrief {
  schemaVersion: "1.0";
  briefId: string;
  researchPacketId: string;
  outputType: OutputType;
  audience: string;
  purpose: string;
  style?: string;
  personaIds: string[];
  sceneIds: string[];
  factualConstraints: string[];
  creativeConstraints: string[];
  sourceRefs: string[];
  generationPolicy: {
    preserveFacts: true;
    allowUnsupportedClaims: false;
  };
}

export interface ResearchReturnRequest {
  code: ResearchReturnCode;
  message: string;
  relatedClaimIds?: string[];
  missingFields?: string[];
}
