import test from "node:test";
import assert from "node:assert/strict";

import {
  anamHealth,
  normalizeAnamAvatars,
  normalizeAnamVoices,
} from "./anam.mjs";


test(
  "Anam health does not expose API key",
  () => {
    const old =
      process.env.ANAM_API_KEY;

    process.env.ANAM_API_KEY =
      "anam-test-secret";

    try {
      const health =
        anamHealth();

      assert.equal(
        health.configured,
        true
      );

      assert.equal(
        JSON.stringify(health)
          .includes("anam-test-secret"),
        false
      );
    }
    finally {
      if (old === undefined) {
        delete process.env.ANAM_API_KEY;
      }
      else {
        process.env.ANAM_API_KEY = old;
      }
    }
  }
);


test(
  "Anam avatars normalize",
  () => {

    const items =
      normalizeAnamAvatars({
        data: [
          {
            id: "avatar-1",
            name: "Mia",
            imageUrl:
              "https://example.test/mia.jpg",
          },
        ],
      });

    assert.equal(
      items.length,
      1
    );

    assert.equal(
      items[0].id,
      "avatar-1"
    );

    assert.equal(
      items[0].name,
      "Mia"
    );

    assert.equal(
      items[0].previewUrl,
      "https://example.test/mia.jpg"
    );
  }
);


test(
  "Anam voices normalize",
  () => {

    const items =
      normalizeAnamVoices({
        data: [
          {
            id: "voice-1",
            displayName: "Cara",
            language: "English",
            gender: "female",
          },
        ],
      });

    assert.equal(
      items.length,
      1
    );

    assert.equal(
      items[0].id,
      "voice-1"
    );

    assert.equal(
      items[0].name,
      "Cara"
    );

    assert.equal(
      items[0].language,
      "English"
    );

    assert.equal(
      items[0].gender,
      "female"
    );
  }
);
