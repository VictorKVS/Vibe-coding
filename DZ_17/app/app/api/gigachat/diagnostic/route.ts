function env(name:string){return process.env[name]?.trim()||'';}
function safeError(error:unknown){
 const e=error as {name?:string;message?:string;cause?:{code?:string;message?:string}};
 return {name:e?.name||'Error',message:e?.message||String(error),causeCode:e?.cause?.code||null,causeMessage:e?.cause?.message||null};
}

export async function GET(){
 const auth=env('GIGACHAT_AUTH_KEY');
 const scope=env('GIGACHAT_SCOPE')||'GIGACHAT_API_PERS';
 const oauth=env('GIGACHAT_OAUTH_URL')||'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
 const base=(env('GIGACHAT_BASE_URL')||'https://api.giga.chat').replace(/\/$/,'');
 if(!auth)return Response.json({ok:false,stage:'config',configured:false,scope,error:'GIGACHAT_AUTH_KEY is not configured.'},{status:503});
 const authorization=/^Basic\s/i.test(auth)?auth:`Basic ${auth}`;
 try{
  const tokenResponse=await fetch(oauth,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','accept':'application/json','RqUID':crypto.randomUUID(),'authorization':authorization},body:new URLSearchParams({scope})});
  const tokenData=await tokenResponse.json().catch(()=>({})) as {access_token?:string;expires_at?:number;message?:string;code?:number};
  if(!tokenResponse.ok||!tokenData.access_token){
   return Response.json({ok:false,stage:'oauth',configured:true,scope,httpStatus:tokenResponse.status,error:tokenData.message||'OAuth request failed',code:tokenData.code||null,secretValuesExposed:false},{status:200});
  }
  try{
   const modelsResponse=await fetch(`${base}/v1/models`,{headers:{accept:'application/json',authorization:`Bearer ${tokenData.access_token}`}});
   const modelsData=await modelsResponse.json().catch(()=>({})) as {data?:Array<{id?:string}>;message?:string};
   if(!modelsResponse.ok){
    return Response.json({ok:false,stage:'models',configured:true,scope,httpStatus:modelsResponse.status,error:modelsData.message||'Models request failed',secretValuesExposed:false},{status:200});
   }
   const models=(modelsData.data||[]).map(x=>String(x.id||'')).filter(Boolean);
   return Response.json({ok:true,stage:'ready',configured:true,online:true,scope,modelCount:models.length,models,secretValuesExposed:false});
  }catch(error){return Response.json({ok:false,stage:'models_fetch',configured:true,scope,error:safeError(error),secretValuesExposed:false},{status:200});}
 }catch(error){return Response.json({ok:false,stage:'oauth_fetch',configured:true,scope,error:safeError(error),secretValuesExposed:false},{status:200});}
}
