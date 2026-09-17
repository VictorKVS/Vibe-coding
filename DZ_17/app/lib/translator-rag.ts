import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

type Message={role:'user'|'assistant';content:string};
type Context=Record<string,unknown>;
type Term={
 term_id:string;source_language:string;target_language:string;source_term:string;
 preferred_target:string;allowed_variants?:string[];domain?:string;status?:string;notes?:string;
};
type MemorySegment={
 segment_id?:string;source_language?:string;target_language?:string;source?:string;target?:string;
 status?:string;domain?:string;source_ref?:string;
};

type TerminologyFile={terms?:Term[]};
type MemoryFile={segments?:MemorySegment[]};

const kbRoot=resolve(process.cwd(),'..','knowledge_base');
const terminologyPath=resolve(kbRoot,'translation_terminology.v1.json');
const memoryPath=resolve(kbRoot,'translation_memory.v1.json');

let cache:{at:number;terms:Term[];segments:MemorySegment[]}|null=null;

function normalize(value:string){return value.toLocaleLowerCase().replace(/\s+/g,' ').trim();}
function stringValue(value:unknown,fallback:string){return typeof value==='string'&&value.trim()?value.trim():fallback;}

async function loadStores(){
 const now=Date.now();
 if(cache&&now-cache.at<30_000)return cache;
 const [termsRaw,memoryRaw]=await Promise.all([
  readFile(terminologyPath,'utf8').catch(()=>'{"terms":[]}'),
  readFile(memoryPath,'utf8').catch(()=>'{"segments":[]}'),
 ]);
 let terms:Term[]=[];let segments:MemorySegment[]=[];
 try{const parsed=JSON.parse(termsRaw) as TerminologyFile;terms=Array.isArray(parsed.terms)?parsed.terms:[];}catch{}
 try{const parsed=JSON.parse(memoryRaw) as MemoryFile;segments=Array.isArray(parsed.segments)?parsed.segments:[];}catch{}
 cache={at:now,terms,segments};return cache;
}

export async function enrichTranslationContext(messages:Message[],context?:Context):Promise<Context>{
 const base=context&&typeof context==='object'?context:{};
 const text=[...messages].reverse().find(m=>m.role==='user')?.content||'';
 const sourceLanguage=stringValue(base.sourceLanguage,'auto');
 const targetLanguage=stringValue(base.targetLanguage,'ru');
 const mode=stringValue(base.translationMode,'technical');
 const domain=stringValue(base.domain,'general');
 const stores=await loadStores();
 const haystack=normalize(text);
 const terms=stores.terms
  .filter(term=>{
   const langOk=sourceLanguage==='auto'||term.source_language===sourceLanguage;
   const targetOk=term.target_language===targetLanguage;
   const termHit=haystack.includes(normalize(term.source_term));
   const domainOk=!term.domain||domain==='general'||term.domain===domain;
   return langOk&&targetOk&&termHit&&domainOk;
  })
  .sort((a,b)=>{
   const rank=(s?:string)=>s==='approved'?0:s==='project'?1:2;
   return rank(a.status)-rank(b.status)||b.source_term.length-a.source_term.length;
  })
  .slice(0,40)
  .map(term=>({
   term_id:term.term_id,
   source_term:term.source_term,
   preferred_target:term.preferred_target,
   allowed_variants:term.allowed_variants||[],
   status:term.status||'proposed',
   domain:term.domain||'general',
   notes:term.notes||'',
  }));
 const normalizedSource=normalize(text);
 const exactMemory=stores.segments
  .filter(segment=>segment.status==='approved'&&typeof segment.source==='string'&&normalize(segment.source)===normalizedSource)
  .filter(segment=>(sourceLanguage==='auto'||segment.source_language===sourceLanguage)&&(!segment.target_language||segment.target_language===targetLanguage))
  .slice(0,3)
  .map(segment=>({
   segment_id:segment.segment_id||null,
   source:segment.source,
   target:segment.target,
   domain:segment.domain||null,
   source_ref:segment.source_ref||null,
  }));
 return {
  ...base,
  workflow:'translation',
  sourceLanguage,
  targetLanguage,
  translationMode:mode,
  translationRag:{
   profile:'RAG-TRANSLATION-v1',
   roleProfile:'ROLE-TRANSLATOR',
   terminologyStore:'KB-TRANSLATION-TERMS',
   translationMemory:'KB-TRANSLATION-MEMORY',
   terminologyMatches:terms,
   exactMemoryMatches:exactMemory,
   retrieval:{terminology:'deterministic_term_match',translationMemory:'exact_match'},
  },
 };
}
