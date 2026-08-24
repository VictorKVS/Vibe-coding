import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpenText,
  Check,
  Clapperboard,
  Database,
  Feather,
  FileText,
  GitBranch,
  ImageIcon,
  MapPin,
  LoaderCircle,
  RotateCcw,
  Send,
  Sparkles,
  Swords,
  Trash2,
  Upload,
  UserRound,
  Download,
  FolderOpen,
  KeyRound,
  PlugZap,
  Settings,
  Orbit,
  Search,
  Heart,
  Laugh,
  ShieldAlert,
  Activity,
  Bug,
} from "lucide-react";
import { GENRES, M1_DEMO, M1_WORLD } from "./m1-contract.js";

const CHARACTER_COLORS = ["#d89a5b", "#e8c06a", "#6fa9d8", "#d06f72", "#89b68c", "#b68ad6"];

const GENRE_PRESENTATION = {
  "Фантастика": {
    icon: Orbit,
    color: "#7dd3fc",
    glow: "rgba(56, 189, 248, .28)",
    caption: "Иные миры · технологии · будущее",
    symbol: "✦",
  },
  "Детектив": {
    icon: Search,
    color: "#fbbf24",
    glow: "rgba(251, 191, 36, .25)",
    caption: "Тайна · улики · расследование",
    symbol: "⌕",
  },
  "Роман": {
    icon: Heart,
    color: "#fb7185",
    glow: "rgba(251, 113, 133, .25)",
    caption: "Чувства · выбор · отношения",
    symbol: "♡",
  },
  "Комедия": {
    icon: Laugh,
    color: "#a3e635",
    glow: "rgba(163, 230, 53, .22)",
    caption: "Юмор · характеры · неожиданность",
    symbol: "☺",
  },
  "Триллер": {
    icon: ShieldAlert,
    color: "#f97316",
    glow: "rgba(249, 115, 22, .28)",
    caption: "Опасность · напряжение · риск",
    symbol: "⚠",
  },
};

const LOCAL_MODELS = [
  { id: "gigachat-20b-a3b-q4", label: "GigaChat-20B A3B Instruct · Q4_K_M", capability: "текст" },
  { id: "gigachat3-10b-a18b-q4", label: "GigaChat3-10B A1.8B · Q4_K_S", capability: "текст · рекомендуемая" },
  { id: "qwen25-14b-1m-q4", label: "Qwen2.5-14B-Instruct-1M · Q4_K_M", capability: "длинный контекст" },
  { id: "qwen25-coder-14b-q4", label: "Qwen2.5-Coder-14B-Instruct · Q4_K_M", capability: "код" },
  { id: "deepseek-coder-v2-lite", label: "DeepSeek-Coder-V2-Lite-Instruct · Q4/Q5", capability: "код" },
  { id: "llava16-mistral-7b", label: "LLaVA-1.6-Mistral-7B · Q4/Q5", capability: "текст + изображение" },
  { id: "llava-llama3-8b-int4", label: "LLaVA-Llama-3-8B · INT4", capability: "текст + изображение" },
  { id: "cogvlm-13b-f16", label: "CogVLM-13B-Chat · F16", capability: "текст + изображение" },
  { id: "mythomax-l2-13b-q4", label: "MythoMax-L2-13B · Q4_K_S", capability: "творческая проза" },
];

const GIGACHAT_MODELS = [
  { id: "GigaChat-2", label: "GigaChat 2 Lite · быстро и экономно" },
  { id: "GigaChat-2-Pro", label: "GigaChat 2 Pro · редактура и сложные инструкции" },
  { id: "GigaChat-2-Max", label: "GigaChat 2 Max · максимум качества и креативности" },
  { id: "GigaChat-3-Ultra", label: "GigaChat 3 Ultra · freemium для физических лиц" },
];

const DEFAULT_MODEL_CONFIG = {
  source: "local",
  localModel: LOCAL_MODELS[1].id,
  externalAgent: "",
  externalProtocol: "openai-compatible",
  externalEndpoint: "https://api.example.com/v1/chat/completions",
  externalModel: "",
  apiKey: "",
};

const PROJECT_STORAGE_KEY = "bookcraft.mvp.project.v1";
const DIAGNOSTIC_STORAGE_KEY = "bookcraft.media.diagnostics.v1";
const MAX_DIAGNOSTIC_EVENTS = 500;

function createRequestId() {
  return globalThis.crypto?.randomUUID?.() || `bookcraft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeDiagnosticValue(value, key = "") {
  if (/token|key|authorization|secret|password/i.test(key)) return "[REDACTED]";
  if (typeof value === "string") {
    if (/^(?:Bearer\s+)?[A-Za-z0-9_-]{24,}\.?[A-Za-z0-9_-]*$/i.test(value.trim())) return "[REDACTED]";
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => safeDiagnosticValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, safeDiagnosticValue(item, name)]));
  }
  return value;
}

function describeControl(target) {
  // EventTarget exists both in browsers and jsdom. Avoid relying on the
  // browser-only global Element so acceptance tests exercise the same path.
  if (!target || typeof target.closest !== "function") return { control: "unknown" };
  const control = target.closest("button, a, select, input, textarea, summary") || target;
  const sensitive = control.matches('input[type="password"]') || /token|key|secret|password/i.test(control.getAttribute("name") || control.getAttribute("placeholder") || "");
  return {
    tag: control.tagName.toLowerCase(),
    control: (control.getAttribute("aria-label") || control.textContent || control.getAttribute("placeholder") || control.id || control.className || "control").trim().replace(/\s+/g, " ").slice(0, 140),
    id: control.id || undefined,
    className: typeof control.className === "string" ? control.className.slice(0, 120) : undefined,
    value: sensitive ? "[REDACTED]" : control.matches("select") ? control.value : undefined,
  };
}

function loadSavedProject(mode) {
  try {
    const saved = JSON.parse(localStorage.getItem(PROJECT_STORAGE_KEY) || "null");
    return saved?.version === 1 && saved?.mode === mode ? saved : null;
  } catch {
    return null;
  }
}

const EMPTY_SCRIPT = {
  introduction: "",
  development: "",
  finale: "",
};

const STARTERS = {
  book: {
    title: "Сценарий книги",
    chatTitle: "Чат — сценарий книги",
    subtitle: "От первой искры до цельного литературного мира",
    icon: BookOpenText,
  },
  video: {
    title: "Сценарий видеоролика",
    chatTitle: "Чат — сценарий видеоролика",
    subtitle: "Сцены, ритм и визуальная драматургия",
    icon: Clapperboard,
  },
};

function Atmosphere() {
  return (
    <div className="atmosphere" aria-hidden="true">
      <div className="aurora-orb orb-one" />
      <div className="aurora-orb orb-two" />
      <div className="aurora-orb orb-three" />
      <div className="spark-field">
        {Array.from({ length: 18 }, (_, index) => (
          <i key={index} style={{ "--spark": index + 1 }} />
        ))}
      </div>
    </div>
  );
}

function UniverseBlueprint() {
  const eventIcons = { place: MapPin, conflict: Swords, generated: Sparkles };

  return (
    <details className="blueprint">
      <summary>
        <span><GitBranch size={16} /> Инженерная карта мира · MVP</span>
        <small>1 линия · 4 героя · 3 события</small>
      </summary>
      <div className="blueprint-grid">
        <section className="cast-rail">
          <header><UserRound size={14} /> Действующие лица</header>
          <div className="cast-list">
            {M1_WORLD.characters.map((character, index) => (
              <div className={`cast-node cast-${index + 1}`} key={character.name}>
                <i>{character.icon}</i>
                <span><strong>{character.name}</strong><small>{character.role}</small></span>
              </div>
            ))}
          </div>
        </section>

        <section className="event-rail">
          <header><MapPin size={14} /> Основная хронология</header>
          <div className="event-line">
            {M1_WORLD.events.map((event, index) => {
              const EventIcon = eventIcons[event.icon];
              return (
                <div className="event-segment" key={event.id}>
                  {index > 0 && (
                    <b className={`event-connector ${event.status === "generated" ? "branch" : ""}`}>
                      <span>{event.status === "generated" ? "AI-развилка" : "приводит к"}</span>
                    </b>
                  )}
                  <article className={`event-card ${event.status}`}>
                    <span className="event-code">{event.id} · {event.status === "canon" ? "КАНОН" : "НОВОЕ"}</span>
                    <i><EventIcon size={15} /></i>
                    <strong>{event.title}</strong>
                    <small>{event.detail}</small>
                  </article>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      <footer className="blueprint-legend">
        <span><i className="legend-canon" /> подтверждено источником</span>
        <span><i className="legend-new" /> новая сцена</span>
        <span><i className="legend-link" /> причинная связь</span>
        <strong>Статический демо-мир · автоматическое извлечение не реализовано</strong>
      </footer>
    </details>
  );
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function normalizeScriptPayload(payload, currentScript) {
  if (!payload || typeof payload !== "object") return null;
  const fields = ["introduction", "development", "finale"];
  if (!fields.every((field) => typeof payload[field] === "string")) return null;
  return {
    assistantMessage:
      typeof payload.assistantMessage === "string" && payload.assistantMessage.trim()
        ? payload.assistantMessage.trim()
        : "Сценарий обновлён.",
    script: Object.fromEntries(
      fields.map((field) => [field, payload[field].trim() || currentScript[field]]),
    ),
  };
}

async function callModelCompletion({ messages, temperature, maxTokens, modelConfig, timeoutMs = 90000 }) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const isLocal = modelConfig.source === "local";
  const isGigaChat = !isLocal && modelConfig.externalProtocol === "gigachat";
  const endpoint = isLocal
    ? "http://127.0.0.1:8018/api/llm/chat/completions"
    : isGigaChat
      ? "/giga-cloud/v1/chat/completions"
      : modelConfig.externalEndpoint.trim();
  if (!endpoint) throw new Error("Укажите endpoint внешнего агента");
  if (!isLocal && !modelConfig.externalModel.trim()) throw new Error("Укажите ID модели внешнего агента");
  if (!isLocal && !modelConfig.apiKey.trim()) throw new Error("Укажите API-ключ внешнего агента");
  try {
    const requestId = globalThis.crypto?.randomUUID?.() || `bookcraft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
        ...(!isLocal ? { Authorization: `Bearer ${modelConfig.apiKey.trim()}` } : {}),
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: isLocal ? modelConfig.localModel : modelConfig.externalModel.trim(),
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
    });
    if (!response.ok) {
      let serverMessage = "";
      try {
        const payload = await response.json();
        serverMessage = payload?.error?.message || payload?.detail || "";
      } catch {
        serverMessage = "";
      }
      if (response.status === 401) {
        throw new Error("LM Studio требует API-токен. Отключите Require Authentication либо настройте токен");
      }
      if (response.status === 404) {
        throw new Error("Endpoint модели не найден. Проверьте Local Server LM Studio");
      }
      if (response.status === 502 || response.status === 503) {
        throw new Error("Локальный сервер модели недоступен. Запустите LM Studio Local Server на порту 1234");
      }
      const suffix = serverMessage ? `: ${serverMessage.slice(0, 240)}` : "";
      throw new Error(`Модель вернула HTTP ${response.status}${suffix}`);
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Модель вернула пустой ответ");
    return content;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Агент не ответил за ${Math.round(timeoutMs / 1000)} секунд`);
    }
    if (error instanceof TypeError && /fetch/i.test(error.message)) {
      throw new Error("Нет соединения с моделью. Проверьте LM Studio и порт 1234");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function CharacterHighlight({ text, characters }) {
  const activeCharacters = characters.filter((character) => character.name.trim());
  if (!text.trim() || activeCharacters.length === 0) return null;

  const byName = new Map(
    activeCharacters.map((character, index) => [
      character.name.trim().toLocaleLowerCase("ru"),
      { ...character, color: character.color || CHARACTER_COLORS[index % CHARACTER_COLORS.length] },
    ]),
  );
  const pattern = activeCharacters
    .map((character) => character.name.trim())
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const parts = text.split(new RegExp(`(${pattern})`, "giu"));

  return (
    <div className="character-highlight-view">
      <header>
        <span>ЦВЕТОВАЯ КАРТА ГЕРОЕВ</span>
        <div>
          {Array.from(byName.values()).map((character) => (
            <small key={character.id}><i style={{ background: character.color }} />{character.name}</small>
          ))}
        </div>
      </header>
      <p>
        {parts.map((part, index) => {
          const character = byName.get(part.toLocaleLowerCase("ru"));
          return character ? (
            <mark
              key={`${part}-${index}`}
              style={{ "--character-color": character.color }}
              title={`${character.name}: ${character.role || "роль не заполнена"}`}
            >
              {part}
            </mark>
          ) : <span key={`${part}-${index}`}>{part}</span>;
        })}
      </p>
    </div>
  );
}

async function generateWithLocalModel({
  mode,
  genre,
  idea,
  script,
  messages,
  referenceMode,
  sources,
  modelConfig,
}) {
  const modeTitle = mode === "book" ? "книги" : "видеоролика";
  const history = messages
    .slice(-6)
    .map((item) => `${item.role === "user" ? "Пользователь" : "Ассистент"}: ${item.text}`)
    .join("\n");

  const referenceLabels = {
    original: "Создай самостоятельную оригинальную историю. Источники используй только как справочный материал.",
    inspired: "Создай новую историю по мотивам источников: сохрани узнаваемые идеи мира и темы, но не копируй фрагменты исходного текста.",
    continuation: "Создай неофициальное продолжение: учитывай факты, персонажей и незавершённые линии источников; явно отделяй канон от новых решений.",
  };
  const sourceContext = sources.length
    ? sources
        .map((source) => `ИСТОЧНИК «${source.name}»:\n${source.text}`)
        .join("\n\n")
        .slice(0, 14000)
    : "Источники не добавлены.";

  const prompt = `
Ты — сценарист и редактор. Помоги создать сценарий ${modeTitle} в жанре «${genre}».
Измени три части сценария с учётом новой просьбы пользователя. Сохраняй удачные
фрагменты текущей версии, если пользователь не просит их заменить.

Режим работы с источниками:
${referenceLabels[referenceMode]}

Локальная база знаний:
${sourceContext}

Текущий сценарий:
Вступление: ${script.introduction || "пока не заполнено"}
Развитие: ${script.development || "пока не заполнено"}
Финал: ${script.finale || "пока не заполнено"}

Последний диалог:
${history || "диалог только начинается"}

Новая просьба: ${idea}

Верни только JSON без markdown:
{
  "assistantMessage": "короткий комментарий о внесённых изменениях",
  "introduction": "обновлённое вступление",
  "development": "обновлённое развитие",
  "finale": "обновлённый финал"
}`.trim();

  const raw = await callModelCompletion({
    messages: [
      {
        role: "system",
        content:
          "Ты создаёшь оригинальные сценарии на русском языке и строго соблюдаешь требуемый формат ответа.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.85,
    maxTokens: 1600,
    modelConfig,
  });

  const firstAttempt = normalizeScriptPayload(extractJson(raw), script);
  if (firstAttempt) return firstAttempt;

  const repairedRaw = await callModelCompletion({
    messages: [
      {
        role: "system",
        content:
          "Ты исправляешь формат данных. Не переписывай содержание. Верни только валидный JSON без markdown.",
      },
      {
        role: "user",
        content: `Преобразуй ответ ниже в объект с четырьмя строковыми полями:
assistantMessage, introduction, development, finale.
Никаких других полей и пояснений.

ОТВЕТ ДЛЯ ИСПРАВЛЕНИЯ:
${raw.slice(0, 12000)}`,
      },
    ],
    temperature: 0.1,
    maxTokens: 1600,
    timeoutMs: 60000,
    modelConfig,
  });
  const repaired = normalizeScriptPayload(extractJson(repairedRaw), script);
  if (!repaired) {
    throw new Error("Выбранный агент дважды вернул ответ в неверном формате; исходный сценарий сохранён");
  }
  return {
    ...repaired,
    assistantMessage: `${repaired.assistantMessage} Формат ответа был исправлен автоматически.`,
  };
}

async function createIllustrationPrompt({ genre, sceneTitle, sceneText, visualStyle, characterProfiles, modelConfig }) {
  const characterContext = characterProfiles
    .filter((character) => character.name.trim())
    .map(
      (character) =>
        `${character.name}: роль/профессия — ${character.role || "не указана"}; ` +
        `внешность и одежда — ${character.appearance || "не указаны"}; ` +
        `биография и уже произошедшие события — ${character.history || "не указаны"}.`,
    )
    .join("\n");
  return callModelCompletion({
      modelConfig,
      messages: [
        {
          role: "system",
          content:
            "Ты арт-директор. Создавай точные русскоязычные промпты для иллюстраций, не добавляй пояснений.",
        },
        {
          role: "user",
          content: `Создай один цельный промпт для иллюстрации сцены произведения.
Жанр: ${genre}.
Часть: ${sceneTitle}.
Визуальный стиль: ${visualStyle}.
Текст сцены: ${sceneText}

Паспорта постоянных персонажей:
${characterContext || "Персонажи пока не описаны; не придумывай противоречащие сцене детали."}

Опиши персонажей, действие, окружение, свет, композицию, настроение и ракурс.
Строго сохраняй профессию, возраст, телосложение, одежду и биографические признаки персонажей.
Не помещай надписи, буквы и водяные знаки на изображение. Максимум 900 знаков.`,
        },
      ],
      temperature: 0.65,
      maxTokens: 420,
      timeoutMs: 90000,
  });
}

function extractImageId(content = "") {
  return content.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || null;
}

async function generateGigaChatImage({ accessToken, prompt, scene }) {
  const response = await fetch("http://127.0.0.1:8018/api/art/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      model: "GigaChat",
      prompt,
      filename: `bookcraft-${scene || "scene"}.jpg`,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.detail ||
      (response.status === 401
        ? "Access token GigaChat недействителен или истёк"
        : `Media Gateway вернул ошибку ${response.status}`),
    );
  }

  if (!data.image_data_url?.startsWith("data:image/")) {
    throw new Error("Media Gateway не вернул готовое изображение");
  }
  return data.image_data_url;
}

async function generateComfyImage({ prompt, scene, checkpoint }) {
  const response = await fetch("http://127.0.0.1:8018/api/comfy/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Request-ID": createRequestId() },
    body: JSON.stringify({
      prompt,
      checkpoint: checkpoint || null,
      filename_prefix: `BOOKCRAFT-${scene || "scene"}`,
      width: 768,
      height: 768,
      steps: 24,
      cfg: 7,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.detail || `ComfyUI вернул ошибку ${response.status}`);
  if (!data.image_data_url?.startsWith("data:image/")) throw new Error("ComfyUI не вернул готовое изображение");
  return data.image_data_url;
}

function StartScreen({ onSelect }) {
  return (
    <main className="start-shell">
      <Atmosphere />
      <header className="brand-row">
        <div className="brand-mark"><Feather size={19} /></div>
        <span>BOOK·CRAFT</span>
        <div className="local-badge"><span /> Локальная AI-студия</div>
      </header>

      <section className="hero">
        <div className="hero-stage">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15} /> Narrative Knowledge Studio</div>
            <h1>Создание<br /><em>сценариев</em></h1>
            <p>
              Превратите идею в стройную историю. Выберите формат — локальный
              AI-соавтор поможет построить драматургию от вступления до финала.
            </p>
          </div>

          <div className="story-visual" aria-hidden="true">
            <div className="story-aura" />
            <div className="floating-note note-one">Новая сюжетная линия</div>
            <div className="floating-note note-two">3 главы готовы</div>
            <div className="story-card">
              <header>
                <span className="story-label">РУКОПИСЬ · 01</span>
                <span className="story-status"><i /> AI создаёт</span>
              </header>
              <h3>Невский<br />после полуночи</h3>
              <p>Фантастический Петербург · 2147 год</p>
              <div className="plot-line">
                <span className="plot-node complete">01</span><b />
                <span className="plot-node active">02</span><b />
                <span className="plot-node">03</span>
              </div>
              <div className="scene-stack">
                <div><span>Вступление</span><strong>Город просыпается</strong></div>
                <div><span>Развитие</span><strong>Тайна под Невой</strong></div>
                <div><span>Финал</span><strong>Ещё не написан</strong></div>
              </div>
            </div>
          </div>
        </div>

        <div className="choice-grid">
          {Object.entries(STARTERS).map(([key, item]) => {
            const Icon = item.icon;
            return (
              <button className="choice-card" key={key} onClick={() => onSelect(key)}>
                <div className="choice-icon"><Icon size={26} /></div>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                </div>
                <span className="choice-arrow">→</span>
              </button>
            );
          })}
        </div>
      </section>

      <footer className="start-footer">
        <span>GigaChat · локальный контур</span>
        <span>Ваши тексты остаются на компьютере</span>
      </footer>
    </main>
  );
}

function Workspace({ mode, onBack }) {
  const initialProject = useMemo(() => loadSavedProject(mode), [mode]);
  const [genre, setGenre] = useState(initialProject?.genre || GENRES[0]);
  const [idea, setIdea] = useState("");
  const [script, setScript] = useState(initialProject?.script || EMPTY_SCRIPT);
  const [messages, setMessages] = useState(initialProject?.messages || [
    {
      role: "assistant",
      text: "Опишите идею, героев или задачу. Я предложу структуру и сразу обновлю сценарий справа.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState("");
  const [referenceMode, setReferenceMode] = useState(initialProject?.referenceMode || "original");
  const [illustrationScene, setIllustrationScene] = useState("development");
  const [visualStyle, setVisualStyle] = useState("Кинематографичная книжная иллюстрация");
  const [artProvider, setArtProvider] = useState("comfy");
  const [comfyCheckpoints, setComfyCheckpoints] = useState([]);
  const [comfyCheckpoint, setComfyCheckpoint] = useState("");
  const [gigaAccessToken, setGigaAccessToken] = useState("");
  const [modelConfig, setModelConfig] = useState(DEFAULT_MODEL_CONFIG);
  const [availableLocalModels, setAvailableLocalModels] = useState(LOCAL_MODELS);
  const [localModelDiscovery, setLocalModelDiscovery] = useState("pending");
  const [connectionStatus, setConnectionStatus] = useState("not-tested");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [illustrationPrompt, setIllustrationPrompt] = useState("");
  const [illustrationUrl, setIllustrationUrl] = useState("");
  const [uploadedPhoto, setUploadedPhoto] = useState(null);
  const [isIllustrating, setIsIllustrating] = useState(false);
  const [selectedExcerpt, setSelectedExcerpt] = useState("");
  const [savedAt, setSavedAt] = useState(initialProject?.savedAt || "");
  const [saveStatus, setSaveStatus] = useState(initialProject ? "restored" : "ready");
  const [diagnostics, setDiagnostics] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DIAGNOSTIC_STORAGE_KEY) || "[]");
      return Array.isArray(saved) ? saved.slice(-MAX_DIAGNOSTIC_EVENTS) : [];
    } catch {
      return [];
    }
  });
  const [diagnosticStatus, setDiagnosticStatus] = useState("ready");
  const [diagnosticIssueUrl, setDiagnosticIssueUrl] = useState("");
  const [characterProfiles, setCharacterProfiles] = useState(() => {
    if (initialProject?.characterProfiles) return initialProject.characterProfiles;
    try {
      return JSON.parse(localStorage.getItem("bookcraft.characters") || "[]");
    } catch {
      return [];
    }
  });
  const [sources, setSources] = useState(() => {
    if (initialProject?.sources) return initialProject.sources;
    try {
      return JSON.parse(localStorage.getItem("bookcraft.sources") || "[]");
    } catch {
      return [];
    }
  });
  const fileInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const projectInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const diagnosticSequenceRef = useRef(diagnostics.at(-1)?.sequence || 0);

  useEffect(() => {
    let cancelled = false;
    async function discoverLoadedModels() {
      try {
        const response = await fetch("/llm-api/v1/models", { method: "GET" });
        if (!response.ok) {
          setLocalModelDiscovery(response.status === 401 ? "authentication-required" : "unavailable");
          return;
        }
        const payload = await response.json();
        const discovered = (Array.isArray(payload?.data) ? payload.data : [])
          .filter((item) => item && typeof item.id === "string" && item.id.trim())
          .map((item) => ({
            id: item.id,
            label: item.id,
            capability: "загружена в LM Studio",
          }));
        if (cancelled) return;
        if (discovered.length === 0) {
          setLocalModelDiscovery("model-not-loaded");
          return;
        }
        setAvailableLocalModels(discovered);
        setLocalModelDiscovery("ready");
        setModelConfig((current) => discovered.some((item) => item.id === current.localModel)
          ? current
          : { ...current, localModel: discovered[0].id });
      } catch {
        if (!cancelled) setLocalModelDiscovery("server-stopped");
      }
    }
    discoverLoadedModels();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("http://127.0.0.1:8018/api/comfy/health")
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled || !Array.isArray(payload?.checkpoints)) return;
        setComfyCheckpoints(payload.checkpoints);
        setComfyCheckpoint((current) => current || payload.checkpoints[0] || "");
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  function traceEvent(type, message, data = {}, level = "info") {
    diagnosticSequenceRef.current += 1;
    const event = {
      sequence: diagnosticSequenceRef.current,
      timestamp: new Date().toISOString(),
      level,
      type,
      message,
      data: safeDiagnosticValue(data),
    };
    setDiagnostics((items) => [...items, event].slice(-MAX_DIAGNOSTIC_EVENTS));
    return event;
  }

  useEffect(() => {
    const onClick = (event) => traceEvent("ui.click", "Нажатие элемента", describeControl(event.target));
    const onChange = (event) => traceEvent("ui.change", "Изменение элемента", describeControl(event.target));
    const onError = (event) => traceEvent("runtime.error", event.message || "Ошибка JavaScript", { filename: event.filename, lineno: event.lineno, colno: event.colno }, "error");
    const onRejection = (event) => traceEvent("runtime.unhandledrejection", event.reason?.message || String(event.reason || "Необработанная ошибка"), {}, "error");
    document.addEventListener("click", onClick, true);
    document.addEventListener("change", onChange, true);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    traceEvent("session.start", "Открыто рабочее пространство", { mode, restored: Boolean(initialProject) });
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("change", onChange, true);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DIAGNOSTIC_STORAGE_KEY, JSON.stringify(diagnostics));
    } catch {
      // Диагностика не должна останавливать работу редактора.
    }
  }, [diagnostics]);

  useEffect(() => {
    localStorage.setItem("bookcraft.sources", JSON.stringify(sources));
  }, [sources]);

  useEffect(
    () => () => {
      if (illustrationUrl) URL.revokeObjectURL(illustrationUrl);
    },
    [illustrationUrl],
  );

  useEffect(
    () => () => {
      if (uploadedPhoto?.url) URL.revokeObjectURL(uploadedPhoto.url);
    },
    [uploadedPhoto],
  );

  useEffect(() => {
    localStorage.setItem("bookcraft.characters", JSON.stringify(characterProfiles));
  }, [characterProfiles]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSavedAt = new Date().toISOString();
      const snapshot = {
        version: 1, mode, genre, script, messages, referenceMode, sources,
        characterProfiles, savedAt: nextSavedAt,
      };
      try {
        localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(snapshot));
        setSavedAt(nextSavedAt);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("failed");
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [mode, genre, script, messages, referenceMode, sources, characterProfiles]);

  const meta = STARTERS[mode];
  const genreMeta = GENRE_PRESENTATION[genre] || GENRE_PRESENTATION["Фантастика"];
  const GenreIcon = genreMeta.icon;
  const completed = useMemo(
    () => Object.values(script).filter((value) => value.trim()).length,
    [script],
  );
  const wordCount = useMemo(
    () => Object.values(script).join(" ").trim().split(/\s+/).filter(Boolean).length,
    [script],
  );
  const activeModel = useMemo(
    () => modelConfig.source === "local"
      ? availableLocalModels.find((model) => model.id === modelConfig.localModel)?.label || "Локальная модель"
      : modelConfig.externalModel || modelConfig.externalAgent || "Внешний агент",
    [modelConfig, availableLocalModels],
  );

  async function sendMessage() {
    const cleanIdea = idea.trim();
    if (!cleanIdea || isLoading) return;

    const nextMessages = [...messages, { role: "user", text: cleanIdea }];
    setMessages(nextMessages);
    setIdea("");
    setError("");
    setIsLoading(true);
    traceEvent("agent.request.start", "Отправлен запрос сценарному агенту", {
      source: modelConfig.source,
      model: modelConfig.source === "local" ? modelConfig.localModel : modelConfig.externalModel,
      protocol: modelConfig.externalProtocol,
      genre,
      mode,
      requestLength: cleanIdea.length,
    });

    try {
      const result = await generateWithLocalModel({
        mode,
        genre,
        idea: cleanIdea,
        script,
        messages: nextMessages,
        referenceMode,
        sources,
        modelConfig,
      });
      if (result.script) setScript(result.script);
      setMessages((items) => [
        ...items,
        { role: "assistant", text: result.assistantMessage },
      ]);
      traceEvent("agent.request.success", "Сценарный агент обновил структуру", {
        completedSections: Object.values(result.script || {}).filter(Boolean).length,
      });
    } catch (requestError) {
      traceEvent("agent.request.error", requestError.message, {
        source: modelConfig.source,
        model: modelConfig.source === "local" ? modelConfig.localModel : modelConfig.externalModel,
        protocol: modelConfig.externalProtocol,
      }, "error");
      setError(
        `${requestError.message}. Проверьте настройки выбранного агента.`,
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function uploadAudioForTranscription(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setIsTranscribing(true);
    traceEvent("stt.upload.start", "Аудиофайл передан на локальное распознавание", {
      contentType: file.type || "unknown",
      sizeBytes: file.size,
    });
    try {
      const body = new FormData();
      body.append("audio", file, file.name);
      const response = await fetch("http://127.0.0.1:8018/api/stt/transcribe", {
        method: "POST",
        headers: { "X-Request-ID": createRequestId() },
        body,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.detail || `Распознавание вернуло ошибку ${response.status}`);
      if (!payload.transcription?.trim()) throw new Error("Whisper не вернул расшифровку");
      setIdea((current) => [current.trim(), payload.transcription.trim()].filter(Boolean).join("\n"));
      traceEvent("stt.upload.success", "Расшифровка добавлена в редактор", {
        transcriptLength: payload.transcription.length,
        durationMs: payload.duration_ms,
      });
    } catch (transcriptionError) {
      traceEvent("stt.upload.error", transcriptionError.message, {}, "error");
      setError(`Распознавание аудио: ${transcriptionError.message}`);
    } finally {
      setIsTranscribing(false);
    }
  }

  function updateModelConfig(field, value) {
    setModelConfig((current) => {
      if (field === "externalProtocol" && value === "gigachat") {
        return {
          ...current,
          externalAgent: "GigaChat API",
          externalProtocol: value,
          externalEndpoint: "https://api.giga.chat/v1/chat/completions",
          externalModel: current.externalModel.startsWith("GigaChat")
            ? current.externalModel
            : GIGACHAT_MODELS[0].id,
        };
      }
      return { ...current, [field]: value };
    });
    setConnectionStatus("not-tested");
    traceEvent("model.config", `Изменён параметр модели: ${field}`, { field, value: /key|token|secret|password/i.test(field) ? "[REDACTED]" : value });
  }

  async function testModelConnection() {
    setError("");
    setIsTestingConnection(true);
    setConnectionStatus("testing");
    traceEvent("model.test.start", "Запущена проверка модели", {
      source: modelConfig.source,
      model: modelConfig.source === "local" ? modelConfig.localModel : modelConfig.externalModel,
      protocol: modelConfig.externalProtocol,
    });
    try {
      const response = await callModelCompletion({
        modelConfig,
        messages: [{ role: "user", content: "Ответь одним словом: READY" }],
        temperature: 0,
        maxTokens: 12,
        timeoutMs: 30000,
      });
      setConnectionStatus(response ? "ready" : "failed");
      traceEvent("model.test.success", "Модель ответила на контрольный запрос");
    } catch (connectionError) {
      traceEvent("model.test.error", connectionError.message, {}, "error");
      setConnectionStatus("failed");
      setError(`Проверка агента: ${connectionError.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  }

  async function addSources(event) {
    const files = Array.from(event.target.files || []);
    const accepted = [];
    for (const file of files) {
      if (file.size > 2 * 1024 * 1024) {
        setError(`Файл «${file.name}» больше 2 МБ. Для MVP добавьте сокращённую текстовую версию.`);
        continue;
      }
      const text = await file.text();
      accepted.push({
        id: `${file.name}-${file.lastModified}`,
        name: file.name,
        text,
        size: file.size,
      });
    }
    setSources((current) => {
      const byId = new Map(current.map((source) => [source.id, source]));
      accepted.forEach((source) => byId.set(source.id, source));
      return Array.from(byId.values());
    });
    event.target.value = "";
  }

  function attachPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Выберите изображение в формате PNG, JPEG или WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Изображение больше 10 МБ. Выберите файл меньшего размера.");
      return;
    }
    setError("");
    setUploadedPhoto((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return { name: file.name, url: URL.createObjectURL(file) };
    });
  }

  function removePhoto() {
    setUploadedPhoto((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  }

  function resetWorkspace() {
    setScript(EMPTY_SCRIPT);
    setMessages([
      {
        role: "assistant",
        text: "Новый сценарий создан. Расскажите, с чего начнём.",
      },
    ]);
    setError("");
    if (illustrationUrl) URL.revokeObjectURL(illustrationUrl);
    setIllustrationUrl("");
    removePhoto();
    setIllustrationPrompt("");
    setSelectedExcerpt("");
    localStorage.removeItem(PROJECT_STORAGE_KEY);
    setSavedAt("");
    setSaveStatus("ready");
  }

  function exportProject() {
    const payload = {
      version: 1, exportedAt: new Date().toISOString(), mode, genre, script,
      messages, referenceMode, sources, characterProfiles,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `bookcraft-${mode}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSaveStatus("exported");
  }

  async function importProject(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (payload.version !== 1 || !GENRES.includes(payload.genre)) throw new Error("неподдерживаемый формат проекта");
      if (!["book", "video"].includes(payload.mode)) throw new Error("неизвестный тип сценария");
      if (!["introduction", "development", "finale"].every((key) => typeof payload.script?.[key] === "string")) throw new Error("повреждена структура сценария");
      if (payload.mode !== mode) throw new Error(`откройте режим «${STARTERS[payload.mode].title}» и повторите импорт`);
      setGenre(payload.genre);
      setScript(payload.script);
      setMessages(Array.isArray(payload.messages) ? payload.messages : []);
      setReferenceMode(["original", "inspired", "continuation"].includes(payload.referenceMode) ? payload.referenceMode : "original");
      setSources(Array.isArray(payload.sources) ? payload.sources : []);
      setCharacterProfiles(Array.isArray(payload.characterProfiles) ? payload.characterProfiles : []);
      setSaveStatus("imported");
      setError("");
    } catch (importError) {
      setError(`Импорт проекта: ${importError.message}`);
      setSaveStatus("failed");
    }
  }

  function loadM1Demo() {
    setGenre(M1_DEMO.genre);
    setScript({ ...M1_DEMO.script });
    setCharacterProfiles(M1_DEMO.characters.map((character) => ({ ...character })));
    setIdea(M1_DEMO.idea);
    setMessages([
      {
        role: "assistant",
        text:
          "Демо «Невский после полуночи» загружено: четыре героя, три события и незавершённый финал. Нажмите «Отправить», чтобы GigaChat создал генерируемую сцену.",
      },
    ]);
    setError("");
    setSelectedExcerpt("");
    setIllustrationPrompt("");
    if (illustrationUrl) URL.revokeObjectURL(illustrationUrl);
    setIllustrationUrl("");
  }

  function rememberSelection(key, textarea) {
    const excerpt = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd).trim();
    if (!excerpt) return;
    setIllustrationScene(key);
    setSelectedExcerpt(excerpt);
  }

  function addCharacter() {
    setCharacterProfiles((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        name: "",
        role: "",
        appearance: "",
        history: "",
        color: CHARACTER_COLORS[items.length % CHARACTER_COLORS.length],
      },
    ]);
  }

  function updateCharacter(id, field, value) {
    setCharacterProfiles((items) =>
      items.map((character) => (character.id === id ? { ...character, [field]: value } : character)),
    );
  }

  async function createIllustration() {
    const sceneText = selectedExcerpt.trim() || script[illustrationScene]?.trim();
    if (!sceneText) {
      setError("Сначала создайте или заполните выбранную часть сценария.");
      return;
    }
    if (artProvider === "giga" && !gigaAccessToken.trim()) {
      setError("Для облачной иллюстрации вставьте временный access token GigaChat.");
      return;
    }

    setError("");
    setIsIllustrating(true);
    traceEvent("art.generate.start", "Запущено создание иллюстрации", {
      scene: illustrationScene,
      style: visualStyle,
      provider: artProvider,
      excerptLength: sceneText.length,
      hasAccessToken: Boolean(gigaAccessToken.trim()),
    });
    try {
      const sceneNames = {
        introduction: "Вступление",
        development: "Развитие",
        finale: "Финал",
      };
      const prompt = await createIllustrationPrompt({
        genre,
        sceneTitle: sceneNames[illustrationScene],
        sceneText,
        visualStyle,
        characterProfiles,
        modelConfig,
      });
      setIllustrationPrompt(prompt);
      const nextUrl = artProvider === "comfy"
        ? await generateComfyImage({ prompt, scene: illustrationScene, checkpoint: comfyCheckpoint })
        : await generateGigaChatImage({ accessToken: gigaAccessToken.trim(), prompt, scene: illustrationScene });
      if (illustrationUrl) URL.revokeObjectURL(illustrationUrl);
      setIllustrationUrl(nextUrl);
      traceEvent("art.generate.success", "Иллюстрация создана", { scene: illustrationScene, style: visualStyle });
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: selectedExcerpt
            ? `Готово: выделенный отрывок из раздела «${sceneNames[illustrationScene]}» превращён в иллюстрацию.`
            : `Готово: создана иллюстрация для раздела «${sceneNames[illustrationScene]}».`,
        },
      ]);
    } catch (illustrationError) {
      traceEvent("art.generate.error", illustrationError.message, { scene: illustrationScene, style: visualStyle }, "error");
      setError(illustrationError.message);
    } finally {
      setIsIllustrating(false);
    }
  }

  async function buildDiagnosticBundle() {
    const services = {};
    for (const [name, url] of Object.entries({
      mediaGateway: "http://127.0.0.1:8018/api/health",
      localModel: "http://127.0.0.1:1234/v1/models",
      comfyUI: "http://127.0.0.1:8018/api/comfy/health",
    })) {
      const startedAt = performance.now();
      try {
        const response = await fetch(url, { method: "GET" });
        services[name] = { ok: response.ok, status: response.status, durationMs: Math.round(performance.now() - startedAt) };
      } catch (probeError) {
        services[name] = { ok: false, error: probeError.message, durationMs: Math.round(performance.now() - startedAt) };
      }
    }
    let pipelineTrace = [];
    try {
      const traceResponse = await fetch("http://127.0.0.1:8018/api/trace/recent?limit=120");
      if (traceResponse.ok) {
        const tracePayload = await traceResponse.json();
        pipelineTrace = Array.isArray(tracePayload?.events) ? tracePayload.events : [];
      }
    } catch {
      pipelineTrace = [];
    }
    return {
      schema: "bookcraft-diagnostics/v1",
      createdAt: new Date().toISOString(),
      application: { mode, genre, completedSections: completed, wordCount, saveStatus, connectionStatus },
      model: {
        source: modelConfig.source,
        model: modelConfig.source === "local" ? modelConfig.localModel : modelConfig.externalModel,
        protocol: modelConfig.externalProtocol,
        endpoint: modelConfig.source === "external" ? modelConfig.externalEndpoint : "http://127.0.0.1:8018/api/llm/chat/completions",
      },
      art: { scene: illustrationScene, style: visualStyle, hasImage: Boolean(illustrationUrl), hasToken: Boolean(gigaAccessToken.trim()) },
      services,
      pipelineTrace,
      browser: { userAgent: navigator.userAgent, language: navigator.language, online: navigator.onLine, viewport: `${window.innerWidth}x${window.innerHeight}` },
      events: diagnostics,
      privacy: "API keys, access tokens, manuscript text, prompts, source files and images are excluded.",
    };
  }

  async function downloadDiagnostics() {
    setDiagnosticStatus("collecting");
    const bundle = await buildDiagnosticBundle();
    const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `bookcraft-diagnostics-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
    traceEvent("diagnostics.download", "Диагностический журнал сохранён в файл", { eventCount: diagnostics.length });
    setDiagnosticStatus("downloaded");
  }

  async function sendDiagnosticsToGitHub() {
    setDiagnosticStatus("sending");
    setDiagnosticIssueUrl("");
    try {
      const bundle = await buildDiagnosticBundle();
      const response = await fetch("http://127.0.0.1:8018/api/diagnostics/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bundle),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || `GitHub Gateway вернул ${response.status}`);
      setDiagnosticIssueUrl(data.issue_url);
      setDiagnosticStatus("sent");
      traceEvent("diagnostics.github.success", "Диагностика отправлена в GitHub", { issueUrl: data.issue_url });
      window.open(data.issue_url, "_blank", "noopener,noreferrer");
    } catch (sendError) {
      setDiagnosticStatus("failed");
      setError(`Отправка диагностики: ${sendError.message}`);
      traceEvent("diagnostics.github.error", sendError.message, {}, "error");
    }
  }

  function clearDiagnostics() {
    setDiagnostics([]);
    diagnosticSequenceRef.current = 0;
    localStorage.removeItem(DIAGNOSTIC_STORAGE_KEY);
    setDiagnosticIssueUrl("");
    setDiagnosticStatus("ready");
  }

  return (
    <main className="workspace-shell">
      <Atmosphere />
      <header className="workspace-header">
        <button className="back-button" onClick={onBack} aria-label="Вернуться">
          <ArrowLeft size={18} />
        </button>
        <div className="mini-brand"><Feather size={17} /> BOOK·CRAFT</div>
        <div className="workspace-heading">
          <span>Рабочее пространство</span>
          <strong>{meta.title}</strong>
        </div>
        <input ref={projectInputRef} type="file" accept="application/json,.json" hidden onChange={importProject} />
        <div className={`save-indicator ${saveStatus}`} title={savedAt || "Проект ещё не сохранён"}>
          <span />
          {saveStatus === "failed" ? "Ошибка сохранения" : saveStatus === "restored" ? "Проект восстановлен" : saveStatus === "imported" ? "Проект импортирован" : saveStatus === "exported" ? "Копия скачана" : savedAt ? "Автосохранено" : "Готов к работе"}
        </div>
        <button className="project-action" onClick={() => projectInputRef.current?.click()}>
          <FolderOpen size={15} /> Импорт
        </button>
        <button className="project-action" onClick={exportProject}>
          <Download size={15} /> Экспорт
        </button>
        <button className="demo-button" onClick={loadM1Demo}>
          <Sparkles size={15} /> Загрузить демо
        </button>
        <button className="reset-button" onClick={resetWorkspace}>
          <RotateCcw size={15} /> Новый сценарий
        </button>
      </header>

      <details className="diagnostic-panel">
        <summary>
          <span><Activity size={16} /> Трассировка работы программы</span>
          <small className={diagnostics.some((item) => item.level === "error") ? "has-errors" : ""}>
            {diagnostics.length} событий · {diagnostics.filter((item) => item.level === "error").length} ошибок
          </small>
        </summary>
        <div className="diagnostic-content">
          <div className="diagnostic-explanation">
            <Bug size={20} />
            <div>
              <strong>Автоматический журнал действий и ошибок</strong>
              <p>Фиксируются кнопки, выбор модели, этапы запросов, ответы сервисов и ошибки. Токены, ключи и текст рукописи исключены.</p>
            </div>
          </div>
          <div className="diagnostic-events" aria-live="polite">
            {diagnostics.slice(-8).reverse().map((item) => (
              <div className={`diagnostic-event ${item.level}`} key={item.sequence}>
                <time>{new Date(item.timestamp).toLocaleTimeString("ru-RU")}</time>
                <span>{item.type}</span>
                <strong>{item.message}</strong>
              </div>
            ))}
          </div>
          <div className="diagnostic-actions">
            <button type="button" onClick={downloadDiagnostics} disabled={diagnosticStatus === "collecting"}>
              <Download size={15} /> Скачать журнал JSON
            </button>
            <button type="button" className="send-diagnostic" onClick={sendDiagnosticsToGitHub} disabled={diagnosticStatus === "sending"}>
              <GitBranch size={15} /> {diagnosticStatus === "sending" ? "Отправляю…" : "Отправить на проверку"}
            </button>
            <button type="button" className="clear-diagnostic" onClick={clearDiagnostics}>Очистить</button>
            {diagnosticStatus === "sent" && <span className="diagnostic-success"><Check size={14} /> Issue создан</span>}
            {diagnosticIssueUrl && <a href={diagnosticIssueUrl} target="_blank" rel="noreferrer">Открыть отчёт</a>}
          </div>
        </div>
      </details>

      <section
        className="genre-bar genre-spectrum"
        style={{ "--genre-color": genreMeta.color, "--genre-glow": genreMeta.glow }}
      >
        <div className="genre-emblem" aria-live="polite">
          <span className="genre-emblem-symbol" aria-hidden="true">{genreMeta.symbol}</span>
          <GenreIcon size={25} strokeWidth={1.65} />
          <span>
            <small>Жанровый профиль</small>
            <strong>{genre}</strong>
            <em>{genreMeta.caption}</em>
          </span>
        </div>
        <div className="genre-control">
          <label htmlFor="genre-select">Выберите жанр</label>
          <select
            id="genre-select"
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
          >
            {GENRES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="current-genre">
          <Check size={15} /> <span>Текущий жанр:</span> <strong>{genre}</strong>
        </div>
        <div className="workspace-stat"><span>Структура</span><strong>{completed}/3</strong></div>
        <div className="workspace-stat"><span>Объём</span><strong>{wordCount} слов</strong></div>
        <div className="active-model-pill" title={activeModel}><span />{activeModel}</div>
      </section>

      <details className="model-gateway">
        <summary>
          <span><Settings size={16} /> Универсальный агент · подключение модели</span>
          <small>{modelConfig.source === "local" ? "локальный контур" : modelConfig.externalAgent || "внешний агент"}</small>
        </summary>
        <div className="model-gateway-content">
          <div className="model-source-switch" role="group" aria-label="Источник модели">
            <button
              type="button"
              className={modelConfig.source === "local" ? "active" : ""}
              onClick={() => updateModelConfig("source", "local")}
            >
              Локальная модель
            </button>
            <button
              type="button"
              className={modelConfig.source === "external" ? "active" : ""}
              onClick={() => updateModelConfig("source", "external")}
            >
              Внешний агент
            </button>
          </div>

          {modelConfig.source === "local" ? (
            <label className="model-field model-field-wide">
              <span>Модель из подтверждённого локального инвентаря</span>
              <select value={modelConfig.localModel} onChange={(event) => updateModelConfig("localModel", event.target.value)}>
                {availableLocalModels.map((model) => (
                  <option key={model.id} value={model.id}>{model.label} — {model.capability}</option>
                ))}
              </select>
              <small>
                {localModelDiscovery === "ready"
                  ? "Список получен из работающего API LM Studio."
                  : localModelDiscovery === "authentication-required"
                    ? "LM Studio требует API-токен. Для локального ДЗ отключите Require Authentication."
                    : localModelDiscovery === "model-not-loaded"
                      ? "LM Studio запущен, но модель не загружена."
                      : "Показан сохранённый инвентарь. Запустите LM Studio на порту 1234 для точного списка."}
              </small>
            </label>
          ) : (
            <div className="external-agent-grid">
              <label className="model-field">
                <span>Какой внешний агент используется</span>
                <input value={modelConfig.externalAgent} onChange={(event) => updateModelConfig("externalAgent", event.target.value)} placeholder="Например: OpenAI, GigaChat, корпоративный gateway" />
              </label>
              <label className="model-field">
                <span>Протокол</span>
                <select value={modelConfig.externalProtocol} onChange={(event) => updateModelConfig("externalProtocol", event.target.value)}>
                  <option value="openai-compatible">OpenAI-compatible Chat Completions</option>
                  <option value="gigachat">GigaChat API · api.giga.chat</option>
                </select>
              </label>
              <label className="model-field model-field-wide">
                <span>Endpoint</span>
                <input
                  value={modelConfig.externalEndpoint}
                  onChange={(event) => updateModelConfig("externalEndpoint", event.target.value)}
                  placeholder="https://host/v1/chat/completions"
                  readOnly={modelConfig.externalProtocol === "gigachat"}
                />
                {modelConfig.externalProtocol === "gigachat" && (
                  <small>Локальный Vite proxy безопасно направляет запрос на https://api.giga.chat/v1/chat/completions.</small>
                )}
              </label>
              <label className="model-field">
                <span>Модель</span>
                {modelConfig.externalProtocol === "gigachat" ? (
                  <select value={modelConfig.externalModel} onChange={(event) => updateModelConfig("externalModel", event.target.value)}>
                    {GIGACHAT_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>{model.label}</option>
                    ))}
                  </select>
                ) : (
                  <input value={modelConfig.externalModel} onChange={(event) => updateModelConfig("externalModel", event.target.value)} placeholder="model-name" />
                )}
              </label>
              <label className="model-field">
                <span><KeyRound size={12} /> {modelConfig.externalProtocol === "gigachat" ? "Access token GigaChat" : "API-ключ"}</span>
                <input
                  type="password"
                  autoComplete="off"
                  value={modelConfig.apiKey}
                  onChange={(event) => updateModelConfig("apiKey", event.target.value)}
                  placeholder={modelConfig.externalProtocol === "gigachat" ? "Временный токен на 30 минут" : "Ключ не сохраняется"}
                />
              </label>
            </div>
          )}

          <div className="model-gateway-footer">
            <button type="button" onClick={testModelConnection} disabled={isTestingConnection}>
              {isTestingConnection ? <LoaderCircle size={14} className="spin" /> : <PlugZap size={14} />}
              Подключить модель
            </button>
            <span className={`connection-status ${connectionStatus}`}>
              {connectionStatus === "ready" ? "READY · модель подключена" : connectionStatus === "failed" ? "FAIL · проверьте параметры" : connectionStatus === "testing" ? "Подключение…" : "Модель ещё не подключена"}
            </span>
            <small>Ключ хранится только в памяти открытой вкладки, не записывается в localStorage и не включается в экспорт.</small>
          </div>
        </div>
      </details>

      <details className="knowledge-panel">
        <summary>
          <span className="knowledge-title"><Database size={16} /> База знаний произведения</span>
          <span className="knowledge-count">{sources.length} источник(а)</span>
        </summary>
        <div className="knowledge-content">
          <div className="reference-modes">
            <span>Режим генерации</span>
            {[
              ["original", "Оригинальная история"],
              ["inspired", "По мотивам"],
              ["continuation", "Продолжение"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={referenceMode === value ? "active" : ""}
                onClick={() => setReferenceMode(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="source-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.json,text/plain,application/json"
              multiple
              hidden
              onChange={addSources}
            />
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              <Upload size={15} /> Добавить TXT / MD / JSON
            </button>
            <small>
              Используйте собственные, лицензированные или перешедшие в общественное достояние тексты.
            </small>
          </div>

          <div className="source-list">
            {sources.length === 0 ? (
              <div className="empty-source">
                <FileText size={18} /> Источники пока не добавлены. Генерация будет полностью оригинальной.
              </div>
            ) : (
              sources.map((source) => (
                <div className="source-chip" key={source.id}>
                  <FileText size={14} />
                  <span>{source.name}</span>
                  <small>{Math.max(1, Math.round(source.size / 1024))} КБ</small>
                  <button
                    type="button"
                    aria-label={`Удалить ${source.name}`}
                    onClick={() =>
                      setSources((current) => current.filter((item) => item.id !== source.id))
                    }
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </details>

      <UniverseBlueprint />

      <details className="character-bible">
        <summary>
          <span><UserRound size={16} /> Паспорта персонажей</span>
          <small>{characterProfiles.length} персонаж(а) · постоянная память образов</small>
        </summary>
        <div className="character-bible-content">
          <p>
            Эти данные добавляются к каждому арт-промпту: профессия, внешность,
            одежда и прожитые события не должны случайно меняться между кадрами.
          </p>
          <div className="character-profile-list">
            {characterProfiles.map((character, index) => (
              <article className="character-profile" key={character.id}>
                <header>
                  <strong>Персонаж {String(index + 1).padStart(2, "0")}</strong>
                  <label className="character-color" title="Цвет персонажа">
                    <input
                      type="color"
                      value={character.color || CHARACTER_COLORS[index % CHARACTER_COLORS.length]}
                      onChange={(event) => updateCharacter(character.id, "color", event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    aria-label="Удалить персонажа"
                    onClick={() => setCharacterProfiles((items) => items.filter((item) => item.id !== character.id))}
                  >
                    <Trash2 size={13} />
                  </button>
                </header>
                <input placeholder="Имя" value={character.name} onChange={(event) => updateCharacter(character.id, "name", event.target.value)} />
                <input placeholder="Кто он: профессия, статус, навыки" value={character.role} onChange={(event) => updateCharacter(character.id, "role", event.target.value)} />
                <textarea placeholder="Постоянная внешность, возраст, телосложение, одежда" value={character.appearance} onChange={(event) => updateCharacter(character.id, "appearance", event.target.value)} />
                <textarea placeholder="Прошлое и уже произошедшие в сюжете события" value={character.history} onChange={(event) => updateCharacter(character.id, "history", event.target.value)} />
              </article>
            ))}
          </div>
          <button type="button" className="add-character" onClick={addCharacter}>
            <UserRound size={14} /> Добавить персонажа
          </button>
        </div>
      </details>

      <section className="workspace-grid">
        <aside className="chat-panel panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">AI-соавтор</span>
              <h2>{meta.chatTitle}</h2>
            </div>
            <div className="online-dot" title="Локальная модель" />
          </div>

          <div className="messages" aria-live="polite">
            {messages.map((message, index) => (
              <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
                {message.role === "assistant" && <Sparkles size={14} />}
                <p>{message.text}</p>
              </div>
            ))}
            {isLoading && (
              <div className="message assistant loading-message">
                <LoaderCircle size={15} className="spin" />
                <p>Продумываю сюжет и обновляю структуру…</p>
              </div>
            )}
          </div>

          {error && <div className="error-box">{error}</div>}

          <div className="composer">
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/ogg,audio/webm,.mp3,.wav,.m4a,.ogg,.webm"
              onChange={uploadAudioForTranscription}
              hidden
            />
            <div className="prompt-chips" aria-label="Быстрые команды">
              {["Предложи сильную завязку", "Усиль конфликт", "Сделай финал неожиданным"].map((prompt) => (
                <button type="button" key={prompt} onClick={() => setIdea(prompt)}>{prompt}</button>
              ))}
            </div>
            <textarea
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Опишите идею, сюжет или задачу"
              rows={3}
            />
            <button
              type="button"
              className="audio-upload-button"
              onClick={() => audioInputRef.current?.click()}
              disabled={isTranscribing || isLoading}
            >
              {isTranscribing ? <LoaderCircle size={17} className="spin" /> : <Upload size={17} />}
              {isTranscribing ? "Распознаю аудио…" : "Загрузить MP3 и расшифровать"}
            </button>
            <button onClick={sendMessage} disabled={!idea.trim() || isLoading}>
              <Send size={17} /> Отправить
            </button>
          </div>
        </aside>

        <section className="script-panel panel">
          <div className="panel-heading script-heading">
            <div>
              <span className="panel-kicker">Редактор структуры</span>
              <h2>{meta.title}</h2>
            </div>
            <div className="script-metrics">
              <div className="progress-pill">{completed}/3 раздела</div>
              <span>{wordCount} слов</span>
            </div>
          </div>

          <div className="script-sections">
            {[
              ["introduction", "01", "Вступление", "Завязка, мир, герои и первый импульс истории"],
              ["development", "02", "Развитие", "Конфликт, препятствия, решения и поворотные точки"],
              ["finale", "03", "Финал", "Кульминация, развязка и итоговое впечатление"],
            ].map(([key, number, title, placeholder]) => (
              <article className="script-block" key={key}>
                <header>
                  <span>{number}</span>
                  <div><strong>{title}</strong><small>{placeholder}</small></div>
                </header>
                <textarea
                  value={script[key]}
                  onChange={(event) =>
                    setScript((current) => ({ ...current, [key]: event.target.value }))
                  }
                  onSelect={(event) => rememberSelection(key, event.currentTarget)}
                  placeholder={`Здесь появится ${title.toLowerCase()}. Текст можно редактировать вручную.`}
                />
                <div className="selection-action">
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (illustrationScene !== key) setSelectedExcerpt("");
                      setIllustrationScene(key);
                      document.querySelector(".illustration-studio")?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                  >
                    <ImageIcon size={13} /> Иллюстрировать выделенное
                  </button>
                  <span>
                    {illustrationScene === key && selectedExcerpt
                      ? `Выбрано ${selectedExcerpt.length} символов`
                      : "Выделите абзац мышью"}
                  </span>
                </div>
                <CharacterHighlight text={script[key]} characters={characterProfiles} />
              </article>
            ))}

            <article className="illustration-studio">
              <header className="illustration-heading">
                <div className="illustration-icon"><ImageIcon size={20} /></div>
                <div>
                  <span>AI ART · COMFYUI + GIGACHAT</span>
                  <h3>Текст превращается в иллюстрацию</h3>
                  <p>Локальный ComfyUI использует ваши checkpoint и LoRA без токена; GigaChat остаётся облачным резервом.</p>
                </div>
              </header>

              <div className="illustration-controls">
                <label>
                  Генератор изображения
                  <select value={artProvider} onChange={(event) => setArtProvider(event.target.value)}>
                    <option value="comfy">Локальный ComfyUI · бесплатно</option>
                    <option value="giga">Облачный GigaChat · токен</option>
                  </select>
                </label>
                <label>
                  Источник кадра
                  <select value={illustrationScene} onChange={(event) => { setIllustrationScene(event.target.value); setSelectedExcerpt(""); }}>
                    <option value="introduction">Вступление</option>
                    <option value="development">Развитие</option>
                    <option value="finale">Финал</option>
                  </select>
                </label>
                <label>
                  Визуальный стиль
                  <select value={visualStyle} onChange={(event) => setVisualStyle(event.target.value)}>
                    <option>Кинематографичная книжная иллюстрация</option>
                    <option>Графический роман</option>
                    <option>Акварельная сказка</option>
                    <option>Ретрофутуризм</option>
                    <option>Исторический реализм</option>
                  </select>
                </label>
                {artProvider === "comfy" ? (
                  <label className="token-field">
                    Checkpoint ComfyUI
                    <select value={comfyCheckpoint} onChange={(event) => setComfyCheckpoint(event.target.value)}>
                      {comfyCheckpoints.length ? comfyCheckpoints.map((checkpoint) => (
                        <option key={checkpoint} value={checkpoint}>{checkpoint}</option>
                      )) : <option value="">Запустите ComfyUI на порту 8188</option>}
                    </select>
                  </label>
                ) : (
                  <label className="token-field">
                    Временный access token GigaChat
                    <input
                      type="password"
                      value={gigaAccessToken}
                      onChange={(event) => setGigaAccessToken(event.target.value)}
                      placeholder="Токен хранится только в памяти вкладки"
                      autoComplete="off"
                    />
                  </label>
                )}
                <button
                  type="button"
                  className="illustrate-button"
                  onClick={createIllustration}
                  disabled={isIllustrating || !script[illustrationScene]?.trim()}
                >
                  {isIllustrating ? <LoaderCircle size={17} className="spin" /> : <Sparkles size={17} />}
                  {isIllustrating ? "Создаю кадр…" : "Создать иллюстрацию"}
                </button>
              </div>

              {selectedExcerpt && (
                <div className="selected-excerpt">
                  <span>ВЫДЕЛЕННЫЙ ОТРЫВОК</span>
                  <p>{selectedExcerpt}</p>
                  <button type="button" onClick={() => setSelectedExcerpt("")}>Использовать весь раздел</button>
                </div>
              )}

              <section className={`photo-upload-card ${uploadedPhoto ? "has-photo" : ""}`} aria-label="Загрузка изображения">
                {uploadedPhoto && (
                  <div className="photo-uploaded-status" role="status">
                    <Check size={15} /> Фото загружено
                  </div>
                )}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/*"
                  hidden
                  onChange={attachPhoto}
                />
                {uploadedPhoto ? (
                  <>
                    <img src={uploadedPhoto.url} alt="Прикреплённое пользователем изображение" />
                    <div className="photo-upload-meta">
                      <span>{uploadedPhoto.name}</span>
                      <button type="button" onClick={removePhoto}>
                        <Trash2 size={14} /> Удалить фото
                      </button>
                    </div>
                  </>
                ) : (
                  <button type="button" className="photo-upload-empty" onClick={() => photoInputRef.current?.click()}>
                    <Upload size={22} />
                    <strong>Добавить изображение</strong>
                    <span>После выбора файла появится зелёная надпись «Фото загружено»</span>
                  </button>
                )}
                {uploadedPhoto && (
                  <button type="button" className="replace-photo-button" onClick={() => photoInputRef.current?.click()}>
                    <Upload size={14} /> Заменить
                  </button>
                )}
              </section>

              <div className={`illustration-preview ${illustrationUrl ? "has-image" : ""}`}>
                {illustrationUrl ? (
                  <>
                    <img src={illustrationUrl} alt={`AI-иллюстрация: ${illustrationScene}`} />
                    <a href={illustrationUrl} download={`bookcraft-${illustrationScene}.jpg`}>
                      <Download size={15} /> Скачать кадр
                    </a>
                  </>
                ) : (
                  <div className="empty-illustration">
                    <ImageIcon size={34} />
                    <strong>Здесь появится первый кадр комикса</strong>
                    <span>Выберите сцену и запустите генерацию</span>
                  </div>
                )}
              </div>

              {illustrationPrompt && (
                <details className="art-prompt">
                  <summary>Показать арт-промпт</summary>
                  <p>{illustrationPrompt}</p>
                </details>
              )}
              <small className="cloud-notice">
                В GigaChat отправляется только готовый арт-промпт. Временный access token проходит через локальный Media Gateway и не сохраняется.
              </small>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}

export default function App() {
  const [mode, setMode] = useState(null);
  return mode ? (
    <Workspace mode={mode} onBack={() => setMode(null)} />
  ) : (
    <StartScreen onSelect={setMode} />
  );
}
