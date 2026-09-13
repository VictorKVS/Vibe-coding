import {persistIngestBundle} from '@/lib/knowledge-factory/repository';
import type {IngestBundle} from '@/lib/knowledge-factory/types';

export async function POST(request:Request){
 let body:IngestBundle;
 try{body=await request.json() as IngestBundle;}
 catch{return Response.json({ok:false,error:{code:'INVALID_JSON',message:'Некорректный JSON.'}},{status:400});}
 try{
  const result=await persistIngestBundle(body);
  return Response.json({ok:true,data:result,trace:{service:'knowledge-factory-ingest',schema_version:'v1',created_at:new Date().toISOString()}},{status:result.duplicate_capture?200:201});
 }catch(error){
  return Response.json({ok:false,error:{code:'INGEST_VALIDATION_ERROR',message:error instanceof Error?error.message:'Ошибка ingest.'}},{status:400});
 }
}
