const DEFAULT_BASE_URL = "https://api.openai.com";
const DEFAULT_MODEL = "gpt-5.6-luna";
const DEFAULT_TTS_MODEL = "gpt-4o-mini-tts";
const ALLOWED_TTS_VOICES = new Set(["alloy","ash","ballad","coral","echo","fable","nova","onyx","sage","shimmer","verse","marin","cedar"]);

export async function openaiHealth() {
  return {
    provider: "openai",
    configured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    ttsModel: process.env.OPENAI_TTS_MODEL || DEFAULT_TTS_MODEL,
  };
}


export async function synthesizeSpeech({
  input,
  voice = "marin",
  instructions = "Speak clearly, naturally, and professionally.",
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is not configured on the server.");
    error.statusCode = 503;
    error.provider = "openai";
    throw error;
  }

  if (typeof input !== "string" || input.trim().length === 0) {
    const error = new Error("TTS input is required.");
    error.statusCode = 400;
    throw error;
  }

  if (input.length > 12000) {
    const error = new Error("TTS input is too long.");
    error.statusCode = 400;
    throw error;
  }

  if (!ALLOWED_TTS_VOICES.has(voice)) {
    const error = new Error("Unsupported TTS voice.");
    error.statusCode = 400;
    throw error;
  }

  const baseUrl = process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.OPENAI_TTS_MODEL || DEFAULT_TTS_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(new URL("/v1/audio/speech", baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        model,
        input: input.trim(),
        voice,
        instructions,
        response_format: "mp3",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const raw = await response.text().catch(() => "");
      const error = new Error(
        `OpenAI TTS request failed with HTTP ${response.status}`
      );
      error.statusCode = response.status;
      error.provider = "openai";
      error.upstream = { error: raw || "Upstream TTS error" };
      throw error;
    }

    return {
      provider: "openai",
      model,
      voice,
      contentType: response.headers.get("content-type") || "audio/mpeg",
      audio: Buffer.from(await response.arrayBuffer()),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateStructured({ prompt, input }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is not configured on the server.");
    error.statusCode = 503;
    throw error;
  }

  const baseUrl = process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(new URL("/v1/responses", baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        instructions: prompt.instructions,
        input: JSON.stringify(input),
        text: {
          format: {
            type: "json_schema",
            name: prompt.id.replaceAll(".", "_"),
            description: prompt.objective,
            schema: prompt.schema,
            strict: true,
          },
        },
      }),
      signal: controller.signal,
    });

    const raw = await response.text();
    let payload = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = { raw };
    }

    if (!response.ok) {
      const error = new Error(
        `OpenAI request failed with HTTP ${response.status}`
      );
      error.statusCode = response.status;
      error.upstream = {
        error: payload?.error?.message ?? payload?.error ?? "Upstream error",
      };
      throw error;
    }

    const outputText = extractOutputText(payload);
    if (!outputText) {
      const error = new Error("OpenAI response did not contain output text.");
      error.statusCode = 502;
      throw error;
    }

    let data;
    try {
      data = JSON.parse(outputText);
    } catch {
      const error = new Error("OpenAI structured output was not valid JSON.");
      error.statusCode = 502;
      throw error;
    }

    return {
      provider: "openai",
      model,
      promptId: prompt.id,
      promptVersion: prompt.version,
      data,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;

  for (const item of payload?.output ?? []) {
    for (const part of item?.content ?? []) {
      if (part?.type === "output_text" && typeof part.text === "string") {
        return part.text;
      }
    }
  }

  return "";
}
