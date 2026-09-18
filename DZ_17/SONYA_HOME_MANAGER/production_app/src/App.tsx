import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Camera, Check, ChefHat, ChevronRight, CircleAlert, Clock3, CreditCard, Home,
  ListChecks, PartyPopper, Refrigerator, RotateCcw, Settings2, ShoppingBasket,
  SkipBack, SkipForward, Sparkles, Square, Trash2, Upload, UtensilsCrossed,
  Volume2, VolumeX, WandSparkles, X,
} from 'lucide-react';
import { api, imageTools } from './local-platform';
import ShowcaseHome from './ShowcaseHome';
import ShowcaseModuleMvp from './ShowcaseModuleMvp';
import type { ShowcaseModuleId } from './showcase-data';

type Mode = 'inspiration' | 'fridge';
type Workspace = 'showcase' | 'analyze' | 'plan' | 'shopping' | 'module';
type MascotState = 'idle' | 'ready' | 'thinking' | 'speaking' | 'success' | 'error';

type Analysis = {
  headline: string;
  confidenceNote: string;
  observation: string[];
  assumptions: string[];
  preparation: string[];
  menu: { name: string; why: string; timeMinutes: number }[];
  shoppingList: { item: string; quantity: string; priority: string }[];
  safety: string[];
};

type ApiResult = { analysis: Analysis; latencyMs: number; engine: string };
type DesignSettings = {
  tickerEnabled: boolean; tickerText: string; tickerSpeed: number;
  heroAutoplay: boolean; heroDelay: number; transitionSpeed: number;
  randomOrder: boolean; pauseOnHover: boolean; glow: number; glass: number;
  motion: number; tone: number;
};

const defaultPrompt = 'Соня, это идея еды для детского праздника. Проанализируй фотографию, определи, из чего сделаны фигурки или блюда, расскажи, как приготовить такое дома, рассчитай продукты на 10 детей и составь список покупок. Отдельно укажи, что видно точно, что является предположением и какие есть безопасные замены.';
const defaultDesign: DesignSettings = {
  tickerEnabled: true,
  tickerText: 'SONYA ONLINE  •  VISION READY  •  ПЛАНИРОВЩИК МЕНЮ  •  ДЕТСКИЙ ОБЕД  •  ДЕСЕРТЫ БЕЗ САХАРА  •  КОМПОТЫ И МОРСЫ  •  ГОЛОСОВОЙ РЕЖИМ  •  ЗДОРОВАЯ СЕМЬЯ  •',
  tickerSpeed: 26, heroAutoplay: true, heroDelay: 7, transitionSpeed: 650,
  randomOrder: false, pauseOnHover: true, glow: 72, glass: 68, motion: 70, tone: 0,
};
const heroFrames = [
  ['СОНЯ · умный помощник', 'Ваш AI-помощник для дома, здорового питания и детских праздников', 'СОНЯ планирует меню, анализирует фото, помогает готовить, собирает покупки, организует семейные события и озвучивает шаги приготовления.', 'СОНЯ всегда рядом', '✦'],
  ['ПРАЗДНИК · без хаоса', 'Детский праздник — от идеи до последней тарелки', 'Гости, меню, полезные десерты, покупки, тайминг кухни и подача собираются в единый понятный план.', 'Праздник, который объединяет', '🎈'],
  ['ЗДОРОВОЕ ДЕТСТВО · вкусно', 'Красивые детские блюда, которые хочется попробовать', 'Весёлая подача, безопасные замены, десерты без добавленного сахара, морсы и компоты вместо сладкой газировки.', 'Вкусное детство сегодня', '🍓'],
  ['ДОМ · запасы под контролем', 'Холодильник и домашний склад работают вместе с меню', 'Фото запасов превращается в понятный остаток: что уже есть, сколько нужно и что действительно стоит заказать.', 'Меньше лишних покупок', '🥗'],
] as const;
const initialTasks = ['Уборка и подготовка дома', 'Список гостей', 'Торт и десерты', 'Украшения и декор', 'Меню и напитки', 'Подарки', 'Тайминг праздника', 'Бюджет план / факт'].map((label, i) => ({ label, done: i < 3 }));

function loadDesign() {
  try {
    const saved = localStorage.getItem('sonya-design-settings');
    return saved ? { ...defaultDesign, ...JSON.parse(saved) } : defaultDesign;
  } catch { return defaultDesign; }
}

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [workspace, setWorkspace] = useState<Workspace>('showcase');
  const [selectedModule, setSelectedModule] = useState<ShowcaseModuleId>('home');
  const [mode, setMode] = useState<Mode>('inspiration');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [childAge, setChildAge] = useState(8);
  const [guests, setGuests] = useState(10);
  const [budget, setBudget] = useState(15000);
  const [lifestyle, setLifestyle] = useState('ЗОЖ + детское меню');
  const [allergies, setAllergies] = useState('нет данных');
  const [analysis, setAnalysis] = useState<ApiResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mascot, setMascot] = useState<MascotState>('idle');
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [cookingMode, setCookingMode] = useState(false);
  const [cookingStep, setCookingStep] = useState(0);
  const [tasks, setTasks] = useState(initialTasks);
  const [design, setDesign] = useState<DesignSettings>(loadDesign);
  const [adminOpen, setAdminOpen] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);

  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const doneCount = tasks.filter(x => x.done).length;
  const shopping = analysis?.analysis.shoppingList ?? [];
  const summary = useMemo(() => `${childAge} лет · ${guests} гостей · ${budget.toLocaleString('ru-RU')} ₽`, [childAge, guests, budget]);
  const hero = heroFrames[heroIndex];
  const style = {
    '--tone': design.tone,
    '--glass-hi': (0.12 + design.glass / 100 * 0.24).toFixed(3),
    '--glass-lo': (0.36 + design.glass / 100 * 0.42).toFixed(3),
    '--glow': (0.05 + design.glow / 100 * 0.28).toFixed(3),
    '--ticker': `${design.tickerSpeed}s`,
    '--hero-speed': `${design.transitionSpeed}ms`,
    '--lift': `${(design.motion / 100 * 6).toFixed(1)}px`,
  } as CSSProperties;

  useEffect(() => localStorage.setItem('sonya-design-settings', JSON.stringify(design)), [design]);
  useEffect(() => {
    if (!design.heroAutoplay || heroPaused) return;
    const timer = window.setInterval(() => setHeroIndex(prev => {
      if (!design.randomOrder) return (prev + 1) % heroFrames.length;
      let next = Math.floor(Math.random() * heroFrames.length);
      if (next === prev) next = (next + 1) % heroFrames.length;
      return next;
    }), Math.max(2, design.heroDelay) * 1000);
    return () => window.clearInterval(timer);
  }, [design.heroAutoplay, design.heroDelay, design.randomOrder, heroPaused]);
  useEffect(() => () => { if (speechSupported) speechSynthesis.cancel(); if (preview) URL.revokeObjectURL(preview); }, [preview, speechSupported]);

  const speak = (text: string) => {
    if (!speechSupported) return setError('Озвучка недоступна в этом браузере.');
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const ru = speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith('ru'));
    if (ru) u.voice = ru;
    u.lang = ru?.lang || 'ru-RU'; u.rate = 0.94; u.pitch = 1.02;
    u.onstart = () => { setSpeaking(true); setMascot('speaking'); };
    u.onend = () => { setSpeaking(false); setMascot('success'); };
    speechSynthesis.speak(u);
  };
  const stopSpeech = () => { if (speechSupported) speechSynthesis.cancel(); setSpeaking(false); setMascot(analysis ? 'success' : 'idle'); };
  const narration = (r: Analysis) => [r.headline, 'Что видно точно', ...r.observation, 'Как приготовить', ...r.preparation, 'Безопасность и замены', ...r.safety].join('. ');

  const onFile = (next: File | null) => {
    setError(''); setAnalysis(null); setCookingMode(false);
    if (!next) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type)) return setError('Поддерживаются JPG, PNG и WEBP.');
    if (next.size > 8 * 1024 * 1024) return setError('Фото больше 8 МБ.');
    if (preview) URL.revokeObjectURL(preview);
    setFile(next); setPreview(URL.createObjectURL(next)); setMascot('ready');
  };

  const analyze = async () => {
    if (!file) return setError('Сначала загрузите фотографию для совместного анализа image + text.');
    if (!prompt.trim()) return setError('Добавьте текстовый запрос для Сони.');
    stopSpeech(); setBusy(true); setError(''); setAnalysis(null); setCookingMode(false); setMascot('thinking');
    try {
      const prepared = await imageTools.resizeIfNeeded(file, { maxDimension: 1600, maxPixels: 2_000_000, quality: 0.82, mimeType: 'image/jpeg' });
      const response = await api.post('/api/analyze', { image: { data: prepared.data, mimeType: prepared.mimeType }, prompt: prompt.trim(), mode, profile: { childAge, guests, budget, lifestyle, allergies } });
      const next = response.data as ApiResult; setAnalysis(next); setMascot('success'); if (autoSpeak) speak(narration(next.analysis));
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка анализа'); setMascot('error'); } finally { setBusy(false); }
  };

  const applyPreset = (preset: 'menu' | 'kids' | 'dessert' | 'drinks' | 'tips' | 'fridge') => {
    setWorkspace('analyze'); setAnalysis(null); setError('');
    if (preset === 'fridge') { setMode('fridge'); setPrompt('Соня, проанализируй фото холодильника или домашних запасов. Определи, что уже есть, предложи блюда и список того, что стоит докупить.'); return; }
    setMode('inspiration');
    const prompts = {
      menu: 'Соня, помоги собрать сбалансированное меню для семьи и детского праздника. По фото оцени идею блюда, предложи сочетания, время приготовления и список покупок.',
      kids: 'Соня, это идея детского обеда. Сделай блюдо полезным, красивым и удобным для ребёнка. Объясни приготовление и предложи безопасные замены.',
      dessert: 'Соня, предложи на основе фото вкусный детский десерт без добавленного сахара. Укажи натуральные способы подсластить, порции, время и покупки.',
      drinks: 'Соня, помоги сделать натуральный компот или морс для детей без лишнего сахара. По фото предложи состав, пропорции, приготовление и количество на гостей.',
      tips: 'Соня, оцени идею на фото с точки зрения здорового семейного питания, удобной подачи детям и подготовки праздника. Дай практичные советы и безопасные улучшения.',
    };
    setPrompt(prompts[preset]);
  };

  const openShowcaseModule = (id: ShowcaseModuleId) => {
    if (id === 'home') return setWorkspace('showcase');
    if (id === 'menu') return applyPreset('menu');
    if (id === 'kids') return applyPreset('kids');
    if (id === 'dessert') return applyPreset('dessert');
    if (id === 'drinks') return applyPreset('drinks');
    if (id === 'tips') return applyPreset('tips');
    if (id === 'fridge') return applyPreset('fridge');
    if (id === 'events') return setWorkspace('plan');
    if (id === 'shopping') return setWorkspace('shopping');
    setSelectedModule(id);
    setWorkspace('module');
  };

  const startCooking = () => { const steps = analysis?.analysis.preparation ?? []; if (!steps.length) return; setCookingMode(true); setCookingStep(0); speak(`Режим готовки. Шаг 1 из ${steps.length}. ${steps[0]}`); };
  const moveStep = (delta: number) => { const steps = analysis?.analysis.preparation ?? []; if (!steps.length) return; const next = Math.max(0, Math.min(steps.length - 1, cookingStep + delta)); setCookingStep(next); speak(`Шаг ${next + 1} из ${steps.length}. ${steps[next]}`); };

  return <div className="app-shell" style={style}>
    <header className="topbar glass">
      <button className="brand" onClick={() => setWorkspace('showcase')}><Home size={22}/><span><b>СОНЯ</b><small>ВАШ ДОМ В ГАРМОНИИ</small></span></button>
      <nav><button onClick={() => setWorkspace('showcase')}>Главная</button><button onClick={() => applyPreset('menu')}>Меню</button><button onClick={() => applyPreset('kids')}>Детский обед</button><button onClick={() => setWorkspace('plan')}>Праздники</button><button onClick={() => setWorkspace('shopping')}>Покупки</button></nav>
      <div className="head-tools"><span className="online">● СОНЯ online</span><button className="gear" onClick={() => setAdminOpen(true)}><Settings2 size={18}/></button></div>
    </header>

    {design.tickerEnabled && <div className="ticker glass"><b>SONYA://LIVE</b><div><span style={{ animationDuration: `${design.tickerSpeed}s` }}>{design.tickerText}&nbsp;&nbsp;&nbsp;&nbsp;{design.tickerText}</span></div></div>}

    {workspace === 'analyze' && <section className="hero glass" onMouseEnter={() => design.pauseOnHover && setHeroPaused(true)} onMouseLeave={() => setHeroPaused(false)}>
      <div className="hero-copy" key={heroIndex}><div className="eyebrow"><Sparkles size={14}/>{hero[0]}</div><h1>{hero[1]}</h1><p>{hero[2]}</p><div className="hero-actions"><button onClick={() => applyPreset('kids')}>Попробовать <ChevronRight size={16}/></button><button onClick={() => setWorkspace('plan')}><PartyPopper size={16}/> Детский праздник</button></div><div className="chips"><span>Полезные рецепты</span><span>Счастливые дети</span><span>Больше времени для семьи</span></div></div>
      <div className="showcase"><div className="big-icon">{hero[4]}</div><Sonya state={mascot}/><div className="showcase-caption">ЗАБОТИТСЯ · ОРГАНИЗУЕТ · ВДОХНОВЛЯЕТ<br/><b>{hero[3]}</b></div><div className="scenario glass"><small>СЦЕНАРИЙ</small><h3>Детский праздник</h3><p>{summary}</p><div className="progress"><i style={{ width: `${doneCount / tasks.length * 100}%` }}/></div></div><div className="dots">{heroFrames.map((_, i) => <button key={i} className={i === heroIndex ? 'active' : ''} onClick={() => setHeroIndex(i)}/>)}</div></div>
    </section>}

    <main className="workspace">
      <aside className="sidebar glass"><Side icon={<Home/>} title="Мой дом" onClick={() => openShowcaseModule('home')}/><Side icon={<UtensilsCrossed/>} title="Планировщик меню" onClick={() => openShowcaseModule('menu')}/><Side icon={<Sparkles/>} title="Детский обед" onClick={() => openShowcaseModule('kids')}/><Side icon={<ChefHat/>} title="Десерты без сахара" onClick={() => openShowcaseModule('dessert')}/><Side icon={<Volume2/>} title="Компоты и морсы" onClick={() => openShowcaseModule('drinks')}/><Side icon={<PartyPopper/>} title="Праздники и гости" onClick={() => openShowcaseModule('events')}/><Side icon={<ShoppingBasket/>} title="Покупки" onClick={() => openShowcaseModule('shopping')}/><Side icon={<WandSparkles/>} title="Полезные советы" onClick={() => openShowcaseModule('tips')}/><Side icon={<Refrigerator/>} title="Мой холодильник" onClick={() => openShowcaseModule('fridge')}/><Side icon={<CreditCard/>} title="Счета и напоминания" onClick={() => openShowcaseModule('reminders')}/><Side icon={<ListChecks/>} title="Семейный календарь" onClick={() => openShowcaseModule('calendar')}/><Side icon={<WandSparkles/>} title="Заметки" onClick={() => openShowcaseModule('notes')}/><Side icon={<Settings2/>} title="Настройки" onClick={() => openShowcaseModule('settings')}/></aside>
      <section className="content">
        {workspace === 'showcase' && <ShowcaseHome onOpen={openShowcaseModule} childAge={childAge} guests={guests} budget={budget}/>}
        {workspace === 'module' && <ShowcaseModuleMvp id={selectedModule} onBack={() => setWorkspace('showcase')}/>}
        {workspace === 'analyze' && <>
          <div className="welcome glass"><div>☀ <b>Доброе утро!</b><span>Пусть сегодня будет вкусный, спокойный и счастливый день.</span></div><div className="badges"><span>Vision AI</span><span>Voice coach</span><span>Healthy family</span></div></div>
          <div className="feature-grid"><Feature emoji="🥗" title="Планировщик меню" text="Баланс, предпочтения и единый список покупок." onClick={() => applyPreset('menu')}/><Feature emoji="🐻" title="Детский обед" text="Полезные блюда, которые выглядят как праздник." onClick={() => applyPreset('kids')}/><Feature emoji="🍓" title="Десерты без сахара" text="Натуральные сладости для маленьких гурманов." onClick={() => applyPreset('dessert')}/><Feature emoji="🫐" title="Компоты и морсы" text="Натуральные напитки вместо сладкой газировки." onClick={() => applyPreset('drinks')}/><Feature emoji="💡" title="Полезные советы" text="Подача, привычки и идеи для семьи." onClick={() => applyPreset('tips')}/></div>
          <section className="panel glass"><h2>Покажите Соне фото и объясните задачу</h2><div className="mode-grid"><button className={mode === 'inspiration' ? 'selected' : ''} onClick={() => setMode('inspiration')}><Camera/> Хочу такое</button><button className={mode === 'fridge' ? 'selected' : ''} onClick={() => setMode('fridge')}><Refrigerator/> Что у меня есть</button></div><div className="analysis-grid"><div className="upload">{preview ? <><img src={preview}/><div className="photo-buttons"><button onClick={() => inputRef.current?.click()}><Upload size={15}/>Заменить</button><button onClick={() => { if (preview) URL.revokeObjectURL(preview); setPreview(''); setFile(null); }}><Trash2 size={15}/>Удалить</button></div></> : <button className="upload-empty" onClick={() => inputRef.current?.click()}><Upload size={28}/><b>Добавить фотографию</b><span>JPG / PNG / WEBP</span></button>}<input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e => onFile(e.target.files?.[0] ?? null)}/></div><div className="prompt"><textarea value={prompt} onChange={e => setPrompt(e.target.value)}/><button className="primary" onClick={analyze} disabled={busy}>{busy ? 'Соня анализирует…' : 'Анализировать фото + текст'}</button><label><input type="checkbox" checked={autoSpeak} onChange={e => setAutoSpeak(e.target.checked)}/> Автоозвучка результата</label></div></div></section>
          <section className="panel glass"><h2>Контекст семьи</h2><div className="form-grid"><label>Возраст ребёнка<input type="number" value={childAge} onChange={e => setChildAge(Number(e.target.value))}/></label><label>Гостей<input type="number" value={guests} onChange={e => setGuests(Number(e.target.value))}/></label><label>Бюджет, ₽<input type="number" value={budget} onChange={e => setBudget(Number(e.target.value))}/></label><label>Образ жизни<input value={lifestyle} onChange={e => setLifestyle(e.target.value)}/></label><label>Аллергии / ограничения<input value={allergies} onChange={e => setAllergies(e.target.value)}/></label></div></section>
          <section className="panel glass result"><h2>Ответ Сони {analysis && <small>{analysis.engine} · {analysis.latencyMs} мс</small>}</h2>{error && <div className="error"><CircleAlert/> {error}</div>}{!analysis && !error && <div className="empty">Здесь появится реальный совместный анализ изображения и текста.</div>}{analysis && <AnalysisView result={analysis.analysis} speaking={speaking} onSpeak={() => speak(narration(analysis.analysis))} onStop={stopSpeech} onCooking={startCooking}/>} {analysis && cookingMode && <CookingCoach steps={analysis.analysis.preparation} current={cookingStep} speaking={speaking} onPrev={() => moveStep(-1)} onNext={() => moveStep(1)} onRepeat={() => speak(`Шаг ${cookingStep + 1}. ${analysis.analysis.preparation[cookingStep]}`)} onStop={stopSpeech} onClose={() => setCookingMode(false)}/>}</section>
        </>}
        {workspace === 'plan' && <PlanView tasks={tasks} setTasks={setTasks}/>} 
        {workspace === 'shopping' && <ShoppingView items={shopping}/>} 
      </section>
    </main>
    {adminOpen && <DesignAdmin settings={design} onChange={patch => setDesign(v => ({ ...v, ...patch }))} onReset={() => setDesign(defaultDesign)} onClose={() => setAdminOpen(false)}/>} 
  </div>;
}

function Side({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) { return <button onClick={onClick}>{icon}<span>{title}</span></button>; }
function Feature({ emoji, title, text, onClick }: { emoji: string; title: string; text: string; onClick: () => void }) { return <button className="feature glass" onClick={onClick}><div>{emoji}</div><h3>{title}</h3><p>{text}</p></button>; }
function Sonya({ state }: { state: MascotState }) { return <div className={`sonya sonya-${state}`}><div className="orbit"/><div className="bot"><div className="antenna"/><div className="head"><span/><span/></div><div className="body"><Sparkles/></div></div><small>{state === 'thinking' ? 'Думаю…' : state === 'speaking' ? 'Рассказываю…' : state === 'ready' ? 'Фото вижу' : state === 'error' ? 'Нужна поправка' : 'Готова помочь'}</small></div>; }
function AnalysisView({ result, speaking, onSpeak, onStop, onCooking }: { result: Analysis; speaking: boolean; onSpeak: () => void; onStop: () => void; onCooking: () => void }) { return <div className="analysis-result"><div className="voicebar"><button onClick={speaking ? onStop : onSpeak}>{speaking ? <VolumeX/> : <Volume2/>}{speaking ? 'Стоп' : 'Озвучить ответ'}</button><button onClick={onCooking}><ChefHat/>Режим готовки</button></div><div className="result-grid"><Result title="Что видно точно" items={result.observation}/><Result title="Что предполагаю" items={result.assumptions}/><Result title="Как приготовить / что сделать" items={result.preparation}/><Result title="Безопасность и замены" items={result.safety}/></div><h3>Варианты для праздника</h3><div className="menu-grid">{result.menu.map((m, i) => <article key={i}><b>{m.name}</b><p>{m.why}</p><small><Clock3 size={14}/>{m.timeMinutes} мин</small></article>)}</div></div>; }
function Result({ title, items }: { title: string; items: string[] }) { return <article className="result-card"><h3>{title}</h3><ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul></article>; }
function CookingCoach({ steps, current, speaking, onPrev, onNext, onRepeat, onStop, onClose }: { steps: string[]; current: number; speaking: boolean; onPrev: () => void; onNext: () => void; onRepeat: () => void; onStop: () => void; onClose: () => void }) { if (!steps.length) return null; return <div className="coach glass"><div><b>ГОЛОСОВОЙ РЕЖИМ · шаг {current + 1}/{steps.length}</b><button onClick={onClose}><Square/></button></div><p>{steps[current]}</p><div><button onClick={onPrev} disabled={current === 0}><SkipBack/>Назад</button><button onClick={speaking ? onStop : onRepeat}>{speaking ? <VolumeX/> : <Volume2/>}{speaking ? 'Стоп' : 'Повторить'}</button><button onClick={onNext} disabled={current === steps.length - 1}>Дальше<SkipForward/></button></div></div>; }
function PlanView({ tasks, setTasks }: { tasks: { label: string; done: boolean }[]; setTasks: React.Dispatch<React.SetStateAction<{ label: string; done: boolean }[]>> }) { return <section className="panel glass"><h2>Детский праздник</h2><div className="task-list">{tasks.map((t, i) => <button key={t.label} className={t.done ? 'done' : ''} onClick={() => setTasks(v => v.map((x, n) => n === i ? { ...x, done: !x.done } : x))}><span>{t.done ? <Check/> : i + 1}</span>{t.label}</button>)}</div></section>; }
function ShoppingView({ items }: { items: Analysis['shoppingList'] }) { const list = items.length ? items : [{ item: 'Воздушные шары', quantity: '1 набор', priority: 'обычно' }, { item: 'Свечи для торта', quantity: '1 набор', priority: 'важно' }]; return <section className="panel glass"><h2>Покупки к празднику</h2><div className="shop-list">{list.map((x, i) => <article key={i}><ShoppingBasket/><b>{x.item}</b><span>{x.quantity}</span><small>{x.priority}</small></article>)}</div></section>; }
function DesignAdmin({ settings, onChange, onReset, onClose }: { settings: DesignSettings; onChange: (p: Partial<DesignSettings>) => void; onReset: () => void; onClose: () => void }) { const presets = [['Blue',0],['Aqua',-18],['Violet',55],['Emerald',-72],['Sunset',132]] as const; return <div className="admin-backdrop" onMouseDown={e => e.currentTarget === e.target && onClose()}><aside className="admin glass"><div className="admin-head"><div><small>SONYA DESIGN SYSTEM</small><h2>Design Admin</h2></div><button onClick={onClose}><X/></button></div><section><h3>Общий тон</h3><div className="tone-presets">{presets.map(([n,v]) => <button key={n} className={settings.tone === v ? 'active' : ''} onClick={() => onChange({ tone: v })}>{n}</button>)}</div><Range label="Hue" value={settings.tone} min={-120} max={160} onChange={tone => onChange({ tone })}/><Range label="Glow" value={settings.glow} min={0} max={100} onChange={glow => onChange({ glow })}/><Range label="Glass" value={settings.glass} min={20} max={100} onChange={glass => onChange({ glass })}/><Range label="Motion" value={settings.motion} min={0} max={100} onChange={motion => onChange({ motion })}/></section><section><h3>Hero</h3><Switch label="Автосмена кадров" checked={settings.heroAutoplay} onChange={heroAutoplay => onChange({ heroAutoplay })}/><Range label="Задержка, сек" value={settings.heroDelay} min={3} max={15} onChange={heroDelay => onChange({ heroDelay })}/><Range label="Переход, мс" value={settings.transitionSpeed} min={200} max={1600} step={50} onChange={transitionSpeed => onChange({ transitionSpeed })}/><Switch label="Случайный порядок" checked={settings.randomOrder} onChange={randomOrder => onChange({ randomOrder })}/><Switch label="Пауза при наведении" checked={settings.pauseOnHover} onChange={pauseOnHover => onChange({ pauseOnHover })}/></section><section><h3>Terminal ticker</h3><Switch label="Показывать строку" checked={settings.tickerEnabled} onChange={tickerEnabled => onChange({ tickerEnabled })}/><textarea value={settings.tickerText} onChange={e => onChange({ tickerText: e.target.value })}/><Range label="Скорость, сек/круг" value={settings.tickerSpeed} min={10} max={50} onChange={tickerSpeed => onChange({ tickerSpeed })}/></section><footer><button onClick={onReset}><RotateCcw/>Сбросить</button><button onClick={onClose}>Готово</button></footer></aside></div>; }
function Range({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) { return <label className="range"><span>{label}<b>{value}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}/></label>; }
function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) { return <label className="switch"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}/>{label}</label>; }
