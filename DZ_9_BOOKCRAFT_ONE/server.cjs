const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const allowed = {'/':'index.html','/index.html':'index.html','/inbox.html':'inbox.html','/app.js':'app.js','/style.css':'style.css','/console.css':'console.css','/console.mjs':'console.mjs','/core.mjs':'core.mjs'};
allowed['/assets/secretary-sprite.png']='assets/secretary-sprite.png';
const types = {'.png':'image/png','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const port = Number(process.env.PORT || 5179);
http.createServer((req,res)=>{
 const file=allowed[new URL(req.url,'http://localhost').pathname];
 if(!file){res.writeHead(404);res.end('Not found');return;}
 fs.readFile(path.join(__dirname,file),(err,data)=>{if(err){res.writeHead(500);res.end('Read error');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store'});res.end(data);});
}).listen(port,'127.0.0.1',()=>console.log(`BOOKCRAFT CRM: http://127.0.0.1:${port}`));
