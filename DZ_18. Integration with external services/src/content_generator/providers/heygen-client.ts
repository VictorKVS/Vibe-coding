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

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
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
