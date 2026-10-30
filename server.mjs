import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeBasePath} from './src/deployment.js';
const projectRoot=path.dirname(fileURLToPath(import.meta.url));
const root=process.env.SERVE_DIST==='1'?path.join(projectRoot,'dist'):projectRoot;
const basePath=normalizeBasePath(process.env.LITORA_BASE_PATH||'');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4','.woff2':'font/woff2'};
export function createServer(){return http.createServer((req,res)=>{
 if(req.url==='/__litora_health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({app:'litora-resort',status:'ready'}));return;}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 if(basePath){if(pathname===basePath)pathname='/';else if(pathname.startsWith(basePath+'/'))pathname=pathname.slice(basePath.length);else{res.writeHead(404).end('Outside site base path');return;}}
 let file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory()){const index=path.join(file,'index.html');file=fs.existsSync(index)?index:path.join(root,'index.html');}
 else if(!fs.existsSync(file))file=path.extname(pathname)?null:path.join(root,'index.html');
 if(!file){res.writeHead(404).end('Not found');return;}
 const stat=fs.statSync(file),headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
 if(req.headers.range){const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!match){res.writeHead(416).end();return;}const start=+match[1],end=Math.min(match[2]?+match[2]:stat.size-1,stat.size-1);if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Content-Length':end-start+1});if(req.method==='HEAD')res.end();else fs.createReadStream(file,{start,end}).pipe(res);return;}
 res.writeHead(200,{...headers,'Content-Length':stat.size});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
});}
if(process.argv[1]===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT||4173);createServer().listen(port,'127.0.0.1',()=>console.log(`LITORA preview: http://127.0.0.1:${port}`));}
