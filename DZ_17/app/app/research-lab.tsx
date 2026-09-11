'use client';
import {useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,ChevronDown,ChevronUp,ExternalLink,FolderArchive,Mic,Search,ShieldCheck,Sparkles} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {researchLanes,researchPrinciples} from './research-data';

type Props={idea:string;onBack:()=>void;onComplete:(pack:string[])=>void};

export function ResearchLab({idea,onBack,onComplete}:Props){
 const [open,setOpen]=useState<string|null>('books');
 const [selected,setSelected]=useState<string[]>(researchLanes.map(x=>x.id));
 const [packed,setPacked]=useState(false);
 const picked=useMemo(()=>researchLanes.filter(x=>selected.includes(x.id)),[selected]);
 const sourceCount=picked.reduce((n,x)=>n+x.sources.length,0);
 const projectCount=picked.reduce((n,x)=>n+x.projects.length,0);
 const toggle=(id:string)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
 const finish=()=>{setPacked(true);setTimeout(()=>onComplete(picked.map(x=>x.label)),700);};
 return <section className={'research-lab '+(packed?'is-packed':'')}>
  <div className="research-head">
   <button className="back" onClick={onBack}><ArrowLeft size={16}/>К идее</button>
   <div className="research-title"><p className="eyebrow">ALINA / RESEARCH WORKSPACE</p><h1>Сначала проверим,<br/>на что опираться.</h1><p>Я не смешиваю факты, рыночные сигналы и гипотезы. Ниже — исследовательский слой для демо; он объясняет решения, но не обещает коммерческий успех.</p></div>
   <div className="research-state glass"><span>SESSION STATE</span><strong>RESEARCHING</strong><small>{sourceCount} источника · {projectCount} сопоставимых проектов</small></div>
  </div>

  <div className="research-stage">
   <aside className="project-memory glass">
    <p className="eyebrow">PROJECT MEMORY</p>
    <div className="memory-folder active"><FolderArchive/><div><span>IDEA</span><strong>{idea||'Киберпанк · молодой герой · боевая академия'}</strong></div><Check/></div>
    <div className="memory-folder active"><FolderArchive/><div><span>RESEARCH</span><strong>{packed?'PACKED':picked.length+' направления'}</strong></div>{packed?<Check/>:<Search/>}</div>
    <div className="memory-folder"><FolderArchive/><div><span>STORY DNA</span><strong>ожидает</strong></div></div>
    <div className="memory-folder"><FolderArchive/><div><span>WORLD</span><strong>ожидает</strong></div></div>
    <div className="memory-folder"><FolderArchive/><div><span>CHARACTERS</span><strong>ожидает</strong></div></div>
    <div className="memory-folder"><FolderArchive/><div><span>VISUALS</span><strong>ожидает</strong></div></div>
   </aside>

   <div className="research-center">
    <div className="research-alina">
     <div className="research-ring"><i/><i/><i/></div>
     <img src="/alina.png" alt="Алина — AI-продюсер"/>
     <div className="research-alina-copy glass"><span className="label">АЛИНА / AI-ПРОДЮСЕР</span><p>«Я собираю доказательства вокруг вашей идеи. Вы увидите не только предложение, но и почему я его делаю.»</p><div><Mic size={14}/> research-backed dialogue</div></div>
    </div>
    <div className="research-pipeline" aria-label="Состояния диалога">
     {['UNDERSTAND','RESEARCH','SYNTHESIZE','PROPOSE','CONFIRM','SAVE'].map((x,i)=><span className={i<2?'done':i===2?'current':''} key={x}>{i<2?<Check size={12}/>:<i/>}{x}</span>)}
    </div>
   </div>

   <aside className="evidence-rail glass">
    <p className="eyebrow">EVIDENCE CONTROL</p>
    {researchPrinciples.map((x,i)=><div className="evidence-rule" key={x}><ShieldCheck/><span>{String(i+1).padStart(2,'0')}</span><p>{x}</p></div>)}
    <div className="confidence-card"><span>CONFIDENCE</span><strong>MEDIUM</strong><p>Данных достаточно, чтобы предложить направление. Недостаточно, чтобы прогнозировать кассу или продажи.</p></div>
   </aside>
  </div>

  <div className="research-windows">
   {researchLanes.map((lane,i)=>{const expanded=open===lane.id,active=selected.includes(lane.id);return <article className={'research-window glass '+(active?'selected ':'')+(expanded?'expanded':'')} key={lane.id} style={{animationDelay:`${i*90}ms`}}>
    <button className="research-window-head" onClick={()=>setOpen(expanded?null:lane.id)}><div><span className="label">0{i+1} / {lane.label}</span><h2>{lane.summary}</h2></div>{expanded?<ChevronUp/>:<ChevronDown/>}</button>
    {expanded&&<div className="research-window-body">
      <div className="source-stack"><span className="label">ИСТОЧНИКИ</span>{lane.sources.map(s=><a href={s.url} target="_blank" rel="noreferrer" className="source-card" key={s.id}><div><strong>{s.publisher} · {s.year}</strong><p>{s.title}</p></div><ExternalLink size={15}/><small><b>Сигнал:</b> {s.signal}</small><small><b>Ограничение:</b> {s.limit}</small></a>)}</div>
      <div className="project-stack"><span className="label">СОПОСТАВИМЫЕ ПРОЕКТЫ</span>{lane.projects.map(p=><div className="project-card" key={p.title}><div><strong>{p.title}</strong><span>{p.year} · {p.format}</span></div><p>{p.why}</p><div>{p.mechanics.map(m=><span key={m}>{m}</span>)}</div></div>)}</div>
    </div>}
    <Button variant="outline" className="outline research-toggle" onClick={()=>toggle(lane.id)}>{active?<Check/>:<Sparkles/>}{active?'В пакете':'Добавить'}</Button>
   </article>})}
  </div>

  <div className="research-summary glass">
   <div><Search/><div><span className="label">ALINA / SYNTHESIS</span><strong>Предварительное направление</strong><p>Для текущей идеи наиболее совместимы: outsider → elite academy, команда через конфликт, семейное наследие, ограниченный артефакт и постепенно расширяющаяся вселенная. В следующем шаге вы решите, что оставить.</p></div></div>
   <Button className="primary" disabled={!picked.length} onClick={finish}><FolderArchive/>Собрать RESEARCH PACK <ArrowRight/></Button>
  </div>

  {packed&&<div className="research-pack glass"><FolderArchive size={36}/><span>RESEARCH PACK / SAVED</span><strong>{sourceCount} источника · {projectCount} проекта</strong><p>{picked.map(x=>x.label).join(' · ')}</p><small>Папка сохранена в память проекта. Переходим к STORY DNA.</small></div>}
 </section>;
}
