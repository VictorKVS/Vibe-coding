import type {
  AvatarDto,
  VoiceDto,
} from "./types";

export interface DidHealth {
  provider: "d-id";
  configured: boolean;
  baseUrl: string;
}

export async function getDidHealth():
  Promise<DidHealth> {

  return requestJson<DidHealth>(
    "/api/did/health"
  );
}

export async function loadDidCatalog():
  Promise<{
    presenters: AvatarDto[];
    voices: VoiceDto[];
  }> {

  const [
    presenterResponse,
    voiceResponse,
  ] = await Promise.all([
    requestJson<{
      presenters: AvatarDto[];
    }>(
      "/api/did/presenters"
    ),

    requestJson<{
      voices: VoiceDto[];
    }>(
      "/api/did/voices"
    ),
  ]);

  return {
    presenters:
      presenterResponse.presenters,

    voices:
      voiceResponse.voices,
  };
}

async function requestJson<T>(
  url: string
): Promise<T> {

  const response =
    await fetch(
      url,
      {
        headers: {
          Accept:
            "application/json",
        },
      }
    );

  const payload =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `D-ID request failed with HTTP ${response.status}`;

    throw new Error(message);
  }

  return payload as T;
}
