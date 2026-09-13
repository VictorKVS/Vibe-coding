import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {resolve,isAbsolute} from 'node:path';
import process from 'node:process';

const cwd=process.cwd();
const envFile=resolve(cwd,'.env.local');
if(existsSync(envFile)&&typeof process.loadEnvFile==='function')process.loadEnvFile(envFile);

const mode=process.argv[2]==='start'?'start':'dev';
const host=process.env.LLAMA_HOST||'127.0.0.1';
const port=process.env.LLAMA_PORT||'8081';
const base=process.env.LLAMA_BASE_URL||`http://${host}:${port}`;
const autostart=(process.env.LLAMA_AUTOSTART||'1')!=='0';
const binRaw=process.env.LLAMA_SERVER_BIN||'runtime/llama/llama-server.exe';
const modelsRaw=process.env.LLAMA_MODELS_DIR||'models';
const bin=isAbsolute(binRaw)?binRaw:resolve(cwd,binRaw);
const modelsDir=isAbsolute(modelsRaw)?modelsRaw:resolve(cwd,modelsRaw);
const ctx=process.env.LLAMA_CTX_SIZE||'8192';
const parallel=process.env.LLAMA_PARALLEL||'1';
const gpuLayers=process.env.LLAMA_GPU_LAYERS||'99';

let llama=null;
let app=null;
let stopping=false;

async function healthy(){
 try{const r=await fetch(`${base.replace(/\/$/,'')}/health`);return r.ok;}catch{return false;}
}
async function waitHealthy(ms=60000){
 const end=Date.now()+ms;
 while(Date.now()<end){if(await healthy())return true;await new Promise(r=>setTimeout(r,750));}
 return false;
}
function stop(){
 if(stopping)return;stopping=true;
 try{app?.kill();}catch{}
 try{llama?.kill();}catch{}
 setTimeout(()=>process.exit(),250);
}
process.on('SIGINT',stop);
process.on('SIGTERM',stop);

if(await healthy()){
 console.log(`[ALINA] llama.cpp router уже работает: ${base}`);
}else if(autostart){
 if(!existsSync(bin)){
  console.warn(`[ALINA] llama-server не найден: ${bin}`);
  console.warn('[ALINA] Приложение запустится без локальных моделей; GigaChat и другие настроенные providers останутся доступны.');
 }else if(!existsSync(modelsDir)){
  console.warn(`[ALINA] Каталог моделей не найден: ${modelsDir}`);
  console.warn('[ALINA] Создайте каталог и положите туда GGUF-модели. Приложение пока запустится без LOCAL моделей.');
 }else{
  console.log(`[ALINA] запускаю llama.cpp router: ${bin}`);
  console.log(`[ALINA] models: ${modelsDir}`);
  llama=spawn(bin,['--models-dir',modelsDir,'--host',host,'--port',port,'-c',ctx,'-np',parallel,'-ngl',gpuLayers],{cwd,stdio:'inherit',windowsHide:false});
  llama.on('exit',code=>{if(!stopping)console.warn(`[ALINA] llama.cpp router завершился, code=${code}`);});
  if(await waitHealthy())console.log(`[ALINA] LOCAL models ready: ${base}`);else console.warn('[ALINA] llama.cpp не успел перейти в ready; UI всё равно запустится и покажет доступные внешние модели.');
 }
}else{
 console.log('[ALINA] LLAMA_AUTOSTART=0 — локальный router не запускается автоматически.');
}

const npm=process.platform==='win32'?'npm.cmd':'npm';
app=spawn(npm,['run',mode],{cwd,stdio:'inherit',env:{...process.env},windowsHide:false});
app.on('exit',code=>{try{llama?.kill();}catch{}process.exit(code??0);});
