import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

export type RuntimePolicyState={
 version:number;
 updatedAt?:string|null;
 modelPolicies:Record<string,{enabled:boolean;security:'approved'|'review'|'blocked'}>;
 promptPolicies:Record<string,{active:boolean;review:'approved'|'pending'|'blocked';version:number}>;
 kbPolicies:Record<string,{enabled:boolean;securityHold:boolean}>;
 routeOverrides:Record<string,string>;
};

export type PolicyDecision={allowed:boolean;reason:string};

const stateFile=resolve(process.cwd(),'runtime','config','admin-control.v1.json');
const EMPTY_STATE:RuntimePolicyState={version:1,updatedAt:null,modelPolicies:{},promptPolicies:{},kbPolicies:{},routeOverrides:{}};

export async function readRuntimePolicy():Promise<RuntimePolicyState>{
 try{
  const raw=JSON.parse(await readFile(stateFile,'utf8')) as Partial<RuntimePolicyState>;
  return {
   version:typeof raw.version==='number'?raw.version:1,
   updatedAt:typeof raw.updatedAt==='string'||raw.updatedAt===null?raw.updatedAt:null,
   modelPolicies:raw.modelPolicies&&typeof raw.modelPolicies==='object'?raw.modelPolicies:{},
   promptPolicies:raw.promptPolicies&&typeof raw.promptPolicies==='object'?raw.promptPolicies:{},
   kbPolicies:raw.kbPolicies&&typeof raw.kbPolicies==='object'?raw.kbPolicies:{},
   routeOverrides:raw.routeOverrides&&typeof raw.routeOverrides==='object'?raw.routeOverrides:{},
  };
 }catch{return structuredClone(EMPTY_STATE);}
}

export function modelPolicyDecision(state:RuntimePolicyState,modelId:string):PolicyDecision{
 const policy=state.modelPolicies[modelId];
 if(!policy)return {allowed:true,reason:'no explicit policy'};
 if(!policy.enabled)return {allowed:false,reason:'model disabled by administrator'};
 if(policy.security==='blocked')return {allowed:false,reason:'model blocked by AI Security'};
 return {allowed:true,reason:policy.security==='approved'?'approved':'security review'};
}

export function promptPolicyDecision(state:RuntimePolicyState,promptId:string):PolicyDecision{
 const policy=state.promptPolicies[promptId];
 if(!policy)return {allowed:true,reason:'no explicit policy'};
 if(!policy.active)return {allowed:false,reason:'prompt version inactive'};
 if(policy.review==='blocked')return {allowed:false,reason:'prompt blocked by AI Security'};
 return {allowed:true,reason:policy.review==='approved'?'approved':'security review pending'};
}

export function kbPolicyDecision(state:RuntimePolicyState,kbId:string):PolicyDecision{
 const policy=state.kbPolicies[kbId];
 if(!policy)return {allowed:true,reason:'no explicit policy'};
 if(!policy.enabled)return {allowed:false,reason:'knowledge base disconnected by administrator'};
 if(policy.securityHold)return {allowed:false,reason:'knowledge base is on AI Security hold'};
 return {allowed:true,reason:'connected'};
}

export function routeOverrideForTask(state:RuntimePolicyState,task:string){return String(state.routeOverrides?.[task]||'').trim();}

export function promptIdForTask(task:string){
 if(task==='kb_extract')return 'PROMPT-KB-EXTRACT';
 if(task==='kb_validate')return 'PROMPT-KB-VALIDATE';
 return 'PROMPT-BASE-ALINA';
}

export function kbRefsForTask(task:string,context?:Record<string,unknown>):string[]{
 const explicit=Array.isArray(context?.kbRefs)?context?.kbRefs.filter((x):x is string=>typeof x==='string'&&Boolean(x.trim())).map(x=>x.trim()):[];
 if(explicit.length)return Array.from(new Set(explicit));
 const workflow=typeof context?.workflow==='string'?context.workflow:'';
 if(workflow==='idea_to_knowledge_base'||workflow==='kb_validation')return ['KB-FOUNDATION','KB-METHODS','KB-NARRATIVE'];
 if(task==='kb_extract'||task==='kb_validate')return ['KB-FOUNDATION','KB-METHODS'];
 return [];
}

export function evaluateKbRefs(state:RuntimePolicyState,refs:string[]):PolicyDecision{
 for(const ref of refs){const d=kbPolicyDecision(state,ref);if(!d.allowed)return {allowed:false,reason:`${ref}: ${d.reason}`};}
 return {allowed:true,reason:refs.length?'all requested KBs allowed':'no KB requested'};
}
