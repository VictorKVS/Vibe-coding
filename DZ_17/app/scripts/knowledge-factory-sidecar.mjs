import {createServer} from 'node:http';
import {appendFile,mkdir,readFile,readdir,rename,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import process from 'node:process';

const host=process.env.KF_SIDECAR_HOST||'127.0.0.1';
const port=Number(process.env.KF_SIDECAR_PORT||8791);
const maxBodyBytes=Number(process.env.KF_SIDECAR_MAX_BODY_BYTES||50*1024*1024);
const root=resolve(process.cwd(),'runtime','knowledge-factory');
const sourcesDir=resolve(root,'sources');
const capturesDir=resolve(root,'captures');
const structureDir=resolve(root,'structure');
const structureProposalsDir=resolve(root,'structure-proposals');
const spansDir=resolve(root,'spans');
const indexesDir=resolve(root,'indexes');
const eventsFile=resolve(root,'events.jsonl');
const captureHashIndexFile=resolve(indexesDir,'capture-by-sha.json');
const traceDir=resolve(process.cwd(),'runtime','trace');
const traceFile=resolve(traceDir,'events.jsonl');

async function ensureDirs(){
 await Promise.all([
  mkdir(sourcesDir,{recursive:true}),mkdir(capturesDir,{recursive:true}),mkdir(structureDir,{recursive:true}),
  mkdir(structureProposalsDir,{recursive:true}),mkdir(spansDir,{recursive:true}),mkdir(indexesDir,{recursive:true}),mkdir(traceDir,{recursive:true}),
 ]);
}
async function atomicJson(path,value){
 await mkdir(dirname(path),{recursive:true});
 const temp=`${path}.${process.pid}.${randomUUID()}.tmp`;
 await writeFile(temp,JSON.stringify(value,null,2)+'\n','utf8');
 await rename(temp,path);
}
async function readJson(path){try{return JSON.parse(await readFile(path,'utf8'));}catch{return null;}}
function requireId(value,label){
 const normalized=String(value||'').trim();
 if(!normalized)throw new Error(`${label} required`);
 if(!/^[A-Za-z0-9._:-]+$/.test(normalized))throw new Error(`${label} contains unsupported characters`);
 return normalized;
}
function redactValue(value,key=''){
 if(/token|secret|password|authorization|api[_-]?key|private[_-]?key/i.test(key))return '[REDACTED]';
 if(Array.isArray(value))return value.map(item=>redactValue(item));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,redactValue(v,k)]));
 if(typeof value==='string'&&value.length>1000)return `${value.slice(0,1000)}…[truncated]`;
 return value;
}
function traceIdFrom(req,prefix='HTTP'){
 const incoming=String(req.headers['x-trace-id']||'').trim();
 return incoming||`${prefix}-${randomUUID()}`;
}
async function recordTrace(input){
 await ensureDirs();
 const event={event_id:randomUUID(),at:new Date().toISOString(),...input,details:input.details?redactValue(input.details):undefined};
 await appendFile(traceFile,JSON.stringify(event)+'\n','utf8');
 const duration=typeof event.duration_ms==='number'?` ${event.duration_ms}ms`:'';
 console.log(`[TRACE] ${event.trace_id} ${event.source} ${event.stage}/${event.action} ${event.status}${duration}`);
 return event;
}
async function recentTraceEvents({limit=100,traceId,testId}={}){
 const safeLimit=Math.max(1,Math.min(Number(limit||100),500));
 let rows=[];
 try{rows=(await readFile(traceFile,'utf8')).split(/\r?\n/).filter(Boolean);}catch{return [];}
 const parsed=rows.map(line=>{try{return JSON.parse(line);}catch{return null;}}).filter(Boolean);
 return parsed.filter(event=>(!traceId||event.trace_id===traceId)&&(!testId||event.test_id===testId)).slice(-safeLimit).reverse();
}
function validateBundle(bundle){
 if(!bundle||bundle.schema_version!=='alina-kf-ingest-v1')throw new Error('Unsupported schema_version');
 const sourceId=requireId(bundle.source?.source_id,'source.source_id');
 const captureId=requireId(bundle.capture?.capture_id,'capture.capture_id');
 if(bundle.capture?.source_id!==sourceId)throw new Error('capture.source_id must equal source.source_id');
 if(!/^[a-fA-F0-9]{64}$/.test(String(bundle.capture?.sha256||'')))throw new Error('capture.sha256 must be a 64-char SHA-256 hex string');
 if(!Array.isArray(bundle.structure_nodes)||!Array.isArray(bundle.source_spans))throw new Error('structure_nodes and source_spans must be arrays');
 const nodeIds=new Set();
 for(const node of bundle.structure_nodes){
  requireId(node.structure_node_id,'structure_node_id');
  if(node.capture_id!==captureId)throw new Error(`Structure node ${node.structure_node_id} points to another capture`);
  if(nodeIds.has(node.structure_node_id))throw new Error(`Duplicate structure_node_id ${node.structure_node_id}`);
  nodeIds.add(node.structure_node_id);
 }
 for(const node of bundle.structure_nodes){if(node.parent_id&&!nodeIds.has(node.parent_id))throw new Error(`Unknown parent_id ${node.parent_id}`);}
 const spanIds=new Set();
 for(const span of bundle.source_spans){
  requireId(span.span_id,'span_id');
  if(span.capture_id!==captureId)throw new Error(`Source span ${span.span_id} points to another capture`);
  if(span.structure_node_id&&!nodeIds.has(span.structure_node_id))throw new Error(`Unknown structure_node_id ${span.structure_node_id}`);
  if(span.text_content===null&&!span.storage_ref)throw new Error(`Source span ${span.span_id} needs text_content or storage_ref`);
  if(spanIds.has(span.span_id))throw new Error(`Duplicate span_id ${span.span_id}`);
  spanIds.add(span.span_id);
 }
 return {sourceId,captureId};
}
function validateStructureProposal(proposal){
 if(!proposal||proposal.schema_version!=='alina-kf-structure-proposal-v1')throw new Error('Unsupported structure proposal schema_version');
 const sourceId=requireId(proposal.source_id,'source_id');
 const captureId=requireId(proposal.capture_id,'capture_id');
 if(proposal.status!=='PROPOSED')throw new Error('A2 structure proposal status must be PROPOSED');
 if(!Array.isArray(proposal.nodes)||proposal.nodes.length<1)throw new Error('Structure proposal needs nodes');
 const nodeIds=new Set();
 for(const node of proposal.nodes){
  requireId(node.structure_node_id,'structure_node_id');
  if(node.capture_id!==captureId)throw new Error(`Structure node ${node.structure_node_id} points to another capture`);
  if(nodeIds.has(node.structure_node_id))throw new Error(`Duplicate structure_node_id ${node.structure_node_id}`);
  nodeIds.add(node.structure_node_id);
 }
 for(const node of proposal.nodes){
  if(node.parent_id&&!nodeIds.has(node.parent_id))throw new Error(`Unknown parent_id ${node.parent_id}`);
  if(Number(node.page_from||0)<1||Number(node.page_to||0)<Number(node.page_from||0))throw new Error(`Invalid page range for ${node.structure_node_id}`);
 }
 return {sourceId,captureId};
}
async function persistIngestBundle(bundle){
 const {sourceId,captureId}=validateBundle(bundle);
 await ensureDirs();
 const hashIndex=(await readJson(captureHashIndexFile))||{};
 const hash=String(bundle.capture.sha256).toLowerCase();
 const existing=hashIndex[hash];
 const now=new Date().toISOString();
 if(existing){
  return {
   schema_version:'alina-kf-ingest-result-v1',source_id:existing.source_id,capture_id:existing.capture_id,
   structure_nodes:((await readJson(resolve(structureDir,`${existing.capture_id}.json`)))||[]).length,
   source_spans:((await readJson(resolve(spansDir,`${existing.capture_id}.json`)))||[]).length,
   duplicate_capture:true,event_id:'dedup:'+hash.slice(0,16),stored_at:now,
  };
 }
 const source={...bundle.source,source_id:sourceId,created_at:bundle.source.created_at||now};
 const capture={...bundle.capture,capture_id:captureId,source_id:sourceId,captured_at:bundle.capture.captured_at||now,security_status:'SECURITY_UNREVIEWED'};
 await atomicJson(resolve(sourcesDir,`${sourceId}.json`),source);
 await atomicJson(resolve(capturesDir,`${captureId}.json`),capture);
 await atomicJson(resolve(structureDir,`${captureId}.json`),bundle.structure_nodes);
 await atomicJson(resolve(spansDir,`${captureId}.json`),bundle.source_spans);
 hashIndex[hash]={source_id:sourceId,capture_id:captureId};
 await atomicJson(captureHashIndexFile,hashIndex);
 const eventId=randomUUID();
 await appendFile(eventsFile,JSON.stringify({event_id:eventId,event_type:'KF_INGEST_STORED',source_id:sourceId,capture_id:captureId,structure_nodes:bundle.structure_nodes.length,source_spans:bundle.source_spans.length,security_status:capture.security_status,trace:bundle.trace||{},created_at:now})+'\n','utf8');
 return {schema_version:'alina-kf-ingest-result-v1',source_id:sourceId,capture_id:captureId,structure_nodes:bundle.structure_nodes.length,source_spans:bundle.source_spans.length,duplicate_capture:false,event_id:eventId,stored_at:now};
}
async function persistStructureProposal(proposal){
 const {sourceId,captureId}=validateStructureProposal(proposal);
 await ensureDirs();
 const capture=await readJson(resolve(capturesDir,`${captureId}.json`));
 if(!capture)throw new Error(`Capture not found: ${captureId}`);
 if(capture.source_id!==sourceId)throw new Error('Structure proposal source_id does not match capture source_id');
 const stored={...proposal,status:'PROPOSED',stored_at:new Date().toISOString()};
 await atomicJson(resolve(structureProposalsDir,`${captureId}.json`),stored);
 const eventId=randomUUID();
 await appendFile(eventsFile,JSON.stringify({event_id:eventId,event_type:'KF_STRUCTURE_PROPOSAL_STORED',source_id:sourceId,capture_id:captureId,status:'PROPOSED',nodes:proposal.nodes.length,created_at:stored.stored_at})+'\n','utf8');
 return {schema_version:'alina-kf-structure-proposal-result-v1',source_id:sourceId,capture_id:captureId,status:'PROPOSED',nodes:proposal.nodes.length,event_id:eventId,stored_at:stored.stored_at};
}
async function getStructureProposal(captureIdRaw){
 const captureId=requireId(captureIdRaw,'capture_id');
 return readJson(resolve(structureProposalsDir,`${captureId}.json`));
}
async function listSources(limit=50){
 await ensureDirs();
 const names=(await readdir(sourcesDir)).filter(x=>x.endsWith('.json')).sort().reverse().slice(0,Math.max(1,Math.min(Number(limit)||50,200)));
 const records=await Promise.all(names.map(name=>readJson(resolve(sourcesDir,name))));
 return records.filter(Boolean);
}
async function getSourceTrace(sourceIdRaw){
 const sourceId=requireId(sourceIdRaw,'source_id');
 const source=await readJson(resolve(sourcesDir,`${sourceId}.json`));
 if(!source)return null;
 let names=[];try{names=await readdir(capturesDir);}catch{return {source,captures:[]};}
 const captures=[];
 for(const name of names.filter(x=>x.endsWith('.json')).sort()){
  const capture=await readJson(resolve(capturesDir,name));
  if(!capture||capture.source_id!==sourceId)continue;
  const structure_nodes=(await readJson(resolve(structureDir,`${capture.capture_id}.json`)))||[];
  const source_spans=(await readJson(resolve(spansDir,`${capture.capture_id}.json`)))||[];
  const structure_proposal=await readJson(resolve(structureProposalsDir,`${capture.capture_id}.json`));
  captures.push({capture,structure_nodes,source_spans,structure_proposal});
 }
 return {source,captures};
}
function send(res,status,body,traceId){
 const payload=JSON.stringify(body);
 res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(payload),...(traceId?{'x-trace-id':traceId}:{})});
 res.end(payload);
}
async function readBody(req){
 const chunks=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>maxBodyBytes)throw new Error(`Request body exceeds ${maxBodyBytes} bytes`);chunks.push(chunk);}
 return Buffer.concat(chunks).toString('utf8');
}

const server=createServer(async(req,res)=>{
 const url=new URL(req.url||'/',`http://${host}:${port}`);
 const started=Date.now();
 try{
  if(req.method==='GET'&&url.pathname==='/health')return send(res,200,{ok:true,service:'alina-kf-node-sidecar',storage_root:root,trace_file:traceFile});
  if(req.method==='GET'&&url.pathname==='/sources'){
   const traceId=traceIdFrom(req,'KF-SOURCES');
   await recordTrace({trace_id:traceId,source:'http',stage:'A1',action:'kf.sources.list',status:'start',route:'/api/v1/kf/sources',method:'GET'});
   const sources=await listSources(url.searchParams.get('limit')||50);
   await recordTrace({trace_id:traceId,source:'http',stage:'A1',action:'kf.sources.list',status:'ok',route:'/api/v1/kf/sources',method:'GET',duration_ms:Date.now()-started,details:{count:sources.length}});
   return send(res,200,{ok:true,data:{sources,count:sources.length},trace:{trace_id:traceId,service:'knowledge-factory-sources',schema_version:'v1',created_at:new Date().toISOString()}},traceId);
  }
  if(req.method==='GET'&&url.pathname==='/source-trace'){
   const traceId=traceIdFrom(req,'KF-TRACE');
   const sourceId=String(url.searchParams.get('source_id')||'').trim();
   await recordTrace({trace_id:traceId,source:'http',stage:'TRACE',action:'kf.source.trace',status:'start',route:'/api/v1/kf/trace',method:'GET',details:{source_id:sourceId||null}});
   if(!sourceId)return send(res,400,{ok:false,error:{code:'SOURCE_ID_REQUIRED',message:'source_id обязателен.'},trace:{trace_id:traceId}},traceId);
   const trace=await getSourceTrace(sourceId);
   if(!trace)return send(res,404,{ok:false,error:{code:'SOURCE_NOT_FOUND',message:'Source не найден.'},trace:{trace_id:traceId}},traceId);
   await recordTrace({trace_id:traceId,source:'http',stage:'TRACE',action:'kf.source.trace',status:'ok',route:'/api/v1/kf/trace',method:'GET',duration_ms:Date.now()-started,details:{source_id:sourceId,captures:trace.captures.length}});
   return send(res,200,{ok:true,data:trace,trace:{trace_id:traceId,service:'knowledge-factory-trace',schema_version:'v1',created_at:new Date().toISOString()}},traceId);
  }
  if(req.method==='POST'&&url.pathname==='/ingest'){
   const traceId=traceIdFrom(req,'KF-INGEST');
   await recordTrace({trace_id:traceId,source:'http',stage:'A1',action:'kf.ingest',status:'start',route:'/api/v1/kf/ingest',method:'POST'});
   let body;try{body=JSON.parse(await readBody(req));}catch(error){return send(res,400,{ok:false,error:{code:'INVALID_JSON',message:error instanceof Error?error.message:'Некорректный JSON.'},trace:{trace_id:traceId}},traceId);}
   const result=await persistIngestBundle(body);
   await recordTrace({trace_id:traceId,source:'http',stage:'A1',action:'kf.ingest',status:'ok',route:'/api/v1/kf/ingest',method:'POST',duration_ms:Date.now()-started,details:{source_id:result.source_id,capture_id:result.capture_id,source_spans:result.source_spans,duplicate_capture:result.duplicate_capture}});
   return send(res,result.duplicate_capture?200:201,{ok:true,data:result,trace:{trace_id:traceId,service:'knowledge-factory-ingest',schema_version:'v1',created_at:new Date().toISOString()}},traceId);
  }
  if(req.method==='POST'&&url.pathname==='/structure-proposal'){
   const traceId=traceIdFrom(req,'KF-A2');
   await recordTrace({trace_id:traceId,source:'http',stage:'A2',action:'structure.proposal.store',status:'start',route:'/api/v1/kf/structure',method:'POST'});
   let body;try{body=JSON.parse(await readBody(req));}catch(error){return send(res,400,{ok:false,error:{code:'INVALID_JSON',message:error instanceof Error?error.message:'Некорректный JSON.'},trace:{trace_id:traceId}},traceId);}
   const result=await persistStructureProposal(body);
   await recordTrace({trace_id:traceId,source:'http',stage:'A2',action:'structure.proposal.store',status:'ok',route:'/api/v1/kf/structure',method:'POST',duration_ms:Date.now()-started,details:{capture_id:result.capture_id,nodes:result.nodes,status:result.status}});
   return send(res,201,{ok:true,data:result,trace:{trace_id:traceId,service:'knowledge-factory-structure',schema_version:'v1',created_at:new Date().toISOString()}},traceId);
  }
  if(req.method==='GET'&&url.pathname==='/structure-proposal'){
   const traceId=traceIdFrom(req,'KF-A2-READ');
   const captureId=String(url.searchParams.get('capture_id')||'').trim();
   await recordTrace({trace_id:traceId,source:'http',stage:'A2',action:'structure.proposal.read',status:'start',route:'/api/v1/kf/structure',method:'GET',details:{capture_id:captureId||null}});
   if(!captureId)return send(res,400,{ok:false,error:{code:'CAPTURE_ID_REQUIRED',message:'capture_id обязателен.'},trace:{trace_id:traceId}},traceId);
   const proposal=await getStructureProposal(captureId);
   if(!proposal)return send(res,404,{ok:false,error:{code:'STRUCTURE_PROPOSAL_NOT_FOUND',message:'Structure proposal не найден.'},trace:{trace_id:traceId}},traceId);
   await recordTrace({trace_id:traceId,source:'http',stage:'A2',action:'structure.proposal.read',status:'ok',route:'/api/v1/kf/structure',method:'GET',duration_ms:Date.now()-started,details:{capture_id:captureId,nodes:proposal.nodes?.length||0,status:proposal.status}});
   return send(res,200,{ok:true,data:proposal,trace:{trace_id:traceId,service:'knowledge-factory-structure',schema_version:'v1',created_at:new Date().toISOString()}},traceId);
  }
  if(req.method==='GET'&&url.pathname==='/trace'){
   const traceId=traceIdFrom(req,'TRACE-READ');
   const events=await recentTraceEvents({limit:url.searchParams.get('limit')||100,traceId:String(url.searchParams.get('trace_id')||'').trim()||undefined,testId:String(url.searchParams.get('test_id')||'').trim()||undefined});
   await recordTrace({trace_id:traceId,source:'http',stage:'TRACE',action:'trace.read',status:'ok',route:'/api/v1/trace',method:'GET',details:{returned:events.length}});
   return send(res,200,{ok:true,data:{events,count:events.length},trace:{trace_id:traceId,service:'runtime-trace',schema_version:'v1',created_at:new Date().toISOString()}},traceId);
  }
  if(req.method==='POST'&&url.pathname==='/trace'){
   const traceId=traceIdFrom(req,'TRACE-MARK');
   let body;try{body=JSON.parse(await readBody(req));}catch{return send(res,400,{ok:false,error:{code:'INVALID_JSON',message:'Некорректный JSON.'},trace:{trace_id:traceId}},traceId);}
   const statusRaw=String(body.status||'info');
   const status=['start','ok','error','info'].includes(statusRaw)?statusRaw:'info';
   const testId=typeof body.test_id==='string'?body.test_id:undefined;
   const event=await recordTrace({trace_id:traceId,source:testId?'test':'script',stage:String(body.stage||'CLIENT').trim(),action:String(body.action||'client.marker').trim(),status,test_id:testId,details:body.details&&typeof body.details==='object'?body.details:{}});
   return send(res,201,{ok:true,data:event,trace:{trace_id:traceId}},traceId);
  }
  return send(res,404,{ok:false,error:{code:'NOT_FOUND',message:'Sidecar route not found'}});
 }catch(error){
  console.error('[KF-SIDECAR] request failed',error);
  return send(res,500,{ok:false,error:{code:'KF_SIDECAR_ERROR',message:error instanceof Error?error.message:'Internal sidecar error'}});
 }
});

server.listen(port,host,()=>{
 console.log(`[KF-SIDECAR] ready http://${host}:${port}`);
 console.log(`[KF-SIDECAR] storage ${root}`);
 console.log(`[KF-SIDECAR] trace ${traceFile}`);
});

function stop(){server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),1000).unref();}
process.on('SIGINT',stop);
process.on('SIGTERM',stop);
