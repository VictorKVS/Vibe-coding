'use client';
import {BrainCircuit,ChevronDown,LoaderCircle} from 'lucide-react';
import type {LlmModel,LlmMeta} from './use-llm';

type Props={models:LlmModel[];selection:string;onChange:(value:string)=>void;busy:boolean;error:string;meta:LlmMeta|null};

export function ModelSwitcher({models,selection,onChange,busy,error,meta}:Props){
 const available=models.filter(m=>m.available);
 const current=models.find(m=>m.id===selection)||models.find(m=>m.id==='auto');
 return <div className={'model-switcher glass '+(busy?'is-busy':'')}>
  <div className="model-switcher-title"><span className="model-led"/><BrainCircuit size={16}/><div><strong>LLM GATEWAY</strong><small>{busy?'Алина думает…':meta?`${meta.provider} · ${meta.model} · ${meta.latencyMs} ms`:'выберите модель или AUTO'}</small></div></div>
  <label className="model-select-wrap" title={current?.note||''}>
   {busy?<LoaderCircle className="model-spinner" size={15}/>:<ChevronDown size={15}/>}<select aria-label="Модель Алины" value={selection} disabled={busy} onChange={e=>onChange(e.target.value)}>{available.map(m=><option value={m.id} key={m.id}>{m.label}</option>)}</select>
  </label>
  {error&&<p className="model-error">{error}</p>}
 </div>;
}
