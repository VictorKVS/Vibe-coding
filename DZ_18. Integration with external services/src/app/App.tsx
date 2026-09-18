import { useEffect, useMemo, useState } from "react";
import { referencePersonas } from "../content_generator/personas/reference-personas";
import { planDemoStoryboard } from "../content_generator/storyboard/planner";
import type { PersonaSpec } from "../content_generator/personas/types";
import type { AvatarDto, VoiceDto } from "../content_generator/providers/types";
import { createHeygenVideoJob, getHeygenHealth, getHeygenVideoJob, loadHeygenCatalog, type HeygenVideoJob } from "../content_generator/providers/heygen-client";
import { generateNewsletter, generatePodcast, type NewsletterOutput, type PodcastOutput } from "../content_generator/providers/llm-client";
import { openAiTtsVoices, synthesizeOpenAiSpeech, type OpenAiTtsVoice } from "../content_generator/providers/tts-client";

type Section = "newsletter" | "podcast" | "avatar" | "storyboard" | "diagnostics";

const sections: Array<{ id: Section; label: string; description: string }> = [
  { id: "newsletter", label: "Рассылки", description: "Текст, subject, preheader и CTA" },
  { id: "podcast", label: "Подкасты", description: "Сценарий и голосовой профиль" },
  { id: "avatar", label: "Видео-аватар", description: "Avatars / voices / provider API" },
  { id: "storyboard", label: "Комикс / Storyboard", description: "Persona + Scene Engine" },
  { id: "diagnostics", label: "Диагностика", description: "Контракты, provider status, demo mode" },
];

export function App() {
  const [section, setSection] = useState<Section>("storyboard");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">F</span>
          <div>
            <strong>FATHER</strong>
            <small>Content Generator · DZ-18</small>
          </div>
        </div>

        <nav className="nav">
          {sections.map((item) => (
            <button
              key={item.id}
              className={section === item.id ? "nav-item active" : "nav-item"}
              onClick={() => setSection(item.id)}
            >
              <span>{item.label}</span>
              <small>{item.description}</small>
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="status-dot" />
          Architecture split active
          <small>ALINA Analyst → contracts → Generator</small>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">PRO AI · Integration with external services</p>
            <h1>{sections.find((item) => item.id === section)?.label}</h1>
          </div>
          <span className="mode-badge">INTEGRATION MODE</span>
        </header>

        {section === "newsletter" && <NewsletterPanel />}
        {section === "podcast" && <PodcastPanel />}
        {section === "avatar" && <AvatarPanel />}
        {section === "storyboard" && <StoryboardPanel />}
        {section === "diagnostics" && <DiagnosticsPanel />}
      </main>
    </div>
  );
}

function PanelHeader({ title, text }: { title: string; text: string }) {
  return (
    <div className="panel-header">
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <span className="chip">MVP</span>
    </div>
  );
}

function NewsletterPanel() {
  const [topic, setTopic] = useState("Новые возможности FATHER Content Generator");
  const [audience, setAudience] = useState("Специалисты и пользователи продукта");
  const [tone, setTone] = useState("professional");
  const [result, setResult] = useState<NewsletterOutput | null>(null);
  const [meta, setMeta] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const response = await generateNewsletter({
        topic,
        audience,
        tone,
        factualConstraints: [],
      });
      setResult(response.data);
      setMeta(`${response.provider} · ${response.model} · ${response.promptId}@${response.promptVersion}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="workspace">
      <div className="card controls">
        <PanelHeader title="Newsletter brief" text="Versioned prompt + server-side LLM provider + structured output." />
        <label>
          Тема
          <textarea value={topic} onChange={(e) => setTopic(e.target.value)} />
        </label>
        <label>
          Аудитория
          <input value={audience} onChange={(e) => setAudience(e.target.value)} />
        </label>
        <label>
          Тон
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="professional">Профессиональный</option>
            <option value="friendly">Дружелюбный</option>
            <option value="expert">Экспертный</option>
          </select>
        </label>
        {error && <div className="provider-state warning"><strong>LLM unavailable</strong><span>{error}</span></div>}
        <button className="primary" disabled={loading} onClick={() => void generate()}>
          {loading ? "Генерация..." : "Сгенерировать рассылку"}
        </button>
      </div>

      <div className="card preview">
        <PanelHeader title="Newsletter output" text={meta || "Результат появится после server-side generation."} />
        {result ? (
          <div className="result-stack">
            <Result label="Subject" value={result.subject} />
            <Result label="Preheader" value={result.preheader} />
            <Result label="Body" value={result.body} />
            <Result label="CTA" value={result.cta} />
            <Result label="Image brief" value={result.imageBrief} />
          </div>
        ) : <EmptyState text="Заполните brief и запустите генерацию." />}
      </div>
    </section>
  );
}

function PodcastPanel() {
  const [topic, setTopic] = useState("Как аналитика превращается в проверенный контент");
  const [duration, setDuration] = useState(5);
  const [voiceProfile, setVoiceProfile] = useState("F-01");
  const [result, setResult] = useState<PodcastOutput | null>(null);
  const [meta, setMeta] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsVoice, setTtsVoice] = useState<OpenAiTtsVoice>("marin");
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const response = await generatePodcast({
        topic,
        durationMinutes: duration,
        voiceProfile,
        factualConstraints: [],
      });
      setResult(response.data);
      setMeta(`${response.provider} · ${response.model} · ${response.promptId}@${response.promptVersion}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function synthesize() {
    if (!result) return;
    setTtsLoading(true);
    setTtsError("");

    try {
      const blob = await synthesizeOpenAiSpeech({
        text: result.script,
        voice: ttsVoice,
        instructions: result.voiceDirection || "Speak clearly and naturally.",
      });
      setAudioUrl(URL.createObjectURL(blob));
    } catch (caught) {
      setTtsError(caught instanceof Error ? caught.message : "TTS failed");
    } finally {
      setTtsLoading(false);
    }
  }

  return (
    <section className="workspace">
      <div className="card controls">
        <PanelHeader title="Podcast brief" text="Сценарий отделён от TTS: текст можно проверить до расхода аудио-кредита." />
        <label>Тема<input value={topic} onChange={(e) => setTopic(e.target.value)} /></label>
        <label>
          Длительность
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            <option value={3}>3 минуты</option>
            <option value={5}>5 минут</option>
            <option value={10}>10 минут</option>
          </select>
        </label>
        <label>
          Persona voice profile
          <select value={voiceProfile} onChange={(e) => setVoiceProfile(e.target.value)}>
            <option value="F-01">F-01</option>
            <option value="M-01">M-01</option>
          </select>
        </label>
        <label>
          TTS voice
          <select value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value as OpenAiTtsVoice)}>
            {openAiTtsVoices.map((voice) => <option key={voice} value={voice}>{voice}</option>)}
          </select>
        </label>
        {error && <div className="provider-state warning"><strong>LLM unavailable</strong><span>{error}</span></div>}
        {ttsError && <div className="provider-state warning"><strong>TTS unavailable</strong><span>{ttsError}</span></div>}
        <button className="primary" disabled={loading} onClick={() => void generate()}>
          {loading ? "Генерация..." : "Сгенерировать сценарий"}
        </button>
        {result && (
          <button className="primary secondary-action" disabled={ttsLoading} onClick={() => void synthesize()}>
            {ttsLoading ? "Синтез речи..." : "Озвучить сценарий"}
          </button>
        )}
      </div>
      <div className="card preview">
        <PanelHeader title="Podcast output" text={meta || "Structured script + separate TTS provider."} />
        {result ? (
          <div className="result-stack">
            <Result label="Title" value={result.title} />
            <Result label="Hook" value={result.hook} />
            <Result label="Outline" value={result.outline.join(" → ")} />
            <Result label="Script" value={result.script} />
            <Result label="Voice direction" value={result.voiceDirection} />
            {audioUrl && (
              <div className="result">
                <small>AI-generated voice · OpenAI TTS · {ttsVoice}</small>
                <audio className="media-player" controls src={audioUrl} />
              </div>
            )}
          </div>
        ) : <EmptyState text="Сценарий ещё не сформирован." />}
      </div>
    </section>
  );
}

function AvatarPanel() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [apiVersion, setApiVersion] = useState("v3");
  const [avatars, setAvatars] = useState<AvatarDto[]>([]);
  const [voices, setVoices] = useState<VoiceDto[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [script, setScript] = useState("Здравствуйте! Это демонстрация интеграции FATHER Content Generator с HeyGen Video Agent.");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [job, setJob] = useState<HeygenVideoJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [error, setError] = useState("");

  async function refresh(loadCatalog = false) {
    setLoading(true);
    setError("");

    try {
      const health = await getHeygenHealth();
      setConfigured(health.heygen.configured);
      setApiVersion(health.heygen.apiVersion);

      if (health.heygen.configured && loadCatalog) {
        const catalog = await loadHeygenCatalog();
        setAvatars(catalog.avatars);
        setVoices(catalog.voices);
        setSelectedAvatarId((current) => current || catalog.avatars[0]?.id || "");
        setSelectedVoiceId((current) => current || catalog.voices[0]?.id || "");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Provider request failed");
    } finally {
      setLoading(false);
    }
  }

  async function generateVideo() {
    if (!selectedAvatarId || !selectedVoiceId) {
      setError("Сначала загрузите каталог и выберите avatar + voice.");
      return;
    }

    setVideoLoading(true);
    setError("");
    setJob(null);

    try {
      const created = await createHeygenVideoJob({
        avatarId: selectedAvatarId,
        voiceId: selectedVoiceId,
        script,
        orientation,
      });
      setJob(created);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Video generation failed");
    } finally {
      setVideoLoading(false);
    }
  }

  useEffect(() => {
    void refresh(false);
  }, []);

  useEffect(() => {
    if (!job?.sessionId || job.status === "completed" || job.status === "failed") return;

    const timer = window.setInterval(() => {
      void getHeygenVideoJob(job.sessionId)
        .then(setJob)
        .catch((caught) => {
          setError(caught instanceof Error ? caught.message : "Video polling failed");
          window.clearInterval(timer);
        });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [job?.sessionId, job?.status]);

  return (
    <section className="workspace">
      <div className="card controls">
        <PanelHeader title="HeyGen Video Agent" text="v3 session → video polling. API key остаётся только на backend." />
        <div className="provider-state warning">
          <strong>
            {configured === null
              ? "Checking provider..."
              : configured
                ? `HeyGen ${apiVersion} configured`
                : "HeyGen key not configured"}
          </strong>
          <span>
            {error ||
              (configured
                ? "Загрузите catalog, выберите presenter и запустите Video Agent."
                : "Добавьте HEYGEN_API_KEY в локальный .env.")}
          </span>
        </div>

        <button className="primary" disabled={loading} onClick={() => void refresh(true)}>
          {loading ? "Загрузка..." : configured ? "Загрузить avatars + voices" : "Проверить провайдера"}
        </button>

        {avatars.length > 0 && voices.length > 0 && (
          <>
            <label>
              Avatar
              <select value={selectedAvatarId} onChange={(e) => setSelectedAvatarId(e.target.value)}>
                {avatars.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>
              Voice
              <select value={selectedVoiceId} onChange={(e) => setSelectedVoiceId(e.target.value)}>
                {voices.map((item) => <option key={item.id} value={item.id}>{item.name}{item.language ? ` · ${item.language}` : ""}</option>)}
              </select>
            </label>
            <label>
              Orientation
              <select value={orientation} onChange={(e) => setOrientation(e.target.value as "landscape" | "portrait")}>
                <option value="landscape">16:9 · landscape</option>
                <option value="portrait">9:16 · portrait</option>
              </select>
            </label>
            <label>
              Script
              <textarea value={script} onChange={(e) => setScript(e.target.value)} />
            </label>
            <button className="primary secondary-action" disabled={videoLoading || !script.trim()} onClick={() => void generateVideo()}>
              {videoLoading ? "Создание job..." : "Сгенерировать видео"}
            </button>
          </>
        )}
      </div>

      <div className="card preview">
        <PanelHeader title="Provider data + video job" text="UI получает нормализованный catalog и job status, provider payload скрыт adapter-слоем." />

        {job && (
          <div className="result-stack video-job">
            <Result label="Session" value={job.sessionId} />
            <Result label="Status" value={job.failureMessage ? `${job.status}: ${job.failureMessage}` : job.status} />
            {typeof job.progress === "number" && <Result label="Progress" value={`${job.progress}%`} />}
            {job.videoId && <Result label="Video ID" value={job.videoId} />}
            {job.videoUrl && (
              <div className="result">
                <small>HeyGen generated video</small>
                <video className="media-player video-player" controls poster={job.thumbnailUrl} src={job.videoUrl} />
              </div>
            )}
          </div>
        )}

        <div className="two-columns catalog-grid">
          <CatalogColumn
            title={`Avatars (${avatars.length})`}
            items={avatars.slice(0, 8).map((item) => ({
              id: item.id,
              name: item.name,
              meta: "HeyGen avatar",
            }))}
          />
          <CatalogColumn
            title={`Voices (${voices.length})`}
            items={voices.slice(0, 8).map((item) => ({
              id: item.id,
              name: item.name,
              meta: [item.language, item.gender].filter(Boolean).join(" · ") || "HeyGen voice",
            }))}
          />
        </div>
      </div>
    </section>
  );
}

function CatalogColumn({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; name: string; meta: string }>;
}) {
  if (items.length === 0) {
    return <EmptyState text={`${title}: нет данных`} />;
  }

  return (
    <div className="result-stack">
      <Result label="Catalog" value={title} />
      {items.map((item) => (
        <div className="result" key={item.id}>
          <small>{item.meta}</small>
          <strong>{item.name}</strong>
        </div>
      ))}
    </div>
  );
}

function StoryboardPanel() {
  const [topic, setTopic] = useState("История создания классической скрипки");
  const [personaId, setPersonaId] = useState("F-01");
  const [frames, setFrames] = useState(6);

  const persona = referencePersonas.find((item) => item.id === personaId) ?? referencePersonas[0];

  const scenes = useMemo(
    () => planDemoStoryboard(topic, persona, frames),
    [topic, persona, frames],
  );

  return (
    <section className="storyboard-layout">
      <div className="card controls">
        <PanelHeader title="Storyboard planner" text="Один Persona Engine для F-01, M-01 и будущих age presets." />
        <label>Тема<textarea value={topic} onChange={(e) => setTopic(e.target.value)} /></label>
        <label>
          Персонаж
          <select value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
            {referencePersonas.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}
          </select>
        </label>
        <label>
          Кадры: {frames}
          <input type="range" min="4" max="9" value={frames} onChange={(e) => setFrames(Number(e.target.value))} />
        </label>
        <PersonaCard persona={persona} />
      </div>

      <div className="card preview storyboard-preview">
        <PanelHeader title="Scene plan" text="Каждый кадр — отдельный SceneSpec. Регенерация одного кадра не требует переписывать историю." />
        <div className="frame-grid">
          {scenes.map((scene) => (
            <article className="frame" key={scene.id}>
              <div className="frame-visual">
                <span>{scene.order}</span>
                <strong>{persona.id}</strong>
                <small>{scene.emotion}</small>
              </div>
              <div className="frame-copy">
                <strong>{scene.environment}</strong>
                <p>{scene.dialogue}</p>
                <small>{scene.wardrobe} · {scene.pose}</small>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DiagnosticsPanel() {
  return (
    <section className="diagnostics-grid">
      <Diagnostic title="Research handoff" status="ready" text="ResearchPacket → ContentBrief contracts заведены." />
      <Diagnostic title="Persona Engine" status="ready" text="F-01 / M-01 проходят один engine path." />
      <Diagnostic title="Scene Engine" status="ready" text="Typed SceneSpec + demo storyboard planner." />
      <Diagnostic title="External API" status="ready" text="HeyGen v3 catalog + Video Agent create/poll + completed MP4 URL." />
      <Diagnostic title="LLM + TTS" status="ready" text="Versioned Responses prompts + server-side OpenAI TTS MP3." />
      <Diagnostic title="Publish" status="pending" text="После baseline и smoke tests." />
    </section>
  );
}

function PersonaCard({ persona }: { persona: PersonaSpec }) {
  return (
    <div className="persona-card">
      <div className="avatar-placeholder">{persona.id}</div>
      <div>
        <strong>{persona.name}</strong>
        <span>{persona.agePreset}</span>
        <small>{persona.personality.communicationStyle}</small>
      </div>
    </div>
  );
}

function Diagnostic({ title, status, text }: { title: string; status: "ready" | "pending"; text: string }) {
  return (
    <article className="card diagnostic">
      <span className={status === "ready" ? "diag ready" : "diag pending"}>{status}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return <div className="result"><small>{label}</small><strong>{value}</strong></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}
