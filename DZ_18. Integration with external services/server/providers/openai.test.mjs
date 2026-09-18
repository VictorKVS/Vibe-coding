import test from "node:test";
import assert from "node:assert/strict";
import { generateStructured, openaiHealth } from "./openai.mjs";
import { getPrompt } from "../prompts/registry.mjs";

test("OpenAI health never exposes the API key", async () => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "openai-test-secret";

  try {
    const health = await openaiHealth();
    assert.equal(health.configured, true);
    assert.equal(JSON.stringify(health).includes("openai-test-secret"), false);
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});

test("structured generation uses Responses API with strict schema and store false", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.OPENAI_MODEL;
  const previousFetch = globalThis.fetch;

  process.env.OPENAI_API_KEY = "test-key";
  process.env.OPENAI_MODEL = "test-model";

  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://api.openai.com/v1/responses");
    assert.equal(options.headers.Authorization, "Bearer test-key");

    const body = JSON.parse(options.body);
    assert.equal(body.model, "test-model");
    assert.equal(body.store, false);
    assert.equal(body.text.format.type, "json_schema");
    assert.equal(body.text.format.strict, true);

    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    subject: "Subject",
                    preheader: "Preheader",
                    body: "Body",
                    cta: "CTA",
                    imageBrief: "Image",
                  }),
                },
              ],
            },
          ],
        }),
    };
  };

  try {
    const result = await generateStructured({
      prompt: getPrompt("newsletter"),
      input: { topic: "test" },
    });

    assert.equal(result.provider, "openai");
    assert.equal(result.promptId, "father.newsletter");
    assert.equal(result.data.subject, "Subject");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = previousModel;
  }
});
