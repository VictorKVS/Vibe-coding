import {randomUUID} from 'node:crypto';
import process from 'node:process';

function arg(name,fallback=''){
 const i=process.argv.indexOf(`--${name}`);
 return i>=0&&process.argv[i+1]?process.argv[i+1]:fallback;
}
function cleanLine(value){return String(value||'').replace(/\s+/g,' ').trim();}
function norm(value){return cleanLine(value).toLowerCase().replace(/[^a-z0-9а-яё]+/gi,' ').trim();}
function roman(value){return /^[ivxlcdm]+$/i.test(String(value||''));}
function candidateId(key,index){return `STP-${key}-${String(index+1).padStart(3,'0')}`;}
function level(type){if(type==='part')return 1;if(type==='chapter'||type==='appendix'||type==='frontmatter')return 2;return 3;}

const sourceId=arg('source-id');
if(!sourceId)throw new Error('Use --source-id SRC-...');
const base=arg('base','http://localhost:3000').replace(/\/$/,'');
const maxPages=Math.max(0,Number(arg('max-pages','0'))||0);
const traceId=`KF-A2-${randomUUID()}`;

async function marker(action,status='info',details={}){
 try{
  await fetch(`${base}/api/v1/trace`,{
   method:'POST',
   headers:{'content-type':'application/json','x-trace-id':traceId},
   body:JSON.stringify({stage:'A2',action,status,details}),
  });
 }catch{}
 console.log(`[TRACE] ${traceId} A2/${action} ${status}`);
}

function detectHeading(lines,pageNo){
 for(let i=0;i<Math.min(lines.length,8);i++){
  const text=lines[i];
  let m=text.match(/^part\s+([ivxlcdm]+|\d+)\b[\s:.-]*(.*)$/i);
  if(m)return {type:'part',label:text,confidence:0.99,rule:'explicit_part',line_index:i,page:pageNo};
  m=text.match(/^chapter\s+([ivxlcdm]+|\d+)\b[\s:.-]*(.*)$/i);
  if(m)return {type:'chapter',label:text,confidence:0.99,rule:'explicit_chapter',line_index:i,page:pageNo};
  m=text.match(/^appendix\b[\s:.-]*(.*)$/i);
  if(m)return {type:'appendix',label:text,confidence:0.97,rule:'explicit_appendix',line_index:i,page:pageNo};
  m=text.match(/^(\d{1,2})[.)]\s+(.{3,120})$/);
  if(m)return {type:'chapter',label:text,confidence:i<=2?0.94:0.88,rule:'numbered_chapter',line_index:i,page:pageNo};
  m=text.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{1,2}))?\s+(.{3,120})$/);
  if(m)return {type:m[3]?'subsection':'section',label:text,confidence:i<=2?0.91:0.84,rule:'numbered_section',line_index:i,page:pageNo};
  m=text.match(/^([IVXLCDM]+)[.)]\s+(.{3,120})$/);
  if(m&&roman(m[1])&&text===text.toUpperCase())return {type:'part',label:text,confidence:0.90,rule:'roman_upper_part',line_index:i,page:pageNo};
  if(/^\d{1,2}$/.test(text)&&lines[i+1]&&lines[i+1].length>=3&&lines[i+1].length<=120){
   return {type:'chapter',label:`${text}. ${lines[i+1]}`,confidence:i<=2?0.91:0.84,rule:'number_title_pair',line_index:i,page:pageNo};
  }
  if(/^(preface|foreword|introduction|conclusion|acknowledg(e)?ments|about the authors|notes|index)$/i.test(text)){
   return {type:'frontmatter',label:text,confidence:0.90,rule:'named_frontmatter',line_index:i,page:pageNo};
  }
 }
 return null;
}

await marker('structure.fetch_source.start','start',{source_id:sourceId});
const sourceResponse=await fetch(`${base}/api/v1/kf/trace?source_id=${encodeURIComponent(sourceId)}`,{headers:{'x-trace-id':traceId}});
const sourcePayload=await sourceResponse.json().catch(()=>({}));
if(!sourceResponse.ok)throw new Error(sourcePayload?.error?.message||`Source trace HTTP ${sourceResponse.status}`);
await marker('structure.fetch_source.complete','ok',{captures:sourcePayload.data?.captures?.length||0});

const captures=Array.isArray(sourcePayload.data?.captures)?sourcePayload.data.captures:[];
if(!captures.length)throw new Error(`No captures found for ${sourceId}`);
const selected=captures.at(-1);
const captureId=selected.capture.capture_id;
const spans=(Array.isArray(selected.source_spans)?selected.source_spans:[])
 .slice()
 .sort((a,b)=>(a.page_from||0)-(b.page_from||0));
if(!spans.length)throw new Error(`No source spans found for ${captureId}`);
const limited=maxPages>0?spans.slice(0,maxPages):spans;
const lastPage=Math.max(...limited.map(x=>Number(x.page_to||x.page_from||0)),1);
const key=String(captureId).replace(/^CAP-/,'');

await marker('structure.header_frequency.start','start',{pages:limited.length});
const lineFrequency=new Map();
for(const span of limited){
 const unique=new Set(String(span.text_content||'').split(/\r?\n/).map(cleanLine).filter(x=>x.length>=3&&x.length<=140));
 for(const line of unique)lineFrequency.set(line,(lineFrequency.get(line)||0)+1);
}
const repeated=new Set([...lineFrequency.entries()].filter(([,count])=>count>=4).map(([line])=>line));
await marker('structure.header_frequency.complete','ok',{repeated_lines:repeated.size});

await marker('structure.detect.start','start',{pages:limited.length});
const raw=[];
for(const span of limited){
 const pageNo=Number(span.page_from||0);
 const lines=String(span.text_content||'').split(/\r?\n/).map(cleanLine).filter(Boolean).filter(line=>!repeated.has(line));
 const candidate=detectHeading(lines,pageNo);
 if(candidate)raw.push(candidate);
}

const byKey=new Map();
for(const c of raw){
 const k=`${c.type}:${norm(c.label)}`;
 const current=byKey.get(k);
 const score=c.confidence-(c.line_index*0.01);
 const currentScore=current?current.confidence-(current.line_index*0.01):-1;
 if(!current||score>currentScore||(score===currentScore&&c.page>current.page))byKey.set(k,c);
}
const candidates=[...byKey.values()].sort((a,b)=>a.page-b.page||level(a.type)-level(b.type));

const rootId=`STP-${key}-DOC`;
const nodes=[{
 structure_node_id:rootId,
 capture_id:captureId,
 parent_id:null,
 node_type:'document',
 ordinal:0,
 label:selected.capture?.metadata?.title||sourcePayload.data?.source?.title||sourceId,
 page_from:Math.min(...limited.map(x=>Number(x.page_from||1))),
 page_to:lastPage,
 confidence:1,
 rule:'proposal_root',
 metadata:{proposal_only:true},
}];
let currentPart=rootId;
let currentChapter=null;
for(const [index,c] of candidates.entries()){
 const id=candidateId(key,index);
 let parentId=rootId;
 if(c.type==='part'){
  currentPart=id;
  currentChapter=null;
 }else if(c.type==='chapter'){
  parentId=currentPart||rootId;
  currentChapter=id;
 }else if(c.type==='section'||c.type==='subsection'){
  parentId=currentChapter||currentPart||rootId;
 }else{
  currentChapter=null;
 }
 nodes.push({
  structure_node_id:id,
  capture_id:captureId,
  parent_id:parentId,
  node_type:c.type,
  ordinal:index+1,
  label:c.label,
  page_from:c.page,
  page_to:c.page,
  confidence:c.confidence,
  rule:c.rule,
  metadata:{proposal_only:true,line_index:c.line_index},
 });
}
for(let i=1;i<nodes.length;i++){
 const node=nodes[i];
 const nodeLevel=level(node.node_type);
 const next=nodes.slice(i+1).find(other=>level(other.node_type)<=nodeLevel&&Number(other.page_from)>Number(node.page_from));
 node.page_to=Math.max(Number(node.page_from),next?Number(next.page_from)-1:lastPage);
}
await marker('structure.detect.complete','ok',{raw_candidates:raw.length,deduplicated:candidates.length,nodes:nodes.length});

const proposal={
 schema_version:'alina-kf-structure-proposal-v1',
 source_id:sourceId,
 capture_id:captureId,
 status:'PROPOSED',
 origin_class:'INFERENCE',
 created_at:new Date().toISOString(),
 producer:{kind:'deterministic_heuristic',name:'reconstruct-book-structure.mjs',version:'1'},
 diagnostics:{
  pages_scanned:limited.length,
  last_page:lastPage,
  repeated_lines_suppressed:repeated.size,
  raw_candidates:raw.length,
  deduplicated_candidates:candidates.length,
  counts:Object.fromEntries([...new Set(nodes.map(x=>x.node_type))].map(type=>[type,nodes.filter(x=>x.node_type===type).length])),
  completeness:'COARSE_BOOK_STRUCTURE',
  unresolved:['semantic section boundaries','false-positive/false-negative heading review','cross-page heading joins'],
 },
 nodes,
};

await marker('structure.proposal.store.start','start',{capture_id:captureId,nodes:nodes.length});
const storeResponse=await fetch(`${base}/api/v1/kf/structure`,{
 method:'POST',
 headers:{'content-type':'application/json','x-trace-id':traceId},
 body:JSON.stringify(proposal),
});
const stored=await storeResponse.json().catch(()=>({}));
if(!storeResponse.ok)throw new Error(stored?.error?.message||`Structure store HTTP ${storeResponse.status}`);
await marker('structure.proposal.store.complete','ok',{capture_id:captureId,nodes:nodes.length});

console.log('\n[ALINA A2] structure proposal created');
console.log(`[ALINA A2] trace_id:   ${traceId}`);
console.log(`[ALINA A2] source_id:  ${sourceId}`);
console.log(`[ALINA A2] capture_id: ${captureId}`);
console.log(`[ALINA A2] pages:      ${limited.length}`);
console.log(`[ALINA A2] nodes:      ${nodes.length}`);
console.log(`[ALINA A2] status:     PROPOSED (not canonical)`);
console.log(`[ALINA A2] inspect:    ${base}/api/v1/kf/structure?capture_id=${encodeURIComponent(captureId)}`);
console.log(`[ALINA A2] runtime:    ${base}/api/v1/trace?trace_id=${encodeURIComponent(traceId)}`);
