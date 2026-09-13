import {listSources} from '@/lib/knowledge-factory/repository';

export async function GET(request:Request){
 const url=new URL(request.url);
 const limit=Number(url.searchParams.get('limit')||50);
 const sources=await listSources(Number.isFinite(limit)?limit:50);
 return Response.json({
  ok:true,
  data:{sources,count:sources.length},
  trace:{service:'knowledge-factory-sources',schema_version:'v1',created_at:new Date().toISOString()},
 });
}
