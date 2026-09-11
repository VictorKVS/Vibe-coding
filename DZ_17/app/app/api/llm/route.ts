type Task='dialogue'|'synthesis'|'architecture';
type Message={role:'user'|'assistant';content:string};
type ImageInput={dataUrl:string;name?:string};
type RequestBody={selection?:string;task?:Task;messages?:Message[];context?:Record<string,unknown>;images?:ImageInput[]};
type ModelItem={id:string;provider:string;model:string;label:string;available:boolean;note:string};

const OPENAI_DEFAULTS=['gpt-5.6-luna','gpt-5.6-terra','gpt-5.6-sol'];
const ALINA_SYSTEM=`Ты — Алина, AI-продюсер проекта «Дикие идеи → в деньги». Отвечай по-русски, кратко и предметно. Ты помогаешь человеку проектировать историю, а не принимаешь ключевые творческие решения вместо него. Разделяй факты, наблюдения, интерпретации и гипотезы. Не обещай коммерческий успех. При работе с изображением сначала опиши только наблюдаемые признаки, затем отдельно объясни, как они могут быть использованы в творческой задаче. Не выдумывай детали, которых не видно на изображении. Если контекст содержит nextQuestion, закончи ответ естественным переходом к этому вопросу. Для обычного диалога достаточно 2–4 предложений.`;

function env(name:string){return process.env[name]?.trim()||'';}
function list(value:string,fallback:string[]=[]){return (value?value.split(','):fallback).map(x=>x.trim()).filter(Boolean);}
function openAIModels(){return list(env('OPENAI_MODELS'),OPENAI_DEFAULTS);}
function compatibleModels(){return list(env('COMPATIBLE_MODELS'));}
function ollamaModels(){return list(env('OLLAMA_MODELS'));}
function configured(provider:string){
 if(provider==='openai')return Boolean(env('OPENAI_API_KEY'));
 if(provider==='compatible')return Boolean(env('COMPATIBLE_BASE_URL')&&compatibleModels().length);
 if(provider==='ollama')return Boolean(ollamaModels().length);
 return true;
}
function catalog():ModelItem[]{
 const items:ModelItem[]=[{id:'auto',provider:'auto',model:'auto',label:'AUTO · умный роутинг',available:true,note:'Диалог → экономичная модель; синтез → средняя; архитектура → сильная.'},{id:'demo',provider:'demo',model:'demo',label:'DEMO · без API',available:true,note:'Детерминированный fallback для показа интерфейса; pixels не анализирует.'}];
 for(const m of openAIModels())items.push({id:`openai:${m}`,provider:'openai',model:m,label:`OpenAI · ${m}`,available:configured('openai'),note:'OpenAI Responses API · text + image'});
 for(const m of compatibleModels())items.push({id:`compatible:${m}`,provider:'compatible',model:m,label:`${env('COMPATIBLE_LABEL')||'OpenAI-compatible'} · ${m}`,available:configured('compatible'),note:`${env('COMPATIBLE_BASE_URL')} · vision зависит от модели`});
 for(const m of ollamaModels())items.push({id:`ollama:${m}`,provider:'ollama',model:m,label:`Ollama · ${m}`,available:configured('ollama'),note:'Локальная или удалённая Ollama; vision зависит от модели'});
 return items;
}

function autoSelection(task:Task){
 if(configured('openai')){
  const models=openAIModels();
  const wanted=task==='architecture'?'gpt-5.6-sol':task==='synthesis'?'gpt-5.6-terra':'gpt-5.6-luna';
  return `openai:${models.includes(wanted)?wanted:models[0]}`;
 }
 if(configured('compatible'))return `compatible:${compatibleModels()[0]}`;
 if(configured('ollama'))return `ollama:${ollamaModels()[0]}`;
 return 'demo';
}
function resolve(selection:string,task:Task){
 const id=selection==='auto'?autoSelection(task):selection;
 const item=catalog().find(x=>x.id===id);
 if(!item)throw new Error('Неизвестная модель.');
 if(!item.available)throw new Error(`Провайдер ${item.provider} не настроен на сервере.`);
 return item;
}
function contextText(context:Record<string,unknown>|undefined){
 if(!context)return '';
 try{return `\n\nКОНТЕКСТ ПРОЕКТА:\n${JSON.stringify(context,null,2).slice(0,12000)}`;}catch{return '';}
}
function dialogueText(messages:Message[],context?:Record<string,unknown>){
 return messages.slice(-12).map(m=>`${m.role==='user'?'Пользователь':'Алина'}: ${m.content}`).join('\n')+contextText(context);
}
function validImages(images:ImageInput[]|undefined){
 return (images||[]).slice(0,3).filter(img=>{
  if(typeof img?.dataUrl!=='string')return false;
  if(img.dataUrl.length>8_000_000)return false;
  return /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(img.dataUrl);
 });
}
function extractOpenAI(data:any){
 if(typeof data?.output_text==='string'&&data.output_text.trim())return data.output_text.trim();
 const parts:string[]=[];
 for(const item of data?.output||[])for(const c of item?.content||[])if(typeof c?.text==='string')parts.push(c.text);
 return parts.join('\n').trim();
}
async function callOpenAI(model:string,messages:Message[],context:Record<string,unknown>|undefined,images:ImageInput[]){
 const text=dialogueText(messages,context);
 const input=images.length?[{role:'user',content:[{type:'input_text',text},...images.map(img=>({type:'input_image',image_url:img.dataUrl}))]}]:text;
 const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${env('OPENAI_API_KEY')}`},body:JSON.stringify({model,instructions:ALINA_SYSTEM,input,max_output_tokens:900})});
 const data:any=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data?.error?.message||`OpenAI HTTP ${r.status}`);
 const out=extractOpenAI(data);if(!out)throw new Error('OpenAI вернул пустой ответ.');
 return {text:out,usage:data?.usage||null};
}
async function callCompatible(model:string,messages:Message[],context:Record<string,unknown>|undefined,images:ImageInput[]){
 const base=env('COMPATIBLE_BASE_URL').replace(/\/$/,'');
 const headers:Record<string,string>={'content-type':'application/json'};const key=env('COMPATIBLE_API_KEY');if(key)headers.authorization=`Bearer ${key}`;
 if(env('COMPATIBLE_SITE_URL'))headers['HTTP-Referer']=env('COMPATIBLE_SITE_URL');
 if(env('COMPATIBLE_APP_NAME'))headers['X-Title']=env('COMPATIBLE_APP_NAME');
 const prompt=dialogueText(messages,context);
 const userContent=images.length?[{type:'text',text:prompt},...images.map(img=>({type:'image_url',image_url:{url:img.dataUrl}}))]:prompt;
 const r=await fetch(`${base}/chat/completions`,{method:'POST',headers,body:JSON.stringify({model,messages:[{role:'system',content:ALINA_SYSTEM},{role:'user',content:userContent}],temperature:.65,max_tokens:900})});
 const data:any=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data?.error?.message||`Compatible API HTTP ${r.status}`);
 const text=data?.choices?.[0]?.message?.content?.trim();if(!text)throw new Error('Провайдер вернул пустой ответ.');
 return {text,usage:data?.usage||null};
}
async function callOllama(model:string,messages:Message[],context:Record<string,unknown>|undefined,images:ImageInput[]){
 const base=(env('OLLAMA_BASE_URL')||'http://127.0.0.1:11434').replace(/\/$/,'');
 const prompt=dialogueText(messages,context);
 const ollamaImages=images.map(img=>img.dataUrl.split(',',2)[1]).filter(Boolean);
 const userMessage:Record<string,unknown>={role:'user',content:prompt};if(ollamaImages.length)userMessage.images=ollamaImages;
 const r=await fetch(`${base}/api/chat`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,messages:[{role:'system',content:ALINA_SYSTEM},userMessage]})});
 const data:any=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data?.error||`Ollama HTTP ${r.status}`);
 const text=data?.message?.content?.trim();if(!text)throw new Error('Ollama вернула пустой ответ.');
 return {text,usage:null};
}
function demoReply(messages:Message[],context:Record<string,unknown>|undefined,images:ImageInput[]){
 const last=[...messages].reverse().find(x=>x.role==='user')?.content||'идею';
 const next=typeof context?.nextQuestion==='string'?` ${context.nextQuestion}`:'';
 const visual=images.length?' Визуальный референс прикреплён, но DEMO-режим не анализирует pixels; выберите vision-модель для реального анализа изображения.':'';
 return {text:`Я услышала: ${last.slice(0,220)}. Зафиксирую это как рабочую гипотезу и не буду менять без вашего подтверждения.${visual}${next}`,usage:null};
}

export async function GET(){
 return Response.json({models:catalog(),auto:{dialogue:autoSelection('dialogue'),synthesis:autoSelection('synthesis'),architecture:autoSelection('architecture')}});
}
export async function POST(request:Request){
 const started=Date.now();
 try{
  const body=(await request.json()) as RequestBody;const task=body.task||'dialogue';const messages=(body.messages||[]).filter(x=>x&&typeof x.content==='string').slice(-20);const images=validImages(body.images);
  if(!messages.length)return Response.json({error:'messages required'},{status:400});
  const item=resolve(body.selection||'auto',task);
  const result=item.provider==='openai'?await callOpenAI(item.model,messages,body.context,images):item.provider==='compatible'?await callCompatible(item.model,messages,body.context,images):item.provider==='ollama'?await callOllama(item.model,messages,body.context,images):demoReply(messages,body.context,images);
  return Response.json({...result,selection:item.id,provider:item.provider,model:item.model,task,imagesReceived:images.length,latencyMs:Date.now()-started});
 }catch(error){return Response.json({error:error instanceof Error?error.message:'LLM gateway error'},{status:500});}
}
