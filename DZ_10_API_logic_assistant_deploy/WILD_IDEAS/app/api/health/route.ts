export async function GET(){
 return Response.json({
  ok:true,
  service:'wild-ideas-alina-zoo',
  llmGateway:'/api/llm',
  zoo:'/api/zoo',
  modelLab:'/model-lab',
  timestamp:new Date().toISOString(),
 });
}
