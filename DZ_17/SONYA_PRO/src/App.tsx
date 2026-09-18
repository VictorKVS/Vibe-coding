import { useMemo, useState } from 'react';
import {
  Bell, CalendarDays, ChevronLeft, ChevronRight, CircleUserRound, Heart,
  Home, ListChecks, Menu, NotebookPen, Search, Settings2, ShoppingCart,
  Sparkles, UtensilsCrossed, X,
} from 'lucide-react';
import { getModule, modules, primaryModuleIds, type ModuleId } from './data';

type LocalCard = { id: string; title: string; done: boolean };

const navTop = ['Главная', 'Возможности', 'Тарифы', 'Блог', 'О нас'];

export default function App() {
  const [active, setActive] = useState<ModuleId>('home');
  const [mobileNav, setMobileNav] = useState(false);
  const [familyNote, setFamilyNote] = useState(() => localStorage.getItem('sonya-pro-family-note') || '');
  const [tasks, setTasks] = useState<LocalCard[]>([
    { id: '1', title: 'Купить ягоды для морса', done: false },
    { id: '2', title: 'Подтвердить меню на субботу', done: true },
    { id: '3', title: 'Проверить список гостей', done: false },
  ]);

  const current = getModule(active);
  const primary = useMemo(() => modules.filter(m => primaryModuleIds.includes(m.id)), []);

  const saveNote = (value: string) => {
    setFamilyNote(value);
    localStorage.setItem('sonya-pro-family-note', value);
  };

  return <div className="pro-shell">
    <header className="pro-header">
      <button className="pro-brand" onClick={() => setActive('home')}>
        <span className="pro-brand-mark">СОНЯ<sup>⌁</sup></span>
        <small>ВАШ ДОМ В ГАРМОНИИ</small>
      </button>

      <div className="pro-tagline">УМНЫЙ ДОМ. ЗДОРОВЫЕ СЕМЬИ. СЧАСТЛИВЫЕ ДЕТИ.</div>

      <div className="pro-actions">
        <button className="icon-btn"><Search size={18}/></button>
        <button className="soft-btn">Войти</button>
        <button className="glow-btn">Начать бесплатно</button>
        <button className="mobile-toggle" onClick={() => setMobileNav(true)}><Menu/></button>
      </div>
    </header>

    <nav className="pro-topnav">
      {navTop.map((item, index) => <button key={item} className={index === 0 ? 'active' : ''}>{item}</button>)}
      <span>Заботится. Организует. Вдохновляет.</span>
    </nav>

    {active === 'home' ? <HomeView onOpen={setActive} primary={primary}/> : <ModuleView
      id={active}
      onBack={() => setActive('home')}
      note={familyNote}
      onNote={saveNote}
      tasks={tasks}
      onTasks={setTasks}
    />}

    {mobileNav && <div className="mobile-drawer-backdrop" onMouseDown={e => e.currentTarget === e.target && setMobileNav(false)}>
      <aside className="mobile-drawer">
        <button className="drawer-close" onClick={() => setMobileNav(false)}><X/></button>
        {modules.map(module => <button key={module.id} onClick={() => { setActive(module.id); setMobileNav(false); }}>
          <span>{module.emoji}</span>{module.title}
        </button>)}
      </aside>
    </div>}
  </div>;
}

function HomeView({ onOpen, primary }: { onOpen: (id: ModuleId) => void; primary: ReturnType<typeof getModule>[] }) {
  return <>
    <section className="pro-hero">
      <div className="hero-copy">
        <div className="eyebrow">С О Н Я</div>
        <h1>Ваш AI-помощник<br/>для дома, здорового<br/>питания и детских праздников</h1>
        <p>СОНЯ планирует меню, подбирает полезные рецепты, помогает готовить, организует детские праздники и делает каждый приём пищи радостным и полезным.</p>
        <div className="hero-buttons">
          <button className="glow-btn big" onClick={() => onOpen('kids')}>Попробовать бесплатно <span>→</span></button>
          <button className="video-btn">▶ <span>Смотреть<br/>видео (1 мин)</span></button>
        </div>
        <div className="hero-benefits">
          <span>🌱 Здоровые дети</span><span>♡ Больше времени для семьи</span><span>☆ Счастливые моменты дома</span>
        </div>
      </div>

      <div className="hero-visual">
        <button className="slider-arrow left"><ChevronLeft/></button>
        <div className="hero-photo-card">
          <div className="hero-photo-scene">
            <div className="child-portrait">👧🏼</div>
            <div className="healthy-plate">🥗</div>
            <div className="berry-drink">🥤</div>
          </div>
          <div className="hero-script">Полезная еда —<br/>счастливые дети!</div>
          <div className="hero-watermark">СОНЯ<small>ВСЕГДА РЯДОМ</small></div>
        </div>
        <button className="slider-arrow right"><ChevronRight/></button>
        <div className="hero-dots"><i className="active"/><i/><i/><i/></div>
      </div>
    </section>

    <main className="pro-main">
      <Sidebar active="home" onOpen={onOpen}/>

      <section className="pro-content">
        <div className="module-grid">
          {primary.map((module, index) => <button key={module.id} className={`module-card ${index < 2 ? 'wide' : ''} accent-${module.accent}`} onClick={() => onOpen(module.id)}>
            <div className="module-art">
              <span className="module-emoji">{module.emoji}</span>
              <span className="dish-orb"/>
            </div>
            <div className="module-info">
              <h2>{module.title}</h2>
              <p>{module.subtitle}</p>
              <ul>{module.bullets.map(item => <li key={item}>☑ {item}</li>)}</ul>
              <b>Открыть →</b>
            </div>
          </button>)}
        </div>

        <section className="family-promo">
          <div className="promo-table">🎂 <span>🥗</span> 🎈</div>
          <div>
            <small>СОНЯ FAMILY</small>
            <h2>СОНЯ — когда детские праздники становятся полезными</h2>
            <p>Вкусные идеи, продуманное меню, списки покупок и уютная организация. Больше радости. Больше здоровья. Больше времени для близких.</p>
          </div>
          <button className="glow-btn" onClick={() => onOpen('events')}>Начать бесплатно →</button>
        </section>
      </section>
    </main>

    <Footer onOpen={onOpen}/>
  </>;
}

function Sidebar({ active, onOpen }: { active: ModuleId; onOpen: (id: ModuleId) => void }) {
  return <aside className="pro-sidebar">
    {modules.map(module => <button key={module.id} className={active === module.id ? 'active' : ''} onClick={() => onOpen(module.id)}>
      <span>{module.emoji}</span>{module.title}
    </button>)}
    <div className="sidebar-quote">🌱<b>Маленькие<br/>здоровые привычки<br/>делают большие<br/>счастливые семьи</b>♥</div>
  </aside>;
}

function ModuleView({
  id, onBack, note, onNote, tasks, onTasks,
}: {
  id: ModuleId;
  onBack: () => void;
  note: string;
  onNote: (value: string) => void;
  tasks: LocalCard[];
  onTasks: (value: LocalCard[]) => void;
}) {
  const module = getModule(id);

  return <main className="pro-main module-page">
    <Sidebar active={id} onOpen={() => {}}/>
    <section className="pro-content">
      <section className={`module-hero accent-${module.accent}`}>
        <button className="back-btn" onClick={onBack}>← На главную</button>
        <span className="module-hero-emoji">{module.emoji}</span>
        <div><small>SONYA PRO · {module.status === 'real' ? 'AI READY' : 'MVP'}</small><h1>{module.title}</h1><p>{module.subtitle}</p></div>
      </section>

      <div className="mvp-layout">
        <section className="pro-panel">
          <h3>Быстрый сценарий</h3>
          <div className="quick-grid">{module.bullets.map((item, index) => <button key={item}><span>{index + 1}</span>{item}</button>)}</div>
        </section>

        <section className="pro-panel">
          <h3>Семейная заметка</h3>
          <textarea value={note} onChange={e => onNote(e.target.value)} placeholder="Что важно учесть сегодня?"/>
          <small>Сохраняется локально. В следующем слое подключим общий семейный профиль и backend.</small>
        </section>

        <section className="pro-panel task-panel">
          <h3>Сегодня</h3>
          {tasks.map(task => <label key={task.id}><input type="checkbox" checked={task.done} onChange={e => onTasks(tasks.map(x => x.id === task.id ? {...x, done:e.target.checked} : x))}/><span>{task.title}</span></label>)}
        </section>

        <section className="pro-panel status-panel">
          <h3>Статус модуля</h3>
          <Status label="Интерфейс" value="готов"/>
          <Status label="Состояние" value="local MVP"/>
          <Status label="AI" value={module.status === 'real' ? 'точка интеграции готова' : 'следующий слой'}/>
          <Status label="Действия" value="только после подтверждения человека"/>
        </section>
      </div>
    </section>
  </main>;
}

function Status({ label, value }: { label: string; value: string }) {
  return <div className="status-row"><b>{label}</b><span>{value}</span></div>;
}

function Footer({ onOpen }: { onOpen: (id: ModuleId) => void }) {
  return <footer className="pro-footer">
    <div className="footer-brand"><b>СОНЯ</b><small>ВАШ ДОМ В ГАРМОНИИ</small></div>
    <nav><button onClick={() => onOpen('menu')}>Возможности</button><button>Тарифы</button><button>Блог</button><button>О нас</button><button>Поддержка</button></nav>
    <div className="socials"><span>VK</span><span>↗</span><span>▶</span><span>◎</span></div>
    <div className="copyright">© 2026 СОНЯ.<br/><small>Умный дом. Счастливые семьи.</small></div>
  </footer>;
}
