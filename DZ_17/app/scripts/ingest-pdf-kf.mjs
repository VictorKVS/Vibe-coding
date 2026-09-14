import {createHash,randomUUID} from 'node:crypto';
import {createReadStream,existsSync} from 'node:fs';
import {mkdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {basename,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import process from 'node:process';

function arg(name,fallback=''){
 const i=process.argv.indexOf(`--${name}`);
 return i>=0&&process.argv[i+1]?process.argv[i+1]:fallback;
}
function safeId(value,label){const v=String(value||'').trim();if(!v)return '';if(!/^[A-Za-z0-9._:-]+$/.test(v))throw new Error(`${label} contains unsupported characters: ${v}`);return v;}
async function sha256File(path){
 const hash=createHash('sha256');
 await new Promise((resolvePromise,reject)=>{
  const stream=createReadStream(path);
  stream.on('data',chunk=>hash.update(chunk));
  stream.on('error',reject);
  stream.on('end',resolvePromise);
 });
 return hash.digest('hex');
}
function cleanText(value){return String(value||'').replace(/\u0000/g,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');}

const inputRaw=arg('input');
if(!inputRaw)throw new Error('Use --input "C:\\path\\book.pdf"');
const input=resolve(inputRaw);
if(!existsSync(input))throw new Error(`PDF not found: ${input}`);

const base=(arg('base','http://localhost:3000')).replace(/\/$/,'');
const python=arg('python',process.env.PYTHON||'python');
const language=arg('language','en');
const sourceType=arg('source-type','book');
const title=arg('title',basename(input));
const traceId=arg('trace-id',`KF-CLI-${randomUUID()}`);
const testId=arg('test-id','');
const requestedSourceId=safeId(arg('source-id'),'source-id');
const requestedCaptureId=safeId(arg('capture-id'),'capture-id');
const scriptDir=dirname(fileURLToPath(import.meta.url));
const extractor=resolve(scriptDir,'extract-pdf-text.py');

async function traceMark(stage,action,status='info',details={}){
 console.log(`[TRACE] ${traceId} ${stage}/${action} ${status}`);
 try{
  await fetch(`${base}/api/v1/trace`,{
   method:'POST',
   headers:{'content-type':'application/json','x-trace-id':traceId},
   body:JSON.stringify({stage,action,status,test_id:testId||undefined,details}),
  });
 }catch{
  // Trace transport must never break the ingest itself.
 }
}

await traceMark('CLIENT','pdf.ingest.start','start',{file:basename(input),source_type:sourceType,language,requested_source_id:requestedSourceId||null});
await traceMark('CLIENT','pdf.hash.start','start');
const hash=await sha256File(input);
await traceMark('CLIENT','pdf.hash.complete','ok',{sha256_prefix:hash.slice(0,16)});
const key=hash.slice(0,16).toUpperCase();
const sourceId=requestedSourceId||`SRC-${key}`;
const captureId=requestedCaptureId||`CAP-${key}`;
const documentNodeId=`STN-${key}-DOC`;
const workDir=resolve('runtime','knowledge-factory-import');
const extractPath=resolve(workDir,`${key}.extract.json`);
await mkdir(workDir,{recursive:true});

if(!existsSync(extractPath)){
 await traceMark('A2','pdf.extract.start','start',{extractor:'pypdf'});
 const run=spawnSync(python,[extractor,'--input',input,'--output',extractPath],{stdio:'inherit'});
 if(run.error)throw run.error;
 if(run.status!==0){
  await traceMark('A2','pdf.extract.failed','error',{exit_code:run.status});
  throw new Error(`PDF extraction failed: exit ${run.status}`);
 }
 await traceMark('A2','pdf.extract.complete','ok');
}else{
 await traceMark('A2','pdf.extract.reuse','info',{extract_path:extractPath});
}
const extracted=JSON.parse(await readFile(extractPath,'utf8'));
if(!Array.isArray(extracted.pages)||!extracted.pages.length)throw new Error('Extractor returned no pages.');
await traceMark('A2','source-spans.build.start','start',{pages:extracted.pages.length});

const sourceSpans=extracted.pages.map(page=>{
 const pageNo=Number(page.page_number);
 const text=cleanText(page.text);
 return {
  span_id:`SPAN-${key}-P${String(pageNo).padStart(4,'0')}`,
  capture_id:captureId,
  structure_node_id:documentNodeId,
  page_from:pageNo,
  page_to:pageNo,
  char_from:0,
  char_to:text.length,
  text_hash:createHash('sha256').update(text,'utf8').digest('hex'),
  text_content:text,
  storage_ref:null,
  metadata:{
   extraction_error:page.extraction_error||null,
   chars:text.length,
   physical_unit:'pdf_page',
  },
 };
});
await traceMark('A2','source-spans.build.complete','ok',{source_spans:sourceSpans.length,nonempty_pages:extracted.nonempty_pages});

const bundle={
 schema_version:'alina-kf-ingest-v1',
 source:{
  source_id:sourceId,
  source_type:sourceType,
  canonical_uri:null,
  acquisition_uri:null,
  title,
  language,
  metadata:{
   local_source_name:basename(input),
   pdf_metadata:extracted.metadata||{},
   page_count:extracted.page_count,
   nonempty_pages:extracted.nonempty_pages,
  },
  status:'registered',
 },
 capture:{
  capture_id:captureId,
  source_id:sourceId,
  sha256:hash,
  mime_type:'application/pdf',
  size_bytes:null,
  storage_ref:input,
  parser_status:'page_text_extracted',
  security_status:'SECURITY_UNREVIEWED',
  metadata:{extractor:'pypdf',extract_schema:extracted.schema_version||null},
 },
 structure_nodes:[{
  structure_node_id:documentNodeId,
  capture_id:captureId,
  parent_id:null,
  node_type:'document',
  ordinal:0,
  label:title,
  page_from:1,
  page_to:Number(extracted.page_count)||sourceSpans.length,
  metadata:{structure_status:'RAW_PAGE_MAP_ONLY',next_stage:'A2_STRUCTURE_RECONSTRUCTION'},
 }],
 source_spans:sourceSpans,
 trace:{
  trace_id:traceId,
  test_id:testId||null,
  importer:'scripts/ingest-pdf-kf.mjs',
  input_sha256:hash,
  requested_source_id:requestedSourceId||null,
  note:'P0 stores page-addressable source spans. Chapter/section semantics are reconstructed in A2, not guessed here.',
 },
};

await traceMark('A1','api.kf.ingest.request','start',{source_id:sourceId,capture_id:captureId,source_spans:sourceSpans.length});
const response=await fetch(`${base}/api/v1/kf/ingest`,{
 method:'POST',
 headers:{'content-type':'application/json','x-trace-id':traceId},
 body:JSON.stringify(bundle),
});
const result=await response.json().catch(()=>({}));
if(!response.ok){
 await traceMark('A1','api.kf.ingest.response','error',{http_status:response.status,error:result?.error?.message||null});
 throw new Error(result?.error?.message||`HTTP ${response.status}`);
}
await traceMark('A1','api.kf.ingest.response','ok',{http_status:response.status,duplicate_capture:result.data.duplicate_capture});
console.log('\n[ALINA KF] ingest complete');
console.log(`[ALINA KF] trace_id:   ${traceId}`);
console.log(`[ALINA KF] source_id:  ${result.data.source_id}`);
console.log(`[ALINA KF] capture_id: ${result.data.capture_id}`);
console.log(`[ALINA KF] spans:      ${result.data.source_spans}`);
console.log(`[ALINA KF] duplicate:  ${result.data.duplicate_capture}`);
console.log(`[ALINA KF] source:     ${base}/api/v1/kf/trace?source_id=${encodeURIComponent(result.data.source_id)}`);
console.log(`[ALINA KF] runtime:    ${base}/api/v1/trace?trace_id=${encodeURIComponent(traceId)}`);
await traceMark('CLIENT','pdf.ingest.complete','ok',{source_id:result.data.source_id,capture_id:result.data.capture_id});
