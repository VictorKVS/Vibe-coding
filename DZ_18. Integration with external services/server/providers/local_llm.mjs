const DEFAULT_BASE_URL =
  "http://127.0.0.1:8088";

const DEFAULT_MODEL =
  "Ministral 3 8B Instruct Q4";


export function localLlmHealth() {
  return {
    provider: "local",

    configured:
      Boolean(
        process.env.LOCAL_LLM_BASE_URL ||
        DEFAULT_BASE_URL
      ),

    model:
      process.env.LOCAL_LLM_NAME ||
      DEFAULT_MODEL,

    runtime:
      "llama.cpp server",

    structuredOutput:
      "json-schema",

    private:
      true,
  };
}


export async function generateLocalStructured({
  prompt,
  input,
  kind = "newsletter",
}) {
  const baseUrl =
    process.env.LOCAL_LLM_BASE_URL ||
    DEFAULT_BASE_URL;

  const model =
    process.env.LOCAL_LLM_NAME ||
    DEFAULT_MODEL;


  const systemPrompt = [
    prompt.instructions,

    "",
    "FACTUAL SAFETY",
    "Use only facts explicitly supplied by INPUT.",
    "Never invent prices, dates, statistics, links, certifications, customers, integrations, product capabilities, free access or trial conditions.",
    "If INPUT does not contain a fact, omit it.",
    "Do not compensate for missing facts by inventing plausible details.",

    "",
    "OUTPUT",
    "Return exactly one object matching the JSON schema.",
    "No Markdown.",
    "No commentary outside the object.",
  ].join("\n");


  let correction = "";


  for (
    let attempt = 1;
    attempt <= 2;
    attempt++
  ) {
    const messages = [
      {
        role: "system",
        content:
          systemPrompt +
          correction,
      },

      {
        role: "user",
        content:
          JSON.stringify(
            input,
            null,
            2
          ),
      },
    ];


    const payload =
      await callLocalServer({
        baseUrl,
        model,
        messages,
        schema:
          prompt.schema,

        maxTokens:
          kind === "podcast"
            ? 1800
            : 1200,
      });


    const content =
      payload?.choices?.[0]
        ?.message?.content;


    if (
      typeof content !== "string" ||
      !content.trim()
    ) {
      throwProvider(
        "Local LLM returned no message content."
      );
    }


    const data =
      parseStructuredJson(
        content
      );


    validateContract(
      data,
      prompt.schema
    );


    const factProblem =
      findFactProblem(
        data,
        input
      );


    if (!factProblem) {
      return {
        provider: "local",
        model,

        promptId:
          prompt.id,

        promptVersion:
          prompt.version,

        attempts:
          attempt,

        data,
      };
    }


    if (attempt === 2) {
      throwProvider(
        "Factual guard rejected the generated content: " +
        factProblem
      );
    }


    correction = [
      "",
      "",
      "CORRECTION FOR THIS ATTEMPT:",
      "The previous draft contained an unsupported claim:",
      factProblem,
      "Regenerate from INPUT only.",
      "Remove that claim instead of replacing it with another invented fact.",
    ].join("\n");
  }


  throwProvider(
    "Local generation failed."
  );
}


async function callLocalServer({
  baseUrl,
  model,
  messages,
  schema,
  maxTokens,
}) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      180000
    );


  try {
    let response;

    try {
      response =
        await fetch(
          `${baseUrl}/v1/chat/completions`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json; charset=utf-8",
            },

            signal:
              controller.signal,

            body:
              JSON.stringify({
                model,

                messages,

                /*
                 * llama.cpp native structured output:
                 * type=json_object + schema.
                 */
                response_format: {
                  type: "json_object",
                  schema,
                },

                temperature:
                  0.15,

                max_tokens:
                  maxTokens,

                stream:
                  false,
              }),
          }
        );
    }
    catch (cause) {
      const message =
        cause?.name === "AbortError"
          ? "Local LLM request timed out."
          : `Local LLM server unavailable: ${cause?.message || cause}`;

      const error =
        new Error(message);

      error.statusCode = 503;
      error.provider = "local";
      error.cause = cause;

      throw error;
    }


    const raw =
      await response.text();


    let payload;

    try {
      payload =
        raw
          ? JSON.parse(raw)
          : {};
    }
    catch {
      payload = {
        raw,
      };
    }


    if (!response.ok) {
      throwProvider(
        payload?.error?.message ||
        payload?.error ||
        `Local LLM HTTP ${response.status}`,
        {
          status:
            response.status,

          preview:
            raw.slice(
              0,
              1500
            ),
        },
        response.status
      );
    }


    return payload;
  }
  finally {
    clearTimeout(
      timer
    );
  }
}


function parseStructuredJson(raw) {
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
    return JSON.parse(
      text
    );
  }
  catch {
  }


  const start =
    text.indexOf("{");

  const end =
    text.lastIndexOf("}");


  if (
    start < 0 ||
    end <= start
  ) {
    throwProvider(
      "Local model output contains no JSON object.",
      {
        preview:
          text.slice(
            0,
            1500
          ),
      }
    );
  }


  const candidate =
    text.slice(
      start,
      end + 1
    );


  try {
    return JSON.parse(
      candidate
    );
  }
  catch {
    throwProvider(
      "Local model returned invalid JSON.",
      {
        preview:
          candidate.slice(
            0,
            1500
          ),
      }
    );
  }
}


function validateContract(
  data,
  schema
) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    throwProvider(
      "Structured output root must be an object."
    );
  }


  const required =
    Array.isArray(
      schema?.required
    )
      ? schema.required
      : [];


  for (
    const key
    of required
  ) {
    if (
      !(key in data)
    ) {
      throwProvider(
        `Missing required field: ${key}`
      );
    }


    if (
      typeof data[key] === "string" &&
      !data[key].trim()
    ) {
      throwProvider(
        `Empty required field: ${key}`
      );
    }
  }
}


function findFactProblem(
  data,
  input
) {
  const supplied =
    JSON.stringify(input)
      .toLowerCase();

  const generated =
    JSON.stringify(data)
      .toLowerCase();


  const checks = [
    {
      input:
        [
          "\\u0431\\u0435\\u0441\\u043f\\u043b\\u0430\\u0442",
          "free",
        ],

      output:
        [
          "\\u0431\\u0435\\u0441\\u043f\\u043b\\u0430\\u0442",
          "free trial",
          "free access",
        ],

      message:
        "unsupported free-access claim",
    },

    {
      input:
        [
          "http://",
          "https://",
          "url",
        ],

      output:
        [
          "\\u043f\\u043e \\u0441\\u0441\\u044b\\u043b\\u043a",
          "\\u043f\\u0435\\u0440\\u0435\\u0439\\u0434\\u0438\\u0442\\u0435 \\u043f\\u043e \\u0441\\u0441\\u044b\\u043b\\u043a",
        ],

      message:
        "unsupported link instruction",
    },

    {
      input:
        [
          "github",
          "vs code",
          "visual studio code",
        ],

      output:
        [
          "github",
          "vs code",
          "visual studio code",
        ],

      message:
        "unsupported integration claim",
    },
  ];


  for (
    const check
    of checks
  ) {
    const inputHasFact =
      check.input.some(
        (marker) =>
          supplied.includes(
            decodeMarker(marker)
          )
      );


    if (inputHasFact) {
      continue;
    }


    const outputHasClaim =
      check.output.some(
        (marker) =>
          generated.includes(
            decodeMarker(marker)
          )
      );


    if (outputHasClaim) {
      return check.message;
    }
  }


  return null;
}


function decodeMarker(value) {
  return value.replace(
    /\\u([0-9a-f]{4})/gi,
    (_, hex) =>
      String.fromCharCode(
        parseInt(
          hex,
          16
        )
      )
  );
}


function throwProvider(
  message,
  upstream,
  statusCode = 502
) {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  error.provider =
    "local";


  if (upstream) {
    error.upstream =
      upstream;
  }


  throw error;
}
