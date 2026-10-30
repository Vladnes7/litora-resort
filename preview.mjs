import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),port=4173,url=`http://127.0.0.1:${port}`,dir=path.join(root,'.preview');
function health(){return new Promise(resolve=>{const req=http.get(url+'/__litora_health',res=>{let data='';res.on('data',c=>data+=c);res.on('end',()=>{try{resolve(JSON.parse(data).app==='litora-resort')}catch{resolve(false)}})});req.setTimeout(1200,()=>req.destroy());req.on('error',()=>resolve(false));});}
if(await health()){console.log(`LITORA is available: ${url}`);process.exit(0);}
if(process.argv.includes('--status')){console.log('LITORA preview is stopped. Start it with npm run preview.');process.exit(1);}
fs.mkdirSync(dir,{recursive:true});const fd=fs.openSync(path.join(dir,'server.log'),'a');
const child=spawn(process.execPath,[path.join(root,'server.mjs')],{cwd:root,detached:true,stdio:['ignore',fd,fd]});
child.unref();fs.closeSync(fd);fs.writeFileSync(path.join(dir,'server.pid'),String(child.pid));
for(let i=0;i<30;i++){await new Promise(resolve=>setTimeout(resolve,100));if(await health()){console.log(`LITORA preview started independently of the chat: ${url}`);process.exit(0);}}
console.error('Preview did not start. See .preview/server.log.');process.exit(1);
