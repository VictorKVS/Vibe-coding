import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

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

const configDir=resolve(process.cwd(),'runtime','config');
const storeFile=resolve(configDir,'prompt-versions.v1.json');

function defaultStore():PromptStore{
 return {schemaVersion:'alina-prompt-store-v1',updatedAt:null,prompts:Object.fromEntries(PROMPT_DEFINITIONS.filter(x=>x.baseVersion>0).map(def=>[def.id,{activeVersion:def.baseVersion,versions:[{version:def.baseVersion,body:def.body,review:'approved',createdAt:null,createdBy:'system',reason:'builtin baseline',source:'builtin'}]}]))};
}

export async function readPromptStore():Promise<PromptStore>{
 const base=defaultStore();
 try{
  const raw=JSON.parse(await readFile(storeFile,'utf8')) as Partial<PromptStore>;
  const merged={...base.prompts,...(raw.prompts||{})};
  for(const def of PROMPT_DEFINITIONS){
   if(def.baseVersion>0&&!merged[def.id])merged[def.id]=base.prompts[def.id];
  }
  return {schemaVersion:'alina-prompt-store-v1',updatedAt:typeof raw.updatedAt==='string'||raw.updatedAt===null?raw.updatedAt:null,prompts:merged};
 }catch{return base;}
}

async function savePromptStore(store:PromptStore){
 await mkdir(configDir,{recursive:true});
 store.updatedAt=new Date().toISOString();
 await writeFile(storeFile,JSON.stringify(store,null,2)+'\n','utf8');
}

function recordFor(store:PromptStore,id:string){const record=store.prompts[id];if(!record)throw new Error(`Неизвестный prompt id: ${id}`);return record;}
function versionFor(record:PromptRecord,version:number){const item=record.versions.find(x=>x.version===version);if(!item)throw new Error(`Версия prompt ${version} не найдена.`);return item;}

export async function effectivePrompt(promptId:string){
 const store=await readPromptStore();const record=recordFor(store,promptId);const active=versionFor(record,record.activeVersion);
 if(active.review!=='approved')throw new Error(`Активная версия ${promptId} не approved.`);
 return {promptId,version:active.version,body:active.body,review:active.review,source:active.source};
}

export async function promptCatalog(includeBodies=false){
 const store=await readPromptStore();
 return PROMPT_DEFINITIONS.map(def=>{
  const record=store.prompts[def.id];
  const active=record?.versions.find(v=>v.version===record.activeVersion);
  const latest=record?.versions.reduce<PromptVersion|undefined>((a,v)=>!a||v.version>a.version?v:a,undefined);
  return {id:def.id,task:def.task,source:def.source,status:def.status,editable:def.editable,activeVersion:record?.activeVersion||def.baseVersion,latestVersion:latest?.version||def.baseVersion,latestReview:latest?.review||(def.status==='planned'?'pending':'approved'),versionCount:record?.versions.length||0,body:includeBodies?(active?.body||def.body):undefined,latestBody:includeBodies?(latest?.body||def.body):undefined,latestCreatedAt:latest?.createdAt||null};
 });
}

export async function createPromptDraft(promptId:string,body:string,actor:string,reason:string){
 const clean=body.trim();if(clean.length<20)throw new Error('Промт слишком короткий.');if(clean.length>30000)throw new Error('Промт превышает 30000 символов.');
 const store=await readPromptStore();const record=recordFor(store,promptId);const next=Math.max(...record.versions.map(v=>v.version),0)+1;
 record.versions.push({version:next,body:clean,review:'pending',createdAt:new Date().toISOString(),createdBy:actor,reason,source:'runtime'});await savePromptStore(store);return next;
}

export async function reviewPromptVersion(promptId:string,version:number,review:PromptReview){
 const store=await readPromptStore();const item=versionFor(recordFor(store,promptId),version);item.review=review;await savePromptStore(store);return item;
}

export async function activatePromptVersion(promptId:string,version:number){
 const store=await readPromptStore();const record=recordFor(store,promptId);const item=versionFor(record,version);if(item.review!=='approved')throw new Error('Активировать можно только approved-версию промта.');record.activeVersion=version;await savePromptStore(store);return item;
}
