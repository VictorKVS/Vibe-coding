import {appendFile,mkdir,readFile,readdir,rename,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import type {CaptureRecord,IngestBundle,IngestResult,SourceRecord,SourceTrace,SourceSpanRecord,StructureNodeRecord} from './types';

const root=resolve(process.cwd(),'runtime','knowledge-factory');
const sourcesDir=resolve(root,'sources');
const capturesDir=resolve(root,'captures');
const structureDir=resolve(root,'structure');
const spansDir=resolve(root,'spans');
const indexesDir=resolve(root,'indexes');
const eventsFile=resolve(root,'events.jsonl');
const captureHashIndexFile=resolve(indexesDir,'capture-by-sha.json');

type HashIndex=Record<string,{source_id:string;capture_id:string}>;

async function ensureDirs(){
 await Promise.all([
  mkdir(sourcesDir,{recursive:true}),
  mkdir(capturesDir,{recursive:true}),
  mkdir(structureDir,{recursive:true}),
  mkdir(spansDir,{recursive:true}),
  mkdir(indexesDir,{recursive:true}),
 ]);
}

async function atomicJson(path:string,value:unknown){
 await mkdir(dirname(path),{recursive:true});
 const temp=`${path}.${process.pid}.${randomUUID()}.tmp`;
 await writeFile(temp,JSON.stringify(value,null,2)+'\n','utf8');
 await rename(temp,path);
}

async function readJson<T>(path:string):Promise<T|null>{
 try{return JSON.parse(await readFile(path,'utf8')) as T;}catch{return null;}
}

function requireId(value:string,label:string){
 const normalized=String(value||'').trim();
 if(!normalized)throw new Error(`${label} required`);
 if(!/^[A-Za-z0-9._:-]+$/.test(normalized))throw new Error(`${label} contains unsupported characters`);
 return normalized;
}

function validateBundle(bundle:IngestBundle){
 if(bundle.schema_version!=='alina-kf-ingest-v1')throw new Error('Unsupported schema_version');
 const sourceId=requireId(bundle.source.source_id,'source.source_id');
 const captureId=requireId(bundle.capture.capture_id,'capture.capture_id');
 if(bundle.capture.source_id!==sourceId)throw new Error('capture.source_id must equal source.source_id');
 if(!/^[a-fA-F0-9]{64}$/.test(bundle.capture.sha256))throw new Error('capture.sha256 must be a 64-char SHA-256 hex string');
 const nodeIds=new Set<string>();
 for(const node of bundle.structure_nodes){
  requireId(node.structure_node_id,'structure_node_id');
  if(node.capture_id!==captureId)throw new Error(`Structure node ${node.structure_node_id} points to another capture`);
  if(nodeIds.has(node.structure_node_id))throw new Error(`Duplicate structure_node_id ${node.structure_node_id}`);
  nodeIds.add(node.structure_node_id);
 }
 for(const node of bundle.structure_nodes){
  if(node.parent_id&&!nodeIds.has(node.parent_id))throw new Error(`Unknown parent_id ${node.parent_id}`);
 }
 const spanIds=new Set<string>();
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

async function readHashIndex():Promise<HashIndex>{return (await readJson<HashIndex>(captureHashIndexFile))||{};}

export async function persistIngestBundle(bundle:IngestBundle):Promise<IngestResult>{
 const {sourceId,captureId}=validateBundle(bundle);
 await ensureDirs();
 const hashIndex=await readHashIndex();
 const existing=hashIndex[bundle.capture.sha256.toLowerCase()];
 const now=new Date().toISOString();
 if(existing){
  return {
   schema_version:'alina-kf-ingest-result-v1',
   source_id:existing.source_id,
   capture_id:existing.capture_id,
   structure_nodes:(await readJson<StructureNodeRecord[]>(resolve(structureDir,`${existing.capture_id}.json`)))?.length||0,
   source_spans:(await readJson<SourceSpanRecord[]>(resolve(spansDir,`${existing.capture_id}.json`)))?.length||0,
   duplicate_capture:true,
   event_id:'dedup:'+bundle.capture.sha256.slice(0,16),
   stored_at:now,
  };
 }
 const source:SourceRecord={...bundle.source,source_id:sourceId,created_at:bundle.source.created_at||now};
 const capture:CaptureRecord={...bundle.capture,capture_id:captureId,source_id:sourceId,captured_at:bundle.capture.captured_at||now};
 await atomicJson(resolve(sourcesDir,`${sourceId}.json`),source);
 await atomicJson(resolve(capturesDir,`${captureId}.json`),capture);
 await atomicJson(resolve(structureDir,`${captureId}.json`),bundle.structure_nodes);
 await atomicJson(resolve(spansDir,`${captureId}.json`),bundle.source_spans);
 hashIndex[capture.sha256.toLowerCase()]={source_id:sourceId,capture_id:captureId};
 await atomicJson(captureHashIndexFile,hashIndex);
 const eventId=randomUUID();
 await appendFile(eventsFile,JSON.stringify({
  event_id:eventId,
  event_type:'KF_INGEST_STORED',
  source_id:sourceId,
  capture_id:captureId,
  structure_nodes:bundle.structure_nodes.length,
  source_spans:bundle.source_spans.length,
  trace:bundle.trace||{},
  created_at:now,
 })+'\n','utf8');
 return {
  schema_version:'alina-kf-ingest-result-v1',
  source_id:sourceId,
  capture_id:captureId,
  structure_nodes:bundle.structure_nodes.length,
  source_spans:bundle.source_spans.length,
  duplicate_capture:false,
  event_id:eventId,
  stored_at:now,
 };
}

export async function getSourceTrace(sourceIdRaw:string):Promise<SourceTrace|null>{
 const sourceId=requireId(sourceIdRaw,'source_id');
 const source=await readJson<SourceRecord>(resolve(sourcesDir,`${sourceId}.json`));
 if(!source)return null;
 let names:string[]=[];
 try{names=await readdir(capturesDir);}catch{return {source,captures:[]};}
 const captures:SourceTrace['captures']=[];
 for(const name of names.filter(x=>x.endsWith('.json')).sort()){
  const capture=await readJson<CaptureRecord>(resolve(capturesDir,name));
  if(!capture||capture.source_id!==sourceId)continue;
  const structure_nodes=(await readJson<StructureNodeRecord[]>(resolve(structureDir,`${capture.capture_id}.json`)))||[];
  const source_spans=(await readJson<SourceSpanRecord[]>(resolve(spansDir,`${capture.capture_id}.json`)))||[];
  captures.push({capture,structure_nodes,source_spans});
 }
 return {source,captures};
}

export async function listSources(limit=50):Promise<SourceRecord[]>{
 await ensureDirs();
 const names=(await readdir(sourcesDir)).filter(x=>x.endsWith('.json')).sort().reverse().slice(0,Math.max(1,Math.min(limit,200)));
 const records=await Promise.all(names.map(name=>readJson<SourceRecord>(resolve(sourcesDir,name))));
 return records.filter((x):x is SourceRecord=>Boolean(x));
}

export function knowledgeFactoryRuntimePath(){return root;}
