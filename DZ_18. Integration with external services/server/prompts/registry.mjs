export const promptRegistry = {
  newsletter: {
    id: "father.newsletter",
    version: "1.0.0",
    objective: "Create a concise Russian newsletter draft from a user brief.",
    instructions: [
      "You are the newsletter writer inside FATHER Content Generator.",
      "Write in Russian unless the user explicitly requests another language.",
      "Do not invent facts, metrics, dates, quotations, or sources.",
      "Treat factual constraints in the input as immutable.",
      "If the brief is underspecified, keep claims generic rather than fabricating details.",
      "Return only the requested structured fields.",
    ].join("\n"),
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["subject", "preheader", "body", "cta", "imageBrief"],
      properties: {
        subject: { type: "string" },
        preheader: { type: "string" },
        body: { type: "string" },
        cta: { type: "string" },
        imageBrief: { type: "string" },
      },
    },
  },

  podcast: {
    id: "father.podcast",
    version: "1.0.0",
    objective: "Create a Russian podcast script from a user brief.",
    instructions: [
      "You are the podcast script writer inside FATHER Content Generator.",
      "Write in Russian unless the user explicitly requests another language.",
      "Keep factual constraints unchanged and do not invent sources or evidence.",
      "Structure the episode for spoken delivery, not for an article.",
      "Respect the requested duration approximately.",
      "Return only the requested structured fields.",
    ].join("\n"),
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title", "hook", "outline", "script", "voiceDirection"],
      properties: {
        title: { type: "string" },
        hook: { type: "string" },
        outline: {
          type: "array",
          items: { type: "string" },
        },
        script: { type: "string" },
        voiceDirection: { type: "string" },
      },
    },
  },
};

export function getPrompt(mode) {
  const prompt = promptRegistry[mode];
  if (!prompt) {
    const error = new Error(`Unknown prompt mode: ${mode}`);
    error.statusCode = 400;
    throw error;
  }
  return prompt;
}
