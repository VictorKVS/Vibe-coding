'use client';
import {BrainCircuit,ChevronDown,LoaderCircle} from 'lucide-react';
import type {LlmModel,LlmMeta,LlmTask} from './use-llm';

type Props={models:LlmModel[];selection:string;onChange:(value:string)=>void;busy:boolean;error:string;meta:LlmMeta|null;task?:LlmTask};
const labels:Record<LlmTask,string>={dialogue:'CHAT',synthesis:'SYNTH',architecture:'DEEP',vision:'VISION',kb_extract:'KB',kb_validate:'CHECK'};

export function ModelSwitcher({models,selection,onChange,busy,error,meta,task}:Props){
 const available=models.filter(m=>m.available&&(!task||m.id==='auto'||m.capabilities?.includes(task)));
 const current=models.find(m=>m.id===selection)||models.find(m=>m.id==='auto');
 return <div className={'model-switcher glass '+(busy?'is-busy':'')}>
  <div className="model-switcher-title"><span className="model-led"/><BrainCircuit size={16}/><div><strong>LLM GATEWAY</strong><small>{busy?'Алина думает…':meta?`${meta.provider} · ${meta.model} · ${meta.latencyMs} ms`:'AUTO или конкретная модель'}</small></div></div>
  <label className="model-select-wrap" title={current?.note||''}>
   {busy?<LoaderCircle className="model-spinner" size={15}/>:<ChevronDown size={15}/>}<select aria-label="Модель Алины" value={available.some(x=>x.id===selection)?selection:'auto'} disabled={busy} onChange={e=>onChange(e.target.value)}>{available.map(m=><option value={m.id} key={m.id}>{m.label}</option>)}</select>
  </label>
  {current?.capabilities?.length?<div className="model-capabilities">{current.capabilities.map(cap=><span key={cap}>{labels[cap]}</span>)}</div>:null}
  {meta?.attempts?.length?<small className="model-fallback">fallback: {meta.attempts.map(x=>x.model).join(' → ')}</small>:null}
  {error&&<p className="model-error">{error}</p>}
 </div>;
}
