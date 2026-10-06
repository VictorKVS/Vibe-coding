import type {
  AvatarDto,
  VoiceDto,
} from "./types";

export interface AnamHealth {
  provider: "anam";
  configured: boolean;
  baseUrl: string;
}

export async function getAnamHealth():
  Promise<AnamHealth> {

  return requestJson<AnamHealth>(
    "/api/anam/health"
  );
}

export async function loadAnamCatalog():
  Promise<{
    avatars: AvatarDto[];
    voices: VoiceDto[];
  }> {

  const [
    avatarResponse,
    voiceResponse,
  ] = await Promise.all([
    requestJson<{
      avatars: AvatarDto[];
    }>("/api/anam/avatars"),

    requestJson<{
      voices: VoiceDto[];
    }>("/api/anam/voices"),
  ]);

  return {
    avatars: avatarResponse.avatars,
    voices: voiceResponse.voices,
  };
}

async function requestJson<T>(
  url: string
): Promise<T> {

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  const payload =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : `Request failed with HTTP ${response.status}`
    );
  }

  return payload as T;
}
