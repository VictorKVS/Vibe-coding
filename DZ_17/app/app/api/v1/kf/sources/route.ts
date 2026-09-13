import {listSources} from '@/lib/knowledge-factory/repository';
import {recordTrace,requestTraceId,traceHeaders} from '@/lib/trace';

export async function GET(request:Request){
 const traceId=requestTraceId(request,'KF-SOURCES');
 const started=Date.now();
 const url=new URL(request.url);
 const limit=Number(url.searchParams.get('limit')||50);
 await recordTrace({trace_id:traceId,source:'http',stage:'A1',action:'kf.sources.list',status:'start',route:'/api/v1/kf/sources',method:'GET',details:{limit:Number.isFinite(limit)?limit:50}});
 try{
  const sources=await listSources(Number.isFinite(limit)?limit:50);
  await recordTrace({trace_id:traceId,source:'http',stage:'A1',action:'kf.sources.list',status:'ok',route:'/api/v1/kf/sources',method:'GET',duration_ms:Date.now()-started,details:{count:sources.length}});
  return Response.json({
   ok:true,
   data:{sources,count:sources.length},
   trace:{trace_id:traceId,service:'knowledge-factory-sources',schema_version:'v1',created_at:new Date().toISOString()},
  },{headers:traceHeaders(traceId)});
 }catch(error){
  const message=error instanceof Error?error.message:'Ошибка списка источников.';
  await recordTrace({trace_id:traceId,source:'http',stage:'A1',action:'kf.sources.list',status:'error',route:'/api/v1/kf/sources',method:'GET',duration_ms:Date.now()-started,details:{message}});
  return Response.json({ok:false,error:{code:'SOURCE_LIST_ERROR',message},trace:{trace_id:traceId}},{status:500,headers:traceHeaders(traceId)});
 }
}
