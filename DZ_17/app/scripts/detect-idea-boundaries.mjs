import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import process from 'node:process';

function arg(name,fallback=''){
 const i=process.argv.indexOf(`--${name}`);
 return i>=0&&process.argv[i+1]?process.argv[i+1]:fallback;
}
function clean(s){return String(s||'').replace(/[\t ]+/g,' ').trim();}
function norm(s){return clean(s).toLowerCase().replace(/[^a-z0-9а-яё]+/gi,' ').trim();}
function sha(s){return createHash('sha256').update(String(s),'utf8').digest('hex');}
function sentenceTitle(text){
 const t=clean(text).replace(/\s+/g,' ');
 const m=t.match(/^(.{20,180}?[.!?])(?:\s|$)/);
 return (m?m[1]:t.slice(0,160)).trim();
}
function strongHeading(p){
 const t=clean(p);
 if(!t||t.length>160)return false;
 if(/^(part|chapter|appendix|section)\s+/i.test(t))return true;
 if(/^\d+(?:\.\d+){0,3}[.)]?\s+\S/.test(t))return true;
 if(t.length<90&&t===t.toUpperCase()&&/[A-ZА-ЯЁ]/.test(t))return true;
 return false;
}
function transitionStart(p){
 const t=norm(p);
 return /^(however|nevertheless|on the other hand|by contrast|in contrast|another|a second|a third|the next|now consider|suppose|there is another|yet|but there is|however there is|однако|с другой стороны|напротив|другая|следующая|теперь рассмотрим|предположим|тем не менее)\b/i.test(t);
}
function paragraphsFromSpan(span){
 const raw=String(span.text_content||'').replace(/\r/g,'');
 let parts=raw.split(/\n\s*\n+/).map(clean).filter(Boolean);
 if(parts.length<=1){
  const lines=raw.split(/\n+/).map(clean).filter(Boolean);
  parts=[];let buf=[];
  for(const line of lines){
   if(strongHeading(line)){
    if(buf.length){parts.push(buf.join(' '));buf=[];}
    parts.push(line);
   }else{
    buf.push(line);
    if(/[.!?]["')\]]?$/.test(line)&&buf.join(' ').length>=320){parts.push(buf.join(' '));buf=[];}
   }
  }
  if(buf.length)parts.push(buf.join(' '));
 }
 return parts.map((text,index)=>({span_id:span.span_id,page_from:span.page_from,page_to:span.page_to,paragraph_index:index,text}));
}

const sourceId=arg('source-id');
if(!sourceId)throw new Error('Use --source-id SRC-...');
const base=arg('base','http://localhost:3000').replace(/\/$/,'');
const traceId=`KF-K56-${randomUUID()}`;
const outputDir=resolve(process.cwd(),'runtime','knowledge-factory','idea-proposals');

async function marker(action,status='info',details={}){
 try{
  await fetch(`${base}/api/v1/trace`,{method:'POST',headers:{'content-type':'application/json','x-trace-id':traceId},body:JSON.stringify({stage:'K5K6',action,status,details})});
 }catch{}
 console.log(`[TRACE] ${traceId} K5K6/${action} ${status}`);
}
async function mustJson(url){
 const r=await fetch(url,{headers:{'x-trace-id':traceId}});
 const p=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(p?.error?.message||`HTTP ${r.status}: ${url}`);
 return p;
}

await marker('idea.fetch.start','start',{source_id:sourceId});
const sourcePayload=await mustJson(`${base}/api/v1/kf/trace?source_id=${encodeURIComponent(sourceId)}`);
const captures=Array.isArray(sourcePayload.data?.captures)?sourcePayload.data.captures:[];
if(!captures.length)throw new Error(`No captures for ${sourceId}`);
const selected=captures.at(-1);
const captureId=selected.capture?.capture_id;
const spans=(Array.isArray(selected.source_spans)?selected.source_spans:[]).slice().sort((a,b)=>(a.page_from||0)-(b.page_from||0));
if(!captureId||!spans.length)throw new Error('Capture or spans missing');
const structurePayload=await mustJson(`${base}/api/v1/kf/structure?capture_id=${encodeURIComponent(captureId)}`);
const proposal=structurePayload.data||{};
const structureNodes=(Array.isArray(proposal.nodes)?proposal.nodes:[]).filter(n=>n.node_type!=='document').sort((a,b)=>(a.page_from||0)-(b.page_from||0));
await marker('idea.fetch.complete','ok',{capture_id:captureId,spans:spans.length,structure_nodes:structureNodes.length});

const regions=structureNodes.length?structureNodes:[{structure_node_id:null,node_type:'document',label:sourcePayload.data?.source?.title||sourceId,page_from:spans[0]?.page_from||1,page_to:spans.at(-1)?.page_to||spans.at(-1)?.page_from||1}];
const ideas=[];
const chunks=[];
let ideaOrdinal=0;
await marker('idea.detect.start','start',{regions:regions.length});

for(const region of regions){
 const regionSpans=spans.filter(s=>Number(s.page_from||0)>=Number(region.page_from||1)&&Number(s.page_from||0)<=Number(region.page_to||region.page_from||1));
 if(!regionSpans.length)continue;
 const units=regionSpans.flatMap(paragraphsFromSpan);
 if(!units.length)continue;
 let current=[];
 let openReason='structure_region_start';
 const closeCurrent=(reason)=>{
  if(!current.length)return;
  ideaOrdinal+=1;
  const first=current[0],last=current.at(-1);
  const ideaId=`IDEA-${String(captureId).replace(/^CAP-/,'')}-${String(ideaOrdinal).padStart(4,'0')}`;
  const distinctSpans=[...new Set(current.map(x=>x.span_id))];
  const joined=current.map(x=>x.text).join('\n\n');
  const fragmentRefs=current.map(x=>({span_id:x.span_id,paragraph_index:x.paragraph_index,page_from:x.page_from,page_to:x.page_to,text_hash:sha(x.text)}));
  ideas.push({
   idea_id:ideaId,source_id:sourceId,capture_id:captureId,structure_refs:region.structure_node_id?[region.structure_node_id]:[],span_refs:distinctSpans,
   page_from:first.page_from,page_to:last.page_to||last.page_from,title_candidate:sentenceTitle(joined),summary_status:'PENDING_SEMANTIC_MODEL',
   boundary_start_reason:openReason,boundary_end_reason:reason,status:'candidate',origin_class:'INFERENCE',confidence:reason==='structure_region_end'?0.72:0.62,
   claims:[],assumptions:[],conditions:[],limitations:[],counterpoints:[],open_questions:['Semantic summary/classification requires Analyst Zoo semantic pass.']
  });
  chunks.push({
   chunk_id:`ICH-${String(captureId).replace(/^CAP-/,'')}-${String(ideaOrdinal).padStart(4,'0')}`,idea_id:ideaId,source_id:sourceId,capture_id:captureId,
   structure_ref:region.structure_node_id||null,span_refs:distinctSpans,fragment_refs:fragmentRefs,page_from:first.page_from,page_to:last.page_to||last.page_from,
   text_hash:sha(joined),canonical_text_duplicated:false,derivation:'IDEA_BOUNDARY_PROPOSAL',status:'derived_candidate'
  });
  current=[];
 };
 for(const unit of units){
  const boundary=current.length>0&&(strongHeading(unit.text)||transitionStart(unit.text));
  if(boundary){closeCurrent(strongHeading(unit.text)?'strong_heading_transition':'discourse_transition');openReason=strongHeading(unit.text)?'strong_heading':'discourse_transition';}
  current.push(unit);
  // Safety valve only: not treated as semantic truth. It prevents unbounded context.
  const chars=current.reduce((n,x)=>n+x.text.length,0);
  if(chars>12000){closeCurrent('forced_context_safety_limit');openReason='continuation_after_safety_split';}
 }
 closeCurrent('structure_region_end');
}

const bundle={
 schema_version:'alina-kf-idea-proposal-v1',source_id:sourceId,capture_id:captureId,status:'PROPOSED',origin_class:'INFERENCE',created_at:new Date().toISOString(),
 producer:{kind:'deterministic_boundary_seed',name:'detect-idea-boundaries.mjs',version:'1'},
 diagnostics:{regions_scanned:regions.length,ideas:ideas.length,chunks:chunks.length,semantic_model_applied:false,forced_splits:ideas.filter(x=>x.boundary_end_reason==='forced_context_safety_limit').length,
  note:'Boundaries are candidate seeds. K5 semantic model/reviewer must refine them before knowledge extraction.'},
 ideas,chunks
};
await mkdir(outputDir,{recursive:true});
const out=resolve(outputDir,`${captureId}.json`);
await writeFile(out,JSON.stringify(bundle,null,2)+'\n','utf8');
await marker('idea.detect.complete','ok',{ideas:ideas.length,chunks:chunks.length,output:out});

console.log('\n[ALINA K5/K6] idea boundary proposal created');
console.log(`[ALINA K5/K6] trace_id:   ${traceId}`);
console.log(`[ALINA K5/K6] source_id:  ${sourceId}`);
console.log(`[ALINA K5/K6] capture_id: ${captureId}`);
console.log(`[ALINA K5/K6] ideas:      ${ideas.length}`);
console.log(`[ALINA K5/K6] chunks:     ${chunks.length}`);
console.log('[ALINA K5/K6] status:     PROPOSED / INFERENCE');
console.log(`[ALINA K5/K6] output:     ${out}`);
