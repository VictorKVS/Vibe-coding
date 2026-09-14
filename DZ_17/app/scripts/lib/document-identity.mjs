const MONTHS={января:'01',февраля:'02',марта:'03',апреля:'04',мая:'05',июня:'06',июля:'07',августа:'08',сентября:'09',октября:'10',ноября:'11',декабря:'12'};

function clean(value){return String(value||'').replace(/\u0000/g,'').replace(/\s+/g,' ').trim();}
function upper(value){return clean(value).toLocaleUpperCase('ru-RU');}
function isJunkTitle(value){const v=clean(value);return !v||v.length<4||/^(microsoft word|untitled|document|pdf|скан|scan|копия)/i.test(v)||/^[\d_().-]+$/.test(v);}
function russianDateToIso(value){const m=clean(value).toLowerCase().match(/(\d{1,2})\s+([а-яё]+)\s+(\d{4})/i);if(!m||!MONTHS[m[2]])return null;return `${m[3]}-${MONTHS[m[2]]}-${String(Number(m[1])).padStart(2,'0')}`;}
function evidence(page,field,snippet){return {page,field,snippet:clean(snippet).slice(0,420)};}

function pageLines(extracted,maxPages=6){
 const out=[];
 for(const page of (extracted?.pages||[]).slice(0,maxPages)){
  const pageNo=Number(page.page_number)||1;
  for(const raw of String(page.text||'').split(/\r?\n/)){
   const text=clean(raw);if(text)out.push({page:pageNo,text,upper:upper(text)});
  }
 }
 return out;
}

function detectKind(lines){
 const joined=lines.map(x=>x.upper).join('\n');
 const patterns=[
  ['federal_law',/ФЕДЕРАЛЬНЫЙ ЗАКОН/],['presidential_decree',/УКАЗ\s+ПРЕЗИДЕНТА\s+РОССИЙСКОЙ ФЕДЕРАЦИИ/],
  ['government_resolution',/ПОСТАНОВЛЕНИЕ\s+ПРАВИТЕЛЬСТВА\s+РОССИЙСКОЙ ФЕДЕРАЦИИ/],['order',/\bПРИКАЗ\b/],
  ['gost',/\bГОСТ(?:\s+Р)?(?:\s+ИСО\/МЭК|\s+ИСО|\s+IEC|\s+ISO)?\s+[A-ZА-Я0-9][A-ZА-Я0-9.\-–/:]*/],
  ['methodical_recommendations',/МЕТОДИЧЕСК(?:ИЕ|ИХ) РЕКОМЕНДАЦ/],['requirements',/\bТРЕБОВАНИЯ\b/],
  ['regulation',/\bПОЛОЖЕНИЕ\b/],['letter',/\bПИСЬМО\b/],
 ];
 for(const [kind,re] of patterns)if(re.test(joined))return kind;
 return 'unknown';
}

function detectIssuer(lines){
 const candidates=[
  ['Правительство Российской Федерации',/ПРАВИТЕЛЬСТВО РОССИЙСКОЙ ФЕДЕРАЦИИ/],
  ['Президент Российской Федерации',/ПРЕЗИДЕНТ РОССИЙСКОЙ ФЕДЕРАЦИИ/],
  ['ФСТЭК России',/(ФЕДЕРАЛЬНАЯ СЛУЖБА ПО ТЕХНИЧЕСКОМУ И ЭКСПОРТНОМУ КОНТРОЛЮ|ФСТЭК РОССИИ)/],
  ['ФСБ России',/(ФЕДЕРАЛЬНАЯ СЛУЖБА БЕЗОПАСНОСТИ РОССИЙСКОЙ ФЕДЕРАЦИИ|ФСБ РОССИИ)/],
  ['Роскомнадзор',/(ФЕДЕРАЛЬНАЯ СЛУЖБА ПО НАДЗОРУ В СФЕРЕ СВЯЗИ,? ИНФОРМАЦИОННЫХ ТЕХНОЛОГИЙ И МАССОВЫХ КОММУНИКАЦИЙ|РОСКОМНАДЗОР)/],
  ['Минцифры России',/(МИНИСТЕРСТВО ЦИФРОВОГО РАЗВИТИЯ,? СВЯЗИ И МАССОВЫХ КОММУНИКАЦИЙ|МИНЦИФРЫ РОССИИ)/],
 ];
 for(const [issuer,re] of candidates){const hit=lines.find(x=>re.test(x.upper));if(hit)return {issuer,evidence:evidence(hit.page,'issuer',hit.text)};}
 return {issuer:null,evidence:null};
}

function detectNumberDate(lines){
 for(const row of lines){
  const m=row.text.match(/от\s+(\d{1,2}\s+[А-Яа-яЁё]+\s+\d{4}\s*г?\.?)\s*(?:№|N)\s*([0-9A-Za-zА-Яа-яЁё./\-–]+)/i);
  if(m)return {date_raw:clean(m[1]),date_iso:russianDateToIso(m[1]),number:clean(m[2]),evidence:evidence(row.page,'date_number',row.text)};
 }
 for(let i=0;i<lines.length;i++){
  const d=lines[i].text.match(/(\d{1,2}\s+[А-Яа-яЁё]+\s+\d{4}\s*г?\.?)/i);if(!d)continue;
  for(let j=i;j<Math.min(i+4,lines.length);j++){
   const n=lines[j].text.match(/(?:№|N)\s*([0-9A-Za-zА-Яа-яЁё./\-–]+)/i);if(n)return {date_raw:clean(d[1]),date_iso:russianDateToIso(d[1]),number:clean(n[1]),evidence:evidence(lines[j].page,'date_number',`${lines[i].text} ${lines[j].text}`)};
  }
 }
 return {date_raw:null,date_iso:null,number:null,evidence:null};
}

function detectGost(lines){
 for(let i=0;i<lines.length;i++){
  const m=lines[i].text.match(/\b(ГОСТ(?:\s+Р)?(?:\s+ИСО\/МЭК|\s+ИСО|\s+ISO\/IEC|\s+ISO|\s+IEC)?\s+[A-ZА-Я0-9][A-ZА-Я0-9.\-–/:]*(?:-\d{4})?)/i);
  if(!m)continue;
  const titleParts=[];
  for(let j=i+1;j<Math.min(i+6,lines.length);j++){
   const t=lines[j].text;if(/^(Москва|Стандартинформ|Предисловие|Содержание)$/i.test(t))break;if(t.length>=5&&t.length<=220)titleParts.push(t);if(titleParts.join(' ').length>260)break;
  }
  const subject=clean(titleParts.join(' '));
  return {number:clean(m[1]),subject:subject||null,evidence:evidence(lines[i].page,'standard_id',lines[i].text),subjectEvidence:subject?evidence(lines[i+1]?.page||lines[i].page,'subject',subject):null};
 }
 return null;
}

function detectSubject(lines,kind){
 const startIndex=Math.max(0,lines.findIndex(x=>kind==='federal_law'?/ФЕДЕРАЛЬНЫЙ ЗАКОН/.test(x.upper):kind==='government_resolution'?/ПОСТАНОВЛЕНИЕ/.test(x.upper):kind==='order'?/\bПРИКАЗ\b/.test(x.upper):false));
 for(let i=startIndex;i<Math.min(lines.length,startIndex+35);i++){
  if(/^(О|ОБ)\s+[А-ЯЁ]/i.test(lines[i].text)&&lines[i].text.length<300){
   const parts=[lines[i].text];
   for(let j=i+1;j<Math.min(i+4,lines.length);j++){
    const n=lines[j].text;
    if(/^(ПРИНЯТ|ОДОБРЕН|ЗАРЕГИСТРИРОВАН|Москва|от\s+\d|№|N\s*\d)/i.test(n))break;
    if(n.length>3&&n.length<220&&!/^[А-ЯЁ ]+$/.test(n))parts.push(n);else break;
   }
   return {subject:clean(parts.join(' ')),evidence:evidence(lines[i].page,'subject',parts.join(' '))};
  }
 }
 return {subject:null,evidence:null};
}

function detectSecurityDomain(text){
 const t=upper(text);
 const terms=[
  ['personal_data',/ПЕРСОНАЛЬН(?:ЫХ|ЫЕ|ЫМИ) ДАНН/],['kii',/(КРИТИЧЕСКОЙ ИНФОРМАЦИОННОЙ ИНФРАСТРУКТУР|\bКИИ\b)/],
  ['information_security',/(ИНФОРМАЦИОННОЙ БЕЗОПАСНОСТ|ЗАЩИТ[АЕЫ] ИНФОРМАЦИ|БЕЗОПАСНОСТИ ИНФОРМАЦИИ)/],
  ['state_secret',/ГОСУДАРСТВЕНН(?:ОЙ|АЯ) ТАЙН/],['cryptography',/(КРИПТОГРАФ|ШИФРОВАЛ|СКЗИ)/],
  ['fstec',/ФСТЭК/],['fsb',/ФСБ РОССИИ/],['gis_security',/(ГОСУДАРСТВЕНН(?:ОЙ|ЫЕ) ИНФОРМАЦИОНН(?:ОЙ|ЫЕ) СИСТЕМ|\bГИС\b)/],
 ];
 return terms.filter(([,re])=>re.test(t)).map(([tag])=>tag);
}

function chooseMetadataTitle(metadata){
 const entries=Object.entries(metadata||{});for(const [key,value] of entries){if(/title/i.test(key)&&!isJunkTitle(value))return clean(value);}return null;
}

export function identifyDocument(extracted,{filename=''}={}){
 const lines=pageLines(extracted,6);const joined=lines.map(x=>x.text).join('\n');const kind=detectKind(lines);const issuerHit=detectIssuer(lines);const nd=detectNumberDate(lines);const gost=kind==='gost'?detectGost(lines):null;const subj=kind==='gost'?{subject:gost?.subject||null,evidence:gost?.subjectEvidence||null}:detectSubject(lines,kind);
 const securityTags=detectSecurityDomain(joined);const metadataTitle=chooseMetadataTitle(extracted?.metadata);
 let documentNumber=nd.number,subject=subj.subject,fullTitle=null,confidence=0.35,titleBasis='unresolved';const ev=[];
 if(issuerHit.evidence)ev.push(issuerHit.evidence);if(nd.evidence)ev.push(nd.evidence);if(subj.evidence)ev.push(subj.evidence);
 if(kind==='gost'&&gost){documentNumber=gost.number;ev.push(gost.evidence);if(gost.subjectEvidence)ev.push(gost.subjectEvidence);fullTitle=subject?`${gost.number}. ${subject}`:gost.number;confidence=subject?0.93:0.78;titleBasis='document_text_standard_heading';}
 else if(kind==='federal_law'&&documentNumber&&subject){fullTitle=`Федеральный закон${nd.date_raw?` от ${nd.date_raw.replace(/\s*г\.?$/i,'')}`:''} № ${documentNumber} «${subject}»`;confidence=0.96;titleBasis='document_text_legal_heading';}
 else if(kind==='government_resolution'&&documentNumber&&subject){fullTitle=`Постановление Правительства Российской Федерации${nd.date_raw?` от ${nd.date_raw.replace(/\s*г\.?$/i,'')}`:''} № ${documentNumber} «${subject}»`;confidence=0.96;titleBasis='document_text_legal_heading';}
 else if(kind==='presidential_decree'&&documentNumber&&subject){fullTitle=`Указ Президента Российской Федерации${nd.date_raw?` от ${nd.date_raw.replace(/\s*г\.?$/i,'')}`:''} № ${documentNumber} «${subject}»`;confidence=0.95;titleBasis='document_text_legal_heading';}
 else if(kind==='order'&&documentNumber&&subject){const issuer=issuerHit.issuer||'неустановленного органа';fullTitle=`Приказ ${issuer}${nd.date_raw?` от ${nd.date_raw.replace(/\s*г\.?$/i,'')}`:''} № ${documentNumber} «${subject}»`;confidence=issuerHit.issuer?0.95:0.82;titleBasis='document_text_legal_heading';}
 else if(metadataTitle){fullTitle=metadataTitle;confidence=0.58;titleBasis='pdf_metadata_title';ev.push(evidence(1,'metadata_title',metadataTitle));}
 else {const first=lines.find(x=>x.text.length>=8&&x.text.length<=220&&!/^(Москва|Содержание|Предисловие)$/i.test(x.text));fullTitle=first?.text||filename||'Неидентифицированный документ';confidence=first?0.45:0.2;titleBasis=first?'first_observed_line':'filename_fallback';if(first)ev.push(evidence(first.page,'title_candidate',first.text));}
 const isLegal=['federal_law','presidential_decree','government_resolution','order','letter','regulation','requirements'].includes(kind);
 const isStandard=kind==='gost';
 const collection=securityTags.length?(isLegal?'legal_ib':isStandard?'standards_ib':'ib_reference'):(isLegal?'legal_general':isStandard?'standards_general':'unclassified');
 const requiredMissing=[];if(['federal_law','presidential_decree','government_resolution','order'].includes(kind)){if(!documentNumber)requiredMissing.push('document_number');if(!subject)requiredMissing.push('subject');}if(!fullTitle)requiredMissing.push('full_title');
 return {
  schema_version:'alina-document-identity-v1',
  filename_alias:filename||null,
  document_type:kind,
  issuer:issuerHit.issuer,
  document_number:documentNumber,
  document_date_raw:nd.date_raw,
  document_date_iso:nd.date_iso,
  subject,
  full_title:fullTitle,
  title_basis:titleBasis,
  title_confidence:Number(confidence.toFixed(2)),
  language:'ru',
  security_tags:securityTags,
  collection,
  legal_status:'pending_official_verification',
  required_missing:requiredMissing,
  needs_review:confidence<0.9||requiredMissing.length>0,
  evidence:ev,
  note:'Название определяется по содержимому документа; имя файла является только alias/fallback и не считается юридически значимым источником.',
 };
}

export function identitySummary(identity){return `${identity.document_type} | ${identity.collection} | ${identity.full_title} | confidence=${identity.title_confidence}${identity.needs_review?' | REVIEW':''}`;}
