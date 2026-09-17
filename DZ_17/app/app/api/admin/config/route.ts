import {appendFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {PROMPT_DEFINITIONS,activatePromptVersion,createPromptDraft,promptCatalog,reviewPromptVersion,type PromptReview} from '@/lib/prompt-registry';

type Role='admin'|'security';
type ControlState={
 schemaVersion:'alina-control-state-v1';
 version:number;
 updatedAt:string|null;
 modelPolicies:Record<string,{enabled:boolean;security:'approved'|'review'|'blocked'}>;
 promptPolicies:Record<string,{active:boolean;review:'approved'|'pending'|'blocked';version:number}>;
 kbPolicies:Record<string,{enabled:boolean;securityHold:boolean}>;
 routeOverrides:Record<string,string>;
 database:{vectorIndexEnabled:boolean;backupEnabled:boolean;objectStorageEnabled:boolean};
};
type Mutation={role?:Role;action?:string;target?:string;value?:unknown;reason?:string};

const ROUTABLE_TASKS=['dialogue','synthesis','architecture','translation','kb_extract','kb_validate'];
const promptDefaults=Object.fromEntries(PROMPT_DEFINITIONS.map(p=>[p.id,{active:p.status==='active',review:p.status==='active'?'approved' as const:'pending' as const,version:p.baseVersion}]));
const kbConnections=[
 {id:'KB-FOUNDATION',label:'Universal Foundation / Analyst Meta-KB',path:'../knowledge_base',kind:'foundation',status:'configured'},
 {id:'KB-SOURCES',label:'Source Registry',path:'../knowledge_base/source_registry.v1.json',kind:'registry',status:'configured'},
 {id:'KB-METHODS',label:'Analyst Method Cards',path:'../knowledge_base/analyst_method_cards.v1.json',kind:'methods',status:'configured'},
 {id:'KB-TRANSLATION-TERMS',label:'Translation Terminology Registry',path:'../knowledge_base/translation_terminology.v1.json',kind:'terminology',status:'configured'},
 {id:'KB-TRANSLATION-MEMORY',label:'Translation Memory',path:'../knowledge_base/translation_memory.v1.json',kind:'translation_memory',status:'configured'},
 {id:'KB-NARRATIVE',label:'Narrative Domain Profile',path:'../profiles/narrative.v1.json',kind:'domain_profile',status:'configured'},
 {id:'KB-OSINT',label:'OSINT Domain Profile',path:'../profiles/osint.v1.json',kind:'domain_profile',status:'planned'},
 {id:'KB-CYBER',label:'Cybersecurity Domain Profile',path:'../profiles/cybersecurity.v1.json',kind:'domain_profile',status:'planned'},
];

const runtimeDir=resolve(process.cwd(),'runtime');
const configDir=resolve(runtimeDir,'config');
const auditDir=resolve(runtimeDir,'audit');
const stateFile=resolve(configDir,'admin-control.v1.json');
const auditFile=resolve(auditDir,'admin-events.jsonl');

const defaultState:ControlState={
 schemaVersion:'alina-control-state-v1',version:1,updatedAt:null,
 modelPolicies:{},promptPolicies:promptDefaults,
 kbPolicies:Object.fromEntries(kbConnections.map(k=>[k.id,{enabled:k.status==='configured',securityHold:false}])),
 routeOverrides:{},database:{vectorIndexEnabled:false,backupEnabled:false,objectStorageEnabled:false},
};

async function ensureDirs(){await Promise.all([mkdir(configDir,{recursive:true}),mkdir(auditDir,{recursive:true})]);}
async function readState():Promise<ControlState>{
 try{
  const raw=JSON.parse(await readFile(stateFile,'utf8')) as Partial<ControlState>;
  return {...defaultState,...raw,modelPolicies:raw.modelPolicies||{},promptPolicies:{...defaultState.promptPolicies,...(raw.promptPolicies||{})},kbPolicies:{...defaultState.kbPolicies,...(raw.kbPolicies||{})},routeOverrides:raw.routeOverrides||{},database:{...defaultState.database,...(raw.database||{})}};
 }catch{return structuredClone(defaultState);}
}
async function saveState(state:ControlState){await ensureDirs();await writeFile(stateFile,JSON.stringify(state,null,2)+'\n','utf8');}
async function appendAudit(event:Record<string,unknown>){await ensureDirs();await appendFile(auditFile,JSON.stringify(event)+'\n','utf8');}
async function recentAudit(limit=20){try{const rows=(await readFile(auditFile,'utf8')).split(/\r?\n/).filter(Boolean).slice(-limit).reverse();return rows.map(x=>{try{return JSON.parse(x)}catch{return null}}).filter(Boolean);}catch{return [];}}
function tokenFor(role:Role){return role==='admin'?(process.env.ALINA_ADMIN_TOKEN||''):(process.env.ALINA_SECURITY_TOKEN||'');}
function authorized(request:Request,role:Role){const expected=tokenFor(role);if(!expected)return false;return (request.headers.get('authorization')||'')===`Bearer ${expected}`;}
function isBool(x:unknown):x is boolean{return typeof x==='boolean';}
function isSecurityState(x:unknown):x is 'approved'|'review'|'blocked'{return x==='approved'||x==='review'||x==='blocked';}
function isReviewState(x:unknown):x is 'approved'|'pending'|'blocked'{return x==='approved'||x==='pending'||x==='blocked';}
function isModelRouteId(value:string){return value==='demo'||/^(llamacpp|gigachat|openai|compatible|ollama):.+$/.test(value);}
function asObject(x:unknown){return x&&typeof x==='object'?x as Record<string,unknown>:{};}

export async function GET(request:Request){
 const databaseConfigured=Boolean(process.env.DATABASE_URL||process.env.POSTGRES_URL);const auditConfigured=Boolean(process.env.AUDIT_DATABASE_URL||databaseConfigured);const state=await readState();
 const adminConfigured=Boolean(tokenFor('admin')),securityConfigured=Boolean(tokenFor('security'));
 const url=new URL(request.url);const includePromptBodies=url.searchParams.get('include_prompt_bodies')==='1';const requestedRole=url.searchParams.get('role');
 let privilegedRole:Role|null=null;
 if(includePromptBodies){
  if(requestedRole!=='admin'&&requestedRole!=='security')return Response.json({error:'role=admin|security required for prompt bodies.'},{status:400});
  privilegedRole=requestedRole;if(!authorized(request,privilegedRole))return Response.json({error:'Недостаточно прав для чтения prompt bodies.'},{status:401});
 }
 const registry=await promptCatalog(includePromptBodies);
 const prompts=registry.map(p=>{const policy=state.promptPolicies[p.id]||{active:p.status==='active',review:p.latestReview==='blocked'?'blocked' as const:p.latestReview==='pending'?'pending' as const:'approved' as const,version:p.activeVersion};return {id:p.id,task:p.task,source:p.source,status:p.status,editable:p.editable,version:p.activeVersion,latestVersion:p.latestVersion,versionCount:p.versionCount,reviewStatus:policy.review,active:policy.active,latestReview:p.latestReview};});
 return Response.json({
  schemaVersion:'alina-admin-config-v4',mode:adminConfigured||securityConfigured?'controlled_writes':'read_only_preview',
  warning:adminConfigured||securityConfigured?'Privileged writes require a role token and are written to the local audit ledger. Secret values are never returned.':'ALINA_ADMIN_TOKEN / ALINA_SECURITY_TOKEN are not configured; control center stays read-only.',
  roles:['ADMINISTRATOR','IB_AI_SECURITY'],routableTasks:ROUTABLE_TASKS,routeOverridePolicy:'any runtime model id; unavailable or blocked overrides fall back safely in /api/llm',
  auth:{adminConfigured,securityConfigured,tokenValuesExposed:false},prompts,promptRegistry:includePromptBodies?registry:undefined,knowledgeBases:kbConnections,control:state,
  database:{target:'PostgreSQL + pgvector',configured:databaseConfigured,connectionValueExposed:false,eventAuditConfigured:auditConfigured,objectStorage:'MinIO/S3 — planned'},
  security:{secretsExposed:false,promptBodiesExposed:includePromptBodies,privilegedWritesEnabled:adminConfigured||securityConfigured,auditRequired:true,modelIntegrity:'policy state + future SHA-256 approval',kbIntegrity:'provenance/version checks — documented'},audit:await recentAudit(),privilegedRole,
 });
}

export async function POST(request:Request){
 let body:Mutation={};try{body=await request.json() as Mutation;}catch{return Response.json({error:'Некорректный JSON.'},{status:400});}
 const role=body.role;if(role!=='admin'&&role!=='security')return Response.json({error:'Неизвестная роль.'},{status:400});
 if(!tokenFor(role))return Response.json({error:`Токен роли ${role} не настроен на сервере.`},{status:503});if(!authorized(request,role))return Response.json({error:'Недостаточно прав: неверный role token.'},{status:401});
 const action=String(body.action||''),target=String(body.target||''),reason=String(body.reason||'').trim();if(!action||!target||reason.length<3)return Response.json({error:'action, target и reason обязательны.'},{status:400});
 const state=await readState();const beforeVersion=state.version;let result:unknown=null;let auditValue:unknown=body.value;
 try{
  if(role==='admin'&&action==='model.set_enabled'&&isBool(body.value)){const current=state.modelPolicies[target]||{enabled:true,security:'review' as const};state.modelPolicies[target]={...current,enabled:body.value};}
  else if(role==='security'&&action==='model.set_security'&&isSecurityState(body.value)){const current=state.modelPolicies[target]||{enabled:true,security:'review' as const};state.modelPolicies[target]={...current,security:body.value};}
  else if(role==='admin'&&action==='route.set_override'&&ROUTABLE_TASKS.includes(target)&&typeof body.value==='string'){const modelId=body.value.trim();if(modelId.length>240)throw new Error('Model id слишком длинный.');if(modelId&&!isModelRouteId(modelId))throw new Error('Некорректный model id для route override.');if(modelId)state.routeOverrides[target]=modelId;else delete state.routeOverrides[target];}
  else if(role==='admin'&&action==='prompt.set_active'&&isBool(body.value)){const current=state.promptPolicies[target]||{active:false,review:'pending' as const,version:1};state.promptPolicies[target]={...current,active:body.value,version:current.version+1};}
  else if(role==='security'&&action==='prompt.set_review'&&isReviewState(body.value)){const current=state.promptPolicies[target]||{active:false,review:'pending' as const,version:1};state.promptPolicies[target]={...current,review:body.value};}
  else if(role==='admin'&&action==='prompt.create_draft'){const value=asObject(body.value);const text=typeof value.body==='string'?value.body:'';result=await createPromptDraft(target,text,role,reason);auditValue={version:(result as {version:number}).version,chars:text.length};}
  else if(role==='security'&&action==='prompt.review_version'){const value=asObject(body.value),version=Number(value.version),review=value.review;if(!Number.isInteger(version)||version<1||!isReviewState(review))throw new Error('version и review обязательны.');result=await reviewPromptVersion(target,version,review as PromptReview);auditValue={version,review};}
  else if(role==='admin'&&action==='prompt.activate_version'){const version=Number(body.value);if(!Number.isInteger(version)||version<1)throw new Error('Некорректная версия prompt.');result=await activatePromptVersion(target,version);const current=state.promptPolicies[target]||{active:true,review:'approved' as const,version};state.promptPolicies[target]={...current,active:true,version};auditValue={version};}
  else if(role==='admin'&&action==='kb.set_enabled'&&isBool(body.value)){const current=state.kbPolicies[target]||{enabled:false,securityHold:false};state.kbPolicies[target]={...current,enabled:body.value};}
  else if(role==='security'&&action==='kb.set_hold'&&isBool(body.value)){const current=state.kbPolicies[target]||{enabled:false,securityHold:false};state.kbPolicies[target]={...current,securityHold:body.value};}
  else if(role==='admin'&&action==='database.set_flag'&&typeof body.value==='object'&&body.value!==null){const value=body.value as {key?:string;enabled?:unknown};if(!['vectorIndexEnabled','backupEnabled','objectStorageEnabled'].includes(String(value.key))||!isBool(value.enabled))throw new Error('Некорректный database flag.');(state.database as unknown as Record<string,boolean>)[String(value.key)]=value.enabled;}
  else return Response.json({error:'Действие не разрешено для этой роли или значение некорректно.'},{status:403});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Ошибка изменения.'},{status:400});}
 state.version=Math.max(1,state.version)+1;state.updatedAt=new Date().toISOString();await saveState(state);
 const event={eventId:crypto.randomUUID(),at:state.updatedAt,role,action,target,value:auditValue,reason,stateVersion:state.version,beforeVersion};await appendAudit(event);
 return Response.json({ok:true,event,control:state,result,prompts:await promptCatalog(false)});
}
