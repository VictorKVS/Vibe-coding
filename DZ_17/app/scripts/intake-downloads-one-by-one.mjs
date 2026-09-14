#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {createReadStream,existsSync} from 'node:fs';
import {mkdir,readFile,readdir,stat,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {basename,dirname,extname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import process from 'node:process';
import {identifyDocument,identitySummary} from './lib/document-identity.mjs';
import {mergeLegalCandidate} from './lib/legal-registry.mjs';

function arg(name,fallback=''){const i=process.argv.indexOf(`--${name}`);return i>=0&&process.argv[i+1]?process.argv[i+1]:fallback;}
function flag(name,fallback=false){const v=arg(name,fallback?'1':'0');return ['1','true','yes','on'].includes(String(v).toLowerCase());}
async function sha256File(path){const hash=createHash('sha256');await new Promise((ok,fail)=>{const s=createReadStream(path);s.on('data',c=>hash.update(c));s.on('error',fail);s.on('end',ok);});return hash.digest('hex');}
async function jsonRead(path,fallback){try{return JSON.parse(await readFile(path,'utf8'));}catch{return fallback;}}
async function jsonWrite(path,value){await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(value,null,2)+'\n','utf8');}
function hashText(value){return createHash('sha256').update(String(value),'utf8').digest('hex');}
function safeSourceId(identity,fileHash){
 const stableParts=[identity.document_type,identity.issuer||'',identity.document_number||'',identity.document_date_iso||''].filter(Boolean);
 const stableEnough=identity.document_number&&(identity.document_date_iso||identity.document_type==='gost');
 if(!stableEnough)return `SRC-${fileHash.slice(0,16).toUpperCase()}`;
 const prefix=identity.document_type==='gost'?'STD':'LEGAL';return `SRC-${prefix}-${hashText(stableParts.join('|')).slice(0,16).toUpperCase()}`;
}
function sourceType(identity){if(identity.document_type==='gost')return 'standard';if(['federal_law','presidential_decree','government_resolution','order','letter','regulation','requirements'].includes(identity.document_type))return 'legal_normative';return identity.collection==='ib_reference'?'ib_reference':'document';}

const defaultDownloads=process.env.ALINA_DOWNLOADS_DIR||resolve(process.env.USERPROFILE||process.env.HOME||'.','Downloads');
const inputDir=resolve(arg('input-dir',defaultDownloads));
const base=arg('base','http://127.0.0.1:3000').replace(/\/$/,'');
const python=arg('python',process.env.PYTHON||'python');
const processAll=flag('all',false);
const writeProposed=flag('write-proposed',true);
const recursive=flag('recursive',false);
if(!existsSync(inputDir))throw new Error(`Input directory not found: ${inputDir}`);

const scriptDir=dirname(fileURLToPath(import.meta.url));
const extractor=resolve(scriptDir,'extract-pdf-text.py');
const ingestScript=resolve(scriptDir,'ingest-pdf-kf.mjs');
const runtimeRoot=resolve(process.cwd(),'runtime','legal-intake');
const statePath=resolve(runtimeRoot,'intake-state.v1.json');
const candidateDir=resolve(runtimeRoot,'candidates');
const extractDir=resolve(runtimeRoot,'extracts');
const registryPath=resolve(process.cwd(),'..','knowledge_base','domains','legal_ib','document_registry.v1.json');
await Promise.all([mkdir(candidateDir,{recursive:true}),mkdir(extractDir,{recursive:true})]);

async function listFiles(dir){
 const out=[];for(const entry of await readdir(dir,{withFileTypes:true})){const p=resolve(dir,entry.name);if(entry.isDirectory()&&recursive)out.push(...await listFiles(p));else if(entry.isFile()&&extname(entry.name).toLowerCase()==='.pdf')out.push(p);}return out.sort((a,b)=>a.localeCompare(b,'ru'));
}

let state=await jsonRead(statePath,{schema_version:'alina-download-intake-state-v1',root:inputDir,updated_at:null,files:{}});
if(state.root!==inputDir)state={schema_version:'alina-download-intake-state-v1',root:inputDir,updated_at:null,files:{}};

async function selectPending(){
 for(const path of await listFiles(inputDir)){
  const st=await stat(path);const signature=`${path}|${st.size}|${st.mtimeMs}`;const known=state.files[signature];if(!known||!['processed','duplicate','needs_review'].includes(known.status))return {path,st,signature};
 }
 return null;
}

async function promoteCandidate(candidate){
 if(!writeProposed)return {written:false,reason:'disabled'};
 if(!['legal_ib','standards_ib'].includes(candidate.identity.collection))return {written:false,reason:'outside legal_ib domain'};
 if(candidate.identity.needs_review||candidate.identity.title_confidence<0.9)return {written:false,reason:'identity requires review'};
 const registry=await jsonRead(registryPath,null);if(!registry||!Array.isArray(registry.documents))throw new Error(`Invalid legal registry: ${registryPath}`);
 const merged=mergeLegalCandidate(registry,candidate);
 if(merged.result.written)await jsonWrite(registryPath,merged.registry);
 return merged.result;
}

async function processOne(item){
 console.log(`\n[INTAKE] file: ${item.path}`);
 const sha=await sha256File(item.path);const key=sha.slice(0,16).toUpperCase();
 const priorByHash=Object.values(state.files).find(x=>x.sha256===sha&&['processed','needs_review','duplicate'].includes(x.status));
 if(priorByHash){state.files[item.signature]={status:'duplicate',path:item.path,sha256:sha,duplicate_of:priorByHash.path||null,source_id:priorByHash.source_id||null,capture_id:priorByHash.capture_id||null,updated_at:new Date().toISOString()};await jsonWrite(statePath,{...state,updated_at:new Date().toISOString()});console.log('[INTAKE] duplicate SHA-256; skipped.');return;}
 const extractPath=resolve(extractDir,`${key}.json`);
 if(!existsSync(extractPath)){
  const run=spawnSync(python,[extractor,'--input',item.path,'--output',extractPath],{stdio:'inherit'});if(run.error)throw run.error;if(run.status!==0)throw new Error(`PDF extraction failed: ${run.status}`);
 }
 const extracted=await jsonRead(extractPath,null);if(!extracted)throw new Error('Extract result missing.');
 const identity=identifyDocument(extracted,{filename:basename(item.path)});console.log(`[INTAKE] ${identitySummary(identity)}`);
 const sourceId=safeSourceId(identity,sha);const captureId=`CAP-${key}`;
 const ingestArgs=[ingestScript,'--input',item.path,'--base',base,'--python',python,'--language','ru','--source-type',sourceType(identity),'--title',identity.full_title,'--source-id',sourceId,'--capture-id',captureId];
 const ingest=spawnSync(process.execPath,ingestArgs,{encoding:'utf8',stdio:['ignore','pipe','pipe']});process.stdout.write(ingest.stdout||'');process.stderr.write(ingest.stderr||'');if(ingest.error)throw ingest.error;if(ingest.status!==0)throw new Error(`Knowledge Factory ingest failed: ${ingest.status}`);
 const actualSource=(ingest.stdout||'').match(/\[ALINA KF\] source_id:\s+(\S+)/)?.[1]||sourceId;
 const actualCapture=(ingest.stdout||'').match(/\[ALINA KF\] capture_id:\s+(\S+)/)?.[1]||captureId;
 const candidate={
  schema_version:'alina-legal-document-intake-candidate-v1',
  created_at:new Date().toISOString(),
  local:{path:item.path,filename:basename(item.path),size_bytes:item.st.size,mtime:new Date(item.st.mtimeMs).toISOString()},
  sha256:sha,source_id:actualSource,capture_id:actualCapture,identity,
  workflow:{status:identity.needs_review?'needs_review':'identified',next_stage:identity.legal_status==='pending_official_verification'?'official_status_verification':'structure_and_requirement_extraction'},
 };
 const candidatePath=resolve(candidateDir,`${key}.json`);await jsonWrite(candidatePath,candidate);
 const promotion=await promoteCandidate(candidate);candidate.workflow.registry_write=promotion;await jsonWrite(candidatePath,candidate);
 state.files[item.signature]={status:identity.needs_review?'needs_review':'processed',path:item.path,sha256:sha,source_id:actualSource,capture_id:actualCapture,full_title:identity.full_title,collection:identity.collection,candidate_path:candidatePath,registry_write:promotion,updated_at:new Date().toISOString()};
 await jsonWrite(statePath,{...state,updated_at:new Date().toISOString()});
 console.log(`[INTAKE] candidate: ${candidatePath}`);console.log(`[INTAKE] canonical registry: ${promotion.written?`${promotion.action||'written'} ${promotion.document_id}`:'not written · '+promotion.reason}`);console.log(`[INTAKE] next: ${candidate.workflow.next_stage}`);
}

let count=0;
while(true){const item=await selectPending();if(!item)break;await processOne(item);count++;if(!processAll)break;}
if(!count)console.log(`[INTAKE] No pending PDF files in ${inputDir}`);else console.log(`[INTAKE] processed sequentially: ${count}`);
