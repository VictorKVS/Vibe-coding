const fs=require('node:fs');
const path=require('node:path');
const destination=path.resolve(process.argv[2]||path.join(__dirname,'dist'));
const files=['index.html','console.css','console.mjs','core.mjs','inbox.html','app.js','style.css'];
fs.mkdirSync(destination,{recursive:true});
for(const name of files)fs.copyFileSync(path.join(__dirname,name),path.join(destination,name));
fs.mkdirSync(path.join(destination,'assets'),{recursive:true});
fs.copyFileSync(path.join(__dirname,'assets','secretary-sprite.png'),path.join(destination,'assets','secretary-sprite.png'));
console.log(`Static CRM built: ${destination}`);
