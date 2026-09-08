const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const allowed = {'/':'index.html','/index.html':'index.html','/inbox.html':'inbox.html','/app.js':'app.js','/style.css':'style.css','/console.css':'console.css','/console.mjs':'console.mjs','/core.mjs':'core.mjs'};
allowed['/assets/secretary-sprite.png']='assets/secretary-sprite.png';
allowed['/voice.mjs']='voice.mjs';
for(const name of ['01-therapist.wav','02-cardiologist.wav','03-checkup.wav'])allowed['/demo-audio/'+name]='demo-audio/'+name;
const types = {'.wav':'audio/wav','.png':'image/png','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
let telegram={status:()=>({configured:false,enabled:false}),inbox:()=>[]};
import('./telegram.mjs').then(m=>{telegram=m.startTelegram(__dirname);}).catch(()=>console.error('Telegram module unavailable'));
const port = Number(process.env.PORT || 5179);
http.createServer((req,res)=>{
 const route=new URL(req.url,'http://localhost').pathname;
 if(route==='/api/telegram/status'||route==='/api/telegram/inbox'){if(req.method!=='GET'){res.writeHead(405);res.end();return;}res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(route.endsWith('status')?telegram.status():telegram.inbox()));return;}
 if(route==='/api/stt/health'||route==='/api/stt/segment'){
  if(req.headers.origin && req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403);res.end();return;}
  if((route.endsWith('health')&&req.method!=='GET')||(route.endsWith('segment')&&req.method!=='POST')){res.writeHead(405);res.end();return;}
  let size=0;const upstream=http.request({hostname:'127.0.0.1',port:8019,path:route.replace('/api/stt',''),method:req.method,headers:{'content-type':req.headers['content-type']||'application/json'}},reply=>{res.writeHead(reply.statusCode,{'Content-Type':reply.headers['content-type']||'application/json'});reply.pipe(res);});
  upstream.setTimeout(660000,()=>upstream.destroy());
  upstream.on('error',()=>{if(!res.headersSent){res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({detail:'Локальный Whisper недоступен. Запустите START_VOICE_CRM.cmd.'}));}else res.end();});
  req.on('data',chunk=>{size+=chunk.length;if(size>1200000){if(!res.headersSent){res.writeHead(413);res.end();}upstream.destroy();}});
  req.on('aborted',()=>upstream.destroy());res.on('close',()=>{if(!res.writableEnded)upstream.destroy();});req.pipe(upstream);return;
 }
 const file=allowed[route];
 if(!file){res.writeHead(404);res.end('Not found');return;}
 fs.readFile(path.join(__dirname,file),(err,data)=>{if(err){res.writeHead(500);res.end('Read error');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store'});res.end(data);});
}).listen(port,'127.0.0.1',()=>console.log(`BOOKCRAFT CRM: http://127.0.0.1:${port}`));
