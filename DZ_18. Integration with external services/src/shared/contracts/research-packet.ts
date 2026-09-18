export type ClaimStatus = "verified" | "disputed" | "hypothesis" | "unknown";

export interface SourceRef {
  id: string;
  uri?: string;
  title?: string;
  accessedAt?: string;
}

export interface ResearchClaim {
  id: string;
  text: string;
  status: ClaimStatus;
  sourceRefs: string[];
}

export interface ResearchPacket {
  schemaVersion: "1.0";
  researchId: string;
  topic: string;
  claims: ResearchClaim[];
  entities: string[];
  timeline: Array<{ dateOrPeriod: string; event: string; sourceRefs: string[] }>;
  people: string[];
  locations: string[];
  era?: string;
  sourceRefs: SourceRef[];
  unresolvedQuestions: string[];
  restrictions: string[];
  provenance: {
    createdBy: "ALINA_ANALYST" | string;
    createdAt: string;
    revision: string;
  };
}
