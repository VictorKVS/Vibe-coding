import { useEffect, useMemo, useRef, useState } from "react";
import { referencePersonas } from "../content_generator/personas/reference-personas";
import { planDemoStoryboard } from "../content_generator/storyboard/planner";
import type { PersonaSpec } from "../content_generator/personas/types";
import type { AvatarDto, VoiceDto } from "../content_generator/providers/types";
import { createHeygenVideoJob, getHeygenHealth, getHeygenVideoJob, getRuntimeHealth, loadHeygenCatalog, type HeygenVideoJob, type RuntimeHealth } from "../content_generator/providers/heygen-client";
import { generateNewsletter, generatePodcast, type NewsletterOutput, type PodcastOutput } from "../content_generator/providers/llm-client";
import { openAiTtsVoices, synthesizeOpenAiSpeech, type OpenAiTtsVoice } from "../content_generator/providers/tts-client";

type Section = "studio" | "newsletter" | "podcast" | "avatar" | "storyboard" | "diagnostics";
type VisualMode = "strontium" | "alina";

const sections: Array<{ id: Section; label: string; description: string; icon: string }> = [
  { id: "studio", label: "AI Центр", description: "Control Model · RAG · Creative Studio", icon: "✦" },
  { id: "newsletter", label: "Рассылки", description: "Текст, subject, preheader и CTA", icon: "▤" },
  { id: "podcast", label: "Подкасты", description: "Сценарий и голосовой профиль", icon: "◉" },
  { id: "avatar", label: "Видео-аватар", description: "Avatars / voices / provider API", icon: "▶" },
  { id: "storyboard", label: "Комикс / Storyboard", description: "Persona + Scene Engine", icon: "▧" },
  { id: "diagnostics", label: "Диагностика", description: "Контракты, provider status, demo mode", icon: "⚙" },
];

export function App() {
  const [section, setSection] = useState<Section>("studio");
  const [visualMode, setVisualMode] = useState<VisualMode>("strontium");

  return (
    <div className={`app-shell theme-${visualMode}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">{visualMode === "strontium" ? "S" : "A"}</span>
          <div>
            <strong>{visualMode === "strontium" ? "STRONTIUM" : "ALINA"}</strong>
            <small>{visualMode === "strontium" ? "AI Studio for Bigger Stories" : "Book · Komiks · AI Studio"}</small>
          </div>
        </div>

        <div className="mode-switch" aria-label="Visual mode">
          <button className={visualMode === "alina" ? "selected" : ""} onClick={() => setVisualMode("alina")}>ALINA</button>
          <button className={visualMode === "strontium" ? "selected" : ""} onClick={() => setVisualMode("strontium")}>STRONTIUM</button>
        </div>

        <nav className="nav">
          {sections.map((item) => (
            <button
              key={item.id}
              className={section === item.id ? "nav-item active" : "nav-item"}
              onClick={() => setSection(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-copy">
                <span>{item.label}</span>
                <small>{item.description}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <span className="status-dot" />
          FATHER architecture active
          <small>ALINA Analyst → contracts → Content Generator</small>
        </div>
      </aside>

      <main className="main">
        <div className="commandbar">
          <div className="searchbox">
            <span>⌕</span>
            <input aria-label="Поиск" placeholder="Поиск по проектам, персонажам, сюжетам, видео..." />
            <kbd>⌘ K</kbd>
          </div>
          <button className="new-scenario" onClick={() => setSection("storyboard")}>＋ Новый сценарий</button>
        </div>

        <header className="topbar">
          <div>
            <p className="eyebrow">{visualMode === "strontium" ? "POWER · SPEED · RESULTS" : "BOOK · KOMIKS · AI STUDIO"}</p>
            <h1>{section === "studio" ? "Control Model, RAG & Creative Admin Studio" : sections.find((item) => item.id === section)?.label}</h1>
            <p className="topbar-subtitle">
              {visualMode === "strontium"
                ? "Управляющая модель для создания, развития и монетизации историй, персонажей, видео и визуальных миров."
                : "Управляющая модель для общения, сюжетной помощи, базы знаний, RAG, безопасности и творчества."}
            </p>
          </div>
          <div className="topbar-actions">
            <span className="mode-badge">INTEGRATION MODE</span>
            <span className="profile-pill">{visualMode === "strontium" ? "Максим" : "Алина"} · online</span>
          </div>
        </header>

        {section === "studio" && <StudioPanel onNavigate={setSection} visualMode={visualMode} />}
        {section === "newsletter" && <NewsletterPanel />}
        {section === "podcast" && <PodcastPanel />}
        {section === "avatar" && <AvatarPanel />}
        {section === "storyboard" && <StoryboardPanel />}
        {section === "diagnostics" && <DiagnosticsPanel />}
      </main>
    </div>
  );
}

function StudioPanel({
  onNavigate,
  visualMode,
}: {
  onNavigate: (section: Section) => void;
  visualMode: VisualMode;
}) {
  const [health, setHealth] = useState<RuntimeHealth | null>(null);

  useEffect(() => {
    void getRuntimeHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  const modules: Array<{ title: string; text: string; target: Section; metric: string; icon: string }> = [
    { title: "Рассылки", text: "Structured text · CTA · image brief", target: "newsletter", metric: "OpenAI", icon: "▤" },
    { title: "Подкасты", text: "Script · TTS · AI voice", target: "podcast", metric: "MP3", icon: "◉" },
    { title: "Видео", text: "Avatar · voice · Video Agent", target: "avatar", metric: "HeyGen v3", icon: "▶" },
    { title: "Storyboard", text: "Persona · Scene · continuity", target: "storyboard", metric: "F-01 / M-01", icon: "▧" },
  ];

  return (
    <div className="studio-grid">
      <section className="card studio-dialog">
        <PanelHeader
          title={visualMode === "strontium" ? "Диалог с Strontium" : "Диалог с управляющей моделью ALina"}
          text="Твой AI-компаньон для идей, сюжета, анализа и реализации."
        />
        <div className="dialog-thread">
          <div className="dialog-message user-message">
            <span className="dialog-avatar">{visualMode === "strontium" ? "M" : "A"}</span>
            <p>Как лучше развить этого персонажа? Он ищет своё место в новом мире, но должен принять решение.</p>
          </div>
          <div className="dialog-message ai-message">
            <span className="dialog-avatar ai">{visualMode === "strontium" ? "S" : "AI"}</span>
            <div>
              <p>Вижу несколько сильных направлений для развития:</p>
              <ol>
                <li>Прошлое возвращается через незакрытый конфликт.</li>
                <li>Новый мир требует принять новые правила.</li>
                <li>Выбор героя меняет отношения и дальнейший сюжет.</li>
              </ol>
            </div>
          </div>
        </div>
        <div className="suggestions">
          <button onClick={() => onNavigate("storyboard")}>Идеи для сюжета</button>
          <button onClick={() => onNavigate("storyboard")}>Развитие персонажа</button>
          <button onClick={() => onNavigate("newsletter")}>Сделать анонс</button>
        </div>
        <div className="fake-input"><span>Напиши сообщение...</span><b>➤</b></div>
      </section>

      <section className="card knowledge-card">
        <PanelHeader title="База знаний и RAG" text="Подключённые источники и трассируемый research boundary." />
        <div className="source-list">
          <SourceRow title="Проекты и сценарии" value="ResearchPacket" ready />
          <SourceRow title="Persona Registry" value="F-01 / M-01" ready />
          <SourceRow title="Scene Registry" value="Typed SceneSpec" ready />
          <SourceRow title="Provider contracts" value="Normalized DTO" ready />
        </div>
        <div className="metrics-row">
          <Metric title="Контракты" value="v1.0" />
          <Metric title="Research" value="Protected" />
          <Metric title="RAG" value="Ready" />
        </div>
      </section>

      <section className="card prompt-card">
        <PanelHeader title="Prompt / Persona" text="Версионированные промпты и единая модель персонажей." />
        <div className="slider-list">
          <FakeSlider label="Креативность" value="80%" width="80%" />
          <FakeSlider label="Логичность" value="72%" width="72%" />
          <FakeSlider label="Детальность" value="84%" width="84%" />
          <FakeSlider label="Строгость" value="40%" width="40%" />
        </div>
        <div className="persona-mini-grid">
          <button onClick={() => onNavigate("storyboard")}>F-01 · Ведущая</button>
          <button onClick={() => onNavigate("storyboard")}>M-01 · Эксперт</button>
        </div>
      </section>

      <section className="card security-card">
        <PanelHeader title="Безопасность" text="Server-side providers и закрытые secrets." />
        <SecurityRow label="OpenAI key" ready={Boolean(health?.openai.configured)} />
        <SecurityRow label="HeyGen key" ready={Boolean(health?.heygen.configured)} />
        <SecurityRow label="Browser secrets" ready />
        <SecurityRow label="Provider DTO boundary" ready />
        <SecurityRow label="Bounded polling" ready />
      </section>

      <section className="card modules-card">
        <PanelHeader title="Контент и подборки" text="Рабочие внешние интеграции DZ-18." />
        <div className="module-grid">
          {modules.map((module) => (
            <button key={module.title} className="module-tile" onClick={() => onNavigate(module.target)}>
              <span className="module-icon">{module.icon}</span>
              <strong>{module.title}</strong>
              <p>{module.text}</p>
              <small>{module.metric}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="card assistant-card">
        <PanelHeader title="Сюжетный ассистент" text="Переход от идеи к сценам и медиапроизводству." />
        <div className="assistant-steps">
          <button onClick={() => onNavigate("storyboard")}><b>1</b> Идея и концепт</button>
          <button onClick={() => onNavigate("storyboard")}><b>2</b> Сцены и персонажи</button>
          <button onClick={() => onNavigate("podcast")}><b>3</b> Голос и подкаст</button>
          <button onClick={() => onNavigate("avatar")}><b>4</b> Видео-аватар</button>
        </div>
      </section>

      <section className="card analytics-card">
        <PanelHeader title="Отчёт о творчестве" text="Состояние текущего DZ-18 baseline." />
        <div className="analytics-metrics">
          <Metric title="Модулей" value="5" />
          <Metric title="Provider tests" value="8/8" />
          <Metric title="Промптов" value="2" />
          <Metric title="Deploy" value="Ready" />
        </div>
        <div className="bars">
          {[42, 65, 54, 78, 61, 88, 72].map((height, index) => (
            <i key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
      </section>

      <section className="card memory-card">
        <PanelHeader title="Память персонажей" text="Identity, continuity и контекстные состояния." />
        <div className="memory-people">
          <div><span>F-01</span><strong>Алина</strong><small>Face Lock ✓</small></div>
          <div><span>M-01</span><strong>Михаил</strong><small>Face Lock ✓</small></div>
          <button className="add-person" onClick={() => onNavigate("storyboard")}>＋<small>Новый</small></button>
        </div>
      </section>
    </div>
  );
}

function SourceRow({ title, value, ready }: { title: string; value: string; ready: boolean }) {
  return <div className="source-row"><span>▣</span><div><strong>{title}</strong><small>{value}</small></div><b>{ready ? "● Активно" : "○ Ожидание"}</b></div>;
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="metric"><small>{title}</small><strong>{value}</strong></div>;
}

function FakeSlider({ label, value, width }: { label: string; value: string; width: string }) {
  return <div className="fake-slider"><span>{label}</span><i><b style={{ width }} /></i><strong>{value}</strong></div>;
}

function SecurityRow({ label, ready }: { label: string; ready: boolean }) {
  return <div className="security-row"><span className={ready ? "security-dot ok" : "security-dot"}>●</span><strong>{label}</strong><small>{ready ? "Активно" : "Не настроено"}</small></div>;
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
  const pollAttempts = useRef(0);

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
    pollAttempts.current = 0;

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

  async function checkVideoStatus() {
    if (!job?.sessionId) return;
    setError("");
    try {
      setJob(await getHeygenVideoJob(job.sessionId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Video polling failed");
    }
  }

  useEffect(() => {
    if (!job?.sessionId || job.status === "completed" || job.status === "failed") return;

    const timer = window.setInterval(() => {
      pollAttempts.current += 1;

      if (pollAttempts.current > 36) {
        setError("Автопроверка остановлена после 3 минут. Нажмите «Проверить статус» вручную.");
        window.clearInterval(timer);
        return;
      }

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
            {job.status !== "completed" && job.status !== "failed" && (
              <button className="primary secondary-action" onClick={() => void checkVideoStatus()}>
                Проверить статус
              </button>
            )}
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
  const [health, setHealth] = useState<RuntimeHealth | null>(null);
  const [healthError, setHealthError] = useState("");

  async function refreshHealth() {
    setHealthError("");
    try {
      setHealth(await getRuntimeHealth());
    } catch (caught) {
      setHealthError(caught instanceof Error ? caught.message : "Health check failed");
    }
  }

  useEffect(() => {
    void refreshHealth();
  }, []);

  return (
    <>
      <div className="card controls diagnostics-summary">
        <PanelHeader title="Runtime diagnostics" text="Показывает доступность backend и конфигурацию providers без раскрытия API keys." />
        {healthError && <div className="provider-state warning"><strong>Backend unavailable</strong><span>{healthError}</span></div>}
        <button className="primary" onClick={() => void refreshHealth()}>Обновить диагностику</button>
      </div>

      <section className="diagnostics-grid">
        <Diagnostic title="Research handoff" status="ready" text="ResearchPacket → ContentBrief contracts заведены." />
        <Diagnostic title="Persona Engine" status="ready" text="F-01 / M-01 проходят один engine path." />
        <Diagnostic title="Scene Engine" status="ready" text="Typed SceneSpec + demo storyboard planner." />
        <Diagnostic
          title="HeyGen v3"
          status={health?.heygen.configured ? "ready" : "pending"}
          text={health
            ? `configured=${health.heygen.configured} · API ${health.heygen.apiVersion}`
            : "Проверка backend..."}
        />
        <Diagnostic
          title="OpenAI Responses"
          status={health?.openai.configured ? "ready" : "pending"}
          text={health
            ? `configured=${health.openai.configured} · model=${health.openai.model}`
            : "Проверка backend..."}
        />
        <Diagnostic
          title="OpenAI TTS"
          status={health?.openai.configured ? "ready" : "pending"}
          text={health
            ? `model=${health.openai.ttsModel} · ключ не выводится в UI`
            : "Проверка backend..."}
        />
        <Diagnostic title="Provider tests" status="ready" text="Node 22: 8/8 provider tests passed." />
        <Diagnostic title="Production image" status="ready" text="Dockerfile + healthcheck + test/build gates заведены." />
        <Diagnostic title="Publish" status="pending" text="Нужен локальный real-key smoke test и опубликованный URL." />
      </section>
    </>
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
