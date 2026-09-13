import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import process from 'node:process';

function arg(name,fallback=''){
 const i=process.argv.indexOf(`--${name}`);
 return i>=0&&process.argv[i+1]?process.argv[i+1]:fallback;
}
function now(){return new Date().toISOString();}
function pct(value){return Math.round(value*100)/100;}
function safeNumber(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
function countBy(items,keyFn){
 const out={};
 for(const item of items){const key=String(keyFn(item)??'unknown');out[key]=(out[key]||0)+1;}
 return out;
}

const sourceId=arg('source-id');
if(!sourceId)throw new Error('Use --source-id SRC-...');
const base=arg('base','http://localhost:3000').replace(/\/$/,'');
const runId=`KF-PAR5-${randomUUID()}`;
const testId=`PAR5-${randomUUID()}`;
const started=Date.now();
const outputDir=resolve(process.cwd(),'runtime','knowledge-factory','parallel-runs');

async function marker(stream,action,status='info',details={}){
 try{
  await fetch(`${base}/api/v1/trace`,{
   method:'POST',
   headers:{'content-type':'application/json','x-trace-id':runId},
   body:JSON.stringify({stage:'PAR5',action:`${stream}.${action}`,status,test_id:testId,details:{stream,...details}}),
  });
 }catch{}
}

async function jsonGet(url){
 const response=await fetch(url,{headers:{'x-trace-id':runId}});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(payload?.error?.message||`HTTP ${response.status}: ${url}`);
 return payload;
}

await marker('CONTROL','run.start','start',{source_id:sourceId,streams:5});
const sourcePayload=await jsonGet(`${base}/api/v1/kf/trace?source_id=${encodeURIComponent(sourceId)}`);
const captures=Array.isArray(sourcePayload.data?.captures)?sourcePayload.data.captures:[];
if(!captures.length)throw new Error(`No captures found for ${sourceId}`);
const selected=captures.at(-1);
const captureId=selected.capture?.capture_id;
const spans=Array.isArray(selected.source_spans)?selected.source_spans:[];
if(!captureId)throw new Error(`Capture id missing for ${sourceId}`);

async function runStream(name,fn){
 const t0=Date.now();
 await marker(name,'start','start',{capture_id:captureId});
 try{
  const data=await fn();
  const duration_ms=Date.now()-t0;
  await marker(name,'complete','ok',{duration_ms});
  return {name,status:'ok',duration_ms,data};
 }catch(error){
  const duration_ms=Date.now()-t0;
  const message=error instanceof Error?error.message:String(error);
  await marker(name,'complete','error',{duration_ms,message});
  return {name,status:'error',duration_ms,error:message};
 }
}

const streamFns=[
 ['S1_SOURCE_INTEGRITY',async()=>{
   const ids=spans.map(x=>String(x.span_id||''));
   const uniqueIds=new Set(ids.filter(Boolean));
   const pages=spans.map(x=>safeNumber(x.page_from)).filter(x=>x>0).sort((a,b)=>a-b);
   const uniquePages=[...new Set(pages)];
   const missingPages=[];
   if(uniquePages.length){for(let p=uniquePages[0];p<=uniquePages.at(-1);p++)if(!uniquePages.includes(p))missingPages.push(p);}
   const wrongCapture=spans.filter(x=>x.capture_id!==captureId).length;
   return {
    source_id:sourceId,capture_id:captureId,span_count:spans.length,unique_span_ids:uniqueIds.size,
    duplicate_span_ids:Math.max(0,ids.filter(Boolean).length-uniqueIds.size),page_min:uniquePages[0]||null,page_max:uniquePages.at(-1)||null,
    unique_pages:uniquePages.length,missing_pages:missingPages,wrong_capture_links:wrongCapture,
    verdict:(uniqueIds.size===spans.length&&missingPages.length===0&&wrongCapture===0)?'PASS':'REVIEW',
   };
  }],
 ['S2_STRUCTURE_READINESS',async()=>{
   const response=await fetch(`${base}/api/v1/kf/structure?capture_id=${encodeURIComponent(captureId)}`,{headers:{'x-trace-id':runId}});
   if(response.status===404)return {proposal_present:false,status:'NOT_YET_PRODUCED',next_action:'run A2 structure reconstruction'};
   const payload=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(payload?.error?.message||`Structure HTTP ${response.status}`);
   const proposal=payload.data||{};
   const nodes=Array.isArray(proposal.nodes)?proposal.nodes:[];
   return {
    proposal_present:true,status:proposal.status||null,origin_class:proposal.origin_class||null,node_count:nodes.length,
    node_types:countBy(nodes,x=>x.node_type),avg_confidence:nodes.length?pct(nodes.reduce((a,x)=>a+safeNumber(x.confidence),0)/nodes.length):null,
    low_confidence_nodes:nodes.filter(x=>safeNumber(x.confidence,1)<0.85).length,
    canonical_safe:proposal.status==='PROPOSED'&&proposal.origin_class==='INFERENCE',
   };
  }],
 ['S3_SEMANTIC_READINESS',async()=>{
   const texts=spans.map(x=>String(x.text_content||''));
   const nonempty=texts.filter(x=>x.trim().length>0);
   const chars=nonempty.map(x=>x.length);
   const total=chars.reduce((a,b)=>a+b,0);
   const sorted=[...chars].sort((a,b)=>a-b);
   const q=p=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))]:0;
   return {
    spans:spans.length,nonempty_spans:nonempty.length,empty_spans:spans.length-nonempty.length,total_chars:total,
    avg_chars_per_nonempty:nonempty.length?Math.round(total/nonempty.length):0,p50_chars:q(.5),p90_chars:q(.9),
    short_pages:chars.filter(x=>x<200).length,long_pages:chars.filter(x=>x>5000).length,
    a3_ready:nonempty.length>0,
    next_stage:'A3 semantic windows should be derived from structure/spans, not fixed permanent chunks',
   };
  }],
 ['S4_PROVENANCE_SECURITY',async()=>{
   const capture=selected.capture||{};
   const source=sourcePayload.data?.source||{};
   const spanStructureIds=new Set(spans.map(x=>x.structure_node_id).filter(Boolean));
   const structureIds=new Set((Array.isArray(selected.structure_nodes)?selected.structure_nodes:[]).map(x=>x.structure_node_id));
   const dangling=[...spanStructureIds].filter(id=>!structureIds.has(id));
   return {
    source_id:source.source_id||null,capture_id:capture.capture_id||null,sha256_present:/^[a-fA-F0-9]{64}$/.test(String(capture.sha256||'')),
    security_status:capture.security_status||null,security_gate_open:capture.security_status==='SECURITY_APPROVED',
    parser_status:capture.parser_status||null,dangling_structure_refs:dangling,
    production_delivery_allowed:capture.security_status==='SECURITY_APPROVED'&&dangling.length===0,
    note:'SECURITY_UNREVIEWED is expected after intake and must not be silently promoted.',
   };
  }],
 ['S5_TELEMETRY',async()=>{
   const payload=await jsonGet(`${base}/api/v1/trace?limit=500`);
   const events=Array.isArray(payload.data?.events)?payload.data.events:[];
   const sourceRelated=events.filter(e=>e?.details?.source_id===sourceId||e?.details?.capture_id===captureId||e?.trace_id===runId);
   const measuredDurations=sourceRelated.map(e=>safeNumber(e.duration_ms,-1)).filter(x=>x>=0);
   return {
    trace_events_total_window:events.length,source_related_events:sourceRelated.length,
    statuses:countBy(sourceRelated,x=>x.status),stages:countBy(sourceRelated,x=>x.stage),actions:countBy(sourceRelated,x=>x.action),
    measured_duration_events:measuredDurations.length,measured_duration_sum_ms:measuredDurations.reduce((a,b)=>a+b,0),
    completion_eta:null,eta_reason:'No trustworthy total remaining-work estimate is available yet.',
   };
  }],
];

const parallelStarted=Date.now();
const streams=await Promise.all(streamFns.map(([name,fn])=>runStream(name,fn)));
const parallelWallMs=Date.now()-parallelStarted;
const serialEquivalentMs=streams.reduce((sum,s)=>sum+s.duration_ms,0);
const savingPct=serialEquivalentMs>0?pct((1-parallelWallMs/serialEquivalentMs)*100):0;
const failed=streams.filter(x=>x.status!=='ok');

const report={
 schema_version:'alina-kf-parallel-run-v1',
 run_id:runId,test_id:testId,source_id:sourceId,capture_id:captureId,created_at:now(),
 mode:'FIVE_CONCURRENT_ANALYTIC_STREAMS',stream_count:5,status:failed.length?'PARTIAL':'OK',
 telemetry:{
  parallel_wall_ms:parallelWallMs,serial_equivalent_sum_ms:serialEquivalentMs,
  observed_concurrency_saving_pct:savingPct,
  speedup_factor_vs_sum_of_observed_stream_times:parallelWallMs>0?pct(serialEquivalentMs/parallelWallMs):null,
  baseline_note:'This is an observed same-run concurrency comparison, not a benchmark against a separately measured 1-stream baseline.',
  corrective_work_share_pct:null,corrective_work_reason:'No tagged corrective-work sample exists for this run.',
  remaining_work:null,completion_forecast:null,
 },
 streams,
 total_duration_ms:Date.now()-started,
};

await mkdir(outputDir,{recursive:true});
const output=resolve(outputDir,`${runId}.json`);
await writeFile(output,JSON.stringify(report,null,2)+'\n','utf8');
await marker('CONTROL','run.complete',failed.length?'error':'ok',{status:report.status,parallel_wall_ms:parallelWallMs,serial_equivalent_sum_ms:serialEquivalentMs,observed_concurrency_saving_pct:savingPct,output});

console.log('\n[ALINA KF PAR5] five-stream run complete');
console.log(`[ALINA KF PAR5] run_id:     ${runId}`);
console.log(`[ALINA KF PAR5] source_id:  ${sourceId}`);
console.log(`[ALINA KF PAR5] capture_id: ${captureId}`);
console.log(`[ALINA KF PAR5] status:     ${report.status}`);
console.log(`[ALINA KF PAR5] wall:       ${parallelWallMs} ms`);
console.log(`[ALINA KF PAR5] serial sum: ${serialEquivalentMs} ms`);
console.log(`[ALINA KF PAR5] saving:     ${savingPct}% (same-run observed concurrency, not a 1-stream benchmark)`);
for(const stream of streams)console.log(`[ALINA KF PAR5] ${stream.name}: ${stream.status} ${stream.duration_ms} ms`);
console.log(`[ALINA KF PAR5] report:     ${output}`);
console.log(`[ALINA KF PAR5] trace:      ${base}/api/v1/trace?trace_id=${encodeURIComponent(runId)}`);
if(failed.length)process.exitCode=2;
