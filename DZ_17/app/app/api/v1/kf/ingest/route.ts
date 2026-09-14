import {forwardToKnowledgeFactorySidecar} from '@/lib/kf-sidecar-client';

export async function POST(request:Request){
 return forwardToKnowledgeFactorySidecar(request,'/ingest');
}
