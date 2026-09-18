const DEFAULT_BASE_URL = "https://api.openai.com";
const DEFAULT_MODEL = "gpt-5.6-luna";

export async function openaiHealth() {
  return {
    provider: "openai",
    configured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
  };
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
