import {appendFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {basename,dirname,extname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import process from 'node:process';

function arg(name,fallback=''){
 const i=process.argv.indexOf(`--${name}`);
 return i>=0&&process.argv[i+1]?process.argv[i+1]:fallback;
}
function numberArg(name,fallback){const n=Number(arg(name,''));return Number.isFinite(n)&&n>0?n:fallback;}
function slug(value){return value.toLowerCase().replace(/\.[^.]+$/,'').replace(/[^a-z0-9а-яё]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,90)||'book';}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function allMatches(text,re){return Array.from(text.matchAll(re)).map(m=>m[0]);}
function multisetEqual(a,b){
 const count=x=>x.reduce((m,v)=>(m.set(v,(m.get(v)||0)+1),m),new Map());
 const A=count(a),B=count(b);if(A.size!==B.size)return false;
 for(const [k,v] of A)if(B.get(k)!==v)return false;return true;
}
function preservationChecks(source,target){
 const sourceNumbers=allMatches(source,/(?<![\p{L}\p{N}_])[-+]?\d+(?:[.,]\d+)?%?/gu);
 const targetNumbers=allMatches(target,/(?<![\p{L}\p{N}_])[-+]?\d+(?:[.,]\d+)?%?/gu);
 const sourceUrls=allMatches(source,/https?:\/\/[^\s)\]}>,]+/gi);
 const targetUrls=allMatches(target,/https?:\/\/[^\s)\]}>,]+/gi);
 return {
  numbers_preserved:multisetEqual(sourceNumbers,targetNumbers),
  urls_preserved:multisetEqual(sourceUrls,targetUrls),
  source_numbers:sourceNumbers,
  target_numbers:targetNumbers,
  source_urls:sourceUrls,
  target_urls:targetUrls,
  source_chars:source.length,
  target_chars:target.length,
  length_ratio:source.length?Number((target.length/source.length).toFixed(3)):null,
 };
}
function cleanPageText(text){
 return String(text||'')
  .replace(/\u0000/g,'')
  .replace(/-\n(?=[a-z])/g,'')
  .replace(/(?<!\n)\n(?!\n)/g,' ')
  .replace(/[ \t]+/g,' ')
  .replace(/\n{3,}/g,'\n\n')
  .trim();
}
function splitOversizeParagraph(text,maxChars){
 if(text.length<=maxChars)return [text];
 const parts=[];let rest=text;
 while(rest.length>maxChars){
  let cut=rest.lastIndexOf('. ',maxChars);
  if(cut<maxChars*0.55)cut=rest.lastIndexOf(' ',maxChars);
  if(cut<1)cut=maxChars;
  parts.push(rest.slice(0,cut+1).trim());rest=rest.slice(cut+1).trim();
 }
 if(rest)parts.push(rest);return parts;
}
function buildChunks(pages,maxChars){
 const chunks=[];let seq=0;
 for(const page of pages){
  const cleaned=cleanPageText(page.text);
  if(!cleaned)continue;
  const paragraphs=cleaned.split(/\n\s*\n/).flatMap(p=>splitOversizeParagraph(p.trim(),maxChars)).filter(Boolean);
  let buf='';let part=0;
  const flush=()=>{if(!buf.trim())return;part+=1;seq+=1;chunks.push({chunk_id:`p${page.page_number}-c${part}`,sequence:seq,page_start:page.page_number,page_end:page.page_number,source:buf.trim()});buf='';};
  for(const p of paragraphs){
   const next=buf?`${buf}\n\n${p}`:p;
   if(next.length>maxChars&&buf)flush();
   buf=buf?`${buf}\n\n${p}`:p;
  }
  flush();
 }
 return chunks;
}
async function fetchJson(url,options){
 const r=await fetch(url,options);const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data?.error||`HTTP ${r.status}`);return data;
}
async function readJsonl(path){
 if(!existsSync(path))return [];
 return (await readFile(path,'utf8')).split(/\r?\n/).filter(Boolean).map(line=>{try{return JSON.parse(line)}catch{return null}}).filter(Boolean);
}
async function writeMarkdown(path,title,chunks,records){
 const byId=new Map(records.filter(r=>r.status==='ok').map(r=>[r.chunk_id,r]));
 const out=[`# ${title}`,'',`Перевод ALINA Translator. Режим: ${mode}. Домен: ${domain}.`,''];
 for(const chunk of chunks){
  const r=byId.get(chunk.chunk_id);if(!r)continue;
  out.push(`## Страница ${chunk.page_start}${chunk.page_end!==chunk.page_start?`-${chunk.page_end}`:''} · ${chunk.chunk_id}`,'',r.translation.trim(),'');
 }
 await writeFile(path,out.join('\n')+'\n','utf8');
}

const inputRaw=arg('input');
if(!inputRaw)throw new Error('Use --input "C:\\path\\book.pdf"');
const input=resolve(inputRaw);
if(!existsSync(input))throw new Error(`PDF not found: ${input}`);
if(extname(input).toLowerCase()!=='.pdf')throw new Error('Input must be a PDF file.');

const base=(arg('base','http://localhost:3000')).replace(/\/$/,'');
const selection=arg('selection','auto');
const mode=arg('mode','reader');
const domain=arg('domain','general');
const sourceLanguage=arg('source-language','en');
const targetLanguage=arg('target-language','ru');
const maxChars=numberArg('chunk-chars',5200);
const retries=numberArg('retries',3);
const maxChunks=Number(arg('max-chunks','0'))||0;
const python=arg('python',process.env.PYTHON||'python');
const sourceName=basename(input);
const bookSlug=slug(sourceName);
const outDir=resolve(arg('out',`runtime/translations/${bookSlug}`));
const extractPath=resolve(outDir,'source.extract.json');
const progressPath=resolve(outDir,'translation.progress.jsonl');
const markdownPath=resolve(outDir,'translation.ru.md');
const manifestPath=resolve(outDir,'manifest.json');
const scriptDir=dirname(fileURLToPath(import.meta.url));
const extractor=resolve(scriptDir,'extract-pdf-text.py');

await mkdir(outDir,{recursive:true});
console.log(`[ALINA BOOK] source: ${input}`);
console.log(`[ALINA BOOK] out:    ${outDir}`);
console.log(`[ALINA BOOK] route:  ${selection}`);
console.log(`[ALINA BOOK] mode:   ${mode}; domain=${domain}; ${sourceLanguage}->${targetLanguage}`);

if(!existsSync(extractPath)){
 const py=spawnSync(python,[extractor,'--input',input,'--output',extractPath],{stdio:'inherit',encoding:'utf8'});
 if(py.error)throw py.error;
 if(py.status!==0)throw new Error(`PDF extraction failed, exit=${py.status}`);
}else console.log(`[ALINA BOOK] reuse extract: ${extractPath}`);

const extracted=JSON.parse(await readFile(extractPath,'utf8'));
if(!Array.isArray(extracted.pages)||!extracted.pages.length)throw new Error('PDF extractor returned no pages.');
if(!extracted.nonempty_pages)throw new Error('No text extracted. This PDF likely requires OCR before translation.');
let chunks=buildChunks(extracted.pages,maxChars);
if(maxChunks>0)chunks=chunks.slice(0,maxChunks);
console.log(`[ALINA BOOK] pages=${extracted.page_count}; text_pages=${extracted.nonempty_pages}; chunks=${chunks.length}`);

const catalog=await fetchJson(`${base}/api/llm`);
if(!Array.isArray(catalog.models))throw new Error('Model catalog unavailable.');
if(selection!=='auto'&&!catalog.models.some(m=>m.id===selection))throw new Error(`Unknown model selection: ${selection}`);

let records=await readJsonl(progressPath);
const done=new Set(records.filter(r=>r.status==='ok').map(r=>r.chunk_id));
console.log(`[ALINA BOOK] resume: ${done.size}/${chunks.length} already translated`);

for(const chunk of chunks){
 if(done.has(chunk.chunk_id))continue;
 const started=Date.now();let lastError=null;let response=null;
 for(let attempt=1;attempt<=retries;attempt++){
  try{
   response=await fetchJson(`${base}/api/llm`,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({
     task:'translation',selection,
     messages:[{role:'user',content:chunk.source}],
     context:{
      sourceLanguage,targetLanguage,translationMode:mode,domain,
      sourceRef:`${sourceName}#page=${chunk.page_start};chunk=${chunk.chunk_id}`,
      documentTitle:sourceName,
     },
    }),
   });
   break;
  }catch(error){
   lastError=error;console.warn(`[ALINA BOOK] ${chunk.chunk_id} attempt ${attempt}/${retries}: ${error instanceof Error?error.message:String(error)}`);
   if(attempt<retries)await sleep(1000*attempt);
  }
 }
 let record;
 if(response){
  const translation=String(response.text||'').trim();
  record={schema_version:'alina-book-translation-record-v1',status:'ok',chunk_id:chunk.chunk_id,sequence:chunk.sequence,page_start:chunk.page_start,page_end:chunk.page_end,source:chunk.source,translation,requested_selection:selection,actual_selection:response.selection,provider:response.provider,model:response.model,latency_ms:response.latencyMs??Date.now()-started,prompt_id:response.promptId,policy_version:response.policyVersion,translation_rag:response.translationRag||null,checks:preservationChecks(chunk.source,translation),translated_at:new Date().toISOString()};
  done.add(chunk.chunk_id);
  console.log(`[ALINA BOOK] ${chunk.chunk_id} -> ${response.model} | ${record.latency_ms} ms | ${translation.length} chars`);
 }else{
  record={schema_version:'alina-book-translation-record-v1',status:'error',chunk_id:chunk.chunk_id,sequence:chunk.sequence,page_start:chunk.page_start,page_end:chunk.page_end,source:chunk.source,translation:'',requested_selection:selection,error:lastError instanceof Error?lastError.message:String(lastError),translated_at:new Date().toISOString()};
 }
 await appendFile(progressPath,JSON.stringify(record)+'\n','utf8');
 records.push(record);
 await writeMarkdown(markdownPath,sourceName,chunks,records);
 if(record.status==='error')throw new Error(`Translation stopped at ${chunk.chunk_id}: ${record.error}. Re-run the same command to resume.`);
}

records=await readJsonl(progressPath);
await writeMarkdown(markdownPath,sourceName,chunks,records);
const ok=records.filter(r=>r.status==='ok'&&chunks.some(c=>c.chunk_id===r.chunk_id));
const issueCount=ok.filter(r=>!r.checks?.numbers_preserved||!r.checks?.urls_preserved).length;
const modelCounts=Object.fromEntries(Array.from(new Set(ok.map(r=>r.model))).filter(Boolean).map(model=>[model,ok.filter(r=>r.model===model).length]));
const manifest={schema_version:'alina-book-translation-manifest-v1',source_path:input,source_name:sourceName,source_page_count:extracted.page_count,text_page_count:extracted.nonempty_pages,source_language:sourceLanguage,target_language:targetLanguage,mode,domain,requested_selection:selection,chunk_chars:maxChars,total_chunks:chunks.length,translated_chunks:ok.length,preservation_warning_chunks:issueCount,model_counts:modelCounts,outputs:{extract:extractPath,progress:progressPath,markdown:markdownPath},completed:ok.length===chunks.length,updated_at:new Date().toISOString()};
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n','utf8');
console.log(`\n[ALINA BOOK] translated ${ok.length}/${chunks.length}`);
console.log(`[ALINA BOOK] markdown: ${markdownPath}`);
console.log(`[ALINA BOOK] manifest: ${manifestPath}`);
if(issueCount)console.warn(`[ALINA BOOK] ${issueCount} chunks need preservation review (numbers/URLs).`);
