import test from "node:test";
import assert from "node:assert/strict";
import {
  heygenHealth,
  listHeygenAvatars,
  listHeygenVoices,
} from "./heygen.mjs";

test("health reports configuration without exposing the API key", async () => {
  const previous = process.env.HEYGEN_API_KEY;
  process.env.HEYGEN_API_KEY = "test-secret-never-return";

  try {
    const health = await heygenHealth();
    assert.equal(health.configured, true);
    assert.equal(JSON.stringify(health).includes("test-secret-never-return"), false);
  } finally {
    if (previous === undefined) delete process.env.HEYGEN_API_KEY;
    else process.env.HEYGEN_API_KEY = previous;
  }
});

test("v3 avatar groups and looks normalize to provider DTO", async () => {
  const previousKey = process.env.HEYGEN_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.HEYGEN_API_KEY = "test-key";

  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers["X-Api-Key"], "test-key");
    return fakeResponse({
      data: {
        avatar_groups: [
          {
            id: "group-1",
            name: "Presenter",
            looks: [
              {
                id: "look-1",
                look_name: "Presenter Office",
                preview_image_url: "https://example.test/avatar.webp",
              },
            ],
          },
        ],
      },
    });
  };

  try {
    const avatars = await listHeygenAvatars();
    assert.equal(avatars.length, 1);
    assert.equal(avatars[0].id, "look-1");
    assert.equal(avatars[0].name, "Presenter Office");
    assert.equal(avatars[0].groupId, "group-1");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.HEYGEN_API_KEY;
    else process.env.HEYGEN_API_KEY = previousKey;
  }
});

test("v3 voices normalize to provider DTO", async () => {
  const previousKey = process.env.HEYGEN_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.HEYGEN_API_KEY = "test-key";

  globalThis.fetch = async () =>
    fakeResponse({
      data: {
        voices: [
          {
            voice_id: "voice-1",
            name: "Demo Voice",
            language: "Russian",
            gender: "female",
            preview_audio: "https://example.test/voice.mp3",
          },
        ],
      },
    });

  try {
    const voices = await listHeygenVoices();
    assert.deepEqual(voices[0], {
      id: "voice-1",
      name: "Demo Voice",
      language: "Russian",
      gender: "female",
      previewUrl: "https://example.test/voice.mp3",
    });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.HEYGEN_API_KEY;
    else process.env.HEYGEN_API_KEY = previousKey;
  }
});

function fakeResponse(payload) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(payload),
  };
}
