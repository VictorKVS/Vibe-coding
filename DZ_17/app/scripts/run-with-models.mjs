import {existsSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
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
const presetRaw=(process.env.LLAMA_MODELS_PRESET||'').trim();
const modelsDir=isAbsolute(modelsRaw)?modelsRaw:resolve(cwd,modelsRaw);
const modelsPreset=presetRaw?(isAbsolute(presetRaw)?presetRaw:resolve(cwd,presetRaw)):'';
const modelsMax=process.env.LLAMA_MODELS_MAX||'1';
const modelsAutoload=(process.env.LLAMA_MODELS_AUTOLOAD||'1')!=='0';
const ctx=process.env.LLAMA_CTX_SIZE||'8192';
const parallel=process.env.LLAMA_PARALLEL||'1';
const gpuLayers=process.env.LLAMA_GPU_LAYERS||'99';

const kfHost=process.env.KF_SIDECAR_HOST||'127.0.0.1';
const kfPort=process.env.KF_SIDECAR_PORT||'8791';
const kfBase=process.env.KF_SIDECAR_BASE_URL||`http://${kfHost}:${kfPort}`;
const kfScript=resolve(cwd,'scripts','knowledge-factory-sidecar.mjs');

function commandFromPath(name){
 try{
  const finder=process.platform==='win32'?'where.exe':'which';
  const r=spawnSync(finder,[name],{encoding:'utf8',windowsHide:true});
  if(r.status===0){const first=String(r.stdout||'').split(/\r?\n/).map(x=>x.trim()).find(Boolean);if(first)return first;}
 }catch{}
 return '';
}
function resolveLlamaServer(){
 const explicit=isAbsolute(binRaw)?binRaw:resolve(cwd,binRaw);
 if(existsSync(explicit))return explicit;
 const requestedName=binRaw.includes('/')||binRaw.includes('\\')?'':binRaw;
 if(requestedName){const found=commandFromPath(requestedName);if(found)return found;}
 const fallback=commandFromPath(process.platform==='win32'?'llama-server.exe':'llama-server');
 return fallback||explicit;
}
const bin=resolveLlamaServer();

const nodeMajor=Number(process.versions.node.split('.')[0]||0);
if(nodeMajor!==22){
 console.warn(`[ALINA] Внимание: проект проверен на Node 22.x, сейчас ${process.version}.`);
 console.warn('[ALINA] Если Vite/vinext/workerd ведут себя нестабильно, переключитесь на Node 22 LTS.');
}

let llama=null;
let kf=null;
let app=null;
let stopping=false;

async function endpointHealthy(url){try{const r=await fetch(url);return r.ok;}catch{return false;}}
async function waitHealthy(url,ms=60000){
 const end=Date.now()+ms;
 while(Date.now()<end){if(await endpointHealthy(url))return true;await new Promise(r=>setTimeout(r,500));}
 return false;
}
function stop(){
 if(stopping)return;stopping=true;
 try{app?.kill();}catch{}
 try{llama?.kill();}catch{}
 try{kf?.kill();}catch{}
 setTimeout(()=>process.exit(),250);
}
process.on('SIGINT',stop);
process.on('SIGTERM',stop);

if(await endpointHealthy(`${kfBase.replace(/\/$/,'')}/health`)){
 console.log(`[ALINA] Knowledge Factory sidecar уже работает: ${kfBase}`);
}else{
 console.log(`[ALINA] запускаю Knowledge Factory sidecar: ${kfBase}`);
 kf=spawn(process.execPath,[kfScript],{
  cwd,
  stdio:'inherit',
  env:{...process.env,KF_SIDECAR_HOST:kfHost,KF_SIDECAR_PORT:String(kfPort),KF_SIDECAR_BASE_URL:kfBase},
  windowsHide:false,
 });
 kf.on('error',error=>console.error(`[ALINA] Не удалось запустить Knowledge Factory sidecar: ${error.message}`));
 kf.on('exit',code=>{if(!stopping)console.warn(`[ALINA] Knowledge Factory sidecar завершился, code=${code}`);});
 if(await waitHealthy(`${kfBase.replace(/\/$/,'')}/health`,15000))console.log(`[ALINA] Knowledge Factory sidecar ready: ${kfBase}`);
 else console.warn('[ALINA] Knowledge Factory sidecar не перешёл в ready; KF API вернёт 503 вместо скрытой 500 ошибки.');
}

if(await endpointHealthy(`${base.replace(/\/$/,'')}/health`)){
 console.log(`[ALINA] llama.cpp router уже работает: ${base}`);
}else if(autostart){
 if(!existsSync(bin)){
  console.warn(`[ALINA] llama-server не найден: ${bin}`);
  console.warn('[ALINA] На Windows можно установить через: winget install llama.cpp');
  console.warn('[ALINA] После установки launcher найдёт llama-server.exe через PATH.');
  console.warn('[ALINA] Приложение запустится без локальных моделей; GigaChat и другие настроенные providers останутся доступны.');
 }else if(modelsPreset&&!existsSync(modelsPreset)){
  console.warn(`[ALINA] Preset локального model zoo не найден: ${modelsPreset}`);
  console.warn('[ALINA] Запустите scripts/configure-existing-model-zoo.ps1 или исправьте LLAMA_MODELS_PRESET.');
 }else if(!modelsPreset&&!existsSync(modelsDir)){
  console.warn(`[ALINA] Каталог моделей не найден: ${modelsDir}`);
  console.warn('[ALINA] Укажите LLAMA_MODELS_PRESET для внешнего model zoo либо создайте LLAMA_MODELS_DIR.');
 }else{
  const sourceArgs=modelsPreset?['--models-preset',modelsPreset]:['--models-dir',modelsDir];
  const args=[...sourceArgs,'--models-max',modelsMax,modelsAutoload?'--models-autoload':'--no-models-autoload','--host',host,'--port',port,'-c',ctx,'-np',parallel,'-ngl',gpuLayers];
  console.log(`[ALINA] запускаю llama.cpp router: ${bin}`);
  if(modelsPreset)console.log(`[ALINA] model preset: ${modelsPreset}`);else console.log(`[ALINA] models dir: ${modelsDir}`);
  console.log(`[ALINA] models max in memory: ${modelsMax}`);
  llama=spawn(bin,args,{cwd,stdio:'inherit',windowsHide:false});
  llama.on('error',error=>console.error(`[ALINA] Не удалось запустить llama.cpp: ${error.message}`));
  llama.on('exit',code=>{if(!stopping)console.warn(`[ALINA] llama.cpp router завершился, code=${code}`);});
  if(await waitHealthy(`${base.replace(/\/$/,'')}/health`))console.log(`[ALINA] LOCAL model zoo ready: ${base}`);
  else console.warn('[ALINA] llama.cpp не успел перейти в ready; UI всё равно запустится и покажет доступные внешние модели.');
 }
}else{
 console.log('[ALINA] LLAMA_AUTOSTART=0 — локальный router не запускается автоматически.');
}

// Windows Node 24+ может возвращать spawn EINVAL при прямом запуске npm.cmd.
// Через системный cmd.exe npm запускается одинаково на Node 22/24 и корректно работает
// в каталогах с пробелами, например G:\\1\\Vibe coding\\....
if(process.platform==='win32'){
 const comspec=process.env.ComSpec||process.env.COMSPEC||'cmd.exe';
 app=spawn(comspec,['/d','/s','/c',`npm run ${mode}`],{cwd,stdio:'inherit',env:{...process.env,KF_SIDECAR_BASE_URL:kfBase},windowsHide:false});
}else{
 app=spawn('npm',['run',mode],{cwd,stdio:'inherit',env:{...process.env,KF_SIDECAR_BASE_URL:kfBase},windowsHide:false});
}
app.on('error',error=>{
 console.error(`[ALINA] Не удалось запустить приложение: ${error.message}`);
 try{llama?.kill();}catch{}
 try{kf?.kill();}catch{}
 process.exitCode=1;
});
app.on('exit',code=>{try{llama?.kill();}catch{}try{kf?.kill();}catch{}process.exit(code??0);});
