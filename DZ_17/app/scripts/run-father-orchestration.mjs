import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import process from 'node:process';

function arg(name,fallback=''){
 const i=process.argv.indexOf(`--${name}`);
 return i>=0&&process.argv[i+1]?process.argv[i+1]:fallback;
}
function now(){return new Date().toISOString();}
const sourceId=arg('source-id');
if(!sourceId)throw new Error('Use --source-id SRC-...');
const base=arg('base','http://localhost:3000').replace(/\/$/,'');
const runId=`FATHER-RUN-${randomUUID()}`;
const outputDir=resolve(process.cwd(),'runtime','knowledge-factory','father-runs');
const started=Date.now();

async function marker(stage,action,status='info',details={}){
 try{
  await fetch(`${base}/api/v1/trace`,{
   method:'POST',
   headers:{'content-type':'application/json','x-trace-id':runId},
   body:JSON.stringify({stage,action,status,details}),
  });
 }catch{}
 console.log(`[TRACE] ${runId} ${stage}/${action} ${status}`);
}

async function getJson(url){
 const response=await fetch(url,{headers:{'x-trace-id':runId}});
 const payload=await response.json().catch(()=>({}));
 return {response,payload};
}

async function runNode(script,args=[]){
 return await new Promise((resolvePromise,reject)=>{
  const child=spawn(process.execPath,[script,...args],{cwd:process.cwd(),stdio:['ignore','pipe','pipe'],env:{...process.env}});
  let stdout='';let stderr='';
  child.stdout.on('data',d=>{const s=String(d);stdout+=s;process.stdout.write(s);});
  child.stderr.on('data',d=>{const s=String(d);stderr+=s;process.stderr.write(s);});
  child.on('error',reject);
  child.on('exit',code=>resolvePromise({code:code??0,stdout,stderr}));
 });
}

const stages=[];
function stage(id,name,status,details={}){stages.push({id,name,status,at:now(),details});}

await marker('FATHER','run.start','start',{source_id:sourceId,pipeline:'FATHER-ANALYST-PIPELINE-v1'});

// K1/K2: verify already-ingested Source/Capture/SourceSpan.
await marker('K1','source.verify','start',{source_id:sourceId});
const sourceRead=await getJson(`${base}/api/v1/kf/trace?source_id=${encodeURIComponent(sourceId)}`);
if(!sourceRead.response.ok)throw new Error(sourceRead.payload?.error?.message||`Source trace HTTP ${sourceRead.response.status}`);
const source=sourceRead.payload.data?.source||{};
const captures=Array.isArray(sourceRead.payload.data?.captures)?sourceRead.payload.data.captures:[];
if(!captures.length)throw new Error(`No captures for ${sourceId}`);
const selected=captures.at(-1);
const captureId=selected.capture?.capture_id;
const spans=Array.isArray(selected.source_spans)?selected.source_spans:[];
if(!captureId)throw new Error('capture_id missing');
stage('K1','register_provenance','READY',{source_id:sourceId,capture_id:captureId,security_status:selected.capture?.security_status||null});
stage('K2','read_parse',spans.length?'READY':'BLOCKED',{source_spans:spans.length,parser_status:selected.capture?.parser_status||null});
await marker('K1','source.verify','ok',{capture_id:captureId,source_spans:spans.length});

// K3: language/translation decision. Original remains canonical.
const language=String(source.language||selected.capture?.metadata?.language||'unknown').toLowerCase();
const translationRequired=language!=='ru'&&language!=='ru-ru'&&language!=='russian';
stage('K3','language_translation_gate',translationRequired?'TRANSLATION_PROJECTION_RECOMMENDED':'NOT_REQUIRED',{
 source_language:language,
 original_preserved:true,
 analysis_can_continue_on_original:true,
 translator_role:'ROLE-TRANSLATOR',
});

// K4: ensure a structure proposal exists; run the deterministic A2 reconstructor if absent.
await marker('K4','structure.ensure','start',{capture_id:captureId});
let structureRead=await getJson(`${base}/api/v1/kf/structure?capture_id=${encodeURIComponent(captureId)}`);
if(structureRead.response.status===404){
 const result=await runNode(resolve(process.cwd(),'scripts','reconstruct-book-structure.mjs'),['--source-id',sourceId,'--base',base]);
 if(result.code!==0)throw new Error(`A2 reconstruction failed with code ${result.code}`);
 structureRead=await getJson(`${base}/api/v1/kf/structure?capture_id=${encodeURIComponent(captureId)}`);
}
if(!structureRead.response.ok)throw new Error(structureRead.payload?.error?.message||`Structure HTTP ${structureRead.response.status}`);
const structure=structureRead.payload.data||{};
const structureNodes=Array.isArray(structure.nodes)?structure.nodes:[];
stage('K4','structure_reconstruction','PROPOSED',{nodes:structureNodes.length,status:structure.status||null,origin_class:structure.origin_class||null});
await marker('K4','structure.ensure','ok',{nodes:structureNodes.length});

// Five-stream readiness run over current persisted state.
await marker('PAR5','five_stream.start','start',{source_id:sourceId});
const par5=await runNode(resolve(process.cwd(),'scripts','run-kf-5-streams.mjs'),['--source-id',sourceId,'--base',base]);
stage('PAR5','five_stream_readiness',par5.code===0?'READY':'PARTIAL',{exit_code:par5.code});
await marker('PAR5','five_stream.complete',par5.code===0?'ok':'error',{exit_code:par5.code});

// Downstream semantic/algorithm stages are designed but intentionally not faked.
for(const [id,name] of [
 ['K5','idea_detection'],
 ['K6','idea_boundary_segmentation'],
 ['K7','knowledge_classification'],
 ['K8','method_algorithm_engineering'],
 ['K9','scenario_engineering'],
 ['K10','realization_conditions'],
 ['K11','validation'],
 ['K12','synthesis_changeset'],
 ['K13','review_publish'],
])stage(id,name,'DESIGNED_NOT_IMPLEMENTED',{reason:'Executable runtime for this stage is the next implementation increment; no fake result produced.'});

const report={
 schema_version:'father-orchestration-run-v1',
 pipeline_id:'FATHER-ANALYST-PIPELINE-v1',
 run_id:runId,
 source_id:sourceId,
 capture_id:captureId,
 created_at:now(),
 total_duration_ms:Date.now()-started,
 translation_required_for_ru_projection:translationRequired,
 stages,
 next_executable_stage:'K5_idea_detection',
 safety:{canonical_auto_publish:false,original_preserved:true,structure_is_proposal:true},
};
await mkdir(outputDir,{recursive:true});
const out=resolve(outputDir,`${runId}.json`);
await writeFile(out,JSON.stringify(report,null,2)+'\n','utf8');
await marker('FATHER','run.complete','ok',{output:out,next_executable_stage:report.next_executable_stage});

console.log('\n[FATHER] orchestration pass complete');
console.log(`[FATHER] run_id:     ${runId}`);
console.log(`[FATHER] source_id:  ${sourceId}`);
console.log(`[FATHER] capture_id: ${captureId}`);
console.log(`[FATHER] spans:      ${spans.length}`);
console.log(`[FATHER] structure:  ${structureNodes.length} proposed nodes`);
console.log(`[FATHER] translation projection recommended: ${translationRequired}`);
console.log(`[FATHER] next:       K5 idea detection`);
console.log(`[FATHER] report:     ${out}`);
console.log(`[FATHER] trace:      ${base}/api/v1/trace?trace_id=${encodeURIComponent(runId)}`);
