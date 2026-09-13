export async function GET(){
 return Response.json({
  ok:true,
  service:'wild-ideas-dz10_31',
  llmGateway:'/api/llm',
  timestamp:new Date().toISOString(),
 });
}
