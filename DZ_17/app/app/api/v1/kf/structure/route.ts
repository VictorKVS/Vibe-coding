import {forwardToKnowledgeFactorySidecar} from '@/lib/kf-sidecar-client';

export async function GET(request:Request){
 const url=new URL(request.url);
 return forwardToKnowledgeFactorySidecar(request,`/structure-proposal${url.search}`);
}

export async function POST(request:Request){
 return forwardToKnowledgeFactorySidecar(request,'/structure-proposal');
}
