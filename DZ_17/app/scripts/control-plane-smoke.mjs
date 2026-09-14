#!/usr/bin/env node

const args=process.argv.slice(2);
const value=(name,fallback='')=>{const i=args.indexOf(name);return i>=0&&args[i+1]?args[i+1]:fallback};
const base=value('--base','http://127.0.0.1:3000').replace(/\/$/,'');
const adminToken=process.env.ALINA_ADMIN_TOKEN||'';
const securityToken=process.env.ALINA_SECURITY_TOKEN||'';
const reason='CI control-plane smoke';
let originalPromptVersion=1;

function assert(condition,message){if(!condition)throw new Error(message)}
async function request(path,options={}){
 const response=await fetch(`${base}${path}`,options);
 const text=await response.text();
 let data={};try{data=text?JSON.parse(text):{}}catch{data={raw:text}}
 return {response,data,text};
}
async function mutate(role,token,action,target,value){
 const {response,data}=await request('/api/admin/config',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${token}`},body:JSON.stringify({role,action,target,value,reason})});
 assert(response.ok,`${role} ${action} ${target} failed: HTTP ${response.status} ${JSON.stringify(data)}`);
 return data;
}
async function expectDenied(task,code,context){
 const {response,data}=await request('/api/llm',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({selection:'demo',task,messages:[{role:'user',content:'CI policy probe'}],context})});
 assert(response.status===403,`${task} expected 403, got ${response.status}: ${JSON.stringify(data)}`);
 assert(data.code===code,`${task} expected ${code}, got ${data.code||'no code'}`);
}

async function cleanup(){
 const steps=[
  ['admin',adminToken,'model.set_enabled','demo',true],
  ['security',securityToken,'model.set_security','demo','review'],
  ['security',securityToken,'prompt.set_review','PROMPT-BASE-ALINA','approved'],
  ['security',securityToken,'kb.set_hold','KB-FOUNDATION',false],
  ['admin',adminToken,'route.set_override','dialogue',''],
  ['admin',adminToken,'prompt.activate_version','PROMPT-BASE-ALINA',originalPromptVersion],
 ];
 for(const [role,token,action,target,value] of steps){
  try{await mutate(role,token,action,target,value)}catch(error){console.warn('[CONTROL-PLANE] cleanup warning:',error instanceof Error?error.message:error)}
 }
}

async function main(){
 assert(adminToken,'ALINA_ADMIN_TOKEN is required');
 assert(securityToken,'ALINA_SECURITY_TOKEN is required');
 let failed=false;
 try{
  const initial=await request('/api/admin/config');
  assert(initial.response.ok,'GET /api/admin/config failed');
  assert(initial.data?.auth?.adminConfigured===true,'admin role must be configured');
  assert(initial.data?.auth?.securityConfigured===true,'security role must be configured');
  assert(initial.data?.auth?.tokenValuesExposed===false,'token values must never be exposed');

  const deniedBodies=await request('/api/admin/config?include_prompt_bodies=1&role=admin');
  assert(deniedBodies.response.status===401,'prompt bodies must require authorization');
  const secured=await request('/api/admin/config?include_prompt_bodies=1&role=admin',{headers:{authorization:`Bearer ${adminToken}`}});
  assert(secured.response.ok,'authorized prompt registry read failed');
  const basePrompt=secured.data?.promptRegistry?.find?.(x=>x.id==='PROMPT-BASE-ALINA');
  assert(basePrompt&&typeof basePrompt.activeBody==='string','authorized prompt body missing');
  originalPromptVersion=basePrompt.activeVersion||1;

  await mutate('admin',adminToken,'model.set_enabled','demo',false);
  let llm=await request('/api/llm');
  let demo=llm.data?.models?.find?.(x=>x.id==='demo');
  assert(demo&&demo.available===false,'Admin disable must remove demo from effective catalog');

  await mutate('admin',adminToken,'model.set_enabled','demo',true);
  await mutate('security',securityToken,'model.set_security','demo','blocked');
  llm=await request('/api/llm');demo=llm.data?.models?.find?.(x=>x.id==='demo');
  assert(demo&&demo.available===false,'Security block must remove demo from effective catalog');

  await mutate('security',securityToken,'model.set_security','demo','review');
  await mutate('admin',adminToken,'route.set_override','dialogue','demo');
  llm=await request('/api/llm');
  assert(llm.data?.routeOverrides?.dialogue==='demo','Admin route override must be persisted');
  assert(Array.isArray(llm.data?.routes?.dialogue)&&llm.data.routes.dialogue[0]==='demo','Allowed route override must become first AUTO candidate');
  await mutate('admin',adminToken,'route.set_override','dialogue','');

  await mutate('security',securityToken,'prompt.set_review','PROMPT-BASE-ALINA','blocked');
  await expectDenied('dialogue','PROMPT_POLICY_DENY');
  await mutate('security',securityToken,'prompt.set_review','PROMPT-BASE-ALINA','approved');

  const marker=`CI_PROMPT_VERSION_${Date.now()}`;
  const created=await mutate('admin',adminToken,'prompt.create_draft','PROMPT-BASE-ALINA',{body:`${basePrompt.activeBody}\n\n${marker}: сохраняй проверяемое происхождение решений.`});
  const draftVersion=created.data?.result?.version||created.result?.version;
  assert(Number.isInteger(draftVersion)&&draftVersion>originalPromptVersion,'prompt draft version was not created');
  const afterDraft=await request('/api/admin/config?include_prompt_bodies=1&role=security',{headers:{authorization:`Bearer ${securityToken}`}});
  const reviewedPrompt=afterDraft.data?.promptRegistry?.find?.(x=>x.id==='PROMPT-BASE-ALINA');
  const draft=reviewedPrompt?.versions?.find?.(x=>x.version===draftVersion);
  assert(draft?.review==='pending'&&draft?.body?.includes(marker),'Security reviewer must see pending draft body');
  await mutate('security',securityToken,'prompt.review_version','PROMPT-BASE-ALINA',{version:draftVersion,review:'approved'});
  await mutate('admin',adminToken,'prompt.activate_version','PROMPT-BASE-ALINA',draftVersion);
  const promptProbe=await request('/api/llm',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({selection:'demo',task:'dialogue',messages:[{role:'user',content:'CI active prompt version probe'}]})});
  assert(promptProbe.response.ok,'LLM prompt version probe failed');
  assert(promptProbe.data?.promptVersion===draftVersion,`LLM did not use activated prompt version v${draftVersion}`);
  await mutate('admin',adminToken,'prompt.activate_version','PROMPT-BASE-ALINA',originalPromptVersion);

  await mutate('security',securityToken,'kb.set_hold','KB-FOUNDATION',true);
  await expectDenied('kb_extract','KB_POLICY_DENY',{workflow:'idea_to_knowledge_base'});
  await mutate('security',securityToken,'kb.set_hold','KB-FOUNDATION',false);

  const final=await request('/api/admin/config');
  assert(final.response.ok,'final GET /api/admin/config failed');
  assert(Array.isArray(final.data?.audit)&&final.data.audit.length>=12,'audit ledger must contain privileged events');
  const serialized=JSON.stringify(final.data);
  assert(!serialized.includes(adminToken),'admin token leaked in API response');
  assert(!serialized.includes(securityToken),'security token leaked in API response');
  assert(!serialized.includes(marker),'prompt body leaked in unprivileged API response');
  console.log(`[CONTROL-PLANE] PASS · state v${final.data?.control?.version||'?'} · audit ${final.data.audit.length} · prompt v${draftVersion} reviewed/activated/rolled back`);
 }catch(error){failed=true;console.error('[CONTROL-PLANE] FAIL',error);}
 finally{await cleanup();}
 if(failed)process.exit(1);
}

main().catch(error=>{console.error(error);process.exit(1)});
