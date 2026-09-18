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


test("video agent create sends avatar, voice, script, and orientation", async () => {
  const previousKey = process.env.HEYGEN_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.HEYGEN_API_KEY = "test-key";

  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://api.heygen.com/v3/video-agents");
    assert.equal(options.method, "POST");
    const body = JSON.parse(options.body);
    assert.equal(body.mode, "generate");
    assert.equal(body.avatar_id, "avatar-1");
    assert.equal(body.voice_id, "voice-1");
    assert.equal(body.prompt, "Hello from FATHER");
    assert.equal(body.orientation, "portrait");
    return fakeResponse({
      data: {
        session_id: "session-1",
        status: "generating",
        video_id: null,
      },
    });
  };

  try {
    const { createHeygenVideo } = await import("./heygen.mjs");
    const job = await createHeygenVideo({
      avatarId: "avatar-1",
      voiceId: "voice-1",
      script: "Hello from FATHER",
      orientation: "portrait",
    });
    assert.equal(job.sessionId, "session-1");
    assert.equal(job.status, "generating");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.HEYGEN_API_KEY;
    else process.env.HEYGEN_API_KEY = previousKey;
  }
});

test("video job status resolves completed video URL", async () => {
  const previousKey = process.env.HEYGEN_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.HEYGEN_API_KEY = "test-key";

  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/v3/video-agents/session-1")) {
      return fakeResponse({
        data: {
          session_id: "session-1",
          status: "completed",
          progress: 100,
          video_id: "video-1",
        },
      });
    }
    if (String(url).endsWith("/v3/videos/video-1")) {
      return fakeResponse({
        data: {
          id: "video-1",
          status: "completed",
          video_url: "https://example.test/video.mp4",
          thumbnail_url: "https://example.test/thumb.webp",
          duration: 12.5,
        },
      });
    }
    throw new Error("unexpected url");
  };

  try {
    const { getHeygenVideoJob } = await import("./heygen.mjs");
    const job = await getHeygenVideoJob("session-1");
    assert.equal(job.status, "completed");
    assert.equal(job.videoId, "video-1");
    assert.equal(job.videoUrl, "https://example.test/video.mp4");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.HEYGEN_API_KEY;
    else process.env.HEYGEN_API_KEY = previousKey;
  }
});
