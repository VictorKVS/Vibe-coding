import GigaChat from "gigachat";
import { Agent } from "node:https";

const DEFAULT_MODEL = "GigaChat-2";
const DEFAULT_SCOPE = "GIGACHAT_API_PERS";
const DEFAULT_BASE_URL = "https://api.giga.chat/api/v1";

export function gigachatHealth() {
  return {
    provider: "gigachat",
    configured: Boolean(
      String(
        process.env.GIGACHAT_CREDENTIALS || ""
      ).trim()
    ),
    model:
      process.env.GIGACHAT_MODEL ||
      DEFAULT_MODEL,
    scope:
      process.env.GIGACHAT_SCOPE ||
      DEFAULT_SCOPE,
  };
}

export async function generateGigaStructured({
  prompt,
  input,
}) {
  const credentials = String(
    process.env.GIGACHAT_CREDENTIALS || ""
  ).trim();

  if (!credentials) {
    const error = new Error(
      "GIGACHAT_CREDENTIALS is not configured on the server."
    );

    error.statusCode = 503;
    error.provider = "gigachat";
    throw error;
  }

  const model =
    process.env.GIGACHAT_MODEL ||
    DEFAULT_MODEL;

  const scope =
    process.env.GIGACHAT_SCOPE ||
    DEFAULT_SCOPE;

  const insecure =
    String(
      process.env.GIGACHAT_INSECURE_SSL ||
      "false"
    ).toLowerCase() === "true";

  const httpsAgent = new Agent({
    rejectUnauthorized: !insecure,
  });

  const client = new GigaChat({
    credentials,
    scope,
    model,
    baseUrl:
      process.env.GIGACHAT_BASE_URL ||
      DEFAULT_BASE_URL,
    timeout: 600,
    httpsAgent,
  });

  const response = await client.chat({
    messages: [
      {
        role: "system",
        content: prompt.instructions,
      },
      {
        role: "user",
        content: JSON.stringify(
          input,
          null,
          2
        ),
      },
    ],

    response_format: {
      type: "json_schema",
      schema: prompt.schema,
      strict: true,
    },

    temperature: 0.45,
    max_tokens: 2600,
  });

  const content =
    response?.choices?.[0]
      ?.message?.content;

  if (
    typeof content !== "string" ||
    !content.trim()
  ) {
    const error = new Error(
      "GigaChat response did not contain text."
    );

    error.statusCode = 502;
    error.provider = "gigachat";
    throw error;
  }

  const data =
    parseGigaStructuredJson(content);

  return {
    provider: "gigachat",
    model,
    promptId: prompt.id,
    promptVersion: prompt.version,
    data,
  };
}
function parseGigaStructuredJson(raw) {
  let text =
    String(raw || "")
      .trim();

  text = text
    .replace(
      /^```(?:json)?\s*/i,
      ""
    )
    .replace(
      /\s*```$/,
      ""
    )
    .trim();

  try {
    return JSON.parse(text);
  }
  catch {
    // GigaChat may wrap a valid object
    // in a short natural-language preface.
  }

  const start =
    text.indexOf("{");

  const end =
    text.lastIndexOf("}");

  if (
    start < 0 ||
    end <= start
  ) {
    throwGigaJsonError(
      raw,
      "GigaChat output contains no JSON object."
    );
  }

  const candidate =
    text.slice(
      start,
      end + 1
    );

  try {
    return JSON.parse(candidate);
  }
  catch {
    throwGigaJsonError(
      candidate,
      "GigaChat structured output was not valid JSON."
    );
  }
}


function throwGigaJsonError(raw, message) {
  const error =
    new Error(message);

  error.statusCode = 502;
  error.provider = "gigachat";

  error.upstream = {
    preview:
      String(raw || "")
        .slice(0, 1500),
  };

  throw error;
}
