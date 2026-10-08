import type { ReactNode } from "react";

export type CreativeTarget =
  | "studio"
  | "newsletter"
  | "podcast"
  | "avatar"
  | "storyboard"
  | "diagnostics";

type CreativeProduct = {
  icon: string;
  title: string;
  description: string;
  status: string;
  target: CreativeTarget;
};

const products: CreativeProduct[] = [
  {
    icon: "▤",
    title: "Книги",
    description: "Идея → исследование → главы → редактура → книга",
    status: "STORY ENGINE",
    target: "storyboard",
  },
  {
    icon: "◫",
    title: "Сценарии",
    description: "Сюжет → сцены → диалоги → storyboard",
    status: "STORY ENGINE",
    target: "storyboard",
  },
  {
    icon: "◇",
    title: "Изображения",
    description: "Персонажи → сцены → иллюстрации → consistency",
    status: "IMAGE ZOO",
    target: "studio",
  },
  {
    icon: "◉",
    title: "Подкасты",
    description: "Сценарий → голос → аудио → публикация",
    status: "TTS",
    target: "podcast",
  },
  {
    icon: "▶",
    title: "Видео",
    description: "Сценарий → avatar → voice → video",
    status: "VIDEO API",
    target: "avatar",
  },
  {
    icon: "◎",
    title: "AI-аватар",
    description: "Персона → голос → мимика → цифровой ведущий",
    status: "AVATAR",
    target: "avatar",
  },
  {
    icon: "⌘",
    title: "Рассылки",
    description: "Brief → LLM → structured email → delivery",
    status: "LLM",
    target: "newsletter",
  },
  {
    icon: "◆",
    title: "FATHER Runtime",
    description: "Models → agents → routing → traces → diagnostics",
    status: "RUNTIME",
    target: "studio",
  },
];

type Props = {
  children?: ReactNode;
  onOpenRuntime?: () => void;
  onNavigate?: (target: CreativeTarget) => void;
};

export function CreativeStudioShell({ children, onOpenRuntime, onNavigate }: Props) {
  return (
    <section className="bookcraft-shell">
      <header className="bookcraft-topbar">
        <div>
          <strong className="bookcraft-logo">BOOKCRAFT</strong>
          <span className="bookcraft-sublogo"> powered by FATHER</span>
        </div>

        <nav className="bookcraft-nav">
          <span>Студия</span>
          <span>Проекты</span>
          <span>Agent Zoo</span>
          <span>Model Zoo</span>
          <span>Knowledge</span>
        </nav>

        <span className="bookcraft-live">● FATHER ONLINE</span>
      </header>

      <div className="bookcraft-hero">
        <div className="bookcraft-copy">
          <span className="bookcraft-eyebrow">
            FATHER CREATIVE AI PLATFORM
          </span>

          <h1>
            Создавайте продукты
            <br />
            вместе с <em>Алиной</em>
          </h1>

          <p>
            От идеи и исследования до текста, изображения, голоса,
            видео и готового цифрового продукта.
          </p>

          <div className="bookcraft-actions">
            <button className="bookcraft-primary" onClick={() => onNavigate?.("studio")}>
              Создать с Алиной
            </button>

            <button
              className="bookcraft-secondary"
              onClick={onOpenRuntime}
            >
              Открыть FATHER Runtime
            </button>
          </div>

          <div className="bookcraft-pipeline">
            <span>IDEA</span>
            <b>→</b>
            <span>ALINA</span>
            <b>→</b>
            <span>FATHER</span>
            <b>→</b>
            <span>AGENTS</span>
            <b>→</b>
            <span>PRODUCT</span>
          </div>
        </div>

        <div className="alina-stage">
          <div className="alina-orbit orbit-one" />
          <div className="alina-orbit orbit-two" />

          <div className="alina-card">
            <span className="alina-status">● ONLINE</span>

            <div className="alina-avatar-placeholder">
              A
            </div>

            <h2>АЛИНА</h2>
            <strong>AI Creative Director</strong>

            <p>
              Исследует · проектирует · создаёт · проверяет
            </p>

            <div className="alina-stack">
              <span>RAG</span>
              <span>Memory</span>
              <span>Agents</span>
              <span>Tools</span>
              <span>Eval</span>
            </div>
          </div>
        </div>
      </div>

      <div className="creative-products">
        {products.map((product) => (
          <article
            className="creative-product"
            key={product.title}
            role="button"
            tabIndex={0}
            onClick={() => onNavigate?.(product.target)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onNavigate?.(product.target);
              }
            }}
          >
            <div className="creative-product-head">
              <span className="creative-product-icon">
                {product.icon}
              </span>
              <small>{product.status}</small>
            </div>

            <h3>{product.title}</h3>
            <p>{product.description}</p>
          </article>
        ))}
      </div>

      <div className="father-flow">
        <span>ALINA</span>
        <b>→</b>
        <span>PROJECT ORCHESTRATOR</span>
        <b>→</b>
        <span>AGENT ZOO</span>
        <b>→</b>
        <span>MODEL ZOO</span>
        <b>→</b>
        <span>TOOLS / MCP</span>
        <b>→</b>
        <span>EVALUATION</span>
      </div>

      {children && (
        <div className="bookcraft-runtime">
          {children}
        </div>
      )}
    </section>
  );
}
