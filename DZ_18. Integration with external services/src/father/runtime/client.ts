const DEFAULT_FATHER_URL = "http://127.0.0.1:8010";

export const FATHER_URL =
  import.meta.env.VITE_FATHER_URL ??
  DEFAULT_FATHER_URL;

export interface FatherHealth {
  father: string;
  gpu: string;

  services: {
    llm: {
      status: string;
      provider: string;
      model: string;
    };

    stt: {
      status: string;
      provider: string;
      model: string;
    };

    tts: {
      status: string;
      provider: string;
    };

    image: {
      status: string;
      provider: string;
      checkpoint: string;
    };
  };

  registered_models: string[];
}

export interface FatherChatResult {
  status: string;
  agent: string;
  model: string;
  answer: string;
}

export interface FatherArtifactResult {
  status: string;
  provider: string;
  url: string;
  checkpoint?: string;
  prompt_id?: string;
}

function artifactUrl(path: string): string {
  if (
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }

  return `${FATHER_URL}${path}`;
}

async function jsonRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `${FATHER_URL}${path}`,
    init,
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `FATHER ${response.status}: ${text}`,
    );
  }

  return response.json() as Promise<T>;
}

export function getFatherHealth() {
  return jsonRequest<FatherHealth>(
    "/api/father/health",
  );
}

export function getFatherZoo() {
  return jsonRequest<{
    ollama: string[];
    comfyui: string[];
  }>("/api/father/zoo");
}

export function fatherChat(
  message: string,
  agent = "alina",
) {
  return jsonRequest<FatherChatResult>(
    "/api/father/chat",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
      },

      body: JSON.stringify({
        agent,
        message,
      }),
    },
  );
}

export async function fatherSpeak(
  text: string,
) {
  const result =
    await jsonRequest<FatherArtifactResult>(
      "/api/father/speak",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json; charset=utf-8",
        },

        body: JSON.stringify({
          text,
        }),
      },
    );

  return {
    ...result,
    url: artifactUrl(result.url),
  };
}

export async function fatherGenerateImage(
  prompt: string,
  width = 768,
  height = 768,
) {
  const result =
    await jsonRequest<FatherArtifactResult>(
      "/api/father/image",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json; charset=utf-8",
        },

        body: JSON.stringify({
          prompt,
          width,
          height,
        }),
      },
    );

  return {
    ...result,
    url: artifactUrl(result.url),
  };
}

export async function fatherTranscribe(
  audio: Blob,
) {
  const data = new FormData();

  data.append(
    "audio",
    audio,
    "microphone.webm",
  );

  return jsonRequest<{
    status: string;
    provider: string;
    model: string;
    text: string;
    language: string;
  }>(
    "/api/father/transcribe",
    {
      method: "POST",
      body: data,
    },
  );
}

export async function fatherAnalyzeImage(
  image: File,
  prompt: string,
) {
  const data = new FormData();

  data.append(
    "image",
    image,
    image.name || "image.png",
  );

  data.append("prompt", prompt);

  return jsonRequest<{
    status: string;
    agent: string;
    provider: string;
    model: string;
    answer: string;
  }>(
    "/api/father/analyze-image",
    {
      method: "POST",
      body: data,
    },
  );
}

