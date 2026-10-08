import "dotenv/config";

import fs from "node:fs";
import crypto from "node:crypto";

import {
  generateLocalStructured
} from "../server/providers/local_llm.mjs";


function readUtf8(file) {
  return fs
    .readFileSync(file, "utf8")
    .replace(/^\uFEFF/, "");
}


function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex")
    .toUpperCase();
}


const promptText =
  readUtf8(
    "./ALINA_LLM_FACTORY/00_COMMON/PROMPT.md"
  );


const inputText =
  readUtf8(
    "./ALINA_LLM_FACTORY/00_COMMON/INPUT.json"
  );


const input =
  JSON.parse(inputText);


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
  id: "alina.factory.smoke",
  version: "1.0.0",
  instructions: promptText,
  schema
};


console.log("");
console.log("==========================================");
console.log(" ALINA FACTORY — QWEN 7B SMOKE TEST");
console.log("==========================================");

console.log(
  "PROMPT_SHA256:",
  sha256(promptText)
);

console.log(
  "INPUT_SHA256 :",
  sha256(inputText)
);

console.log(
  "MODEL        :",
  "qwen2.5:7b"
);

console.log("");


process.env.LOCAL_LLM_MODEL =
  "qwen2.5:7b";


const started =
  Date.now();


try {

  const result =
    await generateLocalStructured({
      prompt,
      input,
      kind: "newsletter"
    });


  const latency =
    Date.now() - started;


  console.log(
    "STATUS       : SUCCESS"
  );

  console.log(
    "LATENCY_MS   :",
    latency
  );

  console.log("");
  console.log(
    "=== PRODUCT ==="
  );

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );


  fs.writeFileSync(
    "./ALINA_LLM_FACTORY/QWEN7B_SMOKE_RESULT.json",
    JSON.stringify(
      {
        status: "success",
        model: "qwen2.5:7b",
        latency_ms: latency,
        prompt_sha256: sha256(promptText),
        input_sha256: sha256(inputText),
        result
      },
      null,
      2
    ),
    "utf8"
  );


  console.log("");
  console.log(
    "RESULT SAVED:"
  );

  console.log(
    "ALINA_LLM_FACTORY/QWEN7B_SMOKE_RESULT.json"
  );

}
catch (error) {

  const latency =
    Date.now() - started;


  console.error(
    "STATUS       : FAILED"
  );

  console.error(
    "LATENCY_MS   :",
    latency
  );

  console.error(
    "ERROR        :",
    error?.stack ||
    error?.message ||
    String(error)
  );


  fs.writeFileSync(
    "./ALINA_LLM_FACTORY/QWEN7B_SMOKE_ERROR.json",
    JSON.stringify(
      {
        status: "failed",
        model: "qwen2.5:7b",
        latency_ms: latency,
        error:
          error?.message ||
          String(error)
      },
      null,
      2
    ),
    "utf8"
  );


  process.exitCode = 1;
}
