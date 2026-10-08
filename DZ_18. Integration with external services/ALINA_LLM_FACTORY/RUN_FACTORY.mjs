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


const FACTORY =
  path.resolve("ALINA_LLM_FACTORY");

const COMMON =
  path.join(FACTORY, "00_COMMON");

const RUNS =
  path.join(FACTORY, "RUNS");

const LATEST =
  path.join(FACTORY, "FINAL");


function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex")
    .toUpperCase();
}


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


function writeText(file, value) {
  fs.mkdirSync(
    path.dirname(file),
    { recursive: true }
  );

  fs.writeFileSync(
    file,
    String(value ?? ""),
    "utf8"
  );
}


function safeName(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}


function utcId() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-");
}


const promptText =
  readUtf8(
    path.join(COMMON, "PROMPT.md")
  );

const inputText =
  readUtf8(
    path.join(COMMON, "INPUT.json")
  );

const originalInput =
  JSON.parse(inputText);


const productSchema = {
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


const factoryPrompt = {
  id:
    "father.multi-llm.factory",

  version:
    "1.0.0",

  instructions:
    promptText,

  schema:
    productSchema
};


/*
 * MAIN PRODUCTION CHAIN.
 *
 * llama3.2:1b is deliberately excluded:
 * it already caused a blocking run.
 *
 * coder models are not useful as the main
 * marketing-production chain.
 *
 * llava is also excluded because this task
 * is text-only.
 */
const stages = [
  {
    id: "01_qwen25_7b",
    provider: "local",
    model: "qwen2.5:7b",
    display: "Qwen 2.5 7B"
  },

  {
    id: "02_deepseek_r1_7b",
    provider: "local",
    model: "deepseek-r1:7b",
    display: "DeepSeek R1 7B"
  },

  {
    id: "03_qwen3_vl_8b",
    provider: "local",
    model: "qwen3-vl:8b-instruct-q4_K_M",
    display: "Qwen3 VL 8B"
  },

  {
    id: "04_gigachat_2",
    provider: "gigachat",
    model: "GigaChat-2",
    display: "GigaChat-2"
  },

  {
    id: "05_openai",
    provider: "openai",
    model: process.env.OPENAI_MODEL || "configured-openai-model",
    display: process.env.OPENAI_MODEL || "OpenAI"
  }
];


const runId =
  `run-${utcId()}`;

const runDir =
  path.join(RUNS, runId);

fs.mkdirSync(
  runDir,
  { recursive: true }
);


/*
 * Freeze exact evidence used by this run.
 */
const runCommon =
  path.join(runDir, "00_COMMON");

fs.mkdirSync(
  runCommon,
  { recursive: true }
);

fs.copyFileSync(
  path.join(COMMON, "PROMPT.md"),
  path.join(runCommon, "PROMPT.md")
);

fs.copyFileSync(
  path.join(COMMON, "INPUT.json"),
  path.join(runCommon, "INPUT.json")
);

const promptHash =
  sha256(promptText);

const inputHash =
  sha256(inputText);

writeJson(
  path.join(runCommon, "HASHES.json"),
  {
    prompt_sha256:
      promptHash,

    input_sha256:
      inputHash
  }
);


let previousProduct = null;

let lastSuccessfulProduct = null;

let lastSuccessfulStage = null;

const manifest = {
  run_id:
    runId,

  started_at:
    new Date().toISOString(),

  prompt_sha256:
    promptHash,

  input_sha256:
    inputHash,

  execution:
    "sequential",

  previous_product_passed:
    true,

  stages:
    []
};


console.log("");
console.log("============================================================");
console.log(" ALINA MULTI-LLM FACTORY");
console.log("============================================================");
console.log("RUN:", runId);
console.log("PROMPT SHA256:", promptHash);
console.log("INPUT  SHA256:", inputHash);
console.log("");


for (
  let index = 0;
  index < stages.length;
  index++
) {
  const stage =
    stages[index];

  const stageDir =
    path.join(
      runDir,
      stage.id
    );

  fs.mkdirSync(
    stageDir,
    { recursive: true }
  );


  const previousText =
    previousProduct
      ? JSON.stringify(
          previousProduct,
          null,
          2
        )
      : "";


  const previousHash =
    previousText
      ? sha256(previousText)
      : null;


  /*
   * IMPORTANT:
   *
   * Base PROMPT and original INPUT remain immutable.
   * PREVIOUS_PRODUCT is separate pipeline data.
   */
  const modelInput = {
    ORIGINAL_INPUT:
      originalInput,

    PREVIOUS_PRODUCT:
      previousProduct
  };


  writeJson(
    path.join(stageDir, "REQUEST.json"),
    {
      run_id:
        runId,

      stage:
        index + 1,

      stage_id:
        stage.id,

      provider:
        stage.provider,

      model:
        stage.model,

      prompt_sha256:
        promptHash,

      input_sha256:
        inputHash,

      previous_product_sha256:
        previousHash,

      input:
        modelInput
    }
  );


  const started =
    Date.now();

  const startedAt =
    new Date().toISOString();


  console.log("------------------------------------------------------------");
  console.log(
    `STAGE ${String(index + 1).padStart(2, "0")}`
  );
  console.log("PROVIDER:", stage.provider);
  console.log("MODEL   :", stage.model);
  console.log("------------------------------------------------------------");


  let result = null;

  let status = "FAILED";

  let errorInfo = null;


  try {
    if (stage.provider === "local") {
      /*
       * generateLocalStructured reads the model
       * from process.env on every invocation.
       */
      process.env.OLLAMA_MODEL =
        stage.model;

      process.env.LOCAL_LLM_NAME =
        stage.display;

      result =
        await generateLocalStructured({
          prompt:
            factoryPrompt,

          input:
            modelInput,

          kind:
            "factory"
        });
    }

    else if (
      stage.provider === "gigachat"
    ) {
      result =
        await generateGigaStructured({
          prompt:
            factoryPrompt,

          input:
            modelInput
        });
    }

    else if (
      stage.provider === "openai"
    ) {
      result =
        await generateStructured({
          prompt:
            factoryPrompt,

          input:
            modelInput
        });
    }

    else {
      throw new Error(
        `Unknown provider: ${stage.provider}`
      );
    }


    if (
      !result?.data ||
      typeof result.data !== "object"
    ) {
      throw new Error(
        "Provider returned no structured product."
      );
    }


    previousProduct =
      result.data;

    lastSuccessfulProduct =
      result.data;

    lastSuccessfulStage =
      stage.id;

    status =
      "SUCCESS";


    writeJson(
      path.join(
        stageDir,
        "PRODUCT.json"
      ),
      result.data
    );


    writeJson(
      path.join(
        stageDir,
        "PROVIDER_RESULT.json"
      ),
      result
    );


    console.log(
      "STATUS  : SUCCESS"
    );

    console.log(
      "CONFIDENCE:",
      result.data.confidence
    );
  }

  catch (error) {
    errorInfo = {
      name:
        error?.name || "Error",

      message:
        error?.message ||
        String(error),

      provider:
        error?.provider ||
        stage.provider,

      statusCode:
        error?.statusCode ||
        null,

      upstream:
        error?.upstream ||
        null
    };


    writeJson(
      path.join(
        stageDir,
        "ERROR.json"
      ),
      errorInfo
    );


    console.error(
      "STATUS  : FAILED"
    );

    console.error(
      "ERROR   :",
      errorInfo.message
    );

    /*
     * DO NOT reset previousProduct.
     *
     * The next model continues from the
     * last successful product.
     */
  }


  const ended =
    Date.now();

  const stageMeta = {
    run_id:
      runId,

    stage:
      index + 1,

    stage_id:
      stage.id,

    provider:
      stage.provider,

    model:
      stage.model,

    display:
      stage.display,

    status,

    started_at:
      startedAt,

    finished_at:
      new Date().toISOString(),

    latency_ms:
      ended - started,

    prompt_sha256:
      promptHash,

    input_sha256:
      inputHash,

    previous_product_sha256:
      previousHash,

    product_sha256:
      status === "SUCCESS"
        ? sha256(
            JSON.stringify(
              result.data,
              null,
              2
            )
          )
        : null,

    error:
      errorInfo
  };


  writeJson(
    path.join(
      stageDir,
      "META.json"
    ),
    stageMeta
  );


  manifest.stages.push(
    stageMeta
  );


  /*
   * Release Ollama model after local stage.
   * Failure here must NOT fail the factory.
   */
  if (stage.provider === "local") {
    try {
      const stop =
        await fetch(
          "http://127.0.0.1:11434/api/generate",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                model:
                  stage.model,

                prompt:
                  "",

                keep_alive:
                  0,

                stream:
                  false
              })
          }
        );

      await stop.text();

      console.log(
        "OLLAMA : RELEASE REQUEST SENT"
      );
    }
    catch (releaseError) {
      console.log(
        "OLLAMA : RELEASE WARNING:",
        releaseError?.message ||
        String(releaseError)
      );
    }
  }


  console.log("");
}


const finalDir =
  path.join(
    runDir,
    "FINAL"
  );

fs.mkdirSync(
  finalDir,
  { recursive: true }
);


manifest.finished_at =
  new Date().toISOString();

manifest.last_successful_stage =
  lastSuccessfulStage;

manifest.success_count =
  manifest.stages.filter(
    x => x.status === "SUCCESS"
  ).length;

manifest.failed_count =
  manifest.stages.filter(
    x => x.status === "FAILED"
  ).length;


if (lastSuccessfulProduct) {
  writeJson(
    path.join(
      finalDir,
      "PRODUCT.json"
    ),
    lastSuccessfulProduct
  );
}
else {
  writeJson(
    path.join(
      finalDir,
      "PRODUCT.json"
    ),
    {
      error:
        "No stage produced a valid product."
    }
  );
}


writeJson(
  path.join(
    finalDir,
    "MANIFEST.json"
  ),
  manifest
);


/*
 * Update top-level FINAL only after
 * the run has completed.
 */
fs.rmSync(
  LATEST,
  {
    recursive: true,
    force: true
  }
);

fs.mkdirSync(
  LATEST,
  { recursive: true }
);

fs.copyFileSync(
  path.join(
    finalDir,
    "PRODUCT.json"
  ),
  path.join(
    LATEST,
    "PRODUCT.json"
  )
);

fs.copyFileSync(
  path.join(
    finalDir,
    "MANIFEST.json"
  ),
  path.join(
    LATEST,
    "MANIFEST.json"
  )
);


writeText(
  path.join(
    LATEST,
    "LATEST_RUN.txt"
  ),
  runId
);


console.log("");
console.log("============================================================");
console.log(" FACTORY COMPLETE");
console.log("============================================================");
console.log("RUN:", runId);
console.log(
  "SUCCESS:",
  manifest.success_count
);
console.log(
  "FAILED :",
  manifest.failed_count
);
console.log(
  "FINAL  :",
  lastSuccessfulStage
);
console.log(
  "PATH   :",
  finalDir
);
console.log("============================================================");
console.log("");
