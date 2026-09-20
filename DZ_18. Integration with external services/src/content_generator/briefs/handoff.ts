import type {
  ContentBrief,
  ResearchPacket,
  ResearchReturnRequest,
} from "../../shared/contracts";

export type HandoffResult =
  | { ok: true; packet: ResearchPacket; brief: ContentBrief }
  | { ok: false; returnToResearch: ResearchReturnRequest };

export function validateResearchHandoff(
  packet: ResearchPacket,
  brief: ContentBrief,
): HandoffResult {
  if (brief.researchPacketId !== packet.researchId) {
    return {
      ok: false,
      returnToResearch: {
        code: "MISSING_FACT",
        message: "ContentBrief references a different ResearchPacket.",
      },
    };
  }

  if (brief.generationPolicy.preserveFacts !== true) {
    return {
      ok: false,
      returnToResearch: {
        code: "CONFLICT_FOUND",
        message: "Generation policy must preserve verified facts.",
      },
    };
  }

  if (brief.generationPolicy.allowUnsupportedClaims !== false) {
    return {
      ok: false,
      returnToResearch: {
        code: "SOURCE_REQUIRED",
        message: "Unsupported factual claims are not allowed.",
      },
    };
  }

  return { ok: true, packet, brief };
}
