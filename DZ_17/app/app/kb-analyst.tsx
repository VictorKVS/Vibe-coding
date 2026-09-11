'use client';
import {useMemo,useState} from 'react';
import {ArrowLeft,BrainCircuit,CheckCircle2,Database,Download,FileJson,GitBranch,LoaderCircle,Network,ShieldCheck,Sparkles} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {ModelSwitcher} from './model-switcher';
import {useLlmGateway} from './use-llm';

type JsonRecord=Record<string,unknown>;
type Draft={schema_version?:string;project?:JsonRecord;entities?:unknown[];facts?:unknown[];relationships?:unknown[];timeline?:unknown[];knowledge_states?:unknown[];plot_threads?:unknown[];visual_requirements?:unknown[];open_questions?:unknown[];conflicts?:unknown[]};
type Validation={schema_version?:string;valid?:boolean;issues?:Array<{severity?:string;path?:string;message?:string}>;recommended_changes?:string[];open_questions?:string[]};

const EXAMPLE=`Молодой человек из небогатой семьи поступает в элитную боевую академию. Его дед был легендарным владельцем семейного оружия. После смерти владельца оружие деактивируется. Для новой привязки наследник должен добровольно пройти три храма исчезнувших цивилизаций. Отец героя отказался от семейной традиции. Спецслужба наблюдает за семьёй и незаметно подталкивает героя к академии, но окончательный выбор должен оставаться за ним.`;

function parseJson<T>(text:string):T|null{
 try{const cleaned=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');return JSON.parse(cleaned) as T;}catch{return null;}
}
function arrayCount(value:unknown){return Array.isArray(value)?value.length:0;}
function downloadJson(data:unknown,name:string){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}

export function KbAnalyst({onBack}:{onBack:()=>void}){
 const llm=useLlmGateway();
 const [idea,setIdea]=useState(EXAMPLE),[raw,setRaw]=useState(''),[draft,setDraft]=useState<Draft|null>(null),[validation,setValidation]=useState<Validation|null>(null),[localError,setLocalError]=useState('');
 const counts=useMemo(()=>draft?{entities:arrayCount(draft.entities),facts:arrayCount(draft.facts),links:arrayCount(draft.relationships),events:arrayCount(draft.timeline),knowledge:arrayCount(draft.knowledge_states),threads:arrayCount(draft.plot_threads)}:null,[draft]);
 const analyze=async()=>{
  if(!idea.trim()||llm.busy)return;setLocalError('');setValidation(null);
  try{const text=await llm.ask({task:'kb_extract',messages:[{role:'user',content:idea.trim()}],context:{workflow:'idea_to_knowledge_base',schema:'alina-kb-v1',source:'user_input',rules:['Everything extracted is proposed','Do not invent canon','Separate facts from beliefs','Create open questions for missing data']}});setRaw(text);const parsed=parseJson<Draft>(text);if(!parsed){setDraft(null);setLocalError('Модель вернула ответ, но он не разобрался как JSON. Сырой ответ сохранён ниже.');return;}setDraft(parsed);}catch{setDraft(null);}
 };
 const validate=async()=>{
  if(!draft||llm.busy)return;setLocalError('');
  try{const text=await llm.ask({task:'kb_validate',messages:[{role:'user',content:JSON.stringify(draft)}],context:{workflow:'kb_validation',schema:'alina-kb-v1',rule:'Do not approve canon; report contradictions and missing provenance.'}});const parsed=parseJson<Validation>(text);if(!parsed){setLocalError('Validator вернул ответ не в JSON.');return;}setValidation(parsed);}catch{}
 };
 return <main className="kb-analyst">
  <button className="back" onClick={onBack}><ArrowLeft size={16}/>На главную</button>
  <section className="kb-head">
   <div><p className="eyebrow">ALINA / KNOWLEDGE BASE ANALYST</p><h1>Из идеи —<br/>в структуру знаний.</h1><p>Алина выделяет сущности, факты, связи, события, знания персонажей и сюжетные нити. Всё извлечённое остаётся <b>proposed</b>, пока автор не утвердит канон.</p></div>
   <div className="kb-principles glass"><span><ShieldCheck/> HUMAN APPROVAL</span><span><GitBranch/> PROVENANCE</span><span><Network/> RELATIONS</span><span><Database/> STRUCTURED KB</span></div>
  </section>

  <ModelSwitcher models={llm.models} selection={llm.selection} onChange={llm.setSelection} busy={llm.busy} error={llm.error} meta={llm.meta} task={draft?'kb_validate':'kb_extract'}/>

  <section className="kb-workspace">
   <div className="kb-input glass">
    <div className="kb-panel-title"><BrainCircuit/><div><span>01 / SOURCE IDEA</span><strong>Что нужно разложить?</strong></div></div>
    <textarea value={idea} onChange={e=>setIdea(e.target.value)} placeholder="Опишите идею, мир, книгу, серию или проект…"/>
    <div className="kb-actions"><Button className="primary" disabled={!idea.trim()||llm.busy} onClick={analyze}>{llm.busy?<LoaderCircle className="model-spinner"/>:<Sparkles/>}Разложить в KB</Button>{draft&&<Button variant="outline" className="outline" disabled={llm.busy} onClick={validate}><ShieldCheck/>Проверить противоречия</Button>}</div>
    <small>Источник на этом этапе только один: пользовательский ввод. Алина не превращает гипотезу в канон автоматически.</small>
   </div>

   <div className="kb-output glass">
    <div className="kb-panel-title"><FileJson/><div><span>02 / DRAFT KB</span><strong>{draft?'Структура собрана':'Ожидает анализа'}</strong></div></div>
    {!draft&&!raw?<div className="kb-empty"><Database/><p>После анализа здесь появится черновик базы знаний ALINA KB v1.</p></div>:null}
    {counts&&<div className="kb-metrics"><span><b>{counts.entities}</b>сущностей</span><span><b>{counts.facts}</b>фактов</span><span><b>{counts.links}</b>связей</span><span><b>{counts.events}</b>событий</span><span><b>{counts.knowledge}</b>knowledge states</span><span><b>{counts.threads}</b>сюжетных нитей</span></div>}
    {draft&&<div className="kb-project-card"><span>PROJECT</span><h2>{String(draft.project?.title||'Без названия')}</h2><p>{String(draft.project?.summary||'')}</p><div><em>{String(draft.project?.kind||'unknown')}</em><em>{String((draft.project?.universe_relation as JsonRecord|undefined)?.mode||'unknown')} universe</em></div></div>}
    {draft?.open_questions&&Array.isArray(draft.open_questions)&&draft.open_questions.length>0?<div className="kb-questions"><span>OPEN QUESTIONS</span>{draft.open_questions.map((q,i)=><p key={i}>• {String(q)}</p>)}</div>:null}
    {draft&&<Button variant="outline" className="outline" onClick={()=>downloadJson(draft,'alina-kb-draft.json')}><Download/>Скачать JSON</Button>}
    {raw&&!draft?<pre className="kb-raw">{raw}</pre>:null}
   </div>
  </section>

  {validation&&<section className={'kb-validation glass '+(validation.valid?'is-valid':'has-issues')}><div className="kb-panel-title"><CheckCircle2/><div><span>03 / VALIDATION</span><strong>{validation.valid?'Структура согласована технически':'Есть вопросы к структуре'}</strong></div></div><div className="kb-validation-grid"><div><span>ISSUES</span>{validation.issues?.length?validation.issues.map((x,i)=><p key={i}><b>{x.severity||'info'}</b> {x.path||'$'} — {x.message||''}</p>):<p>Явных противоречий не найдено.</p>}</div><div><span>RECOMMENDED</span>{validation.recommended_changes?.map((x,i)=><p key={i}>• {x}</p>)}</div><div><span>ASK AUTHOR</span>{validation.open_questions?.map((x,i)=><p key={i}>• {x}</p>)}</div></div><small>VALIDATION ≠ CANON APPROVAL. Финальное решение остаётся у автора.</small></section>}
  {localError&&<p className="kb-local-error">{localError}</p>}
 </main>;
}
