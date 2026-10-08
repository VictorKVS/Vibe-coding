import { execFile } from "node:child_process";
import {
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BASE_URL =
  "https://api.anam.ai";

const CACHE_TTL_MS =
  15 * 60 * 1000;

const workerPath =
  fileURLToPath(
    new URL(
      "./anam_worker.mjs",
      import.meta.url
    )
  );


export function anamHealth() {
  return {
    provider: "anam",

    configured:
      Boolean(
        String(
          process.env.ANAM_API_KEY || ""
        ).trim()
      ),

    baseUrl:
      process.env.ANAM_BASE_URL ||
      DEFAULT_BASE_URL,

    transport:
      "isolated-node-worker",

    cache:
      "15-minute API cache",
  };
}


export async function listAnamAvatars() {
  const payload =
    await loadAnamPayload(
      "avatars"
    );

  return normalizeAnamAvatars(
    payload
  );
}


export async function listAnamVoices() {
  const payload =
    await loadAnamPayload(
      "voices"
    );

  return normalizeAnamVoices(
    payload
  );
}


async function loadAnamPayload(kind) {
  const cacheFile =
    join(
      tmpdir(),
      `father-dz18-anam-${kind}.json`
    );

  // Prefer a fresh response previously obtained
  // from the real Anam API.
  try {
    const info =
      await stat(cacheFile);

    if (
      Date.now() - info.mtimeMs
      < CACHE_TTL_MS
    ) {
      const raw =
        await readFile(
          cacheFile,
          "utf8"
        );

      return JSON.parse(raw);
    }
  }
  catch {
    // No fresh cache. Fetch below.
  }

  try {
    const payload =
      await runWorker(kind);

    await writeFile(
      cacheFile,
      JSON.stringify(payload),
      "utf8"
    );

    return payload;
  }
  catch (error) {
    // If Anam is temporarily slow, allow the
    // last successful real API result.
    try {
      const raw =
        await readFile(
          cacheFile,
          "utf8"
        );

      return JSON.parse(raw);
    }
    catch {
      throw error;
    }
  }
}


function runWorker(kind) {
  return new Promise(
    (resolve, reject) => {

      execFile(
        process.execPath,

        [
          workerPath,
          kind,
        ],

        {
          timeout:
            300000,

          windowsHide:
            true,

          maxBuffer:
            32 * 1024 * 1024,

          env: {
            ...process.env,
          },
        },

        (
          error,
          stdout,
          stderr
        ) => {

          if (error) {
            const wrapped =
              new Error(
                String(
                  stderr ||
                  error.message
                ).trim() ||
                "Anam worker failed."
              );

            wrapped.statusCode =
              502;

            wrapped.provider =
              "anam";

            reject(wrapped);
            return;
          }

          try {
            resolve(
              JSON.parse(stdout)
            );
          }
          catch {
            const wrapped =
              new Error(
                "Anam worker returned invalid JSON."
              );

            wrapped.statusCode =
              502;

            wrapped.provider =
              "anam";

            reject(wrapped);
          }
        }
      );
    }
  );
}


export function normalizeAnamAvatars(
  payload
) {
  return pickArray(
    payload,
    [
      "avatars",
      "items",
      "data",
      "results",
    ]
  )
    .map((item) => ({
      id:
        stringValue(
          item.id ??
          item.avatarId
        ),

      name:
        stringValue(
          item.name ??
          item.displayName ??
          item.display_name
        ) ||
        "Anam avatar",

      previewUrl:
        stringValue(
          item.thumbnailUrl ??
          item.thumbnail_url ??
          item.imageUrl ??
          item.image_url ??
          item.previewUrl
        ) ||
        undefined,
    }))
    .filter(
      (item) => item.id
    );
}


export function normalizeAnamVoices(
  payload
) {
  return pickArray(
    payload,
    [
      "voices",
      "items",
      "data",
      "results",
    ]
  )
    .map((item) => ({
      id:
        stringValue(
          item.id ??
          item.voiceId
        ),

      name:
        stringValue(
          item.name ??
          item.displayName ??
          item.display_name
        ) ||
        "Anam voice",

      language:
        stringValue(
          item.language ??
          item.languageCode ??
          item.locale ??
          item.country
        ) ||
        undefined,

      gender:
        stringValue(
          item.gender
        ) ||
        undefined,

      previewUrl:
        stringValue(
          item.previewUrl ??
          item.preview_url ??
          item.sampleUrl ??
          item.sample_url
        ) ||
        undefined,
    }))
    .filter(
      (item) => item.id
    );
}


function pickArray(
  payload,
  keys
) {
  const candidates = [
    payload,
    payload?.data,
    payload?.result,
  ].filter(Boolean);

  for (
    const candidate
    of candidates
  ) {

    if (
      Array.isArray(candidate)
    ) {
      return candidate;
    }

    for (
      const key
      of keys
    ) {

      if (
        Array.isArray(
          candidate?.[key]
        )
      ) {
        return candidate[key];
      }
    }
  }

  return [];
}


function stringValue(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}
