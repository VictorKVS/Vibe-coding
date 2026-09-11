type Task='dialogue'|'synthesis'|'architecture'|'vision'|'kb_extract'|'kb_validate';
type Message={role:'user'|'assistant';content:string};
type ImageInput={dataUrl:string;name?:string};
type RequestBody={selection?:string;task?:Task;messages?:Message[];context?:Record<string,unknown>;images?:ImageInput[]};
type ModelItem={id:string;provider:string;model:string;label:string;available:boolean;note:string;capabilities:Task[]};
type Provider='openai'|'compatible'|'ollama'|'demo';

const OPENAI_DEFAULTS=['gpt-5.6-luna','gpt-5.6-terra','gpt-5.6-sol'];
const TEXT_TASKS:Task[]=['dialogue','synthesis','architecture','kb_extract','kb_validate'];
const BASE_SYSTEM=`Ты — Алина, AI-продюсер и аналитик проекта «Дикие идеи → в деньги». Отвечай по-русски, кратко и предметно. Ты помогаешь человеку проектировать историю и базу знаний, но не утверждаешь канон без подтверждения автора. Разделяй факты, наблюдения, интерпретации и гипотезы. Не обещай коммерческий успех. При работе с изображением сначала опиши только наблюдаемые признаки, затем отдельно объясни, как они могут быть использованы в творческой задаче. Не выдумывай детали, которых не видно на изображении.`;
const KB_EXTRACT_SYSTEM=`${BASE_SYSTEM}\n\nРЕЖИМ: KNOWLEDGE BASE ANALYST. Разложи пользовательскую идею в черновик структурированной базы знаний. Возвращай ТОЛЬКО валидный JSON без markdown и пояснений вокруг него. Все автоматически извлечённые элементы имеют status="proposed". Не создавай канонические факты, которых пользователь не сообщил. Если данных недостаточно, помещай вопрос в open_questions. JSON schema: {"schema_version":"alina-kb-v1","project":{"title":string,"kind":"standalone"|"series"|"spin_off"|"prequel"|"parallel"|"adaptation"|"unknown","universe_relation":{"mode":"new"|"existing"|"unknown","name":string|null},"summary":string},"entities":[{"temp_id":string,"type":"character"|"location"|"organization"|"artifact"|"event"|"concept","name":string,"description":string,"status":"proposed"}],"facts":[{"subject":string,"predicate":string,"object":string,"scope":"universe"|"series"|"project"|"scene"|"unknown","status":"proposed","confidence":number,"source":"user_input"}],"relationships":[{"from":string,"type":string,"to":string,"status":"proposed"}],"timeline":[{"event":string,"time":string|null,"order_hint":number|null,"status":"proposed"}],"knowledge_states":[{"character":string,"knowledge":string,"state":"knows"|"believes"|"rumor"|"secret"|"unknown","status":"proposed"}],"plot_threads":[{"name":string,"description":string,"status":"proposed"}],"visual_requirements":[{"subject":string,"requirement":string,"status":"proposed"}],"open_questions":[string],"conflicts":[string]}.`;
const KB_VALIDATE_SYSTEM=`${BASE_SYSTEM}\n\nРЕЖИМ: KB VALIDATOR. Пользователь передаст JSON-черновик базы знаний. Проверь внутренние противоречия, недостаточную трассируемость, смешение фактов и интерпретаций, неоднозначные сущности и пропущенные связи. Возвращай ТОЛЬКО JSON: {"schema_version":"alina-kb-validation-v1","valid":boolean,"issues":[{"severity":"low"|"medium"|"high","path":string,"message":string}],"recommended_changes":[string],"open_questions":[string]}. Не меняй канон самостоятельно.`;

function env(name:string){return process.env[name]?.trim()||'';}
function list(value:string,fallback:string[]=[]){return (value?value.split(','):fallback).map(x=>x.trim()).filter(Boolean);}
function openAIModels(){return list(env('OPENAI_MODELS'),OPENAI_DEFAULTS);}
function compatibleModels(){return list(env('COMPATIBLE_MODELS'));}
function ollamaModels(){return list(env('OLLAMA_MODELS'));}
function providerModels(provider:Provider){return provider==='openai'?openAIModels():provider==='compatible'?compatibleModels():provider==='ollama'?ollamaModels():['demo'];}
function configured(provider:Provider){
 if(provider==='openai')return Boolean(env('OPENAI_API_KEY'));
 if(provider==='compatible')return Boolean(env('COMPATIBLE_BASE_URL')&&compatibleModels().length);
 if(provider==='ollama')return Boolean(ollamaModels().length);
 return true;
}
function prefix(provider:Provider){return provider==='openai'?'OPENAI':provider==='compatible'?'COMPATIBLE':provider==='ollama'?'OLLAMA':'DEMO';}
function explicitModel(provider:Provider,task:Task){
 const p=prefix(provider);
 if(task==='dialogue')return env(`${p}_DIALOGUE_MODEL`);
 if(task==='synthesis')return env(`${p}_SYNTHESIS_MODEL`);
 if(task==='architecture')return env(`${p}_ARCHITECTURE_MODEL`);
 if(task==='vision')return env(`${p}_VISION_MODEL`);
 if(task==='kb_extract')return env(`${p}_KB_MODEL`)||env(`${p}_SYNTHESIS_MODEL`);
 if(task==='kb_validate')return env(`${p}_KB_VALIDATE_MODEL`)||env(`${p}_ARCHITECTURE_MODEL`)||env(`${p}_KB_MODEL`);
 return '';
}
function defaultPreferred(provider:Provider,task:Task){
 if(provider!=='openai')return '';
 if(task==='architecture'||task==='kb_validate')return 'gpt-5.6-sol';
 if(task==='synthesis'||task==='kb_extract')return 'gpt-5.6-terra';
 if(task==='dialogue')return 'gpt-5.6-luna';
 return '';
}
function preferredModel(models:string[],preferred:string){return preferred&&models.includes(preferred)?preferred:models[0]||'';}
function modelFor(provider:Provider,task:Task){
 if(provider==='demo')return 'demo';
 const models=providerModels(provider);
 if(task==='vision'){
  const vision=explicitModel(provider,'vision');
  return vision&&models.includes(vision)?vision:'';
 }
 return preferredModel(models,explicitModel(provider,task)||defaultPreferred(provider,task));
}
function capabilities(provider:Provider,model:string):Task[]{
 if(provider==='demo')return [...TEXT_TASKS,'vision'];
 const caps=[...TEXT_TASKS];
 if(model===explicitModel(provider,'vision'))caps.push('vision');
 return caps;
}
function catalog():ModelItem[]{
 const items:ModelItem[]=[{id:'auto',provider:'auto',model:'auto',label:'AUTO · умный роутинг',available:true,note:'Маршрутизация по задаче с fallback между провайдерами.',capabilities:['dialogue','synthesis','architecture','vision','kb_extract','kb_validate']},{id:'demo',provider:'demo',model:'demo',label:'DEMO · без API',available:true,note:'Текстовый fallback; vision не анализирует pixels и сообщает об этом.',capabilities:['dialogue','synthesis','architecture','vision','kb_extract','kb_validate']}];
 for(const m of openAIModels())items.push({id:`openai:${m}`,provider:'openai',model:m,label:`OpenAI · ${m}`,available:configured('openai'),note:'OpenAI Responses API',capabilities:capabilities('openai',m)});
 for(const m of compatibleModels())items.push({id:`compatible:${m}`,provider:'compatible',model:m,label:`${env('COMPATIBLE_LABEL')||'OpenAI-compatible'} · ${m}`,available:configured('compatible'),note:env('COMPATIBLE_BASE_URL'),capabilities:capabilities('compatible',m)});
 for(const m of ollamaModels())items.push({id:`ollama:${m}`,provider:'ollama',model:m,label:`Ollama · ${m}`,available:configured('ollama'),note:'Локальная или удалённая Ollama',capabilities:capabilities('ollama',m)});
 return items;
}
function providerOrder():Provider[]{
 const raw=list(env('ALINA_PROVIDER_ORDER'),['openai','compatible','ollama','demo']);
 const allowed=new Set<Provider>(['openai','compatible','ollama','demo']);
 const result=raw.filter((x):x is Provider=>allowed.has(x as Provider));
 return result.length?result:['openai','compatible','ollama','demo'];
}
function autoCandidates(task:Task){
 const out:ModelItem[]=[];
 for(const provider of providerOrder()){
  if(!configured(provider))continue;
  const model=modelFor(provider,task);if(!model)continue;
  const id=provider==='demo'?'demo':`${provider}:${model}`;
  const item=catalog().find(x=>x.id===id);if(item&&item.capabilities.includes(task))out.push(item);
 }
 return out;
}
function resolveManual(selection:string,task:Task){
 const item=catalog().find(x=>x.id===selection);
 if(!item)throw new Error('Неизвестная модель.');
 if(!item.available)throw new Error(`Провайдер ${item.provider} не настроен на сервере.`);
 if(!item.capabilities.includes(task))throw new Error(`Модель ${item.model} не отмечена как поддерживающая задачу ${task}. Настройте соответствующий *_MODEL в env или выберите AUTO.`);
 return item;
}
function contextText(context:Record<string,unknown>|undefined){
 if(!context)return '';
 try{return `\n\nКОНТЕКСТ ПРОЕКТА:\n${JSON.stringify(context,null,2).slice(0,16000)}`;}catch{return '';}
}
function dialogueText(messages:Message[],context?:Record<string,unknown>){return messages.slice(-12).map(m=>`${m.role==='user'?'Пользователь':'Алина'}: ${m.content}`).join('\n')+contextText(context);}
function validImages(images:ImageInput[]|undefined){return (images||[]).slice(0,3).filter(img=>typeof img?.dataUrl==='string'&&img.dataUrl.length<=8_000_000&&/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(img.dataUrl));}
function systemFor(task:Task){return task==='kb_extract'?KB_EXTRACT_SYSTEM:task==='kb_validate'?KB_VALIDATE_SYSTEM:BASE_SYSTEM;}
function extractOpenAI(data:unknown){
 const value=data as {output_text?:string;output?:Array<{content?:Array<{text?:string}>}>};
 if(typeof value?.output_text==='string'&&value.output_text.trim())return value.output_text.trim();
 const parts:string[]=[];for(const item of value?.output||[])for(const c of item?.content||[])if(typeof c?.text==='string')parts.push(c.text);return parts.join('\n').trim();
}
async function callOpenAI(model:string,task:Task,messages:Message[],context:Record<string,unknown>|undefined,images:ImageInput[]){
 const text=dialogueText(messages,context);const input=images.length?[{role:'user',content:[{type:'input_text',text},...images.map(img=>({type:'input_image',image_url:img.dataUrl}))]}]:text;
 const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${env('OPENAI_API_KEY')}`},body:JSON.stringify({model,instructions:systemFor(task),input,max_output_tokens:task.startsWith('kb_')?2600:900})});
 const data=await r.json().catch(()=>({}));if(!r.ok){const e=data as {error?:{message?:string}};throw new Error(e?.error?.message||`OpenAI HTTP ${r.status}`);}const out=extractOpenAI(data);if(!out)throw new Error('OpenAI вернул пустой ответ.');return {text:out,usage:(data as {usage?:unknown})?.usage||null};
}
async function callCompatible(model:string,task:Task,messages:Message[],context:Record<string,unknown>|undefined,images:ImageInput[]){
 const base=env('COMPATIBLE_BASE_URL').replace(/\/$/,'');const headers:Record<string,string>={'content-type':'application/json'};const key=env('COMPATIBLE_API_KEY');if(key)headers.authorization=`Bearer ${key}`;if(env('COMPATIBLE_SITE_URL'))headers['HTTP-Referer']=env('COMPATIBLE_SITE_URL');if(env('COMPATIBLE_APP_NAME'))headers['X-Title']=env('COMPATIBLE_APP_NAME');
 const prompt=dialogueText(messages,context);const userContent=images.length?[{type:'text',text:prompt},...images.map(img=>({type:'image_url',image_url:{url:img.dataUrl}}))]:prompt;
 const r=await fetch(`${base}/chat/completions`,{method:'POST',headers,body:JSON.stringify({model,messages:[{role:'system',content:systemFor(task)},{role:'user',content:userContent}],temperature:task.startsWith('kb_')?0.2:0.65,max_tokens:task.startsWith('kb_')?2600:900})});
 const data=await r.json().catch(()=>({})) as {error?:{message?:string};choices?:Array<{message?:{content?:string}}>;usage?:unknown};if(!r.ok)throw new Error(data?.error?.message||`Compatible API HTTP ${r.status}`);const text=data?.choices?.[0]?.message?.content?.trim();if(!text)throw new Error('Провайдер вернул пустой ответ.');return {text,usage:data?.usage||null};
}
async function callOllama(model:string,task:Task,messages:Message[],context:Record<string,unknown>|undefined,images:ImageInput[]){
 const base=(env('OLLAMA_BASE_URL')||'http://127.0.0.1:11434').replace(/\/$/,'');const prompt=dialogueText(messages,context);const ollamaImages=images.map(img=>img.dataUrl.split(',',2)[1]).filter(Boolean);const userMessage:Record<string,unknown>={role:'user',content:prompt};if(ollamaImages.length)userMessage.images=ollamaImages;
 const r=await fetch(`${base}/api/chat`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,messages:[{role:'system',content:systemFor(task)},userMessage],options:{temperature:task.startsWith('kb_')?0.2:0.65}})});const data=await r.json().catch(()=>({})) as {error?:string;message?:{content?:string}};if(!r.ok)throw new Error(data?.error||`Ollama HTTP ${r.status}`);const text=data?.message?.content?.trim();if(!text)throw new Error('Ollama вернула пустой ответ.');return {text,usage:null};
}
function demoKb(last:string){return JSON.stringify({schema_version:'alina-kb-v1',project:{title:'Черновой проект',kind:'unknown',universe_relation:{mode:'unknown',name:null},summary:last.slice(0,500)},entities:[],facts:[],relationships:[],timeline:[],knowledge_states:[],plot_threads:[],visual_requirements:[],open_questions:['DEMO не выполняет полноценное извлечение. Подключите рабочую LLM для анализа.'],conflicts:[]},null,2);}
function demoReply(task:Task,messages:Message[],context:Record<string,unknown>|undefined,images:ImageInput[]){const last=[...messages].reverse().find(x=>x.role==='user')?.content||'идею';if(task==='kb_extract')return {text:demoKb(last),usage:null};if(task==='kb_validate')return {text:JSON.stringify({schema_version:'alina-kb-validation-v1',valid:false,issues:[{severity:'medium',path:'$',message:'DEMO не выполняет семантическую валидацию базы знаний.'}],recommended_changes:['Подключить рабочую LLM и повторить проверку.'],open_questions:[]},null,2),usage:null};const next=typeof context?.nextQuestion==='string'?` ${context.nextQuestion}`:'';const visual=images.length?' Визуальный референс прикреплён, но DEMO-режим не анализирует pixels; выберите vision-модель для реального анализа изображения.':'';return {text:`Я услышала: ${last.slice(0,220)}. Зафиксирую это как рабочую гипотезу и не буду менять без вашего подтверждения.${visual}${next}`,usage:null};}
async function call(item:ModelItem,task:Task,messages:Message[],context:Record<string,unknown>|undefined,images:ImageInput[]){if(item.provider==='openai')return callOpenAI(item.model,task,messages,context,images);if(item.provider==='compatible')return callCompatible(item.model,task,messages,context,images);if(item.provider==='ollama')return callOllama(item.model,task,messages,context,images);return demoReply(task,messages,context,images);}

export async function GET(){
 const routes:Record<string,string[]>=Object.fromEntries((['dialogue','synthesis','architecture','vision','kb_extract','kb_validate'] as Task[]).map(task=>[task,autoCandidates(task).map(x=>x.id)]));
 return Response.json({models:catalog(),providerOrder:providerOrder(),routes});
}
export async function POST(request:Request){
 const started=Date.now();
 try{
  const body=(await request.json()) as RequestBody;const task=body.task||'dialogue';const messages=(body.messages||[]).filter(x=>x&&typeof x.content==='string').slice(-20);const images=validImages(body.images);if(!messages.length)return Response.json({error:'messages required'},{status:400});if(task==='vision'&&!images.length)return Response.json({error:'vision task requires image'},{status:400});
  const attempts:{model:string;error:string}[]=[];const candidates=body.selection&&body.selection!=='auto'?[resolveManual(body.selection,task)]:autoCandidates(task);if(!candidates.length)throw new Error(`Нет модели для задачи ${task}. Проверьте env-конфигурацию.`);
  for(const item of candidates){try{const result=await call(item,task,messages,body.context,images);return Response.json({...result,selection:item.id,provider:item.provider,model:item.model,task,imagesReceived:images.length,latencyMs:Date.now()-started,attempts});}catch(error){attempts.push({model:item.id,error:error instanceof Error?error.message:'provider error'});if(body.selection&&body.selection!=='auto')throw error;}}
  throw new Error(`Все модели завершились ошибкой: ${attempts.map(x=>x.model).join(', ')}`);
 }catch(error){return Response.json({error:error instanceof Error?error.message:'LLM gateway error'},{status:500});}
}
