import { planAlinaRequest, type AlinaTask } from '@/lib/alina-orchestrator';

type Task = AlinaTask;
type Message={role:'user'|'assistant';content:string};
type RequestBody={selection?:string;task?:Task;agent?:string;messages?:Message[];context?:Record<string,unknown>};
type ModelItem={id:string;provider:string;model:string;label:string;available:boolean;note:string};

const OPENAI_DEFAULTS=['gpt-5.6-luna','gpt-5.6-terra','gpt-5.6-sol'];
let gigaTokenCache:{token:string;expiresAtMs:number}|null=null;

function env(name:string){return process.env[name]?.trim()||'';}
function list(value:string,fallback:string[]=[]){return (value?value.split(','):fallback).map(x=>x.trim()).filter(Boolean);}
function openAIModels(){return list(env('OPENAI_MODELS'),OPENAI_DEFAULTS);}
function compatibleModels(){return list(env('COMPATIBLE_MODELS'));}
function ollamaModels(){return list(env('OLLAMA_MODELS'));}
function gigaModels(){return list(env('GIGACHAT_MODELS'));}
function configured(provider:string){
 if(provider==='openai')return Boolean(env('OPENAI_API_KEY'));
 if(provider==='compatible')return Boolean(env('COMPATIBLE_BASE_URL')&&compatibleModels().length);
 if(provider==='ollama')return Boolean(ollamaModels().length);
 if(provider==='gigachat')return Boolean(env('GIGACHAT_AUTH_KEY')&&gigaModels().length);
 return true;
}
function catalog():ModelItem[]{
 const items:ModelItem[]=[{id:'auto',provider:'auto',model:'auto',label:'AUTO · умный роутинг',available:true,note:'Диалог → экономичная модель; синтез → средняя; архитектура → сильная.'},{id:'demo',provider:'demo',model:'demo',label:'DEMO · без API',available:true,note:'Детерминированный fallback для показа интерфейса.'}];
 for(const m of openAIModels())items.push({id:`openai:${m}`,provider:'openai',model:m,label:`OpenAI · ${m}`,available:configured('openai'),note:'OpenAI Responses API'});
 for(const m of compatibleModels())items.push({id:`compatible:${m}`,provider:'compatible',model:m,label:`${env('COMPATIBLE_LABEL')||'OpenAI-compatible'} · ${m}`,available:configured('compatible'),note:env('COMPATIBLE_BASE_URL')});
 for(const m of ollamaModels())items.push({id:`ollama:${m}`,provider:'ollama',model:m,label:`Ollama · ${m}`,available:configured('ollama'),note:'Локальная или удалённая Ollama'});
 for(const m of gigaModels())items.push({id:`gigachat:${m}`,provider:'gigachat',model:m,label:`GigaChat · ${m}`,available:configured('gigachat'),note:'GigaChat API · OAuth access token cached server-side'});
 return items;
}

function autoSelection(task:Task){
 if(configured('openai')){
  const models=openAIModels();
  const wanted=task==='architecture'?'gpt-5.6-sol':task==='synthesis'?'gpt-5.6-terra':'gpt-5.6-luna';
  return `openai:${models.includes(wanted)?wanted:models[0]}`;
 }
 if(configured('gigachat'))return `gigachat:${gigaModels()[0]}`;
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
function extractOpenAI(data:any){
 if(typeof data?.output_text==='string'&&data.output_text.trim())return data.output_text.trim();
 const parts:string[]=[];
 for(const item of data?.output||[])for(const c of item?.content||[])if(typeof c?.text==='string')parts.push(c.text);
 return parts.join('\n').trim();
}
async function callOpenAI(model:string,systemPrompt:string,messages:Message[],context?:Record<string,unknown>){
 const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${env('OPENAI_API_KEY')}`},body:JSON.stringify({model,instructions:systemPrompt,input:dialogueText(messages,context),max_output_tokens:900})});
 const data:any=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data?.error?.message||`OpenAI HTTP ${r.status}`);
 const text=extractOpenAI(data);if(!text)throw new Error('OpenAI вернул пустой ответ.');
 return {text,usage:data?.usage||null};
}
async function callCompatible(model:string,systemPrompt:string,messages:Message[],context?:Record<string,unknown>){
 const base=env('COMPATIBLE_BASE_URL').replace(/\/$/,'');
 const headers:Record<string,string>={'content-type':'application/json'};const key=env('COMPATIBLE_API_KEY');if(key)headers.authorization=`Bearer ${key}`;
 if(env('COMPATIBLE_SITE_URL'))headers['HTTP-Referer']=env('COMPATIBLE_SITE_URL');
 if(env('COMPATIBLE_APP_NAME'))headers['X-Title']=env('COMPATIBLE_APP_NAME');
 const r=await fetch(`${base}/chat/completions`,{method:'POST',headers,body:JSON.stringify({model,messages:[{role:'system',content:systemPrompt},...messages,{role:'user',content:contextText(context)||'Продолжай с учётом контекста.'}],temperature:.65,max_tokens:900})});
 const data:any=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data?.error?.message||`Compatible API HTTP ${r.status}`);
 const text=data?.choices?.[0]?.message?.content?.trim();if(!text)throw new Error('Провайдер вернул пустой ответ.');
 return {text,usage:data?.usage||null};
}
async function callOllama(model:string,systemPrompt:string,messages:Message[],context?:Record<string,unknown>){
 const base=(env('OLLAMA_BASE_URL')||'http://127.0.0.1:11434').replace(/\/$/,'');
 const r=await fetch(`${base}/api/chat`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,stream:false,messages:[{role:'system',content:systemPrompt},...messages,{role:'user',content:contextText(context)||'Продолжай.'}]})});
 const data:any=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data?.error||`Ollama HTTP ${r.status}`);
 const text=data?.message?.content?.trim();if(!text)throw new Error('Ollama вернула пустой ответ.');
 return {text,usage:data?.eval_count!=null||data?.prompt_eval_count!=null?{prompt_tokens:data?.prompt_eval_count??null,completion_tokens:data?.eval_count??null}:null};
}
function gigaExpiryMs(value:unknown){
 const n=Number(value);
 if(!Number.isFinite(n)||n<=0)return Date.now()+29*60*1000;
 return n>1e12?n:n*1000;
}
async function gigaAccessToken(){
 const now=Date.now();
 if(gigaTokenCache&&gigaTokenCache.expiresAtMs-now>60000)return gigaTokenCache.token;
 const authKey=env('GIGACHAT_AUTH_KEY');
 if(!authKey)throw new Error('GIGACHAT_AUTH_KEY не настроен.');
 const authUrl=env('GIGACHAT_AUTH_URL')||'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
 const scope=env('GIGACHAT_SCOPE')||'GIGACHAT_API_PERS';
 const body=new URLSearchParams({scope});
 const r=await fetch(authUrl,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','accept':'application/json','RqUID':crypto.randomUUID(),'authorization':`Basic ${authKey}`},body});
 const data:any=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data?.message||data?.error||`GigaChat OAuth HTTP ${r.status}`);
 const token=typeof data?.access_token==='string'?data.access_token:'';
 if(!token)throw new Error('GigaChat OAuth не вернул access_token.');
 gigaTokenCache={token,expiresAtMs:gigaExpiryMs(data?.expires_at)};
 return token;
}
async function callGigaChat(model:string,systemPrompt:string,messages:Message[],context?:Record<string,unknown>){
 const token=await gigaAccessToken();
 const base=(env('GIGACHAT_BASE_URL')||'https://api.giga.chat/v1').replace(/\/$/,'');
 const gigaMessages=[{role:'system',content:systemPrompt},...messages];
 const extra=contextText(context);if(extra)gigaMessages.push({role:'user',content:extra});
 const r=await fetch(`${base}/chat/completions`,{method:'POST',headers:{'content-type':'application/json','accept':'application/json','authorization':`Bearer ${token}`},body:JSON.stringify({model,messages:gigaMessages,stream:false,temperature:.65,max_tokens:900})});
 const data:any=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data?.message||data?.error?.message||data?.error||`GigaChat HTTP ${r.status}`);
 const content=data?.choices?.[0]?.message?.content;
 const text=typeof content==='string'?content.trim():'';
 if(!text)throw new Error('GigaChat вернул пустой ответ.');
 return {text,usage:data?.usage||null};
}
function demoReply(messages:Message[],context:Record<string,unknown>|undefined,agentName:string){
 const last=[...messages].reverse().find(x=>x.role==='user')?.content||'идею';
 const next=typeof context?.nextQuestion==='string'?` ${context.nextQuestion}`:'';
 return {text:`[${agentName}] Я услышала: ${last.slice(0,220)}. Зафиксирую это как рабочую гипотезу и не буду менять без вашего подтверждения.${next}`,usage:null};
}

export async function GET(){
 return Response.json({models:catalog(),auto:{dialogue:autoSelection('dialogue'),synthesis:autoSelection('synthesis'),architecture:autoSelection('architecture')},zoo:'/api/zoo'});
}
export async function POST(request:Request){
 const started=Date.now();
 try{
  const body=(await request.json()) as RequestBody;const task=body.task||'dialogue';const messages=(body.messages||[]).filter(x=>x&&typeof x.content==='string').slice(-20);
  if(!messages.length)return Response.json({error:'messages required'},{status:400});
  const query=[...messages].reverse().find(x=>x.role==='user')?.content||messages[messages.length-1].content;
  const plan=planAlinaRequest({query,task,explicitAgent:body.agent});
  const item=resolve(body.selection||'auto',task);
  const result=item.provider==='openai'?await callOpenAI(item.model,plan.systemPrompt,messages,body.context):item.provider==='gigachat'?await callGigaChat(item.model,plan.systemPrompt,messages,body.context):item.provider==='compatible'?await callCompatible(item.model,plan.systemPrompt,messages,body.context):item.provider==='ollama'?await callOllama(item.model,plan.systemPrompt,messages,body.context):demoReply(messages,body.context,plan.agentName);
  return Response.json({...result,selection:item.id,provider:item.provider,model:item.model,task,latencyMs:Date.now()-started,agentId:plan.agentId,agentName:plan.agentName,promptId:plan.promptId,promptVersion:plan.promptVersion,knowledgeRefs:plan.knowledgeRefs,routingReason:plan.routingReason});
 }catch(error){return Response.json({error:error instanceof Error?error.message:'LLM gateway error'},{status:500});}
}
