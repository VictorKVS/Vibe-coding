type PromptDescriptor={id:string;task:string;source:string;status:'active'|'planned';editable:boolean};

const prompts:PromptDescriptor[]=[
 {id:'PROMPT-BASE-ALINA',task:'dialogue/synthesis/architecture/vision',source:'app/api/llm/route.ts',status:'active',editable:false},
 {id:'PROMPT-KB-EXTRACT',task:'kb_extract',source:'app/api/llm/route.ts',status:'active',editable:false},
 {id:'PROMPT-KB-VALIDATE',task:'kb_validate',source:'app/api/llm/route.ts',status:'active',editable:false},
 {id:'PROMPT-SENIOR-REVIEW',task:'senior_review',source:'knowledge_base/analyst_method_cards.v1.json',status:'planned',editable:false},
];

const kbConnections=[
 {id:'KB-FOUNDATION',label:'Universal Foundation / Analyst Meta-KB',path:'../knowledge_base',kind:'foundation',status:'configured'},
 {id:'KB-SOURCES',label:'Source Registry',path:'../knowledge_base/source_registry.v1.json',kind:'registry',status:'configured'},
 {id:'KB-METHODS',label:'Analyst Method Cards',path:'../knowledge_base/analyst_method_cards.v1.json',kind:'methods',status:'configured'},
 {id:'KB-NARRATIVE',label:'Narrative Domain Profile',path:'../profiles/narrative.v1.json',kind:'domain_profile',status:'configured'},
 {id:'KB-OSINT',label:'OSINT Domain Profile',path:'../profiles/osint.v1.json',kind:'domain_profile',status:'planned'},
 {id:'KB-CYBER',label:'Cybersecurity Domain Profile',path:'../profiles/cybersecurity.v1.json',kind:'domain_profile',status:'planned'},
];

export async function GET(){
 const databaseConfigured=Boolean(process.env.DATABASE_URL||process.env.POSTGRES_URL);
 const auditConfigured=Boolean(process.env.AUDIT_DATABASE_URL||databaseConfigured);
 return Response.json({
  schemaVersion:'alina-admin-config-v1',
  mode:'read_only_preview',
  warning:'Server-side authentication/RBAC is not implemented yet. This endpoint never returns secrets or secret values.',
  roles:['ADMINISTRATOR','IB_AI_SECURITY'],
  prompts,
  knowledgeBases:kbConnections,
  database:{
   target:'PostgreSQL + pgvector',
   configured:databaseConfigured,
   connectionValueExposed:false,
   eventAuditConfigured:auditConfigured,
   objectStorage:'MinIO/S3 — planned',
  },
  security:{
   secretsExposed:false,
   promptBodiesExposed:false,
   privilegedWritesEnabled:false,
   auditRequired:true,
   modelIntegrity:'hash/approval workflow — planned',
   kbIntegrity:'provenance/version checks — documented',
  },
 });
}
