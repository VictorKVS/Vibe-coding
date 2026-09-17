import {forwardToKnowledgeFactorySidecar} from '@/lib/kf-sidecar-client';

export async function GET(request:Request){
 const url=new URL(request.url);
 return forwardToKnowledgeFactorySidecar(request,`/source-trace${url.search}`);
}
