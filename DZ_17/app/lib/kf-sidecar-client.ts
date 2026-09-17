const DEFAULT_BASE='http://127.0.0.1:8791';

function sidecarBase(){
 const raw=String(process.env.KF_SIDECAR_BASE_URL||DEFAULT_BASE).trim();
 return raw.replace(/\/$/,'');
}

export async function forwardToKnowledgeFactorySidecar(request:Request,path:string){
 const traceId=request.headers.get('x-trace-id')||'';
 const headers=new Headers();
 const contentType=request.headers.get('content-type');
 if(contentType)headers.set('content-type',contentType);
 if(traceId)headers.set('x-trace-id',traceId);
 const method=request.method.toUpperCase();
 const body=method==='GET'||method==='HEAD'?undefined:await request.text();
 try{
  const response=await fetch(`${sidecarBase()}${path}`,{method,headers,body});
  const outHeaders=new Headers();
  outHeaders.set('content-type',response.headers.get('content-type')||'application/json; charset=utf-8');
  const returnedTrace=response.headers.get('x-trace-id');
  if(returnedTrace)outHeaders.set('x-trace-id',returnedTrace);
  outHeaders.set('x-alina-kf-backend','node-sidecar');
  return new Response(response.body,{status:response.status,headers:outHeaders});
 }catch(error){
  const message=error instanceof Error?error.message:'Knowledge Factory sidecar unavailable';
  return Response.json({
   ok:false,
   error:{
    code:'KF_SIDECAR_UNAVAILABLE',
    message,
    hint:'Start ALINA with npm run dev:models or run npm run kf:sidecar in a separate terminal.',
   },
  },{status:503,headers:{'x-alina-kf-backend':'node-sidecar'}});
 }
}
