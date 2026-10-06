import test from "node:test";
import assert from "node:assert/strict";

import {
  didHealth,
  listDidPresenters,
  listDidVoices,
} from "./did.mjs";


test(
  "D-ID health does not expose API key",
  async () => {

    const old =
      process.env.DID_API_KEY;

    process.env.DID_API_KEY =
      "user:test-secret";

    try {
      const health =
        didHealth();

      assert.equal(
        health.configured,
        true
      );

      assert.equal(
        JSON.stringify(
          health
        ).includes(
          "test-secret"
        ),
        false
      );
    }
    finally {
      if (old === undefined) {
        delete process.env.DID_API_KEY;
      }
      else {
        process.env.DID_API_KEY =
          old;
      }
    }
  }
);


test(
  "D-ID presenters normalize to AvatarDto",
  async () => {

    const oldKey =
      process.env.DID_API_KEY;

    const oldFetch =
      globalThis.fetch;

    process.env.DID_API_KEY =
      "demo:secret";

    globalThis.fetch =
      async (
        url,
        options
      ) => {

        assert.equal(
          String(url),
          "https://api.d-id.com/clips/presenters?limit=100"
        );

        assert.match(
          options.headers.Authorization,
          /^Basic /
        );

        return fakeResponse([
          {
            presenter_id:
              "presenter-1",

            name:
              "Amber",

            thumbnail_url:
              "https://example.test/amber.jpg",
          },
        ]);
      };

    try {
      const items =
        await listDidPresenters();

      assert.equal(
        items.length,
        1
      );

      assert.equal(
        items[0].id,
        "presenter-1"
      );

      assert.equal(
        items[0].name,
        "Amber"
      );
    }
    finally {
      globalThis.fetch =
        oldFetch;

      if (oldKey === undefined) {
        delete process.env.DID_API_KEY;
      }
      else {
        process.env.DID_API_KEY =
          oldKey;
      }
    }
  }
);


test(
  "D-ID voices normalize to VoiceDto",
  async () => {

    const oldKey =
      process.env.DID_API_KEY;

    const oldFetch =
      globalThis.fetch;

    process.env.DID_API_KEY =
      "demo:secret";

    globalThis.fetch =
      async () =>
        fakeResponse([
          {
            id:
              "ru-RU-SvetlanaNeural",

            name:
              "Svetlana",

            language:
              "ru-RU",

            gender:
              "Female",
          },
        ]);

    try {
      const items =
        await listDidVoices();

      assert.equal(
        items.length,
        1
      );

      assert.equal(
        items[0].id,
        "ru-RU-SvetlanaNeural"
      );

      assert.equal(
        items[0].language,
        "ru-RU"
      );
    }
    finally {
      globalThis.fetch =
        oldFetch;

      if (oldKey === undefined) {
        delete process.env.DID_API_KEY;
      }
      else {
        process.env.DID_API_KEY =
          oldKey;
      }
    }
  }
);


function fakeResponse(payload) {
  return {
    ok: true,
    status: 200,

    text: async () =>
      JSON.stringify(payload),
  };
}
