import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {profiles,seedProfile,newSession,advance,optionsFor,summarizeSession} from './core.mjs';

export function startTelegram(root,{fetch:fetchFn=globalThis.fetch}={}){
 const configFile=path.join(root,'.runtime','telegram.json');let config={};try{config=JSON.parse(fs.readFileSync(configFile,'utf8').replace(/^\uFEFF/,''));}catch{}
 const token=process.env.TELEGRAM_BOT_TOKEN||config.token,allowed=String(process.env.TELEGRAM_ALLOWED_CHAT_ID||config.chatId||''),ffmpeg=process.env.FFMPEG_PATH||config.ffmpeg||'',decoderPython=process.env.CRM_AUDIO_PYTHON||config.python;
 const stateFile=path.join(root,'.runtime','telegram-state.json');let state={offset:0,profiles:{},sessions:{},inbox:[]};try{state=JSON.parse(fs.readFileSync(stateFile,'utf8'));}catch{}
 let running=false,lastError='',username='',stopping=false;
 const persist=()=>{fs.mkdirSync(path.dirname(stateFile),{recursive:true});const tmp=stateFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(state));fs.renameSync(tmp,stateFile);};
 const api=async(method,body)=>{const r=await fetchFn(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(method==='getUpdates'?35000:30000)});const json=await r.json();if(!r.ok||!json.ok)throw Error('Telegram API не выполнил запрос. Проверьте настройку и сеть.');return json.result;};
 const send=async(chatId,text,session)=>api('sendMessage',{chat_id:chatId,text:text.slice(0,4000),reply_markup:{keyboard:(session?optionsFor(session):[]).map(o=>[{text:o.label}]),resize_keyboard:true,one_time_keyboard:false}});
 async function transcribe(file){
  if(file.file_size>20*1024*1024)throw Error('Запись больше 20 МБ. Пришлите более короткий файл.');
  const info=await api('getFile',{file_id:file.file_id});if(!info.file_path)throw Error('Telegram не вернул файл.');
  const response=await fetchFn(`https://api.telegram.org/file/bot${token}/${info.file_path}`,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Не удалось скачать аудио из Telegram.');
  const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>20*1024*1024){await response.body.cancel().catch(()=>{});throw Error('Запись больше 20 МБ.');}chunks.push(chunk);}
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'bookcraft-telegram-'));
  try{
   const input=path.join(folder,'input'),output=path.join(folder,'audio.raw');fs.writeFileSync(input,Buffer.concat(chunks));
   await new Promise((resolve,reject)=>{const command=ffmpeg||decoderPython||'python';const args=ffmpeg?['-nostdin','-v','error','-y','-i',input,'-t','601','-ac','1','-ar','16000','-f','s16le',output]:[path.join(root,'decode-audio.py'),input,output];const proc=spawn(command,args,{windowsHide:true,stdio:'ignore'});const timer=setTimeout(()=>{proc.kill();reject(Error('Преобразование аудио заняло слишком много времени.'));},60000);proc.once('error',()=>{clearTimeout(timer);reject(Error('Декодер аудио не найден. Проверьте локальную настройку Telegram.'));});proc.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(Error('Файл не удалось прочитать. Пришлите WAV, MP3 или OGG/Opus до 10 минут; для M4A нужен FFmpeg.'));});});
   const pcm=fs.readFileSync(output);if(!pcm.length||pcm.length>600*32000)throw Error('Запись должна содержать звук и длиться не более 10 минут.');const texts=[];
   for(let offset=0;offset<pcm.length;offset+=30*32000){const chunk=pcm.subarray(offset,offset+30*32000),header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+chunk.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(16000,24);header.writeUInt32LE(32000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(chunk.length,40);const form=new FormData();form.append('audio',new Blob([header,chunk],{type:'audio/wav'}),'segment.wav');const r=await fetchFn('http://127.0.0.1:8019/segment',{method:'POST',body:form,signal:AbortSignal.timeout(660000)});if(!r.ok)throw Error('Whisper недоступен или не обработал запись. Запустите локальный сервис и повторите.');const result=await r.json();if(typeof result.text==='string')texts.push(result.text);}
   if(!texts.join('').trim())throw Error('Речь не обнаружена. Пришлите другую запись.');return texts.join('\n');
  }finally{for(const name of ['input','audio.raw']){try{fs.unlinkSync(path.join(folder,name));}catch{}}fs.rmdirSync(folder);}
 }
 async function handle(update){
  if(state.inbox.some(item=>item.id===`telegram-${update.update_id}`))return;const msg=update.message;if(!msg||String(msg.chat.id)!==allowed)return;const key=String(msg.chat.id);let current=state.sessions[key];
  const command=(msg.text||'').split(' ')[0].replace(/^\//,'');
  if(command==='start'||profiles[command]){const id=profiles[command]?command:'sales';state.profiles[id]??=seedProfile(id);current=newSession(id,'Telegram',`Я Алина, демонстрационный секретарь. ${profiles[id].greeting}\n\nПрофили: /sales /medical /sport /auto /massage /warehouse. Новый диалог: /start. Записи, заявки и ответы — учебные, без реальной покупки или бронирования.`);state.sessions[key]=current;persist();await send(msg.chat.id,current.messages[0].text,current);return;}
  if(!current){await send(msg.chat.id,'Начните с /start или выберите профиль: /medical /sport /auto /massage /warehouse.');return;}
  let text=msg.text||'',file=msg.voice||msg.audio||(msg.document&&/\.(wav|mp3|ogg|oga|m4a|webm)$/i.test(msg.document.file_name||'')?msg.document:null);
  if(file){await send(msg.chat.id,'Запись получена. Распознаю речь локальным Whisper…');text=await transcribe(file);await send(msg.chat.id,`Распознано:\n${text}`);}
  if(!text){await send(msg.chat.id,'Пришлите текст, голосовое сообщение или аудиофайл MP3/WAV/OGG/M4A.');return;}
  const choice=optionsFor(current).find(o=>o.label===text);const d=state.profiles[current.profile],result=advance(current,choice?.value||text,d);current=result.session;state.sessions[key]=current;
  if(result.client)d.clients.push(result.client);if(result.record){d.records.unshift(result.record);if(d.stock[result.record.itemId]!==undefined)d.stock[result.record.itemId]-=result.record.quantity;}
  const item={id:`telegram-${update.update_id}`,created:new Date().toISOString(),profile:current.profile,text,reply:current.messages.at(-1).text,audio:!!file,session:current,analysis:summarizeSession(current,d),record:result.record||d.records.find(r=>r.id===current.recordId)||null};state.inbox=[item,...state.inbox].slice(0,30);persist();await send(msg.chat.id,item.reply,current);
 }
 async function loop(){if(!token||!allowed)return;running=true;try{username=(await api('getMe',{})).username||'';const hook=await api('getWebhookInfo',{});if(hook.url){lastError='У бота уже настроен webhook. Используйте отдельного бота.';running=false;return;}}catch{lastError='Не удалось подключить Telegram. Проверьте токен и сеть.';running=false;return;}
  while(!stopping){try{const updates=await api('getUpdates',{offset:state.offset,timeout:25,allowed_updates:['message']});for(const u of updates){try{await handle(u);}catch(e){lastError=e.message;if(String(u.message?.chat.id)===allowed)await send(u.message.chat.id,e.message).catch(()=>{});}state.offset=u.update_id+1;persist();}lastError='';}catch{lastError='Нет связи с Telegram. Повтор подключения через 5 секунд.';await new Promise(r=>setTimeout(r,5000));}}
 }
 const finished=loop();return {finished,status:()=>({configured:!!token,enabled:running,restrictedChat:!!allowed,username,error:lastError,requires:token?(allowed?[]:['chatId']):['token','chatId']}),inbox:()=>state.inbox,stop:()=>{stopping=true;}};
}
