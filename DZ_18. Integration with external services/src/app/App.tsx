import { useMemo, useState } from "react";
import { referencePersonas } from "../content_generator/personas/reference-personas";
import { planDemoStoryboard } from "../content_generator/storyboard/planner";
import type { PersonaSpec } from "../content_generator/personas/types";

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
          <span className="mode-badge">DEMO MODE</span>
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
  const [generated, setGenerated] = useState(false);

  return (
    <section className="workspace">
      <div className="card controls">
        <PanelHeader title="Newsletter brief" text="Подготовка структуры рассылки без привязки к конкретному LLM provider." />
        <label>
          Тема
          <textarea value={topic} onChange={(e) => setTopic(e.target.value)} />
        </label>
        <label>
          Аудитория
          <input defaultValue="Специалисты и пользователи продукта" />
        </label>
        <label>
          Тон
          <select defaultValue="professional">
            <option value="professional">Профессиональный</option>
            <option value="friendly">Дружелюбный</option>
            <option value="expert">Экспертный</option>
          </select>
        </label>
        <button className="primary" onClick={() => setGenerated(true)}>Собрать preview</button>
      </div>

      <div className="card preview">
        <PanelHeader title="Preview" text="Пока локальный deterministic fallback. LLM adapter подключается следующим этапом." />
        {generated ? (
          <div className="result-stack">
            <Result label="Subject" value={topic} />
            <Result label="Preheader" value="Коротко о том, что изменилось и как использовать новые возможности." />
            <Result label="CTA" value="Открыть FATHER Content Generator" />
          </div>
        ) : <EmptyState text="Заполните brief и соберите preview." />}
      </div>
    </section>
  );
}

function PodcastPanel() {
  const [ready, setReady] = useState(false);

  return (
    <section className="workspace">
      <div className="card controls">
        <PanelHeader title="Podcast brief" text="Сценарий отделён от TTS, поэтому отсутствие API-ключа не ломает работу." />
        <label>Тема<input defaultValue="Как аналитика превращается в проверенный контент" /></label>
        <label>Длительность<select defaultValue="5"><option value="3">3 минуты</option><option value="5">5 минут</option><option value="10">10 минут</option></select></label>
        <label>Voice profile<select defaultValue="F-01"><option>F-01</option><option>M-01</option></select></label>
        <button className="primary" onClick={() => setReady(true)}>Подготовить сценарий</button>
      </div>
      <div className="card preview">
        <PanelHeader title="Podcast output" text="TTS provider будет подключён через отдельный adapter." />
        {ready ? <Result label="Сценарий" value="Вступление → исходный факт → объяснение → пример → вывод → CTA." /> : <EmptyState text="Сценарий ещё не сформирован." />}
      </div>
    </section>
  );
}

function AvatarPanel() {
  return (
    <section className="workspace">
      <div className="card controls">
        <PanelHeader title="External Avatar Provider" text="UI готов к серверному HeyGen/совместимому adapter. Ключ в браузер не передаётся." />
        <div className="provider-state warning">
          <strong>Provider not configured</strong>
          <span>HEYGEN_API_KEY отсутствует — реальный API вызов пока не выполняется.</span>
        </div>
        <button className="primary" disabled>Загрузить avatars + voices</button>
      </div>
      <div className="card preview">
        <PanelHeader title="Provider data" text="После backend-интеграции здесь появятся нормализованные AvatarDto и VoiceDto." />
        <div className="two-columns">
          <EmptyState text="Avatars: нет данных" />
          <EmptyState text="Voices: нет данных" />
        </div>
      </div>
    </section>
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
      <Diagnostic title="External API" status="pending" text="Нужен server-side HeyGen adapter." />
      <Diagnostic title="LLM provider" status="pending" text="Нужен versioned prompt registry + adapter." />
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
