import {getSourceTrace} from '@/lib/knowledge-factory/repository';

export async function GET(request:Request){
 const url=new URL(request.url);
 const sourceId=String(url.searchParams.get('source_id')||'').trim();
 if(!sourceId)return Response.json({ok:false,error:{code:'SOURCE_ID_REQUIRED',message:'source_id обязателен.'}},{status:400});
 try{
  const trace=await getSourceTrace(sourceId);
  if(!trace)return Response.json({ok:false,error:{code:'SOURCE_NOT_FOUND',message:'Source не найден.'}},{status:404});
  return Response.json({
   ok:true,
   data:trace,
   trace:{service:'knowledge-factory-trace',schema_version:'v1',created_at:new Date().toISOString()},
  });
 }catch(error){
  return Response.json({ok:false,error:{code:'TRACE_ERROR',message:error instanceof Error?error.message:'Ошибка trace.'}},{status:400});
 }
}
