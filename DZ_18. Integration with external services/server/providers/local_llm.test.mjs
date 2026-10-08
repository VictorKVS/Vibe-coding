import test from "node:test";
import assert from "node:assert/strict";

import {
  localLlmHealth,
} from "./local_llm.mjs";


test(
  "Local LLM health does not expose file paths",
  () => {

    const oldCli =
      process.env.LOCAL_LLM_CLI;

    const oldModel =
      process.env.LOCAL_LLM_MODEL;


    process.env.LOCAL_LLM_CLI =
      "C:\\missing\\llama-cli.exe";

    process.env.LOCAL_LLM_MODEL =
      "C:\\missing\\model.gguf";


    try {

      const health =
        localLlmHealth();


      assert.equal(
        health.provider,
        "local"
      );


      assert.equal(
        JSON.stringify(health)
          .includes("C:\\missing"),
        false
      );
    }
    finally {

      if (oldCli === undefined) {
        delete process.env.LOCAL_LLM_CLI;
      }
      else {
        process.env.LOCAL_LLM_CLI =
          oldCli;
      }


      if (oldModel === undefined) {
        delete process.env.LOCAL_LLM_MODEL;
      }
      else {
        process.env.LOCAL_LLM_MODEL =
          oldModel;
      }
    }
  }
);
