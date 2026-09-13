import {persistIngestBundle} from '@/lib/knowledge-factory/repository';
import type {IngestBundle} from '@/lib/knowledge-factory/types';
import {recordTrace,requestTraceId,traceHeaders} from '@/lib/trace';

export async function POST(request:Request){
 const traceId=requestTraceId(request,'KF-INGEST');
 const started=Date.now();
 await recordTrace({trace_id:traceId,source:'http',stage:'A1',action:'kf.ingest',status:'start',route:'/api/v1/kf/ingest',method:'POST'});
 let body:IngestBundle;
 try{body=await request.json() as IngestBundle;}
 catch{
  await recordTrace({trace_id:traceId,source:'http',stage:'A1',action:'kf.ingest',status:'error',route:'/api/v1/kf/ingest',method:'POST',duration_ms:Date.now()-started,details:{code:'INVALID_JSON'}});
  return Response.json({ok:false,error:{code:'INVALID_JSON',message:'Некорректный JSON.'},trace:{trace_id:traceId}},{status:400,headers:traceHeaders(traceId)});
 }
 try{
  const result=await persistIngestBundle(body);
  await recordTrace({trace_id:traceId,source:'http',stage:'A1',action:'kf.ingest',status:'ok',route:'/api/v1/kf/ingest',method:'POST',duration_ms:Date.now()-started,details:{source_id:result.source_id,capture_id:result.capture_id,source_spans:result.source_spans,duplicate_capture:result.duplicate_capture}});
  return Response.json({ok:true,data:result,trace:{trace_id:traceId,service:'knowledge-factory-ingest',schema_version:'v1',created_at:new Date().toISOString()}},{status:result.duplicate_capture?200:201,headers:traceHeaders(traceId)});
 }catch(error){
  const message=error instanceof Error?error.message:'Ошибка ingest.';
  await recordTrace({trace_id:traceId,source:'http',stage:'A1',action:'kf.ingest',status:'error',route:'/api/v1/kf/ingest',method:'POST',duration_ms:Date.now()-started,details:{code:'INGEST_VALIDATION_ERROR',message}});
  return Response.json({ok:false,error:{code:'INGEST_VALIDATION_ERROR',message},trace:{trace_id:traceId}},{status:400,headers:traceHeaders(traceId)});
 }
}
