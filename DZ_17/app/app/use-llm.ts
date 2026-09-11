'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';

export type LlmTask='dialogue'|'synthesis'|'architecture'|'vision'|'kb_extract'|'kb_validate';
export type LlmModel={id:string;provider:string;model:string;label:string;available:boolean;note:string;capabilities:LlmTask[]};
export type LlmMeta={selection:string;provider:string;model:string;task:LlmTask;latencyMs:number;attempts?:{model:string;error:string}[]};
export type LlmImage={dataUrl:string;name?:string};
export type LlmRoutes=Record<string,string[]>;
const KEY='wild-ideas:llm-selection:v1';

export function useLlmGateway(){
 const [models,setModels]=useState<LlmModel[]>([]),[selection,setSelectionState]=useState('auto'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[meta,setMeta]=useState<LlmMeta|null>(null),[routes,setRoutes]=useState<LlmRoutes>({});
 useEffect(()=>{try{setSelectionState(window.localStorage.getItem(KEY)||'auto');}catch{}fetch('/api/llm').then(r=>r.json()).then(data=>{setModels(Array.isArray(data?.models)?data.models:[]);setRoutes(data?.routes&&typeof data.routes==='object'?data.routes:{});}).catch(()=>setError('Не удалось получить список LLM.'));},[]);
 const setSelection=useCallback((value:string)=>{setSelectionState(value);setError('');try{window.localStorage.setItem(KEY,value);}catch{}},[]);
 const ask=useCallback(async({task='dialogue',messages,context,images=[]}:{task?:LlmTask;messages:{role:'user'|'assistant';content:string}[];context?:Record<string,unknown>;images?:LlmImage[]})=>{
  setBusy(true);setError('');
  try{
   const r=await fetch('/api/llm',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({selection,task,messages,context,images})});
   const data=await r.json();if(!r.ok)throw new Error(data?.error||`LLM HTTP ${r.status}`);
   setMeta({selection:data.selection,provider:data.provider,model:data.model,task:data.task,latencyMs:data.latencyMs,attempts:Array.isArray(data.attempts)?data.attempts:[]});
   return String(data.text||'');
  }catch(e){const message=e instanceof Error?e.message:'Ошибка LLM';setError(message);throw e;}finally{setBusy(false);}
 },[selection]);
 const selected=useMemo(()=>models.find(x=>x.id===selection)||models.find(x=>x.id==='auto')||null,[models,selection]);
 const supports=useCallback((task:LlmTask)=>selection==='auto'||Boolean(selected?.capabilities?.includes(task)),[selection,selected]);
 return {models,selection,setSelection,selected,busy,error,meta,routes,supports,ask};
}
