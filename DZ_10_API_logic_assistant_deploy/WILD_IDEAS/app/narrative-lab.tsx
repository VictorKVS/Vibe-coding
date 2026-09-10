'use client';
import {useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,ChevronDown,ChevronUp,FolderArchive,Library,ShieldCheck,Sparkles} from 'lucide-react';
import {Button} from '@/components/ui/button';

type Module={id:string;title:string;purpose:string;mechanic:string;fit:number;refs:string[]};
type Genre={id:string;label:string;note:string;modules:Module[]};

const genres:Genre[]=[
 {id:'scifi',label:'Фантастика / киберпанк',note:'Рост героя, закрытая элита, наследие, древняя технология и постепенно расширяющийся мир.',modules:[
  {id:'outsider',title:'Чужой среди элиты',purpose:'Быстро создаёт социальный контраст и понятную цель героя.',mechanic:'бедный герой → боевая академия → борьба за место',fit:94,refs:['academy story','outsider-to-elite']},
  {id:'team',title:'Соперники становятся командой',purpose:'Даёт ансамбль персонажей и естественные конфликты.',mechanic:'3 конфликта → общий противник → первая совместная победа',fit:91,refs:['ensemble','rivals-to-allies']},
  {id:'legacy',title:'Наследие семьи',purpose:'Связывает личную историю героя с большой историей мира.',mechanic:'дед-герой → отец отказался → наследник выбирает сам',fit:96,refs:['family legacy','generational conflict']},
  {id:'artifact',title:'Деактивированное оружие рода',purpose:'Создаёт правило мира, квест и политическую ценность.',mechanic:'смерть носителя → 3 храма → добровольная привязка',fit:98,refs:['artifact quest','worthiness test']},
  {id:'hidden',title:'Скрытое влияние спецслужб',purpose:'Добавляет долгую интригу без прямого принуждения.',mechanic:'наблюдение с детства → мягкие стимулы → добровольный выбор',fit:88,refs:['hidden hand','institutional pressure']},
  {id:'expand',title:'Расширяющаяся вселенная',purpose:'Не перегружает лором и оставляет пространство для серии.',mechanic:'академия → планета → храмы → цивилизации → космос',fit:95,refs:['progressive reveal','franchise expansion']},
 ]},
 {id:'spy',label:'Шпионский боевик',note:'Миссия, двойные мотивы, контроль информации, предательство и разворот доверия.',modules:[
  {id:'mission',title:'Миссия с неполным брифом',purpose:'Сразу запускает действие и оставляет пространство для открытия правды.',mechanic:'задание → скрытая цель → новая трактовка миссии',fit:90,refs:['mission thriller','information gap']},
  {id:'handler',title:'Куратор с двойной ролью',purpose:'Создаёт постоянное напряжение между помощью и контролем.',mechanic:'наставник → контролёр → возможный союзник/манипулятор',fit:86,refs:['handler','mentor ambiguity']},
  {id:'mole',title:'Предательство внутри команды',purpose:'Проверяет отношения и ломает безопасную структуру.',mechanic:'доверие → утечка → ложное обвинение → раскрытие',fit:89,refs:['mole plot','betrayal']},
  {id:'clock',title:'Ограничение по времени',purpose:'Ускоряет темп и заставляет героев принимать рискованные решения.',mechanic:'угроза → дедлайн → сокращение вариантов → выбор цены',fit:84,refs:['ticking clock','escalation']},
  {id:'reversal',title:'Разворот цели',purpose:'Позволяет превратить простой боевик в политическую интригу.',mechanic:'враг → источник → союзник; заказчик → проблема',fit:92,refs:['reversal','false objective']},
  {id:'cost',title:'Цена лояльности',purpose:'Даёт эмоциональный конфликт поверх миссии.',mechanic:'долг ↔ близкий человек ↔ правда',fit:87,refs:['loyalty conflict','personal stakes']},
 ]},
 {id:'fantasy',label:'Фэнтези / приключение',note:'Чудо, древняя тайна, путешествие, испытания достоинства и конфликт старого мира с новым.',modules:[
  {id:'threshold',title:'Порог в неизвестный мир',purpose:'Отделяет обычную жизнь от приключения.',mechanic:'знак → отказ/сомнение → переход границы',fit:88,refs:['threshold','call to adventure']},
  {id:'relic',title:'Реликвия с правилами',purpose:'Даёт чуду ограничения и делает магию драматургически полезной.',mechanic:'сила + цена + запрет + условие достойности',fit:95,refs:['relic rules','magic constraint']},
  {id:'lost',title:'Утерянные цивилизации',purpose:'Создаёт археологическую глубину и визуальное разнообразие.',mechanic:'следы → руины → ложная версия истории → открытие',fit:93,refs:['lost civilization','deep time']},
  {id:'trials',title:'Три испытания',purpose:'Позволяет каждому испытанию проверять разную сторону героя.',mechanic:'память → воля → жертва',fit:97,refs:['trial sequence','worthiness']},
  {id:'companions',title:'Разные спутники',purpose:'Через героев показывает разные взгляды на мир.',mechanic:'союзник + скептик + носитель тайны',fit:86,refs:['companions','contrast cast']},
  {id:'myth',title:'Легенда оказывается неполной',purpose:'Избегает прямолинейной “избранности”.',mechanic:'семейный миф → противоречие → новая правда',fit:94,refs:['myth revision','hidden history']},
 ]},
 {id:'detective',label:'Детектив / тайна',note:'Цепочка улик, ложные версии, скрытый мотив, проверка алиби и финальная реконструкция.',modules:[
  {id:'inciting',title:'Необъяснимое событие',purpose:'Формирует вопрос, ради которого читатель продолжает историю.',mechanic:'аномалия → первая версия → несостыковка',fit:89,refs:['mystery hook','inciting clue']},
  {id:'clues',title:'Цепочка проверяемых улик',purpose:'Даёт честную игру с читателем.',mechanic:'улика → гипотеза → проверка → новая улика',fit:96,refs:['clue chain','fair play']},
  {id:'red',title:'Ложная, но логичная версия',purpose:'Создаёт напряжение без случайного обмана.',mechanic:'правдивые факты → неверная причинность → опровержение',fit:93,refs:['red herring','false theory']},
  {id:'motive',title:'Скрытый мотив',purpose:'Связывает действие преступления с психологией персонажей.',mechanic:'публичная причина ≠ реальная причина',fit:91,refs:['hidden motive','character secret']},
  {id:'reconstruct',title:'Реконструкция событий',purpose:'Даёт зрителю интеллектуальную награду.',mechanic:'разрозненные факты → единая временная линия',fit:95,refs:['reconstruction','timeline']},
  {id:'after',title:'Последствие раскрытия',purpose:'Не даёт расследованию закончиться одной разгадкой.',mechanic:'правда → новый конфликт отношений/мира',fit:85,refs:['aftermath','truth cost']},
 ]},
];

export function NarrativeLab({onBack,onComplete}:{onBack:()=>void;onComplete:(modules:string[])=>void}){
 const [genre,setGenre]=useState('scifi');
 const current=genres.find(g=>g.id===genre)!;
 const [selected,setSelected]=useState<Record<string,string[]>>(()=>Object.fromEntries(genres.map(g=>[g.id,g.id==='scifi'?g.modules.map(m=>m.id):g.modules.slice(0,4).map(m=>m.id)])));
 const [packed,setPacked]=useState(false),[open,setOpen]=useState<string|null>('legacy');
 const picked=current.modules.filter(m=>selected[current.id]?.includes(m.id));
 const score=useMemo(()=>picked.length?Math.round(picked.reduce((s,m)=>s+m.fit,0)/picked.length):0,[picked]);
 const toggle=(id:string)=>{setPacked(false);setSelected(s=>({...s,[current.id]:(s[current.id]||[]).includes(id)?s[current.id].filter(x=>x!==id):[...(s[current.id]||[]),id]}));};
 const finish=()=>{setPacked(true);setTimeout(()=>onComplete(picked.map(m=>m.title)),550);};
 return <section className={'narrative-lab '+(packed?'is-packed':'')}>
  <div className="narrative-head"><button className="back" onClick={onBack}><ArrowLeft size={16}/>Назад</button><div><p className="eyebrow">STORY DNA / NARRATIVE CONSTRUCTOR</p><h1>Соберём сюжет как<br/>проверяемую конструкцию.</h1><p>В MVP это библиотека драматургических механизмов. Оценка показывает совместимость модулей с выбранным замыслом, а не вероятность кассового успеха.</p></div><div className="narrative-score glass"><span>FIT SCORE</span><strong>{score}</strong><small>/100 · demo heuristic</small></div></div>
  <div className="genre-tabs" role="tablist">{genres.map(g=><button key={g.id} className={g.id===genre?'active':''} onClick={()=>{setGenre(g.id);setPacked(false);}}>{g.label}</button>)}</div>
  <div className="narrative-orbit">
   <div className="narrative-alina"><div className="narrative-ring"/><img src="/alina.png" alt="Алина — AI-продюсер"/><strong>АЛИНА</strong><span>Предлагаю механики, вы выбираете</span></div>
   <div className="narrative-intro glass"><Library size={18}/><div><span className="label">АЛИНА / КОНСТРУКТОР</span><p>{current.note}</p></div></div>
   <div className="module-grid">{current.modules.map((m,i)=>{const active=selected[current.id]?.includes(m.id),expanded=open===m.id;return <article key={m.id} className={'story-module glass '+(active?'selected ':'')+(expanded?'expanded':'')} style={{animationDelay:`${i*70}ms`}}><button className="module-top" onClick={()=>setOpen(expanded?null:m.id)}><span className="module-num">0{i+1}</span><div><h2>{m.title}</h2><p>{m.purpose}</p></div>{expanded?<ChevronUp/>:<ChevronDown/>}</button>{expanded&&<div className="module-detail"><span className="label">МЕХАНИКА</span><p>{m.mechanic}</p><div className="module-meta"><span>FIT <b>{m.fit}</b></span><span>REF <b>{m.refs.length}</b></span><span>STATUS <b>{active?'USE':'SKIP'}</b></span></div><div className="ref-chips">{m.refs.map(r=><span key={r}>{r}</span>)}</div></div>}<Button variant="outline" className="outline module-toggle" onClick={()=>toggle(m.id)}>{active?<Check/>:<Sparkles/>}{active?'Выбрано':'Добавить'}</Button></article>})}</div>
  </div>
  <div className="narrative-footer glass"><div><ShieldCheck/><div><span className="label">ПРАВИЛО MVP</span><strong>{picked.length} модулей выбрано</strong><p>Методики и примеры будут пополняться вашими жанровыми схемами. Каждая карточка получит источник, автора, год, ограничения и список сопоставимых проектов.</p></div></div><Button className="primary" disabled={!picked.length} onClick={finish}><FolderArchive/>Собрать STORY DNA <ArrowRight/></Button></div>
  {packed&&<div className="dna-pack glass"><FolderArchive size={32}/><span>STORY DNA / PACKED</span><strong>{current.label}</strong><p>{picked.map(m=>m.title).join(' · ')}</p><small>Сохраняем в память проекта и переходим к визуальному миру.</small></div>}
 </section>;
}
