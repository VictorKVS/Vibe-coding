'use client';
import {useState} from 'react';
import {ArrowRight,ArrowLeft,Check,Mic,Square,Volume2,VolumeX,Maximize2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {interview,worlds,heroes,looks} from './story-data';
import {useLlmGateway} from './use-llm';
import {ModelSwitcher} from './model-switcher';

type Props={stage:number;answers:string[];world:string;variants:string[];names:string[];draft:string;line:string;voiceOn:boolean;speaking:boolean;listening:boolean;error:string;setDraft:(v:string)=>void;choose:(v:string)=>void;go:(n:number)=>void;backAnswer:()=>void;selectWorld:(v:string)=>void;selectHero:(i:number,v:string)=>void;setName:(i:number,v:string)=>void;toggleVoice:()=>void;repeat:()=>void;microphone:()=>void};

export function OrbitStudio(p:Props){
 const [hero,setHero]=useState(0),[preview,setPreview]=useState<number|null>(null),[aiReply,setAiReply]=useState('');
 const llm=useLlmGateway();const q=p.answers.length;
 const title=p.stage===0?(q<3?interview[q].title:'Основа истории готова'):p.stage===1?'Выберите мир вашей истории':`Каким будет ${p.names[hero]||heroes[hero].name}?`;
 const options=p.stage===0?(q<3?interview[q].options:[]):p.stage===1?worlds.map(w=>w.name):looks;
 const selected=(i:number)=>p.stage===1?p.world===worlds[i].id:p.stage===2?p.variants[hero]===String(i):false;
 const picture=(i:number)=>p.stage===1?{backgroundImage:'url(/worlds.png)',backgroundSize:'300% 100%',backgroundPosition:`${i*50}% center`}:{backgroundImage:'url(/heroes.png)',backgroundSize:'300% 300%',backgroundPosition:`${hero*50}% ${i*50}%`};
 const submitIdea=async(answer:string)=>{
  if(!answer.trim()||llm.busy)return;
  const clean=answer.trim();const nextAnswers=[...p.answers,clean];const nextQuestion=nextAnswers.length<3?interview[nextAnswers.length].speech:'Основа есть. Теперь я соберу исследовательский слой и покажу, на что можно опираться.';
  setAiReply('');p.choose(clean);
  try{
   const text=await llm.ask({task:'dialogue',messages:[{role:'user',content:clean}],context:{stage:'idea_intake',confirmedAnswers:nextAnswers,nextQuestion,rule:'Не принимай решение за пользователя. Кратко отрази смысл ответа и перейди к следующему вопросу.'}});
   setAiReply(text);
  }catch{setAiReply('');}
 };
 const select=(i:number)=>{if(p.stage===0){void submitIdea(options[i]);return;}if(p.stage===1)p.selectWorld(worlds[i].id);else p.selectHero(hero,String(i));setPreview(null);};
 const speech=p.stage===2?`${p.names[hero]||heroes[hero].name}. ${heroes[hero].detail} Выберите образ — его можно рассмотреть крупнее.`:p.stage===0&&llm.busy?'Анализирую вашу мысль и сверяю её с контекстом проекта…':p.stage===0&&aiReply?aiReply:p.line;
 return <section className="orbital-studio" aria-label="Круговой диалог с Алиной">
  <div className="orbit-heading"><span className="eyebrow">ДИКИЕ ИДЕИ / ЖИВАЯ ИСТОРИЯ</span><h1>{title}</h1><p>{p.stage===0?`Знакомство · ${Math.min(q+1,3)} из 3 вопросов`:p.stage===1?'Три направления · нажмите на изображение, чтобы рассмотреть':`Герой ${hero+1} из 3 · три варианта образа`}</p></div>
  <ModelSwitcher models={llm.models} selection={llm.selection} onChange={v=>{llm.setSelection(v);setAiReply('');}} busy={llm.busy} error={llm.error} meta={llm.meta}/>
  {p.stage===2&&<div className="orbit-hero-tabs" aria-label="Выбор персонажа">{heroes.map((h,i)=><Button key={h.name} variant="outline" aria-pressed={hero===i} className={'outline '+(hero===i?'active':'')} onClick={()=>setHero(i)}>{p.variants[i]&&<Check size={14}/>} {p.names[i]||h.name}</Button>)}</div>}
  <div className={'orbit-field '+(p.stage>0?'with-images':'')}>
   <div className="orbit-tracks" aria-hidden="true"><span/><span/><span/></div>
   <div className={'orbit-core '+(p.speaking?'is-speaking':'')+(p.listening?' is-listening':'')+(llm.busy?' is-thinking':'')}><div className="core-face"><img src="/alina.png" alt="Алина — цифровая ведущая"/></div><strong>АЛИНА</strong><span>{p.listening?'Слушаю ваш ответ':llm.busy?'Думаю…':p.speaking?'Рассказываю':'Создаём вашу историю'}</span><div className="core-controls"><Button variant="ghost" size="icon" aria-label={p.voiceOn?'Выключить голос':'Включить голос'} onClick={p.toggleVoice}>{p.voiceOn?<VolumeX/>:<Volume2/>}</Button><Button variant="ghost" size="icon" aria-label="Повторить реплику" onClick={p.repeat}><Volume2/></Button>{p.stage===0&&q<3&&<Button variant="ghost" size="icon" aria-label={p.listening?'Остановить микрофон':'Ответить голосом'} onClick={p.microphone}>{p.listening?<Square/>:<Mic/>}</Button>}</div></div>
   <div className="orbit-speech glass" aria-live="polite"><span className="label">АЛИНА / {p.stage===0?'LLM DIALOGUE':p.stage===1?'ВАШ МИР':'ПЕРСОНАЖИ'}</span><p>{speech}</p>{p.stage===0&&llm.meta&&<small className="llm-trace">MODEL {llm.meta.model} · {llm.meta.latencyMs} ms · {llm.meta.task}</small>}</div>
   {options.map((option,i)=><article key={`${p.stage}-${q}-${hero}-${i}`} className={`orbit-card satellite-${i} glass ${selected(i)?'chosen':''}`} style={{animationDelay:`${i*100}ms`}}>{p.stage>0&&<button className="orbit-picture" aria-label={'Рассмотреть '+option} style={picture(i)} onClick={()=>setPreview(i)}><Maximize2 size={17}/></button>}<div className="orbit-card-body"><span className="label">ВАРИАНТ 0{i+1}{selected(i)?' / ВЫБРАН':''}</span>{p.stage===0?<Button variant="ghost" className="orbit-answer" disabled={llm.busy} onClick={()=>select(i)}>{option}<ArrowRight size={18}/></Button>:<><h2>{option}</h2>{p.stage===1&&<p>{worlds[i].tag}</p>}<Button variant="outline" className="outline" onClick={()=>select(i)}>{selected(i)?<Check/>:<ArrowRight/>}{selected(i)?'Выбрано':'Выбрать'}</Button></>}</div></article>)}
   {p.stage===0&&q===3&&<div className="orbit-ready glass"><Check/><h2>Первый замысел собран</h2><p>Теперь проверим его по исследованиям, а затем соберём STORY DNA.</p><Button className="primary" onClick={()=>p.go(1)}>Открыть Research <ArrowRight/></Button></div>}
   <div className="orbit-memory" aria-label="Выбранные решения">{p.answers.map((a,i)=><span key={i}><Check size={12}/>{a}</span>)}{p.world&&<span><Check size={12}/>{worlds.find(w=>w.id===p.world)?.name}</span>}</div>
  </div>
  {p.error&&<p className="orbit-error" role="status">{p.error}</p>}
  {p.stage===0&&q<3&&<form className="orbit-compose glass" onSubmit={e=>{e.preventDefault();if(p.draft.trim())void submitIdea(p.draft);}}><label htmlFor="orbit-answer">Ваш ответ</label><input id="orbit-answer" placeholder="Скажите или напишите свою идею…" value={p.draft} onChange={e=>p.setDraft(e.target.value)} maxLength={1000}/><Button className="outline" variant="outline" type="button" onClick={p.microphone}>{p.listening?<Square/>:<Mic/>}{p.listening?'Стоп':'Голос'}</Button><Button className="primary" type="submit" disabled={!p.draft.trim()||llm.busy}>Подтвердить <ArrowRight/></Button><small>Голос сначала превращается в текст. После подтверждения ответ уходит выбранной LLM через серверный gateway; API-ключ в браузер не передаётся.</small></form>}
  {p.stage===2&&<div className="orbit-name"><label htmlFor="orbit-name">Имя персонажа</label><input id="orbit-name" value={p.names[hero]} maxLength={50} onChange={e=>p.setName(hero,e.target.value)}/><span>Концепты костюмов адаптируем к выбранному миру перед выпуском.</span></div>}
  <div className="stage-actions">{p.stage===0?(q>0&&<button className="back" onClick={()=>{setAiReply('');p.backAnswer();}}><ArrowLeft size={16}/>Изменить предыдущий ответ</button>):<button className="back" onClick={()=>p.stage===2&&hero>0?setHero(hero-1):p.go(p.stage-1)}><ArrowLeft size={16}/>{p.stage===2&&hero>0?'Предыдущий герой':'Назад'}</button>}{p.stage===1&&<Button className="primary" disabled={!p.world} onClick={()=>p.go(2)}>К образам героев <ArrowRight/></Button>}{p.stage===2&&<Button className="primary" disabled={!p.variants[hero]||!p.names[hero].trim()||(hero===2&&(p.variants.some(v=>!v)||p.names.some(n=>!n.trim())))} onClick={()=>hero<2?setHero(hero+1):p.go(3)}>{hero<2?'Следующий герой':'Согласовать концепцию'}<ArrowRight/></Button>}</div>
  <Dialog open={preview!==null} onOpenChange={open=>{if(!open)setPreview(null);}}><DialogContent className="orbit-preview">{preview!==null&&<><DialogTitle>{p.stage===1?worlds[preview].name:`${p.names[hero]} · ${looks[preview]}`}</DialogTitle><DialogDescription>{p.stage===1?worlds[preview].description:heroes[hero].detail}</DialogDescription><div className={'preview-picture '+(p.stage===1?'world-preview':'')} role="img" aria-label={options[preview]} style={picture(preview)}/><Button className="primary" onClick={()=>select(preview)}>Выбрать этот вариант <Check/></Button></>}</DialogContent></Dialog>
 </section>;
}
