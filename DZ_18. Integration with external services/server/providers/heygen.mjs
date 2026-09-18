const DEFAULT_BASE_URL = "https://api.heygen.com";

export class ProviderConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProviderConfigError";
    this.statusCode = 503;
  }
}

export async function heygenHealth() {
  return {
    provider: "heygen",
    apiVersion: "v3",
    configured: Boolean(process.env.HEYGEN_API_KEY),
    baseUrl: process.env.HEYGEN_BASE_URL || DEFAULT_BASE_URL,
  };
}

export async function listHeygenAvatars() {
  const payload = await heygenGet("/v3/avatars");
  const groups = pickArray(payload, ["avatar_groups", "avatars", "items"]);

  const avatars = [];
  for (const group of groups) {
    const looks = pickArray(group, ["looks", "avatar_looks", "items"]);
    if (looks.length > 0) {
      for (const look of looks) {
        avatars.push(normalizeAvatar(look, group));
      }
    } else {
      avatars.push(normalizeAvatar(group));
    }
  }

  return avatars.filter((item) => item.id);
}

export async function listHeygenVoices() {
  const payload = await heygenGet("/v3/voices");
  const voices = pickArray(payload, ["voices", "items"]);

  return voices
    .map((voice) => ({
      id: stringValue(voice.voice_id ?? voice.id),
      name: stringValue(voice.name ?? voice.display_name ?? voice.voice_name) || "Unnamed voice",
      language: stringValue(voice.language ?? voice.locale),
      gender: stringValue(voice.gender),
      previewUrl: stringValue(
        voice.preview_audio ??
        voice.preview_audio_url ??
        voice.preview_url
      ),
    }))
    .filter((item) => item.id);
}

async function heygenGet(path) {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    throw new ProviderConfigError(
      "HEYGEN_API_KEY is not configured on the server."
    );
  }

  const baseUrl = process.env.HEYGEN_BASE_URL || DEFAULT_BASE_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(new URL(path, baseUrl), {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    const text = await response.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }

    if (!response.ok) {
      const error = new Error(
        `HeyGen request failed with HTTP ${response.status}`
      );
      error.statusCode = response.status;
      error.upstream = sanitizeUpstreamError(payload);
      throw error;
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeAvatar(avatar, group = {}) {
  return {
    id: stringValue(
      avatar.avatar_id ??
      avatar.look_id ??
      avatar.id ??
      group.avatar_id ??
      group.id
    ),
    name:
      stringValue(
        avatar.name ??
        avatar.display_name ??
        avatar.look_name ??
        group.name ??
        group.display_name
      ) || "Unnamed avatar",
    previewUrl: stringValue(
      avatar.preview_image_url ??
      avatar.preview_url ??
      avatar.thumbnail_url ??
      avatar.image_url ??
      group.preview_image_url ??
      group.preview_url
    ),
    groupId: stringValue(
      avatar.avatar_group_id ??
      avatar.group_id ??
      group.avatar_group_id ??
      group.id
    ),
  };
}

function pickArray(payload, keys) {
  const candidates = [
    payload,
    payload?.data,
    payload?.result,
    payload?.data?.result,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    for (const key of keys) {
      if (Array.isArray(candidate?.[key])) return candidate[key];
    }
  }
  return [];
}

function stringValue(value) {
  return typeof value === "string" ? value : "";
}

function sanitizeUpstreamError(payload) {
  if (!payload || typeof payload !== "object") return undefined;
  return {
    error: payload.error ?? payload.message ?? payload.code ?? "Upstream error",
  };
}
