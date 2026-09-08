import test from 'node:test';
import assert from 'node:assert/strict';
import {profiles,seedProfile,newSession,advance,seedPersonalHistory,metrics,summarizeSession} from './core.mjs';
for(const id of Object.keys(profiles)){
 test(`${id}: полный сценарий создаёт заявку только после подтверждения`,()=>{
  const d=seedProfile(id),p=profiles[id],item=p.catalog[0];let s=newSession(id);
  for(const text of ['new',item.id,item.stock!==undefined?'2':item.slots[0],'Виктор','viktor@example.test']){const r=advance(s,text,d);assert.equal(r.record,undefined);s=r.session;}
  assert.equal(s.step,'confirm');assert.equal(advance(s,'давайте подумаем',d).record,undefined);
  const result=advance(s,'confirm',d);assert.equal(result.session.step,'done');assert.equal(result.record.itemId,item.id);assert.equal(result.record.amount,item.price*(item.stock!==undefined?2:1));assert.equal(result.client.name,'Виктор');assert.equal(advance(result.session,'confirm',d).record,undefined);
 });
 test(`${id}: три отдельные истории Виктора и повторная инициализация без дублей`,()=>{
  const d=seedProfile(id);seedPersonalHistory(id,d);assert.equal(d.sessions.length,3);assert.equal(d.history.length,3);assert.equal(d.records.length,27);assert.equal(d.clients.filter(c=>c.contact==='viktor@example.test').length,1);
  assert.equal(new Set(d.sessions.map(s=>s.channel)).size,3);assert.equal(new Set(d.sessions.map(s=>s.itemId)).size,3);
  for(const h of d.history){assert.equal(h.text,summarizeSession(d.sessions.find(s=>s.id===h.sessionId),d));assert.match(h.text,/Учебный пример/);}
  seedPersonalHistory(id,d);assert.equal(d.records.length,27);assert.equal(d.sessions.length,3);
 });
}
test('Остаток проверяется на вводе и повторно перед подтверждением',()=>{
 const d=seedProfile('sales');let s=newSession('sales');for(const input of ['new','s1'])s=advance(s,input,d).session;
 assert.equal(advance(s,'-2',d).session.step,'quantity');assert.equal(advance(s,'1000',d).session.step,'quantity');assert.equal(advance(s,'1.5',d).session.step,'quantity');
 for(const input of ['2','Виктор','viktor@example.test'])s=advance(s,input,d).session;d.stock.s1=1;const result=advance(s,'confirm',d);assert.equal(result.record,undefined);assert.equal(result.session.step,'quantity');
});
test('Смена сценария очищает прежний выбор, человек доступен в середине диалога',()=>{
 const d=seedProfile('sport');let s=newSession('sport');for(const input of ['new','p1','Завтра, 09:00','Виктор'])s=advance(s,input,d).session;
 s=advance(s,'restart',d).session;assert.equal(s.itemId,null);assert.equal(s.slot,null);assert.equal(s.name,'');assert.equal(s.step,'item');assert.equal(advance(s,'Позовите оператора',d).session.step,'human');
});
test('Медицинские рекомендации направляются специалисту, не превращаются в ответ бота',()=>{
 const d=seedProfile('medical');assert.equal(advance(newSession('medical'),'Какие лекарства принимать?',d).session.step,'human');
});
test('Метрики вычисляются из записей и выбранного периода',()=>{
 const now=Date.now(),d=seedProfile('sales',now),m=metrics(d,30,now);assert.equal(m.records.length,24);assert.equal(m.byStage.reduce((a,b)=>a+b),24);assert.equal(m.byChannel.reduce((a,b)=>a+b.count,0),24);assert(metrics(d,7,now).records.length<24);d.records[0].stage=3;assert.equal(metrics(d,30,now).completed,m.completed+1);
});
test('Изоляция профилей и точное сопоставление контакта',()=>{
 const a=seedProfile('sales'),b=seedProfile('medical');a.settings.goal='Изменено';assert.notEqual(a.settings.goal,b.settings.goal);let s=newSession('sales');for(const input of ['new','s1','1','Другое имя','CLIENT1@example.test'])s=advance(s,input,a).session;const r=advance(s,'confirm',a);assert.equal(r.client,null);assert.equal(r.record.clientId,a.clients[0].id);
});
test('Типовые распознанные обращения сразу выбирают нужную услугу',()=>{
 const d=seedProfile('medical');for(const [text,id] of [['Хочу записаться на приём к терапевту','m1'],['Нужен кардиолог','m2'],['Мне нужен профилактический осмотр','m3']]){const result=advance(newSession('medical'),text,d);assert.equal(result.session.itemId,id);assert.equal(result.session.step,'slot');assert.equal(result.record,undefined);}
});
