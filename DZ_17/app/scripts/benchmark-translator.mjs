import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import process from 'node:process';

function arg(name,fallback=''){
 const i=process.argv.indexOf(`--${name}`);
 return i>=0&&process.argv[i+1]?process.argv[i+1]:fallback;
}
function listArg(name,fallback=[]){
 const raw=arg(name,'');
 return raw?raw.split(',').map(x=>x.trim()).filter(Boolean):fallback;
}
function allMatches(text,re){return Array.from(text.matchAll(re)).map(m=>m[0]);}
function multisetEqual(a,b){
 const count=x=>x.reduce((m,v)=>(m.set(v,(m.get(v)||0)+1),m),new Map());
 const A=count(a),B=count(b);if(A.size!==B.size)return false;
 for(const [k,v] of A)if(B.get(k)!==v)return false;return true;
}
function paraCount(text){return text.trim()?text.trim().split(/\n\s*\n/).length:0;}
function autoChecks(source,translation,expectedTerms=[]){
 const sourceNumbers=allMatches(source,/(?<![\p{L}\p{N}_])[-+]?\d+(?:[.,]\d+)?%?/gu);
 const targetNumbers=allMatches(translation,/(?<![\p{L}\p{N}_])[-+]?\d+(?:[.,]\d+)?%?/gu);
 const sourceUrls=allMatches(source,/https?:\/\/[^\s)\]}>,]+/gi);
 const targetUrls=allMatches(translation,/https?:\/\/[^\s)\]}>,]+/gi);
 const sourceIdentifiers=allMatches(source,/\b(?:[A-Z][A-Z0-9_-]{2,}|[A-Za-z]+\.[A-Za-z0-9_.-]+|[A-Za-z_][A-Za-z0-9_]*\(\))\b/g);
 const missingIds=sourceIdentifiers.filter(x=>!translation.includes(x));
 const termChecks=expectedTerms.map(t=>({term:t,found:translation.toLocaleLowerCase().includes(String(t).toLocaleLowerCase())}));
 const sp=paraCount(source),tp=paraCount(translation);
 return {
  numbers_preserved:multisetEqual(sourceNumbers,targetNumbers),
  source_numbers:sourceNumbers,
  target_numbers:targetNumbers,
  urls_preserved:multisetEqual(sourceUrls,targetUrls),
  source_urls:sourceUrls,
  target_urls:targetUrls,
  identifiers_preserved:missingIds.length===0,
  missing_identifiers:missingIds,
  source_paragraphs:sp,
  target_paragraphs:tp,
  paragraph_count_delta:tp-sp,
  required_terms:termChecks,
  required_terms_pass:termChecks.every(x=>x.found),
  empty_output:!translation.trim(),
  source_chars:source.length,
  target_chars:translation.length,
  length_ratio:source.length?Number((translation.length/source.length).toFixed(3)):null,
 };
}
function scoreChecks(checks){
 const binary=[checks.numbers_preserved,checks.urls_preserved,checks.identifiers_preserved,checks.required_terms_pass,!checks.empty_output];
 return Number((binary.filter(Boolean).length/binary.length*100).toFixed(1));
}
async function jsonFetch(url,options){
 const r=await fetch(url,options);const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data?.error||`HTTP ${r.status}`);return data;
}

const base=(arg('base','http://localhost:3000')).replace(/\/$/,'');
const corpusPath=resolve(arg('corpus','../knowledge_base/translation_benchmark_cases.example.json'));
const models=listArg('models',['auto']);
const modeOverride=arg('mode','');
const outRaw=arg('out','');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const outPath=resolve(outRaw||`runtime/benchmarks/translation-${stamp}.json`);

const corpus=JSON.parse(await readFile(corpusPath,'utf8'));
if(!Array.isArray(corpus.cases)||!corpus.cases.length)throw new Error('Benchmark corpus has no cases.');
const catalog=await jsonFetch(`${base}/api/llm`);
const modelIds=new Set((catalog.models||[]).map(m=>m.id));
for(const selection of models){if(selection!=='auto'&&!modelIds.has(selection))throw new Error(`Unknown model selection: ${selection}`);}

const run={
 schema_version:'alina-translation-benchmark-run-v1',
 benchmark_id:corpus.benchmark_id||'BENCH-TRANSLATION-EN-RU-v1',
 corpus_version:corpus.version||1,
 started_at:new Date().toISOString(),
 base_url:base,
 requested_models:models,
 environment:{node:process.version,platform:process.platform,arch:process.arch},
 results:[],
};

for(const testCase of corpus.cases){
 const source=String(testCase.source||'');
 if(!source.trim())continue;
 for(const selection of models){
  const started=Date.now();
  const requestBody={
   task:'translation',selection,
   messages:[{role:'user',content:source}],
   context:{
    sourceLanguage:testCase.source_language||'en',
    targetLanguage:testCase.target_language||'ru',
    translationMode:modeOverride||testCase.mode||'technical',
    domain:testCase.domain||'general',
   },
  };
  let record;
  try{
   const response=await jsonFetch(`${base}/api/llm`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(requestBody)});
   const translation=String(response.text||'');const checks=autoChecks(source,translation,testCase.expected_terms||[]);
   record={case_id:testCase.case_id,domain:testCase.domain||'general',mode:requestBody.context.translationMode,requested_selection:selection,actual_selection:response.selection,provider:response.provider,model:response.model,latency_ms:response.latencyMs??Date.now()-started,source,translation,checks,automatic_preservation_score:scoreChecks(checks),rag_terms:response.translationRag?.terminologyMatches||[],error:null};
  }catch(error){
   record={case_id:testCase.case_id,domain:testCase.domain||'general',mode:requestBody.context.translationMode,requested_selection:selection,actual_selection:null,provider:null,model:null,latency_ms:Date.now()-started,source,translation:'',checks:null,automatic_preservation_score:0,rag_terms:[],error:error instanceof Error?error.message:String(error)};
  }
  run.results.push(record);
  console.log(`[TRANSLATION BENCH] ${record.case_id} | ${selection} | ${record.model||'ERROR'} | score=${record.automatic_preservation_score} | ${record.latency_ms} ms`);
 }
}

run.finished_at=new Date().toISOString();
run.summary=models.map(selection=>{
 const rows=run.results.filter(r=>r.requested_selection===selection);const ok=rows.filter(r=>!r.error);
 return {selection,cases:rows.length,success:ok.length,failures:rows.length-ok.length,avg_automatic_preservation_score:ok.length?Number((ok.reduce((s,r)=>s+r.automatic_preservation_score,0)/ok.length).toFixed(1)):0,avg_latency_ms:ok.length?Math.round(ok.reduce((s,r)=>s+r.latency_ms,0)/ok.length):null};
});
run.warning='Automatic preservation score is NOT translation-quality proof. Final ranking requires blind human/MQM review and, where desired, an external baseline such as Google Translate on the same lawful corpus.';
await mkdir(dirname(outPath),{recursive:true});
await writeFile(outPath,JSON.stringify(run,null,2)+'\n','utf8');
console.log(`\n[TRANSLATION BENCH] report: ${outPath}`);
console.table(run.summary);
