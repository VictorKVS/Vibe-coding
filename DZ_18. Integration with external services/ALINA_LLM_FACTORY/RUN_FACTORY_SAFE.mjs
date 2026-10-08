import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";


const ROOT =
  process.cwd();

const FACTORY =
  path.join(
    ROOT,
    "ALINA_LLM_FACTORY"
  );

const COMMON =
  path.join(
    FACTORY,
    "00_COMMON"
  );

const RUNS =
  path.join(
    FACTORY,
    "RUNS"
  );

const FINAL =
  path.join(
    FACTORY,
    "FINAL"
  );

const STAGE_WORKER =
  path.join(
    FACTORY,
    "STAGE_WORKER.mjs"
  );

const PROMPT_FILE =
  path.join(
    COMMON,
    "PROMPT.md"
  );

const INPUT_FILE =
  path.join(
    COMMON,
    "INPUT.json"
  );


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


function timestamp() {

  return new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+/, "")
    .replace("T", "-");
}


async function killTree(pid) {

  if (!pid) {
    return;
  }

  if (process.platform === "win32") {

    await new Promise(
      (resolve) => {

        const killer =
          spawn(
            "taskkill",
            [
              "/PID",
              String(pid),
              "/T",
              "/F"
            ],
            {
              stdio: "ignore",
              windowsHide: true
            }
          );

        killer.on(
          "close",
          resolve
        );

        killer.on(
          "error",
          resolve
        );
      }
    );

    return;
  }

  try {
    process.kill(
      pid,
      "SIGKILL"
    );
  }
  catch {
    // already exited
  }
}


function runStage(
  configFile,
  timeoutSeconds
) {

  return new Promise(
    (resolve) => {

      const started =
        Date.now();

      let settled =
        false;

      let timedOut =
        false;


      const child =
        spawn(
          process.execPath,
          [
            STAGE_WORKER,
            configFile
          ],
          {
            stdio: "inherit",
            windowsHide: false
          }
        );


      const finish =
        (value) => {

          if (settled) {
            return;
          }

          settled =
            true;

          clearTimeout(timer);

          resolve(value);
        };


      const timer =
        setTimeout(
          async () => {

            timedOut =
              true;

            console.error("");
            console.error(
              "WATCHDOG TIMEOUT"
            );

            console.error(
              `PID=${child.pid}`
            );

            await killTree(
              child.pid
            );

            finish({
              status:
                "timeout",

              exit_code:
                124,

              latency_ms:
                Date.now() - started
            });

          },
          timeoutSeconds * 1000
        );


      child.on(
        "error",
        (error) => {

          finish({
            status:
              "spawn_error",

            exit_code:
              1,

            latency_ms:
              Date.now() - started,

            error:
              error?.message ||
              String(error)
          });
        }
      );


      child.on(
        "close",
        (code, signal) => {

          if (timedOut) {
            return;
          }

          finish({
            status:
              code === 0
                ? "success"
                : "failed",

            exit_code:
              code,

            signal:
              signal ?? null,

            latency_ms:
              Date.now() - started
          });
        }
      );
    }
  );
}


/*
 * Phase A.
 *
 * Only models for which an adapter already exists.
 *
 * GGUF / llama.cpp models will be added separately
 * after their executable/model paths are confirmed.
 */
const stages = [

  {
    stage:
      1,

    stage_id:
      "01_qwen25_7b",

    provider:
      "ollama",

    model:
      "qwen2.5:7b",

    timeout_seconds:
      240
  },

  {
    stage:
      2,

    stage_id:
      "02_deepseek_r1_7b",

    provider:
      "ollama",

    model:
      "deepseek-r1:7b",

    timeout_seconds:
      300
  },

  {
    stage:
      3,

    stage_id:
      "03_qwen3_vl_8b",

    provider:
      "ollama",

    model:
      "qwen3-vl:8b-instruct-q4_K_M",

    timeout_seconds:
      300
  },

  {
    stage:
      4,

    stage_id:
      "04_gigachat",

    provider:
      "gigachat",

    model:
      process.env.GIGACHAT_MODEL ||
      "GigaChat-2",

    timeout_seconds:
      180
  },

  {
    stage:
      5,

    stage_id:
      "05_openai",

    provider:
      "openai",

    model:
      process.env.OPENAI_MODEL ||
      "gpt-5.6-luna",

    timeout_seconds:
      180
  }
];


const promptText =
  readUtf8(
    PROMPT_FILE
  );


const inputText =
  readUtf8(
    INPUT_FILE
  );


JSON.parse(
  inputText
);


const runId =
  timestamp();


const runDir =
  path.join(
    RUNS,
    runId
  );


fs.mkdirSync(
  runDir,
  {
    recursive: true
  }
);


const runCommon =
  path.join(
    runDir,
    "00_COMMON"
  );


fs.mkdirSync(
  runCommon,
  {
    recursive: true
  }
);


fs.copyFileSync(
  PROMPT_FILE,
  path.join(
    runCommon,
    "PROMPT.md"
  )
);


fs.copyFileSync(
  INPUT_FILE,
  path.join(
    runCommon,
    "INPUT.json"
  )
);


writeJson(
  path.join(
    runCommon,
    "HASHES.json"
  ),
  {
    prompt_canonical_sha256:
      sha256(promptText),

    input_canonical_sha256:
      sha256(inputText)
  }
);


writeJson(
  path.join(
    runCommon,
    "PIPELINE.json"
  ),
  {
    run_id:
      runId,

    mode:
      "phase-a",

    stages
  }
);


console.log("");
console.log(
  "=========================================="
);

console.log(
  " ALINA MULTI-LLM FACTORY"
);

console.log(
  "=========================================="
);

console.log(
  "RUN_ID:",
  runId
);

console.log(
  "PROMPT_SHA256:",
  sha256(promptText)
);

console.log(
  "INPUT_SHA256:",
  sha256(inputText)
);

console.log(
  "STAGES:",
  stages.length
);

console.log("");


let previousProductFile =
  null;

let lastSuccessfulProduct =
  null;

const manifestStages =
  [];


for (
  const stage of stages
) {

  console.log("");
  console.log(
    "=========================================="
  );

  console.log(
    ` STAGE ${stage.stage}/${stages.length}`
  );

  console.log(
    stage.stage_id
  );

  console.log(
    `${stage.provider} / ${stage.model}`
  );

  console.log(
    "=========================================="
  );


  const outputDir =
    path.join(
      runDir,
      stage.stage_id
    );


  fs.mkdirSync(
    outputDir,
    {
      recursive: true
    }
  );


  const configFile =
    path.join(
      outputDir,
      "STAGE_CONFIG.json"
    );


  const config = {

    stage:
      stage.stage,

    stage_id:
      stage.stage_id,

    provider:
      stage.provider,

    model:
      stage.model,

    prompt_file:
      path.join(
        runCommon,
        "PROMPT.md"
      ),

    input_file:
      path.join(
        runCommon,
        "INPUT.json"
      ),

    previous_product_file:
      previousProductFile,

    output_dir:
      outputDir
  };


  writeJson(
    configFile,
    config
  );


  const execution =
    await runStage(
      configFile,
      stage.timeout_seconds
    );


  const productFile =
    path.join(
      outputDir,
      "PRODUCT.json"
    );


  if (
    execution.status === "success" &&
    (() => {
      const metaPath = path.join(outputDir, "META.json");
      if (!fs.existsSync(metaPath)) return false;
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        return meta.status === "success";
      } catch {
        return false;
      }
    })() &&
    fs.existsSync(productFile)
  ) {

    previousProductFile =
      productFile;

    lastSuccessfulProduct =
      productFile;

  }


  /*
   * If watchdog killed the worker before it could
   * write META.json, parent creates timeout META.
   */
  const metaFile =
    path.join(
      outputDir,
      "META.json"
    );


  if (
    execution.status === "timeout" &&
    !fs.existsSync(metaFile)
  ) {

    writeJson(
      metaFile,
      {
        stage:
          stage.stage,

        stage_id:
          stage.stage_id,

        provider:
          stage.provider,

        model:
          stage.model,

        status:
          "timeout",

        timeout_seconds:
          stage.timeout_seconds,

        latency_ms:
          execution.latency_ms
      }
    );
  }


  manifestStages.push({
    stage:
      stage.stage,

    stage_id:
      stage.stage_id,

    provider:
      stage.provider,

    model:
      stage.model,

    status:
      (() => {
        if (execution.status !== "success") {
          return execution.status;
        }

        const metaPath = path.join(outputDir, "META.json");

        if (!fs.existsSync(metaPath)) {
          return "failed";
        }

        try {
          const meta = JSON.parse(
            fs.readFileSync(metaPath, "utf8")
          );

          if (meta.status !== "success") {
            return typeof meta.status === "string"
              ? meta.status
              : "failed";
          }

          return fs.existsSync(productFile)
            ? "success"
            : "failed";
        } catch {
          return "failed";
        }
      })(),

    exit_code:
      execution.exit_code,

    latency_ms:
      execution.latency_ms,

    product_created:
      fs.existsSync(
        productFile
      )
  });


  /*
   * Release Ollama model after every local stage.
   */
  if (
    stage.provider === "ollama"
  ) {

    await new Promise(
      (resolve) => {

        const stopper =
          spawn(
            "ollama",
            [
              "stop",
              stage.model
            ],
            {
              stdio: "ignore",
              windowsHide: true
            }
          );

        stopper.on(
          "close",
          resolve
        );

        stopper.on(
          "error",
          resolve
        );
      }
    );
  }
}


const finalDir =
  path.join(
    runDir,
    "FINAL"
  );


fs.mkdirSync(
  finalDir,
  {
    recursive: true
  }
);


if (
  lastSuccessfulProduct
) {

  fs.copyFileSync(
    lastSuccessfulProduct,
    path.join(
      finalDir,
      "PRODUCT.json"
    )
  );

}


const manifest = {

  run_id:
    runId,

  started_from:
    "ALINA_LLM_FACTORY",

  prompt_sha256:
    sha256(promptText),

  original_input_sha256:
    sha256(inputText),

  stages:
    manifestStages,

  successful_stages:
    manifestStages
      .filter(
        item =>
          item.status === "success" &&
          item.product_created
      )
      .length,

  total_stages:
    stages.length,

  final_product_created:
    Boolean(
      lastSuccessfulProduct
    ),

  completed_at:
    new Date().toISOString()
};


writeJson(
  path.join(
    finalDir,
    "MANIFEST.json"
  ),
  manifest
);


/*
 * Update top-level FINAL only when
 * at least one stage succeeded.
 */
if (
  lastSuccessfulProduct
) {

  fs.mkdirSync(
    FINAL,
    {
      recursive: true
    }
  );


  fs.copyFileSync(
    lastSuccessfulProduct,
    path.join(
      FINAL,
      "PRODUCT.json"
    )
  );


  writeJson(
    path.join(
      FINAL,
      "MANIFEST.json"
    ),
    manifest
  );
}


console.log("");
console.log(
  "=========================================="
);

console.log(
  " FACTORY COMPLETE"
);

console.log(
  "=========================================="
);

console.log(
  "RUN:",
  runDir
);

console.log(
  "SUCCESS:",
  manifest.successful_stages,
  "/",
  manifest.total_stages
);

console.log(
  "FINAL:",
  manifest.final_product_created
);


process.exit(
  lastSuccessfulProduct
    ? 0
    : 1
);
