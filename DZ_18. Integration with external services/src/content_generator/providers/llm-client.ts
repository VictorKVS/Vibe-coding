export interface NewsletterOutput {
  subject: string;
  preheader: string;
  body: string;
  cta: string;
  imageBrief: string;
}

export interface PodcastOutput {
  title: string;
  hook: string;
  outline: string[];
  script: string;
  voiceDirection: string;
}

export interface GenerationMeta<T> {
  provider: string;
  model: string;
  promptId: string;
  promptVersion: string;
  data: T;
}

export function generateNewsletter(input: {
  topic: string;
  audience: string;
  tone: string;
  factualConstraints?: string[];
}) {
  return postJson<GenerationMeta<NewsletterOutput>>(
    "/api/generate/newsletter",
    input,
  );
}

export function generatePodcast(input: {
  topic: string;
  durationMinutes: number;
  voiceProfile: string;
  factualConstraints?: string[];
}) {
  return postJson<GenerationMeta<PodcastOutput>>(
    "/api/generate/podcast",
    input,
  );
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
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
