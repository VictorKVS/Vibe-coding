import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import {
  generateLocalStructured
} from "../server/providers/local_llm.mjs";

import {
  generateGigaStructured
} from "../server/providers/gigachat.mjs";

import {
  generateStructured
} from "../server/providers/openai.mjs";


function readUtf8(file) {
  return fs
    .readFileSync(file, "utf8")
    .replace(/^\uFEFF/, "");
}


function writeJson(file, value) {
  fs.mkdirSync(
    path.dirname(file),
    { recursive: true }
  );

  fs.writeFileSync(
    file,
    JSON.stringify(value, null, 2),
    "utf8"
  );
}


function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex")
    .toUpperCase();
}


function normalizeProduct(result) {

  if (
    result &&
    typeof result === "object" &&
    result.data &&
    typeof result.data === "object"
  ) {
    return result.data;
  }

  return result;
}


const configFile =
  process.argv[2];


if (!configFile) {
  console.error(
    "Usage: node STAGE_WORKER.mjs <stage-config.json>"
  );

  process.exit(2);
}


const config =
  JSON.parse(
    readUtf8(configFile)
  );


const {
  stage,
  stage_id,
  provider,
  model,
  prompt_file,
  input_file,
  previous_product_file,
  quality_feedback_file,
  output_dir
} = config;


if (
  !stage_id ||
  !provider ||
  !model ||
  !prompt_file ||
  !input_file ||
  !output_dir
) {
  throw new Error(
    "Invalid stage configuration"
  );
}


fs.mkdirSync(
  output_dir,
  { recursive: true }
);


const promptText =
  readUtf8(prompt_file);


const inputText =
  readUtf8(input_file);


const originalInput =
  JSON.parse(inputText);


let previousProduct =
  null;


if (
  previous_product_file &&
  fs.existsSync(previous_product_file)
) {
  previousProduct =
    JSON.parse(
      readUtf8(
        previous_product_file
      )
    );
}


const schema = {
  type: "object",

  additionalProperties: false,

  properties: {

    summary: {
      type: "string"
    },

    product: {
      type: "string"
    },

    improvements_made: {
      type: "array",
      items: {
        type: "string"
      }
    },

    problems_found: {
      type: "array",
      items: {
        type: "string"
      }
    },

    facts_requiring_verification: {
      type: "array",
      items: {
        type: "string"
      }
    },

    confidence: {
      type: "number",
      minimum: 0,
      maximum: 100
    }
  },

  required: [
    "summary",
    "product",
    "improvements_made",
    "problems_found",
    "facts_requiring_verification",
    "confidence"
  ]
};


const prompt = {
  id: "alina.multi-llm.factory",
  version: "1.0.0",
  instructions: promptText,
  schema
};


/*
 * IMPORTANT:
 *
 * ORIGINAL_INPUT never changes.
 *
 * PREVIOUS_PRODUCT is separate pipeline state.
 *
 * Therefore every stage receives the same
 * immutable base prompt and original input.
 */
let qualityFeedback = null;

if (quality_feedback_file) {
  if (!fs.existsSync(quality_feedback_file)) {
    throw new Error(
      `Quality feedback file not found: ${quality_feedback_file}`
    );
  }

  qualityFeedback = JSON.parse(
    readUtf8(quality_feedback_file)
  );
}
const stageInput = {
  ORIGINAL_INPUT:
    originalInput,

  PREVIOUS_PRODUCT:
    previousProduct,


  QUALITY_FEEDBACK: qualityFeedback
};


const requestEvidence = {

  stage,
  stage_id,
  provider,
  model,

  prompt_sha256:
    sha256(promptText),

  original_input_sha256:
    sha256(inputText),

  previous_product_sha256:
    previousProduct
      ? sha256(
          JSON.stringify(
            previousProduct
          )
        )
      : null,

  has_previous_product:
    previousProduct !== null
};


writeJson(
  path.join(
    output_dir,
    "REQUEST.json"
  ),
  requestEvidence
);


function providerConfigured(provider) {
  if (provider === "gigachat") {
    return Boolean(
      process.env.GIGACHAT_CREDENTIALS?.trim()
    );
  }

  if (provider === "openai") {
    return Boolean(
      process.env.OPENAI_API_KEY?.trim()
    );
  }

  return true;
}

function writeSkippedNotConfigured() {
  const now = new Date().toISOString();

  writeJson(
    path.join(output_dir, "META.json"),
    {
      stage,
      stage_id: stage_id,
      provider,
      model,
      status: "SKIPPED_NOT_CONFIGURED",
      reason: "missing_credentials",
      started_at: now,
      finished_at: now,
      latency_ms: 0
    }
  );

  writeJson(
    path.join(output_dir, "SKIPPED.json"),
    {
      status: "SKIPPED_NOT_CONFIGURED",
      provider,
      model,
      reason: "missing_credentials"
    }
  );

  console.log(
    `STATUS SKIPPED_NOT_CONFIGURED provider=${provider}`
  );

  process.exit(0);
}

if (!providerConfigured(provider)) {
  writeSkippedNotConfigured();
}
const startedAt =
  new Date().toISOString();


const started =
  Date.now();


try {

  let result;


  if (provider === "ollama") {

    process.env.LOCAL_LLM_MODEL =
      model;

    result =
      await generateLocalStructured({
        prompt,
        input: stageInput,
        kind: "newsletter"
      });

  }
  else if (
    provider === "gigachat"
  ) {

    process.env.GIGACHAT_MODEL =
      model;

    result =
      await generateGigaStructured({
        prompt,
        input: stageInput
      });

  }
  else if (
    provider === "openai"
  ) {

    process.env.OPENAI_MODEL =
      model;

    result =
      await generateStructured({
        prompt,
        input: stageInput
      });

  }
  else {

    throw new Error(
      `Unsupported provider: ${provider}`
    );

  }


  const latencyMs =
    Date.now() - started;


  const product =
    normalizeProduct(result);


  writeJson(
    path.join(
      output_dir,
      "PROVIDER_RESULT.json"
    ),
    result
  );


  writeJson(
    path.join(
      output_dir,
      "PRODUCT.json"
    ),
    product
  );


  writeJson(
    path.join(
      output_dir,
      "META.json"
    ),
    {
      stage,
      stage_id,
      provider,
      model,

      status:
        "success",

      started_at:
        startedAt,

      finished_at:
        new Date().toISOString(),

      latency_ms:
        latencyMs,

      prompt_sha256:
        requestEvidence.prompt_sha256,

      original_input_sha256:
        requestEvidence.original_input_sha256,

      previous_product_sha256:
        requestEvidence.previous_product_sha256
    }
  );


  console.log(
    JSON.stringify(
      {
        stage,
        stage_id,
        provider,
        model,
        status: "success",
        latency_ms: latencyMs,
        output_dir
      }
    )
  );


  process.exit(0);

}
catch (error) {

  const latencyMs =
    Date.now() - started;


  const message =
    error?.message ||
    String(error);

  const safeErrorDetails = {
    status_code: error?.statusCode ?? null,
    provider_error: error?.provider ?? provider,
    upstream_preview_length:
      typeof error?.upstream?.preview === "string"
        ? error.upstream.preview.length
        : 0,

  };


  writeJson(
    path.join(
      output_dir,
      "ERROR.json"
    ),
    {
      ...safeErrorDetails,
      error:
        message,

      stack:
        error?.stack || null
    }
  );


  writeJson(
    path.join(
      output_dir,
      "META.json"
    ),
    {
      stage,
      stage_id,
      provider,
      model,

      status:
        "failed",

      started_at:
        startedAt,

      finished_at:
        new Date().toISOString(),

      latency_ms:
        latencyMs,

      error:
        message,

      prompt_sha256:
        requestEvidence.prompt_sha256,

      original_input_sha256:
        requestEvidence.original_input_sha256,

      previous_product_sha256:
        requestEvidence.previous_product_sha256
    }
  );


  console.error(
    `STAGE FAILED: ${stage_id}`
  );

  console.error(
    error?.stack ||
    message
  );


  process.exit(1);
}
