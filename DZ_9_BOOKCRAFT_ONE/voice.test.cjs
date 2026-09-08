const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {JSDOM}=require(process.env.CRM_JSDOM_PATH||'jsdom');
test('Отмена доступа к микрофону не оставляет поздний поток включённым',async()=>{
 const dom=new JSDOM('<section id="voice-panel"></section>',{url:'http://localhost',runScripts:'outside-only'});const w=dom.window;let resolve,stopped=0;Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia:()=>new Promise(r=>resolve=r)}});w.MediaRecorder=class {};
 w.eval(fs.readFileSync(path.join(__dirname,'voice.mjs'),'utf8').replace(/^export /gm,''));w.mountVoice({beforeRecord:()=>{},onTranscript:()=>{}});
 const pending=w.document.querySelector('#mic-start').onclick();w.dispatchEvent(new w.Event('crm:context-changed'));resolve({getTracks:()=>[{stop:()=>stopped++}]});await pending;assert.equal(stopped,1);assert.equal(w.document.querySelector('#mic-stop').disabled,true);assert.equal(w.document.querySelector('#mic-start').disabled,false);dom.window.close();
});
test('Пустая расшифровка не отправляется; корректный текст передаётся явно',()=>{
 const dom=new JSDOM('<section id="voice-panel"></section>',{url:'http://localhost',runScripts:'outside-only'});const w=dom.window;let text='';w.eval(fs.readFileSync(path.join(__dirname,'voice.mjs'),'utf8').replace(/^export /gm,''));w.mountVoice({beforeRecord:()=>{},onTranscript:t=>text=t});w.document.querySelector('#send-transcript').click();assert.equal(text,'');w.document.querySelector('#audio-transcript').value='Хочу записаться к терапевту';w.document.querySelector('#send-transcript').click();assert.equal(text,'Хочу записаться к терапевту');dom.window.close();
});
