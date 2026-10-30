import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {routes} from './src/content.js';
import {photos} from './src/photos.js';
import {normalizeBasePath} from './src/deployment.js';
const basePath=normalizeBasePath(process.env.LITORA_BASE_PATH||'');
const textExtensions=new Set(['.html','.js','.css','.json','.svg']);
function deployText(text){return basePath?text.replace(/(["'`(\s])\/(assets|brand|src|docs)\//g,(_,quote,directory)=>quote+basePath+'/'+directory+'/'):text;}
const root=path.dirname(fileURLToPath(import.meta.url)),dist=path.join(root,'dist');
const acceptedAssets=new Set(Object.values(photos).flatMap(p=>[p.src,...(p.srcset||'').split(',').map(s=>s.trim().split(' ')[0])]).filter(Boolean).map(s=>s.replace(/^\//,'')));
await Promise.all([...acceptedAssets].map(async rel=>{try{await fs.access(path.join(root,rel));}catch{throw new Error(`Accepted asset is missing: ${rel}`);}}));
await fs.rm(dist,{recursive:true,force:true});
await fs.mkdir(dist,{recursive:true});
async function copy(directory){for(const entry of await fs.readdir(path.join(root,directory),{withFileTypes:true})){if(['archive'].includes(entry.name))continue;const rel=path.join(directory,entry.name);if(entry.isDirectory())await copy(rel);else{if(rel.startsWith('assets/images/')&&!acceptedAssets.has(rel))continue;if(rel.startsWith('assets/fonts')&&rel.endsWith('.ttf'))continue;if(rel.startsWith('docs')&&entry.name!=='territory.json')continue;if(rel.startsWith('brand')&&!['monogram.svg','masterplan-v2-base.png'].includes(entry.name)&&!rel.startsWith('brand/plans'))continue;await fs.mkdir(path.dirname(path.join(dist,rel)),{recursive:true});if(textExtensions.has(path.extname(rel)))await fs.writeFile(path.join(dist,rel),deployText(await fs.readFile(path.join(root,rel),'utf8')));else await fs.copyFile(path.join(root,rel),path.join(dist,rel));}}}
for(const dir of ['src','assets','brand','docs'])await copy(dir);
const template=deployText((await fs.readFile(path.join(root,'index.html'),'utf8')).replace('<meta name="site-base" content="">',`<meta name="site-base" content="${basePath}">`));
for(const route of routes){const directory=path.join(dist,route.path);await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,'index.html'),template.replace('<title>LITORA — жизнь у моря</title>',`<title>${route.title} — LITORA</title>`));}
await fs.writeFile(path.join(dist,'404.html'),template);
await fs.writeFile(path.join(dist,'.nojekyll'),'');
console.log(`Built ${routes.length} routes in ${dist}`);
