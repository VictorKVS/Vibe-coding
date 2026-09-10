'use client';
import { useState, useCallback } from 'react';
import { Studio } from './studio';
import { AgentTools } from './agent-tools';
import { NeuralHud } from './neural-hud';
import { ArrowUpRight, ArrowRight, Sparkles, Layers3, Film, Orbit, BookOpen, Image, Mic, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

const capabilities = [
  ['ИДЕЯ → БРИФ','Помогаем вытащить мысль из головы, уточнить задачу, аудиторию, формат и результат.'],
  ['АЛИНА / AI-ПРОВОДНИК','Голосовой и текстовый диалог ведёт человека по проекту и собирает решения.'],
  ['КНИГИ И СЦЕНАРИИ','Структура книги, главы, сцены, диалоги, сценарный план комикса или короткого ролика.'],
  ['МИРЫ И ПЕРСОНАЖИ','Паспорта героев, визуальные направления, атмосфера, карта мира и связи.'],
  ['ФОТО И ИЗОБРАЖЕНИЯ','Визуальные концепты, обложки, персонажи, сцены и наборы изображений для проекта.'],
  ['ИЗ ИДЕИ — В ПРОДУКТ','Лендинг, презентация, демо, экспорт материалов и следующий шаг к запуску.'],
];

export default function Home(){
const [chat,setChat]=useState(false);
const begin=useCallback(()=>{setChat(true);window.scrollTo({top:0,behavior:'smooth'});},[]);
return <div className="shell"><NeuralHud/><AgentTools open={begin}/><header><a className="brand" href="#" onClick={e=>{e.preventDefault();setChat(false);}}><Orbit/>ДИКИЕ ИДЕИ <span className="brand-arrow">→</span> В ДЕНЬГИ<span>●</span></a><nav aria-label="Основная навигация"><a href="#from-thought" onClick={()=>setChat(false)}>От мысли</a><a href="#what-we-do" onClick={()=>setChat(false)}>Что умеем</a><a href="#project" onClick={()=>setChat(false)}>Демо</a></nav><Button variant="outline" className="outline" onClick={begin}>Обсудить идею <ArrowUpRight/></Button></header>
{!chat?<main>
<section className="brand-hero">
  <div className="brand-copy">
    <p className="eyebrow"><i/>AI CREATIVE STUDIO / BOOK·CRAFT</p>
    <h1><span>Дикие идеи</span><br/><em>в деньги.</em></h1>
    <p className="brand-lead">Берём мысль, которая пока существует только у вас в голове, и превращаем её в понятный проект: книгу, сценарий, визуальную историю, комикс, презентацию или цифровой продукт.</p>
    <div className="actions"><Button className="primary" onClick={begin}>Рассказать идею Алине <ArrowUpRight/></Button><a href="#from-thought">Посмотреть, как это работает <ArrowRight size={17}/></a></div>
    <div className="brand-proof"><span><Lightbulb size={16}/> идея</span><b>→</b><span><Sparkles size={16}/> концепция</span><b>→</b><span><Layers3 size={16}/> продукт</span></div>
  </div>
  <aside className="alina-showcase glass" aria-label="Алина — AI-проводник студии">
    <div className="alina-orbit" aria-hidden="true"><span/><span/><span/></div>
    <div className="alina-portrait"><img src="/alina.png" alt="Алина — цифровая ведущая студии Дикие идеи"/></div>
    <div className="alina-copy"><span className="label">АЛИНА / AI-ПРОДЮСЕР</span><h2>«Расскажите мне самую странную идею.»</h2><p>Я помогу разложить её на смысл, аудиторию, мир, героев, визуал и следующий шаг.</p><Button className="outline" variant="outline" onClick={begin}><Mic size={17}/> Начать разговор</Button></div>
  </aside>
</section>

<section id="from-thought" className="thought-section">
  <div className="thinker-visual glass"><img src="https://commons.wikimedia.org/wiki/Special:Redirect/file/The_Thinker%2C_Rodin.jpg" alt="Огюст Роден — Мыслитель"/><div className="thinker-shade"/><span className="thinker-tag">01 / МЫСЛЬ</span><small>Огюст Роден · «Мыслитель» · public domain</small></div>
  <div className="thought-copy"><p className="eyebrow">СНАЧАЛА ЕСТЬ ТОЛЬКО МЫСЛЬ</p><h2>Мысль должна<br/>получить форму.</h2><p>Большинство сильных проектов начинаются не с технического задания. Они начинаются с фразы «а что, если…». Мы задаём вопросы, находим ядро идеи и собираем из него управляемую концепцию.</p><div className="thought-flow"><span>замысел</span><ArrowRight/><span>диалог</span><ArrowRight/><span>структура</span><ArrowRight/><span>результат</span></div></div>
</section>

<section id="what-we-do" className="life-section">
  <div className="section-heading"><div><p className="eyebrow">02 / ИДЕИ В ЖИЗНЬ</p><h2>Одна идея.<br/>Много форм.</h2></div><p>Не заставляем мысль подстраиваться под один формат. Подбираем тот, в котором она работает лучше.</p></div>
  <div className="life-gallery">
    <article className="life-card glass"><div className="life-image"><img src="/academy-arrival.png" alt="Визуальный концепт истории"/></div><div><BookOpen/><span className="label">КНИГИ / СЦЕНАРИИ</span><h3>История, которую можно читать.</h3><p>Структура, главы, сцены, герои, диалоги и план выпуска.</p></div></article>
    <article className="life-card glass"><div className="life-image sprite worlds-sprite" aria-label="Концепты миров"/><div><Image/><span className="label">ФОТО / ИЗОБРАЖЕНИЯ</span><h3>Мир, который можно увидеть.</h3><p>Обложки, атмосфера, персонажи, сцены и визуальные направления.</p></div></article>
    <article className="life-card glass"><div className="life-image sprite heroes-sprite" aria-label="Концепты персонажей"/><div><Film/><span className="label">КОМИКС / ВИДЕО</span><h3>Идея, которую хочется показать.</h3><p>Покадровый план, тизер, презентация и демонстрационный сценарий.</p></div></article>
  </div>
</section>

<section className="fit-section glass">
  <div><p className="eyebrow">ВАШИ ИДЕИ НАМ ПОДХОДЯТ</p><h2>Серьёзные. Странные.<br/>Слишком смелые.</h2><p>Если идею можно объяснить словами, её уже можно превратить в прототип. Мы начинаем не с ограничения, а с вопроса: «какой результат должен увидеть человек?»</p></div>
  <Button className="primary" onClick={begin}>Проверить свою идею <ArrowUpRight/></Button>
</section>

<section className="capabilities-section">
  <div className="section-heading"><div><p className="eyebrow">03 / ЧТО МЫ УМЕЕМ</p><h2>От разговора<br/>до продукта.</h2></div><p>Часть возможностей в этой версии показана как демонстрационный контур, но архитектура собирается как единая студия.</p></div>
  <div className="capability-grid">{capabilities.map(([title,text],i)=><article className="glass capability" key={title}><span className="cap-index">0{i+1}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
</section>

<section id="project" className="project"><div className="section-heading"><div><p className="eyebrow">ПИЛОТ / ПЕРЕСЕЧЕНИЕ ТРЁХ ЛУН</p><h2>Показываем не обещание.<br/>Показываем демо.</h2></div><p>Заранее подготовленные визуалы позволяют показать полный путь идеи без ожидания тяжёлой генерации.</p></div><div className="cards"><article className="glass story"><span className="label">01 / ЗАВЯЗКА</span><h3>До берета —<br/>целая жизнь.</h3><p>Кай Арден едет в академию императорских рейнджеров. Отец обещал ему легендарное оружие из чужого храма. Но его угасшую силу можно вернуть только на трёх лунах.</p><div className="tags"><span>Космическое фэнтези</span><span>Приключения</span><span>По мотивам классики</span></div></article><article className="glass output"><Layers3 size={28}/><span className="label">ПЛАН ВЫПУСКА</span><h3>20 страниц</h3><p>Собранный сценарный путь от идеи до первого выпуска.</p><small>● demo ready</small></article><article className="glass output"><Film size={28}/><span className="label">ВИЗУАЛЬНЫЙ ПИЛОТ</span><h3>3 мира × 3 героя</h3><p>Готовые концепты показываются как результат генерационного контура.</p><small>● assets ready</small></article></div></section>

<section className="glass cta"><div><p className="eyebrow">СЛЕДУЮЩАЯ ИСТОРИЯ — ВАША</p><h2>А что, если…</h2><p>Продолжите фразу. С этого всё и начинается.</p></div><Button className="primary" onClick={begin}>Обсудить с Алиной <ArrowUpRight/></Button></section>
</main>:null}<Studio active={chat} onStart={begin} onBack={()=>setChat(false)}/>
<footer><span>ДИКИЕ ИДЕИ → В ДЕНЬГИ ●</span><p>Из мысли — в форму. Из формы — в продукт.</p><span>BOOK·CRAFT Neural Studio · demo 2026</span></footer></div>;
}
