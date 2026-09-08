const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {JSDOM}=require(process.env.CRM_JSDOM_PATH||'jsdom');
test('Полный UI: история, профили, сценарии, ошибка, отмена, создание и сохранение заявки',async()=>{
 const core=await import(pathToFileURL(path.join(__dirname,'core.mjs')));
 const dom=new JSDOM(fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),{url:'http://localhost:5179',runScripts:'outside-only'});
 const w=dom.window,d=w.document;w.structuredClone=structuredClone;w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 for(const [k,v] of Object.entries(core))w[k]=v;w.mountVoice=()=>{};
 const source=fs.readFileSync(path.join(__dirname,'console.mjs'),'utf8').replace(/^import [^\r\n]+\r?\n/gm,'');
 w.eval(source);
 const click=s=>{const el=d.querySelector(s);assert(el,`Element ${s}`);el.click();};
 const store=()=>JSON.parse(w.localStorage.getItem('bookcraft.one.mvp.v2'));
 const send=async text=>{d.querySelector('#chat-input').value=text;d.querySelector('#chat-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,770));};
 try{
  assert.equal(d.querySelectorAll('.kpi').length,4);
  click('[data-page="personal"]');assert.equal(d.querySelectorAll('.history-entry').length,3);
  let h=store().profiles.sales.history[0];click(`[data-history="${h.id}"]`);assert.equal(d.querySelector('.result-text').textContent,h.text);click('[data-close="info-dialog"]');
  click('[data-page="scenarios"]');d.querySelector('#greeting').value='Здравствуйте, я Алина.';d.querySelector('#scenario-form').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(store().profiles.sales.settings.greeting,'Здравствуйте, я Алина.');
  click('[data-open-bot]');assert.equal(d.querySelector('#chat-messages').textContent,'Здравствуйте, я Алина.');
  const historyBefore=JSON.stringify(store().profiles.sales.history);d.querySelector('#chat-input').value='Черновик';click('#clear-chat');assert.equal(d.querySelector('#chat-input').value,'');assert.equal(JSON.stringify(store().profiles.sales.history),historyBefore);
  d.querySelector('#simulate-failure').checked=true;await send('Хочу купить');assert.match(d.querySelector('#chat-status').textContent,/Сервис недоступен/);assert.equal(d.querySelector('#chat-input').value,'Хочу купить');assert.equal(store().profiles.sales.sessions[0].messages.length,1);
  d.querySelector('#simulate-failure').checked=false;
  d.querySelector('#chat-form').dispatchEvent(new w.Event('submit',{cancelable:true}));click('#cancel-chat');await new Promise(r=>setTimeout(r,770));assert.equal(store().profiles.sales.sessions[0].messages.length,1);
  for(const input of ['new','s1','1','Виктор','viktor@example.test'])await send(input);
  assert.equal(store().profiles.sales.records.length,27);await send('confirm');assert.equal(store().profiles.sales.records.length,28);assert.equal(store().profiles.sales.stock.s1,11);assert.equal(store().profiles.sales.clients.filter(c=>c.contact==='viktor@example.test').length,1);
  click('[data-close="bot-dialog"]');click('[data-page="dialogs"]');click('[data-analyze-session]');assert.equal(store().profiles.sales.history.length,3);assert.equal(store().profiles.sales.history[0].sessionId,store().profiles.sales.sessions[0].id);
  click('#workspace');click('[data-profile="medical"]');assert.equal(store().active,'medical');assert.equal(store().profiles.medical.records.length,27);click('[data-page="personal"]');assert.equal(d.querySelectorAll('.history-entry').length,3);assert.match(d.querySelector('#page').textContent,/Приём терапевта/);
  h=store().profiles.medical.history[1];click(`[data-history="${h.id}"]`);assert.equal(d.querySelector('.result-text').textContent,h.text);click('[data-close="info-dialog"]');
  click('[data-page="integrations"]');click('[data-integration="0"]');assert.match(d.querySelector('#info-title').textContent,/Telegram/);
  assert(!d.querySelectorAll('script[src^="http"]').length);
 }finally{dom.window.close();}
});
