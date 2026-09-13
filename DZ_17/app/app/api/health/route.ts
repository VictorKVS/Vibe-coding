export async function GET(){
 return Response.json({
  ok:true,
  service:'alina-dz17',
  llmGateway:'/api/llm',
  knowledgeFactory:{
   ingest:'/api/v1/kf/ingest',
   sources:'/api/v1/kf/sources',
   trace:'/api/v1/kf/trace?source_id=<SRC-ID>',
  },
  timestamp:new Date().toISOString(),
 });
}
