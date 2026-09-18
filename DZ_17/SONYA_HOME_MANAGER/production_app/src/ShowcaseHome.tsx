import type { ShowcaseModuleId } from './showcase-data';
import { showcaseModules } from './showcase-data';
import './showcase.css';

type Props = {
  onOpen: (id: ShowcaseModuleId) => void;
  childAge: number;
  guests: number;
  budget: number;
};

const primaryIds: ShowcaseModuleId[] = ['menu', 'kids', 'dessert', 'drinks', 'tips'];

export default function ShowcaseHome({ onOpen, childAge, guests, budget }: Props) {
  const primary = showcaseModules.filter(item => primaryIds.includes(item.id));

  return <div className="showcase-home">
    <section className="portfolio-hero">
      <div className="portfolio-hero-copy">
        <span className="portfolio-kicker">С О Н Я</span>
        <h1>Ваш AI-помощник<br/>для дома, здорового<br/>питания и детских праздников</h1>
        <p>СОНЯ планирует меню, анализирует фото, помогает готовить, организует семейные события и собирает всё важное в одном спокойном интерфейсе.</p>
        <div className="portfolio-cta">
          <button onClick={() => onOpen('kids')}>Попробовать бесплатно <span>→</span></button>
          <button className="ghost" onClick={() => onOpen('events')}>🎬 Витринный сценарий</button>
        </div>
        <div className="portfolio-benefits">
          <span>🌱 Здоровые дети</span>
          <span>♡ Больше времени для семьи</span>
          <span>✦ Счастливые моменты дома</span>
        </div>
      </div>

      <div className="portfolio-hero-visual">
        <div className="hero-orb hero-orb-a"/>
        <div className="hero-orb hero-orb-b"/>
        <div className="hero-family-card">
          <div className="hero-family-emoji">👧🏼</div>
          <div className="hero-family-copy"><b>Полезная еда — счастливые дети</b><span>СОНЯ всегда рядом</span></div>
        </div>
        <div className="hero-mini-card"><small>СЦЕНАРИЙ</small><b>Детский праздник</b><span>{childAge} лет · {guests} гостей · {budget.toLocaleString('ru-RU')} ₽</span></div>
        <div className="hero-dots"><i/><i/><i/><i/></div>
      </div>
    </section>

    <section className="portfolio-grid">
      {primary.map((item, index) => <button
        key={item.id}
        className={`portfolio-module portfolio-${item.accent} ${index < 2 ? 'portfolio-wide' : ''}`}
        onClick={() => onOpen(item.id)}
      >
        <div className="portfolio-module-art"><span>{item.emoji}</span><div className="art-glow"/></div>
        <div className="portfolio-module-copy">
          <h3>{item.title}</h3>
          <p>{item.subtitle}</p>
          <ul>{item.bullets.map(bullet => <li key={bullet}>✓ {bullet}</li>)}</ul>
          <b className="portfolio-open">Открыть →</b>
        </div>
      </button>)}
    </section>

    <section className="portfolio-promo">
      <div className="promo-art"><span>🎂</span><span>🎈</span><span>🥗</span></div>
      <div><small>SONYA FAMILY</small><h2>Когда детские праздники становятся полезными</h2><p>Вкусные идеи, продуманное меню, список покупок и понятная организация — без хаоса.</p></div>
      <button onClick={() => onOpen('events')}>Открыть праздник →</button>
    </section>

    <footer className="portfolio-footer">
      <div><b>СОНЯ</b><small>ВАШ ДОМ В ГАРМОНИИ</small></div>
      <nav><button onClick={() => onOpen('menu')}>Возможности</button><button onClick={() => onOpen('events')}>Праздники</button><button onClick={() => onOpen('settings')}>Настройки</button></nav>
      <span>Showcase build · Human-in-the-loop AI</span>
    </footer>
  </div>;
}
