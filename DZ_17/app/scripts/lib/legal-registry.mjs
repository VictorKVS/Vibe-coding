import {createHash} from 'node:crypto';

function clean(value){return String(value??'').trim();}
function hash16(value){return createHash('sha256').update(String(value),'utf8').digest('hex').slice(0,16).toUpperCase();}
function sameIdentity(document,candidate){
 if(document.source_id&&candidate.source_id&&document.source_id===candidate.source_id)return true;
 const aType=clean(document.document_type),bType=clean(candidate.identity?.document_type);
 const aNum=clean(document.document_number),bNum=clean(candidate.identity?.document_number);
 const aDate=clean(document.document_date_iso),bDate=clean(candidate.identity?.document_date_iso);
 return Boolean(aType&&bType&&aType===bType&&aNum&&bNum&&aNum===bNum&&aDate&&bDate&&aDate===bDate);
}
function captureView(candidate){
 return {
  capture_id:candidate.capture_id,
  sha256:candidate.sha256,
  observed_full_title:candidate.identity?.full_title||null,
  title_confidence:candidate.identity?.title_confidence??null,
  source_locators:Array.isArray(candidate.identity?.evidence)?candidate.identity.evidence:[],
  ingested_at:candidate.created_at||new Date().toISOString(),
 };
}
function titles(document,candidate){
 const values=[document.full_title,...(document.observed_titles||[]),candidate.identity?.full_title].map(clean).filter(Boolean);
 return Array.from(new Set(values));
}

export function mergeLegalCandidate(registry,candidate){
 if(!registry||!Array.isArray(registry.documents))throw new Error('Invalid legal registry.');
 if(!candidate?.source_id||!candidate?.capture_id||!candidate?.sha256||!candidate?.identity)throw new Error('Candidate identity/source/capture/SHA required.');

 for(const document of registry.documents){
  const captures=Array.isArray(document.captures)?document.captures:[];
  if(captures.some(c=>String(c?.sha256||'').toLowerCase()===String(candidate.sha256).toLowerCase())||String(document.sha256||'').toLowerCase()===String(candidate.sha256).toLowerCase()){
   return {registry,result:{written:false,reason:'sha256 duplicate',document_id:document.document_id,capture_id:candidate.capture_id,capture_count:Math.max(captures.length,1)}};
  }
 }

 const existing=registry.documents.find(document=>sameIdentity(document,candidate));
 if(existing){
  const capture=captureView(candidate);
  existing.captures=Array.isArray(existing.captures)?existing.captures:[];
  if(existing.capture_id&&existing.sha256&&!existing.captures.some(c=>c.capture_id===existing.capture_id)){
   existing.captures.push({capture_id:existing.capture_id,sha256:existing.sha256,observed_full_title:existing.full_title||null,title_confidence:null,source_locators:existing.source_locators||[],ingested_at:existing.created_at||null});
  }
  existing.captures.push(capture);
  existing.capture_count=existing.captures.length;
  existing.latest_capture_id=candidate.capture_id;
  existing.observed_titles=titles(existing,candidate);
  existing.updated_at=new Date().toISOString();
  delete existing.capture_id;
  delete existing.sha256;
  if(clean(existing.full_title)!==clean(candidate.identity.full_title)){
   existing.review_status='pending';
   existing.identity_conflict=true;
  }
  return {registry,result:{written:true,action:'capture_appended',document_id:existing.document_id,capture_id:candidate.capture_id,capture_count:existing.capture_count,identity_conflict:Boolean(existing.identity_conflict)}};
 }

 const identity=candidate.identity;
 const capture=captureView(candidate);
 const document={
  document_id:`DOC-${hash16(candidate.source_id)}`,
  source_id:candidate.source_id,
  full_title:identity.full_title,
  document_type:identity.document_type,
  issuer:identity.issuer,
  document_number:identity.document_number,
  document_date_raw:identity.document_date_raw,
  document_date_iso:identity.document_date_iso,
  subject:identity.subject,
  language:identity.language,
  security_tags:identity.security_tags,
  collection:identity.collection,
  origin_class:'SOURCE_DERIVED',
  source_locators:identity.evidence,
  status:'proposed',
  review_status:'pending',
  legal_status:'pending_official_verification',
  captures:[capture],
  capture_count:1,
  latest_capture_id:candidate.capture_id,
  observed_titles:[identity.full_title].filter(Boolean),
  identity_conflict:false,
  created_at:candidate.created_at||new Date().toISOString(),
  updated_at:candidate.created_at||new Date().toISOString(),
 };
 registry.documents.push(document);
 return {registry,result:{written:true,action:'document_created',document_id:document.document_id,capture_id:candidate.capture_id,capture_count:1,identity_conflict:false}};
}
