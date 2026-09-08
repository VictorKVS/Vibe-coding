const fs=require('node:fs');
const path=require('node:path');
const destination=path.resolve(process.argv[2]||path.join(__dirname,'dist'));
const files=['lab.html','lab.mjs','lab.css','index.html','console.css','console.mjs','core.mjs','voice.mjs','inbox.html','app.js','style.css'];
fs.mkdirSync(destination,{recursive:true});
for(const name of files)fs.copyFileSync(path.join(__dirname,name),path.join(destination,name));
fs.mkdirSync(path.join(destination,'assets'),{recursive:true});
fs.copyFileSync(path.join(__dirname,'assets','secretary-sprite.png'),path.join(destination,'assets','secretary-sprite.png'));
console.log(`Static CRM built: ${destination}`);

fs.mkdirSync(path.join(destination,'demo-audio'),{recursive:true});
for(const name of ['01-therapist.wav','02-cardiologist.wav','03-checkup.wav'])fs.copyFileSync(path.join(__dirname,'demo-audio',name),path.join(destination,'demo-audio',name));
