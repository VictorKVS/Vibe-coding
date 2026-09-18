import type { AvatarDto, VoiceDto } from "./types";

export interface HeygenHealth {
  ok: boolean;
  app: string;
  heygen: {
    provider: "heygen";
    apiVersion: string;
    configured: boolean;
    baseUrl: string;
  };
}

export interface HeygenVideoJob {
  provider: "heygen";
  apiVersion?: string;
  sessionId: string;
  videoId?: string;
  status: string;
  progress?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  failureMessage?: string;
}

export async function getHeygenHealth(): Promise<HeygenHealth> {
  return requestJson<HeygenHealth>("/api/health");
}

export async function loadHeygenCatalog(): Promise<{
  avatars: AvatarDto[];
  voices: VoiceDto[];
}> {
  const [avatarResponse, voiceResponse] = await Promise.all([
    requestJson<{ avatars: AvatarDto[] }>("/api/heygen/avatars"),
    requestJson<{ voices: VoiceDto[] }>("/api/heygen/voices"),
  ]);

  return {
    avatars: avatarResponse.avatars,
    voices: voiceResponse.voices,
  };
}

export function createHeygenVideoJob(input: {
  avatarId: string;
  voiceId: string;
  script: string;
  orientation: "landscape" | "portrait";
}) {
  return requestJson<HeygenVideoJob>("/api/heygen/video-jobs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getHeygenVideoJob(sessionId: string) {
  return requestJson<HeygenVideoJob>(
    `/api/heygen/video-jobs/${encodeURIComponent(sessionId)}`,
  );
}

async function requestJson<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `Request failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}
