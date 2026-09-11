'use client';
import {useEffect,useMemo,useState} from 'react';
import {ArrowLeft,Ban,BrainCircuit,Check,CheckCircle2,Database,Download,Eye,FileJson,GitBranch,ImagePlus,LoaderCircle,Network,RotateCcw,ShieldCheck,Sparkles,X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {ModelSwitcher} from './model-switcher';
import {useLlmGateway,type LlmImage,type LlmTask} from './use-llm';

type JsonRecord=Record<string,unknown>;
type KbStatus='proposed'|'approved'|'rejected';
type KbItem=JsonRecord&{status?:KbStatus|string};
type ReviewSection='entities'|'facts'|'relationships'|'timeline'|'knowledge_states'|'plot_threads'|'visual_requirements';
type Draft={schema_version?:string;project?:JsonRecord;entities?:KbItem[];facts?:KbItem[];relationships?:KbItem[];timeline?:KbItem[];knowledge_states?:KbItem[];plot_threads?:KbItem[];visual_requirements?:KbItem[];open_questions?:unknown[];conflicts?:unknown[]};
type Validation={schema_version?:string;valid?:boolean;issues?:Array<{severity?:string;path?:string;message?:string}>;recommended_changes?:string[];open_questions?:string[]};
type SavedState={idea?:string;draft?:Draft|null;validation?:Validation|null;visualObservation?:string;canonApproved?:boolean};

const STORE='alina:kb-analyst:v2';
const EXAMPLE=`Молодой человек из небогатой семьи поступает в элитную боевую академию. Его дед был легендарным владельцем семейного оружия. После смерти владельца оружие деактивируется. Для новой привязки наследник должен добровольно пройти три храма исчезнувших цивилизаций. Отец героя отказался от семейной традиции. Спецслужба наблюдает за семьёй и незаметно подталкивает героя к академии, но окончательный выбор должен оставаться за ним.`;

const SECTIONS:Array<{key:ReviewSection;label:string;empty:string}>=[
 {key:'entities',label:'СУЩНОСТИ',empty:'Сущности не выделены'},
 {key:'facts',label:'ФАКТЫ',empty:'Факты не выделены'},
 {key:'relationships',label:'СВЯЗИ',empty:'Связи не выделены'},
 {key:'timeline',label:'TIMELINE',empty:'События не выделены'},
 {key:'knowledge_states',label:'КТО ЧТО ЗНАЕТ',empty:'Knowledge states не выделены'},
 {key:'plot_threads',label:'СЮЖЕТНЫЕ НИТИ',empty:'Сюжетные нити не выделены'},
 {key:'visual_requirements',label:'ВИЗУАЛЬНЫЕ ТРЕБОВАНИЯ',empty:'Визуальные требования не выделены'},
];

function parseJson<T>(text:string):T|null{
 try{const cleaned=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');return JSON.parse(cleaned) as T;}catch{return null;}
}
function arrayCount(value:unknown){return Array.isArray(value)?value.length:0;}
function downloadJson(data:unknown,name:string){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
function displayValue(value:unknown){if(value===null||value===undefined)return '—';if(typeof value==='object')return JSON.stringify(value);return String(value);}
function itemSummary(item:KbItem){return Object.entries(item).filter(([key])=>key!=='status').map(([key,value])=>`${key}: ${displayValue(value)}`).join(' · ');}
function normalizeDraft(input:Draft):Draft{
 const next={...input};
 for(const {key} of SECTIONS){const list=next[key];if(Array.isArray(list))next[key]=list.map(item=>({...item,status:item.status||'proposed'}));}
 return next;
}

export function KbAnalyst({onBack}:{onBack:()=>void}){
 const llm=useLlmGateway();
 const [idea,setIdea]=useState(EXAMPLE),[raw,setRaw]=useState(''),[draft,setDraft]=useState<Draft|null>(null),[validation,setValidation]=useState<Validation|null>(null),[localError,setLocalError]=useState(''),[visual,setVisual]=useState<LlmImage|null>(null),[visualObservation,setVisualObservation]=useState(''),[visualError,setVisualError]=useState(''),[canonApproved,setCanonApproved]=useState(false),[hydrated,setHydrated]=useState(false),[runTask,setRunTask]=useState<LlmTask>('kb_extract');

 useEffect(()=>{try{const saved=window.localStorage.getItem(STORE);if(saved){const state=JSON.parse(saved) as SavedState;if(typeof state.idea==='string')setIdea(state.idea);if(state.draft)setDraft(normalizeDraft(state.draft));if(state.validation)setValidation(state.validation);if(typeof state.visualObservation==='string')setVisualObservation(state.visualObservation);setCanonApproved(Boolean(state.canonApproved));}}catch{}setHydrated(true);},[]);
 useEffect(()=>{if(!hydrated)return;try{window.localStorage.setItem(STORE,JSON.stringify({idea,draft,validation,visualObservation,canonApproved} satisfies SavedState));}catch{}},[hydrated,idea,draft,validation,visualObservation,canonApproved]);

 const counts=useMemo(()=>draft?{entities:arrayCount(draft.entities),facts:arrayCount(draft.facts),links:arrayCount(draft.relationships),events:arrayCount(draft.timeline),knowledge:arrayCount(draft.knowledge_states),threads:arrayCount(draft.plot_threads),visuals:arrayCount(draft.visual_requirements)}:null,[draft]);
 const review=useMemo(()=>{let approved=0,proposed=0,rejected=0;for(const {key} of SECTIONS)for(const item of draft?.[key]||[]){if(item.status==='approved')approved++;else if(item.status==='rejected')rejected++;else proposed++;}return {approved,proposed,rejected,total:approved+proposed+rejected};},[draft]);

 const attachImage=(file?:File)=>{
  if(!file)return;setVisualError('');setCanonApproved(false);
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setVisualError('Поддерживаются JPG, PNG и WEBP.');return;}
  if(file.size>5*1024*1024){setVisualError('Изображение должно быть не больше 5 МБ.');return;}
  const reader=new FileReader();reader.onload=()=>{if(typeof reader.result==='string')setVisual({dataUrl:reader.result,name:file.name});else setVisualError('Не удалось прочитать изображение.');};reader.onerror=()=>setVisualError('Не удалось прочитать изображение.');reader.readAsDataURL(file);
 };

 const setStatus=(section:ReviewSection,index:number,status:KbStatus)=>{
  setDraft(current=>{if(!current)return current;const list=current[section];if(!Array.isArray(list))return current;return {...current,[section]:list.map((item,i)=>i===index?{...item,status}:item)};});setCanonApproved(false);
 };
 const approveAll=()=>{setDraft(current=>{if(!current)return current;const next={...current};for(const {key} of SECTIONS){const list=next[key];if(Array.isArray(list))next[key]=list.map(item=>({...item,status:item.status==='rejected'?'rejected':'approved'}));}return next;});setCanonApproved(true);};
 const resetReview=()=>{setDraft(current=>{if(!current)return current;const next={...current};for(const {key} of SECTIONS){const list=next[key];if(Array.isArray(list))next[key]=list.map(item=>({...item,status:'proposed'}));}return next;});setCanonApproved(false);};

 const analyze=async()=>{
  if(!idea.trim()||llm.busy)return;setLocalError('');setValidation(null);setCanonApproved(false);setRaw('');
  if(visual&&!llm.supports('vision')){setLocalError('Для приложенного изображения выберите AUTO или модель с capability VISION.');return;}
  try{
   let observation='';
   if(visual){setRunTask('vision');observation=await llm.ask({task:'vision',messages:[{role:'user',content:`Проанализируй изображение только как источник наблюдаемых признаков для базы знаний. Не придумывай сюжет и не объявляй интерпретации каноном. Контекст задачи пользователя: ${idea.trim()}`}],images:[visual],context:{workflow:'kb_visual_observation',rule:'Return observable details first; mark uncertainty explicitly.'}});setVisualObservation(observation);}
   setRunTask('kb_extract');
   const material=visual?`${idea.trim()}\n\nVISUAL OBSERVATION FROM VISION MODEL — НЕ КАНОН, а машинное наблюдение:\n${observation}`:idea.trim();
   const text=await llm.ask({task:'kb_extract',messages:[{role:'user',content:material}],context:{workflow:'idea_to_knowledge_base',schema:'alina-kb-v1',sources:visual?['user_input','vision_observation']:['user_input'],rules:['Everything extracted is proposed','Do not invent canon','Separate facts from beliefs','Keep visual observations separate from author facts','Create open questions for missing data']}});
   setRaw(text);const parsed=parseJson<Draft>(text);if(!parsed){setDraft(null);setLocalError('Модель вернула ответ, но он не разобрался как JSON. Сырой ответ сохранён ниже.');return;}setDraft(normalizeDraft(parsed));
  }catch{setDraft(null);}finally{setRunTask('kb_extract');}
 };

 const validate=async()=>{
  if(!draft||llm.busy)return;setLocalError('');setRunTask('kb_validate');
  try{const text=await llm.ask({task:'kb_validate',messages:[{role:'user',content:JSON.stringify(draft)}],context:{workflow:'kb_validation',schema:'alina-kb-v1',rule:'Do not approve canon; report contradictions, missing provenance, impossible knowledge states and unresolved visual ambiguity.'}});const parsed=parseJson<Validation>(text);if(!parsed){setLocalError('Validator вернул ответ не в JSON.');return;}setValidation(parsed);}catch{}finally{setRunTask('kb_extract');}
 };

 const clearSession=()=>{setDraft(null);setValidation(null);setRaw('');setVisualObservation('');setVisual(null);setCanonApproved(false);setLocalError('');try{window.localStorage.removeItem(STORE);}catch{}};
 const modelTask: LlmTask=visual?'vision':runTask;

 return <main className="kb-analyst">
  <button className="back" onClick={onBack}><ArrowLeft size={16}/>На главную</button>
  <section className="kb-head">
   <div><p className="eyebrow">ALINA / MULTIMODAL KNOWLEDGE ANALYST</p><h1>Из материала —<br/>в базу знаний.</h1><p>Алина принимает текст и визуальный референс, отдельно фиксирует машинное наблюдение, затем раскладывает материал на сущности, факты, связи, timeline, знания персонажей и визуальные требования. До подтверждения автора всё остаётся <b>proposed</b>.</p></div>
   <div className="kb-principles glass"><span><Eye/> OBSERVE FIRST</span><span><ShieldCheck/> HUMAN APPROVAL</span><span><GitBranch/> PROVENANCE</span><span><Database/> STRUCTURED KB</span></div>
  </section>

  <ModelSwitcher models={llm.models} selection={llm.selection} onChange={llm.setSelection} busy={llm.busy} error={llm.error} meta={llm.meta} task={modelTask}/>

  <section className="kb-workspace">
   <div className="kb-input glass">
    <div className="kb-panel-title"><BrainCircuit/><div><span>01 / SOURCE MATERIAL</span><strong>Текст + изображение</strong></div></div>
    <textarea value={idea} onChange={e=>{setIdea(e.target.value);setCanonApproved(false);}} placeholder="Опишите идею, мир, книгу, серию, сцену или проект…"/>
    <div className="kb-visual-input"><label className="kb-upload"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>attachImage(e.target.files?.[0])}/><ImagePlus size={18}/><span>{visual?'Заменить изображение':'Добавить изображение'}</span></label>{visual&&<div className="kb-image-preview"><img src={visual.dataUrl} alt="Визуальный материал для KB Analyst"/><div><strong>{visual.name||'visual-reference'}</strong><span>vision → observation → KB</span></div><button type="button" aria-label="Удалить изображение" onClick={()=>{setVisual(null);setVisualObservation('');setVisualError('');setCanonApproved(false);}}><X size={16}/></button></div>}</div>
    {visualError&&<p className="kb-local-error">{visualError}</p>}
    <div className="kb-actions"><Button className="primary" disabled={!idea.trim()||llm.busy} onClick={analyze}>{llm.busy?<LoaderCircle className="model-spinner"/>:<Sparkles/>}{visual?'Анализировать текст + фото':'Разложить в KB'}</Button>{draft&&<Button variant="outline" className="outline" disabled={llm.busy} onClick={validate}><ShieldCheck/>Проверить противоречия</Button>}<Button variant="ghost" onClick={clearSession} disabled={llm.busy}><RotateCcw/>Сбросить</Button></div>
    <small>Изображение сначала проходит отдельный vision-анализ. Его результат сохраняется как машинное наблюдение и не считается утверждённым фактом мира.</small>
   </div>

   <div className="kb-output glass">
    <div className="kb-panel-title"><FileJson/><div><span>02 / DRAFT KB</span><strong>{draft?'Структура собрана':'Ожидает анализа'}</strong></div></div>
    {!draft&&!raw?<div className="kb-empty"><Database/><p>После анализа здесь появится черновик ALINA KB v1 и результат мультимодального наблюдения.</p></div>:null}
    {visualObservation&&<div className="kb-vision-result"><div><Eye/><span>VISION OBSERVATION</span></div><p>{visualObservation}</p><small>Машинное наблюдение · не канон</small></div>}
    {counts&&<div className="kb-metrics"><span><b>{counts.entities}</b>сущностей</span><span><b>{counts.facts}</b>фактов</span><span><b>{counts.links}</b>связей</span><span><b>{counts.events}</b>событий</span><span><b>{counts.knowledge}</b>knowledge states</span><span><b>{counts.visuals}</b>visual rules</span></div>}
    {draft&&<div className="kb-project-card"><span>PROJECT</span><h2>{String(draft.project?.title||'Без названия')}</h2><p>{String(draft.project?.summary||'')}</p><div><em>{String(draft.project?.kind||'unknown')}</em><em>{String((draft.project?.universe_relation as JsonRecord|undefined)?.mode||'unknown')} universe</em></div></div>}
    {draft?.open_questions&&draft.open_questions.length>0?<div className="kb-questions"><span>OPEN QUESTIONS</span>{draft.open_questions.map((q,i)=><p key={i}>• {String(q)}</p>)}</div>:null}
    {draft?.conflicts&&draft.conflicts.length>0?<div className="kb-conflicts"><span>CONFLICTS</span>{draft.conflicts.map((q,i)=><p key={i}>• {String(q)}</p>)}</div>:null}
    {draft&&<div className="kb-actions"><Button variant="outline" className="outline" onClick={()=>downloadJson(draft,canonApproved?'alina-kb-approved.json':'alina-kb-draft.json')}><Download/>Скачать JSON</Button></div>}
    {raw&&!draft?<pre className="kb-raw">{raw}</pre>:null}
   </div>
  </section>

  {draft&&<section className="kb-review glass">
   <div className="kb-review-head"><div className="kb-panel-title"><Network/><div><span>03 / HUMAN REVIEW</span><strong>Проверка перед каноном</strong></div></div><div className="kb-review-stats"><span className="approved">{review.approved} approved</span><span>{review.proposed} proposed</span><span className="rejected">{review.rejected} rejected</span></div></div>
   <div className="kb-review-actions"><Button className="primary" disabled={!review.total} onClick={approveAll}><Check/>Утвердить всё, кроме отклонённого</Button><Button variant="outline" className="outline" onClick={resetReview}><RotateCcw/>Вернуть в proposed</Button>{canonApproved&&<span className="kb-canon-badge"><CheckCircle2/>AUTHOR APPROVED / local prototype</span>}</div>
   <div className="kb-sections">{SECTIONS.map(section=>{const items=draft[section.key]||[];return <article className="kb-section" key={section.key}><div className="kb-section-title"><span>{section.label}</span><b>{items.length}</b></div>{items.length?items.map((item,index)=><div className={'kb-item status-'+(item.status||'proposed')} key={`${section.key}-${index}`}><p>{itemSummary(item)}</p><div className="kb-item-actions"><span>{String(item.status||'proposed').toUpperCase()}</span><button type="button" title="Утвердить" onClick={()=>setStatus(section.key,index,'approved')}><Check size={14}/></button><button type="button" title="Отклонить" onClick={()=>setStatus(section.key,index,'rejected')}><Ban size={14}/></button></div></div>):<p className="kb-section-empty">{section.empty}</p>}</article>})}</div>
  </section>}

  {validation&&<section className={'kb-validation glass '+(validation.valid?'is-valid':'has-issues')}><div className="kb-panel-title"><CheckCircle2/><div><span>04 / VALIDATION</span><strong>{validation.valid?'Структура согласована технически':'Есть вопросы к структуре'}</strong></div></div><div className="kb-validation-grid"><div><span>ISSUES</span>{validation.issues?.length?validation.issues.map((x,i)=><p key={i}><b>{x.severity||'info'}</b> {x.path||'$'} — {x.message||''}</p>):<p>Явных противоречий не найдено.</p>}</div><div><span>RECOMMENDED</span>{validation.recommended_changes?.map((x,i)=><p key={i}>• {x}</p>)}</div><div><span>ASK AUTHOR</span>{validation.open_questions?.map((x,i)=><p key={i}>• {x}</p>)}</div></div><small>VALIDATION ≠ CANON APPROVAL. Даже технически валидный черновик становится рабочим каноном только после действия автора.</small></section>}
  {localError&&<p className="kb-local-error">{localError}</p>}
 </main>;
}
