import {getSourceTrace} from '@/lib/knowledge-factory/repository';
import {recordTrace,requestTraceId,traceHeaders} from '@/lib/trace';

export async function GET(request:Request){
 const traceId=requestTraceId(request,'KF-TRACE');
 const started=Date.now();
 const url=new URL(request.url);
 const sourceId=String(url.searchParams.get('source_id')||'').trim();
 await recordTrace({trace_id:traceId,source:'http',stage:'TRACE',action:'kf.source.trace',status:'start',route:'/api/v1/kf/trace',method:'GET',details:{source_id:sourceId||null}});
 if(!sourceId){
  await recordTrace({trace_id:traceId,source:'http',stage:'TRACE',action:'kf.source.trace',status:'error',route:'/api/v1/kf/trace',method:'GET',duration_ms:Date.now()-started,details:{code:'SOURCE_ID_REQUIRED'}});
  return Response.json({ok:false,error:{code:'SOURCE_ID_REQUIRED',message:'source_id обязателен.'},trace:{trace_id:traceId}},{status:400,headers:traceHeaders(traceId)});
 }
 try{
  const trace=await getSourceTrace(sourceId);
  if(!trace){
   await recordTrace({trace_id:traceId,source:'http',stage:'TRACE',action:'kf.source.trace',status:'error',route:'/api/v1/kf/trace',method:'GET',duration_ms:Date.now()-started,details:{code:'SOURCE_NOT_FOUND',source_id:sourceId}});
   return Response.json({ok:false,error:{code:'SOURCE_NOT_FOUND',message:'Source не найден.'},trace:{trace_id:traceId}},{status:404,headers:traceHeaders(traceId)});
  }
  await recordTrace({trace_id:traceId,source:'http',stage:'TRACE',action:'kf.source.trace',status:'ok',route:'/api/v1/kf/trace',method:'GET',duration_ms:Date.now()-started,details:{source_id:sourceId,captures:trace.captures.length}});
  return Response.json({
   ok:true,
   data:trace,
   trace:{trace_id:traceId,service:'knowledge-factory-trace',schema_version:'v1',created_at:new Date().toISOString()},
  },{headers:traceHeaders(traceId)});
 }catch(error){
  const message=error instanceof Error?error.message:'Ошибка trace.';
  await recordTrace({trace_id:traceId,source:'http',stage:'TRACE',action:'kf.source.trace',status:'error',route:'/api/v1/kf/trace',method:'GET',duration_ms:Date.now()-started,details:{message,source_id:sourceId}});
  return Response.json({ok:false,error:{code:'TRACE_ERROR',message},trace:{trace_id:traceId}},{status:400,headers:traceHeaders(traceId)});
 }
}
