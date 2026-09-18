const DEFAULT_BASE_URL = "https://api.heygen.com";
const ALLOWED_ORIENTATIONS = new Set(["landscape", "portrait"]);

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
  const payload = await heygenRequest("/v3/avatars");
  const groups = pickArray(payload, ["avatar_groups", "avatars", "items"]);

  const avatars = [];
  for (const group of groups) {
    const looks = pickArray(group, ["looks", "avatar_looks", "items"]);
    if (looks.length > 0) {
      for (const look of looks) avatars.push(normalizeAvatar(look, group));
    } else {
      avatars.push(normalizeAvatar(group));
    }
  }

  return avatars.filter((item) => item.id);
}

export async function listHeygenVoices() {
  const payload = await heygenRequest("/v3/voices");
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

export async function createHeygenVideo({
  avatarId,
  voiceId,
  script,
  orientation = "landscape",
}) {
  if (!stringValue(avatarId)) return badRequest("avatarId is required.");
  if (!stringValue(voiceId)) return badRequest("voiceId is required.");
  if (!stringValue(script)) return badRequest("script is required.");
  if (script.length > 12000) return badRequest("script is too long.");
  if (!ALLOWED_ORIENTATIONS.has(orientation)) {
    return badRequest("orientation must be landscape or portrait.");
  }

  const payload = await heygenRequest("/v3/video-agents", {
    method: "POST",
    body: {
      prompt: script,
      mode: "generate",
      avatar_id: avatarId,
      voice_id: voiceId,
      orientation,
    },
    timeoutMs: 30000,
  });

  const data = payload?.data ?? {};
  const sessionId = stringValue(data.session_id);
  if (!sessionId) {
    const error = new Error("HeyGen create response missing session_id.");
    error.statusCode = 502;
    throw error;
  }

  return {
    provider: "heygen",
    apiVersion: "v3",
    sessionId,
    videoId: stringValue(data.video_id) || undefined,
    status: stringValue(data.status) || "generating",
  };
}

export async function getHeygenVideoJob(sessionId) {
  const safeSessionId = stringValue(sessionId);
  if (!safeSessionId) return badRequest("sessionId is required.");

  const sessionPayload = await heygenRequest(
    `/v3/video-agents/${encodeURIComponent(safeSessionId)}`
  );
  const session = sessionPayload?.data ?? {};
  const sessionStatus = stringValue(session.status) || "generating";
  const videoId = stringValue(session.video_id);

  if (sessionStatus === "failed") {
    return {
      provider: "heygen",
      sessionId: safeSessionId,
      status: "failed",
      progress: numberValue(session.progress),
      failureMessage: extractEnvelopeError(sessionPayload) || "HeyGen session failed.",
    };
  }

  if (!videoId) {
    return {
      provider: "heygen",
      sessionId: safeSessionId,
      status: sessionStatus,
      progress: numberValue(session.progress),
    };
  }

  const videoPayload = await heygenRequest(
    `/v3/videos/${encodeURIComponent(videoId)}`
  );
  const video = videoPayload?.data ?? {};
  const videoStatus = stringValue(video.status) || sessionStatus;

  return {
    provider: "heygen",
    sessionId: safeSessionId,
    videoId,
    status: videoStatus,
    progress: numberValue(session.progress),
    videoUrl: stringValue(video.video_url) || undefined,
    thumbnailUrl: stringValue(video.thumbnail_url) || undefined,
    duration: numberValue(video.duration),
    failureMessage:
      stringValue(video.failure_message) ||
      stringValue(video.failure_code) ||
      undefined,
  };
}

async function heygenRequest(
  path,
  { method = "GET", body, timeoutMs = 12000 } = {}
) {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    throw new ProviderConfigError(
      "HEYGEN_API_KEY is not configured on the server."
    );
  }

  const baseUrl = process.env.HEYGEN_BASE_URL || DEFAULT_BASE_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(new URL(path, baseUrl), {
      method,
      headers: {
        "X-Api-Key": apiKey,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
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
        translateHeygenHttpError(response.status, payload)
      );
      error.statusCode = response.status;
      error.provider = "heygen";
      error.upstream = sanitizeUpstreamError(payload);
      throw error;
    }

    const envelopeError = extractEnvelopeError(payload);
    if (envelopeError) {
      const error = new Error(envelopeError);
      error.statusCode = 502;
      error.provider = "heygen";
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

function translateHeygenHttpError(status, payload) {
  const raw = JSON.stringify(payload ?? {}).toLowerCase();
  if (status === 401) return "HeyGen API key missing or invalid.";
  if (status === 402 || raw.includes("quota") || raw.includes("credit")) {
    return "HeyGen credit limit reached.";
  }
  if (status === 404 && raw.includes("avatar")) {
    return "HeyGen avatar not found.";
  }
  if (status === 404 && raw.includes("voice")) {
    return "HeyGen voice not found.";
  }
  if (status === 429) return "HeyGen rate limit exceeded.";
  return `HeyGen request failed with HTTP ${status}`;
}

function extractEnvelopeError(payload) {
  const error = payload?.error;
  if (!error) return "";
  if (typeof error === "string") return error;
  return stringValue(error.message) || stringValue(error.code) || "HeyGen returned an error.";
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sanitizeUpstreamError(payload) {
  if (!payload || typeof payload !== "object") return undefined;
  return {
    error: payload.error ?? payload.message ?? payload.code ?? "Upstream error",
  };
}
