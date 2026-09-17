export async function GET(){
 const sidecarBase=String(process.env.KF_SIDECAR_BASE_URL||'http://127.0.0.1:8791').replace(/\/$/,'');
 let sidecarReady=false;
 try{
  const response=await fetch(`${sidecarBase}/health`,{signal:AbortSignal.timeout(800)});
  sidecarReady=response.ok;
 }catch{}
 return Response.json({
  ok:true,
  service:'alina-dz17',
  llmGateway:'/api/llm',
  knowledgeFactory:{
   backend:'node-sidecar',
   sidecarReady,
   ingest:'/api/v1/kf/ingest',
   sources:'/api/v1/kf/sources',
   sourceTrace:'/api/v1/kf/trace?source_id=<SRC-ID>',
   structureProposal:'/api/v1/kf/structure?capture_id=<CAP-ID>',
   runtimeTrace:'/api/v1/trace?limit=100',
   runtimeTraceById:'/api/v1/trace?trace_id=<TRACE-ID>',
   runtimeTraceByTest:'/api/v1/trace?test_id=<TEST-ID>',
  },
  timestamp:new Date().toISOString(),
 });
}
