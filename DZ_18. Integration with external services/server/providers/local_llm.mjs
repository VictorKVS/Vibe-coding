const DEFAULT_BASE_URL =
  "http://127.0.0.1:11434";

const DEFAULT_MODEL =
  "qwen2.5:7b";

const DEFAULT_DISPLAY =
  "Qwen 2.5 7B";


export function localLlmHealth() {
  return {
    provider: "local",

    configured: true,

    model:
      process.env.LOCAL_LLM_NAME ||
      DEFAULT_DISPLAY,

    runtime:
      "ollama",

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

  const ollamaModel =
    process.env.OLLAMA_MODEL ||
    DEFAULT_MODEL;

  const displayModel =
    process.env.LOCAL_LLM_NAME ||
    DEFAULT_DISPLAY;


  const systemPrompt = [
    prompt.instructions,

    "",
    "FACTUAL SAFETY",
    "Use only facts explicitly present in INPUT.",
    "Never invent prices, dates, statistics, URLs, customers, integrations, certifications, free access, trial conditions or product capabilities.",
    "If INPUT does not provide a fact, omit it.",

    "",
    "OUTPUT",
    "Return exactly one JSON object matching the schema.",
    "No Markdown.",
    "No text outside JSON.",
  ].join("\n");


  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      180000
    );


  let response;

  try {

    response = await fetch(
      `${baseUrl}/api/chat`,
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
            model:
              ollamaModel,

            messages: [
              {
                role:
                  "system",

                content:
                  systemPrompt,
              },
              {
                role:
                  "user",

                content:
                  JSON.stringify(
                    input,
                    null,
                    2
                  ),
              },
            ],

            stream:
              false,

            format:
              prompt.schema,

            keep_alive:
              "30m",

            options: {
              temperature:
                0,

              num_ctx:
                4096,
            },
          }),
      }
    );
  }
  catch (cause) {

    const error =
      new Error(
        cause?.name === "AbortError"
          ? "Ollama request timed out."
          : `Ollama unavailable: ${cause?.message || cause}`
      );

    error.statusCode = 503;
    error.provider = "local";
    error.cause = cause;

    throw error;
  }
  finally {
    clearTimeout(timer);
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

    const error =
      new Error(
        payload?.error ||
        `Ollama HTTP ${response.status}`
      );

    error.statusCode =
      response.status;

    error.provider =
      "local";

    error.upstream = {
      preview:
        raw.slice(
          0,
          1500
        ),
    };

    throw error;
  }


  const content =
    payload?.message?.content;


  if (
    typeof content !== "string" ||
    !content.trim()
  ) {
    throwProvider(
      "Ollama returned no message content."
    );
  }


  let data;

  try {
    data =
      JSON.parse(
        content
      );
  }
  catch {
    throwProvider(
      "Ollama structured output was not valid JSON.",
      {
        preview:
          content.slice(
            0,
            1500
          ),
      }
    );
  }


  validateContract(
    data,
    prompt.schema
  );


  return {
    provider:
      "local",

    model:
      displayModel,

    runtime:
      "ollama",

    ollamaModel,

    promptId:
      prompt.id,

    promptVersion:
      prompt.version,

    data,
  };
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

    if (!(key in data)) {
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


function throwProvider(
  message,
  upstream
) {

  const error =
    new Error(message);

  error.statusCode =
    502;

  error.provider =
    "local";


  if (upstream) {
    error.upstream =
      upstream;
  }


  throw error;
}
