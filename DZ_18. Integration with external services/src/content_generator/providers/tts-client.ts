export const openAiTtsVoices = [
  "marin",
  "cedar",
  "coral",
  "alloy",
  "ash",
  "ballad",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
] as const;

export type OpenAiTtsVoice = (typeof openAiTtsVoices)[number];

export async function synthesizeOpenAiSpeech(input: {
  text: string;
  voice: OpenAiTtsVoice;
  instructions: string;
}): Promise<Blob> {
  const response = await fetch("/api/tts/openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      input: input.text,
      voice: input.voice,
      instructions: input.instructions,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `TTS request failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.blob();
}


export const localTtsVoices = [
  "xenia",
  "eugene",
] as const;

export type LocalTtsVoice =
  (typeof localTtsVoices)[number];

export async function synthesizeLocalSpeech(input: {
  text: string;
  voice: LocalTtsVoice;
}): Promise<Blob> {
  const response = await fetch("/api/tts/local", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/wav",
    },
    body: JSON.stringify({
      input: input.text,
      voice: input.voice,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));

    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `Local TTS request failed with HTTP ${response.status}`;

    throw new Error(message);
  }

  return response.blob();
}
