#!/usr/bin/env node
import {identifyDocument} from './lib/document-identity.mjs';
function extracted(text){return {metadata:{},pages:[{page_number:1,text}]};}
function assert(c,m){if(!c)throw new Error(m);}
const cases=[
 {name:'152-FZ',text:'ФЕДЕРАЛЬНЫЙ ЗАКОН\nО персональных данных\nПринят Государственной Думой\n27 июля 2006 года N 152-ФЗ',check:x=>x.document_type==='federal_law'&&x.document_number==='152-ФЗ'&&/О персональных данных/.test(x.full_title)&&x.collection==='legal_ib'},
 {name:'PP1119',text:'ПРАВИТЕЛЬСТВО РОССИЙСКОЙ ФЕДЕРАЦИИ\nПОСТАНОВЛЕНИЕ\nот 1 ноября 2012 г. N 1119\nОб утверждении требований к защите персональных данных при их обработке в информационных системах персональных данных',check:x=>x.document_type==='government_resolution'&&x.document_number==='1119'&&x.issuer==='Правительство Российской Федерации'&&x.collection==='legal_ib'},
 {name:'FSTEC order',text:'ФЕДЕРАЛЬНАЯ СЛУЖБА ПО ТЕХНИЧЕСКОМУ И ЭКСПОРТНОМУ КОНТРОЛЮ\nПРИКАЗ\nот 11 февраля 2013 г. N 17\nОб утверждении Требований о защите информации, не составляющей государственную тайну, содержащейся в государственных информационных системах',check:x=>x.document_type==='order'&&x.document_number==='17'&&x.issuer==='ФСТЭК России'&&x.collection==='legal_ib'},
 {name:'GOST',text:'ГОСТ Р 57580.1-2017\nБезопасность финансовых (банковских) операций\nЗащита информации финансовых организаций',check:x=>x.document_type==='gost'&&/ГОСТ Р 57580.1-2017/.test(x.document_number)&&x.collection==='standards_ib'},
];
for(const c of cases){const id=identifyDocument(extracted(c.text),{filename:'short.pdf'});assert(c.check(id),`${c.name} failed: ${JSON.stringify(id)}`);console.log(`[IDENTITY] PASS ${c.name} → ${id.full_title}`);}
console.log(`[IDENTITY] ${cases.length}/${cases.length} fixtures passed`);
