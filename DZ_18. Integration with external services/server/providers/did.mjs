const DEFAULT_BASE_URL = "https://api.d-id.com";

export function didHealth() {
  return {
    provider: "d-id",
    configured: Boolean(
      String(process.env.DID_API_KEY || "").trim()
    ),
    baseUrl:
      process.env.DID_BASE_URL ||
      DEFAULT_BASE_URL,
  };
}

export async function listDidPresenters() {
  const payload = await didRequest(
    "/clips/presenters?limit=100"
  );

  const list = pickArray(
    payload,
    [
      "presenters",
      "items",
      "results",
      "data",
    ]
  );

  return list
    .map((item) => ({
      id: stringValue(
        item.presenter_id ??
        item.id
      ),

      name:
        stringValue(
          item.name ??
          item.preview_name ??
          item.display_name ??
          item.presenter_id ??
          item.id
        ) || "D-ID presenter",

      previewUrl:
        stringValue(
          item.thumbnail_url ??
          item.image_url ??
          item.preview_url ??
          item.idle_video
        ) || undefined,
    }))
    .filter((item) => item.id);
}

export async function listDidVoices() {
  const payload = await didRequest(
    "/tts/voices"
  );

  const list = pickArray(
    payload,
    [
      "voices",
      "items",
      "results",
      "data",
    ]
  );

  return list
    .map((item) => ({
      id: stringValue(
        item.voice_id ??
        item.id
      ),

      name:
        stringValue(
          item.name ??
          item.display_name ??
          item.voice_name ??
          item.voice_id ??
          item.id
        ) || "D-ID voice",

      language:
        stringValue(
          item.language ??
          item.locale ??
          item.language_code
        ) || undefined,

      gender:
        stringValue(
          item.gender
        ) || undefined,

      previewUrl:
        stringValue(
          item.preview_url ??
          item.preview_audio_url ??
          item.audio_url ??
          item.sample_url
        ) || undefined,
    }))
    .filter((item) => item.id);
}

async function didRequest(path) {
  const key = String(
    process.env.DID_API_KEY || ""
  ).trim();

  if (!key) {
    const error = new Error(
      "DID_API_KEY is not configured on the server."
    );

    error.statusCode = 503;
    error.provider = "d-id";
    throw error;
  }

  const baseUrl =
    process.env.DID_BASE_URL ||
    DEFAULT_BASE_URL;

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      20000
    );

  try {
    const response = await fetch(
      new URL(path, baseUrl),
      {
        method: "GET",

        headers: {
          Authorization:
            buildAuthorization(key),

          Accept:
            "application/json",
        },

        signal:
          controller.signal,
      }
    );

    const raw =
      await response.text();

    let payload = {};

    try {
      payload =
        raw
          ? JSON.parse(raw)
          : {};
    }
    catch {
      payload = {
        raw,
      };
    }

    if (!response.ok) {
      const error = new Error(
        translateHttpError(
          response.status
        )
      );

      error.statusCode =
        response.status;

      error.provider =
        "d-id";

      throw error;
    }

    return payload;
  }
  finally {
    clearTimeout(timeout);
  }
}

function buildAuthorization(key) {
  if (
    key.toLowerCase().startsWith(
      "basic "
    )
  ) {
    return key;
  }

  if (key.includes(":")) {
    return (
      "Basic " +
      Buffer.from(
        key,
        "utf8"
      ).toString("base64")
    );
  }

  // D-ID keys may already be supplied
  // in encoded credential form.
  return `Basic ${key}`;
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

function translateHttpError(status) {
  if (status === 401) {
    return (
      "D-ID API key is missing or invalid."
    );
  }

  if (status === 402) {
    return (
      "D-ID account has insufficient credits."
    );
  }

  if (status === 403) {
    return (
      "D-ID API access is not permitted for this account."
    );
  }

  if (status === 429) {
    return (
      "D-ID API rate limit exceeded."
    );
  }

  return (
    `D-ID request failed with HTTP ${status}`
  );
}
