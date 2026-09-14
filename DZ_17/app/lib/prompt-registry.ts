import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

export type PromptTask='dialogue'|'synthesis'|'architecture'|'vision'|'translation'|'kb_extract'|'kb_validate';
export type PromptReview='approved'|'pending'|'blocked';
export type PromptVersion={version:number;body:string;review:PromptReview;createdAt:string|null;createdBy:string;reason:string;source:'builtin'|'runtime'};
export type PromptRecord={activeVersion:number;versions:PromptVersion[]};
export type PromptStore={schemaVersion:'alina-prompt-store-v1';updatedAt:string|null;prompts:Record<string,PromptRecord>};

const BASE_SYSTEM=`Ты — Алина, AI-продюсер и аналитик проекта «Дикие идеи → в деньги». Отвечай по-русски, кратко и предметно. Ты помогаешь человеку проектировать историю и базу знаний, но не утверждаешь канон без подтверждения автора. Разделяй факты, наблюдения, интерпретации и гипотезы. Не обещай коммерческий успех. При работе с изображением сначала опиши только наблюдаемые признаки, затем отдельно объясни, как они могут быть использованы в творческой задаче. Не выдумывай детали, которых не видно на изображении.`;
const TRANSLATION_SYSTEM=`Ты — ALINA Translator, специализированный переводчик. Твоя задача — переводить, а не пересказывать. Целевой язык по умолчанию русский, если контекст не задаёт другой targetLanguage. Сохраняй факты, отрицания, модальность, причинно-следственные связи, числа, даты, единицы измерения, ссылки, идентификаторы, структуру абзацев, нумерацию и форматирование настолько точно, насколько это возможно. Не добавляй объяснений, выводов, оценок и фактов от себя. Код, команды, API, URL, имена функций, переменных и файлов не переводи. Имена собственные транслитерируй или сохраняй по контексту, но не выдумывай локализованные формы. Используй translationRag.terminologyMatches как терминологические подсказки: approved имеет высший приоритет; project — следующий; proposed — только подсказка и не должна ломать контекст. Если translationRag.exactMemoryMatches содержит approved exact-match, его перевод считается предпочтительным. Режим exact требует максимально близкого перевода и сохранения структуры; technical — точности терминологии и естественного технического русского; reader — читаемого русского без сокращения смысла. Возвращай только перевод без вступления, послесловия и комментариев.`;
const KB_EXTRACT_SYSTEM=`${BASE_SYSTEM}\n\nРЕЖИМ: KNOWLEDGE BASE ANALYST. Разложи пользовательскую идею в черновик структурированной базы знаний. Возвращай ТОЛЬКО валидный JSON без markdown и пояснений вокруг него. Все автоматически извлечённые элементы имеют status="proposed". Не создавай канонические факты, которых пользователь не сообщил. Если данных недостаточно, помещай вопрос в open_questions. JSON schema: {"schema_version":"alina-kb-v1","project":{"title":string,"kind":"standalone"|"series"|"spin_off"|"prequel"|"parallel"|"adaptation"|"unknown","universe_relation":{"mode":"new"|"existing"|"unknown","name":string|null},"summary":string},"entities":[{"temp_id":string,"type":"character"|"location"|"organization"|"artifact"|"event"|"concept","name":string,"description":string,"status":"proposed"}],"facts":[{"subject":string,"predicate":string,"object":string,"scope":"universe"|"series"|"project"|"scene"|"unknown","status":"proposed","confidence":number,"source":"user_input"}],"relationships":[{"from":string,"type":string,"to":string,"status":"proposed"}],"timeline":[{"event":string,"time":string|null,"order_hint":number|null,"status":"proposed"}],"knowledge_states":[{"character":string,"knowledge":string,"state":"knows"|"believes"|"rumor"|"secret"|"unknown","status":"proposed"}],"plot_threads":[{"name":string,"description":string,"status":"proposed"}],"visual_requirements":[{"subject":string,"requirement":string,"status":"proposed"}],"open_questions":[string],"conflicts":[string]}.`;
const KB_VALIDATE_SYSTEM=`${BASE_SYSTEM}\n\nРЕЖИМ: KB VALIDATOR. Пользователь передаст JSON-черновик базы знаний. Проверь внутренние противоречия, недостаточную трассируемость, смешение фактов и интерпретаций, неоднозначные сущности и пропущенные связи. Возвращай ТОЛЬКО JSON: {"schema_version":"alina-kb-validation-v1","valid":boolean,"issues":[{"severity":"low"|"medium"|"high","path":string,"message":string}],"recommended_changes":[string],"open_questions":[string]}. Не меняй канон самостоятельно.`;

export const PROMPT_DEFINITIONS=[
 {id:'PROMPT-BASE-ALINA',task:'dialogue/synthesis/architecture/vision',source:'lib/prompt-registry.ts',status:'active' as const,editable:true,baseVersion:1,body:BASE_SYSTEM},
 {id:'PROMPT-TRANSLATOR',task:'translation',source:'lib/prompt-registry.ts + ../profiles/translator.v1.json',status:'active' as const,editable:true,baseVersion:1,body:TRANSLATION_SYSTEM},
 {id:'PROMPT-KB-EXTRACT',task:'kb_extract',source:'lib/prompt-registry.ts',status:'active' as const,editable:true,baseVersion:1,body:KB_EXTRACT_SYSTEM},
 {id:'PROMPT-KB-VALIDATE',task:'kb_validate',source:'lib/prompt-registry.ts',status:'active' as const,editable:true,baseVersion:1,body:KB_VALIDATE_SYSTEM},
 {id:'PROMPT-SENIOR-REVIEW',task:'senior_review',source:'knowledge_base/analyst_method_cards.v1.json',status:'planned' as const,editable:false,baseVersion:0,body:''},
];

const taskPrompt:Record<PromptTask,string>={dialogue:'PROMPT-BASE-ALINA',synthesis:'PROMPT-BASE-ALINA',architecture:'PROMPT-BASE-ALINA',vision:'PROMPT-BASE-ALINA',translation:'PROMPT-TRANSLATOR',kb_extract:'PROMPT-KB-EXTRACT',kb_validate:'PROMPT-KB-VALIDATE'};
const configDir=resolve(process.cwd(),'runtime','config');
const storeFile=resolve(configDir,'prompt-store.v1.json');

function baselineRecord(body:string):PromptRecord{return {activeVersion:1,versions:[{version:1,body,review:'approved',createdAt:null,createdBy:'system',reason:'builtin baseline',source:'builtin'}]};}
function defaultStore():PromptStore{return {schemaVersion:'alina-prompt-store-v1',updatedAt:null,prompts:Object.fromEntries(PROMPT_DEFINITIONS.filter(d=>d.baseVersion>0).map(d=>[d.id,baselineRecord(d.body)]))};}
function normalizeRecord(base:PromptRecord|undefined,value:unknown):PromptRecord{
 if(!base)throw new Error('Prompt baseline missing.');
 const raw=(value&&typeof value==='object'?value:{}) as Partial<PromptRecord>;
 const versions=Array.isArray(raw.versions)?raw.versions.filter(v=>v&&typeof v.version==='number'&&typeof v.body==='string'&&(v.review==='approved'||v.review==='pending'||v.review==='blocked')):[];
 const merged=[...base.versions];
 for(const item of versions){const i=merged.findIndex(v=>v.version===item.version);if(i>=0)merged[i]=item;else merged.push(item);}
 merged.sort((a,b)=>a.version-b.version);
 const active=typeof raw.activeVersion==='number'&&merged.some(v=>v.version===raw.activeVersion)?raw.activeVersion:base.activeVersion;
 return {activeVersion:active,versions:merged};
}
export async function readPromptStore():Promise<PromptStore>{
 const base=defaultStore();
 try{
  const raw=JSON.parse(await readFile(storeFile,'utf8')) as Partial<PromptStore>;
  const prompts={...base.prompts};
  for(const [id,record] of Object.entries(base.prompts))prompts[id]=normalizeRecord(record,raw.prompts?.[id]);
  return {schemaVersion:'alina-prompt-store-v1',updatedAt:typeof raw.updatedAt==='string'?raw.updatedAt:null,prompts};
 }catch{return base;}
}
async function savePromptStore(store:PromptStore){await mkdir(configDir,{recursive:true});store.updatedAt=new Date().toISOString();await writeFile(storeFile,JSON.stringify(store,null,2)+'\n','utf8');}
function getRecord(store:PromptStore,id:string){const record=store.prompts[id];if(!record)throw new Error(`Неизвестный prompt id: ${id}`);return record;}
function getVersion(record:PromptRecord,version:number){const item=record.versions.find(v=>v.version===version);if(!item)throw new Error(`Версия prompt v${version} не найдена.`);return item;}

export function promptIdForRuntimeTask(task:PromptTask){return taskPrompt[task];}
export async function effectivePromptForTask(task:PromptTask){const id=taskPrompt[task];const store=await readPromptStore();const record=getRecord(store,id);const version=getVersion(record,record.activeVersion);if(version.review!=='approved')throw new Error(`Активная версия ${id} v${version.version} не approved.`);return {id,version:version.version,body:version.body,review:version.review,source:version.source};}

export async function promptCatalog(includeBodies=false){
 const store=await readPromptStore();
 return PROMPT_DEFINITIONS.map(def=>{
  const record=store.prompts[def.id];const active=record?.versions.find(v=>v.version===record.activeVersion);const latest=record?.versions.at(-1);
  return {id:def.id,task:def.task,source:def.source,status:def.status,editable:def.editable,activeVersion:record?.activeVersion||def.baseVersion,latestVersion:latest?.version||def.baseVersion,latestReview:latest?.review||(def.status==='planned'?'pending':'approved'),versionCount:record?.versions.length||0,activeBody:includeBodies?(active?.body||def.body):undefined,latestBody:includeBodies?(latest?.body||def.body):undefined,versions:includeBodies?(record?.versions||[]):undefined,updatedAt:store.updatedAt};
 });
}

export async function createPromptDraft(id:string,body:string,actor:string,reason:string){
 const clean=body.trim();if(clean.length<20)throw new Error('Промт слишком короткий.');if(clean.length>30000)throw new Error('Промт превышает 30000 символов.');
 const store=await readPromptStore();const record=getRecord(store,id);const next=Math.max(0,...record.versions.map(v=>v.version))+1;record.versions.push({version:next,body:clean,review:'pending',createdAt:new Date().toISOString(),createdBy:actor,reason,source:'runtime'});await savePromptStore(store);return {id,version:next};
}
export async function reviewPromptVersion(id:string,version:number,review:PromptReview){const store=await readPromptStore();const item=getVersion(getRecord(store,id),version);if(item.source==='builtin'&&review!=='approved')throw new Error('Baseline builtin-версию нельзя блокировать в version store; используйте prompt policy для глобального security block.');item.review=review;await savePromptStore(store);return {id,version,review};}
export async function activatePromptVersion(id:string,version:number){const store=await readPromptStore();const record=getRecord(store,id);const item=getVersion(record,version);if(item.review!=='approved')throw new Error('Активировать можно только approved-версию.');record.activeVersion=version;await savePromptStore(store);return {id,version};}
