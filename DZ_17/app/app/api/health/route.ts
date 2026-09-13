export async function GET(){
 return Response.json({
  ok:true,
  service:'alina-dz17',
  llmGateway:'/api/llm',
  knowledgeFactory:{
   ingest:'/api/v1/kf/ingest',
   sources:'/api/v1/kf/sources',
   sourceTrace:'/api/v1/kf/trace?source_id=<SRC-ID>',
   runtimeTrace:'/api/v1/trace?limit=100',
   runtimeTraceById:'/api/v1/trace?trace_id=<TRACE-ID>',
   runtimeTraceByTest:'/api/v1/trace?test_id=<TEST-ID>',
  },
  timestamp:new Date().toISOString(),
 });
}
