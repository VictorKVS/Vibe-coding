import test from "node:test";
import assert from "node:assert/strict";

import {
  gigachatHealth,
} from "./gigachat.mjs";

test(
  "GigaChat health does not expose credentials",
  () => {
    const old =
      process.env.GIGACHAT_CREDENTIALS;

    process.env.GIGACHAT_CREDENTIALS =
      "super-secret-key";

    try {
      const health =
        gigachatHealth();

      assert.equal(
        health.configured,
        true
      );

      assert.equal(
        JSON.stringify(health)
          .includes("super-secret-key"),
        false
      );
    }
    finally {
      if (old === undefined) {
        delete process.env.GIGACHAT_CREDENTIALS;
      }
      else {
        process.env.GIGACHAT_CREDENTIALS =
          old;
      }
    }
  }
);
