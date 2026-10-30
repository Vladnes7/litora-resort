import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function run(command,args,options={}){
 const result=spawnSync(command,args,{cwd:root,stdio:'inherit',...options});
 if(result.status!==0)throw Error(`${command} failed (${result.status})`);
 return result;
}
function readGit(args){const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});if(r.status!==0)throw Error('Cannot read Git repository metadata');return r.stdout.trim();}
const remote=readGit(['remote','get-url','origin']);
const match=remote.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
if(!match)throw Error('The origin must be a GitHub repository');
const [,owner,repository]=match;
const base=process.env.LITORA_BASE_PATH??(repository.toLowerCase()===`${owner.toLowerCase()}.github.io`?'':'/'+repository);
if(readGit(['status','--porcelain','--untracked-files=normal']))throw Error('Commit source changes before publishing');
// Publishing is gated by the complete local suite, including the built project path.
run('npm',['run','check']);
run(process.execPath,['build.mjs'],{env:{...process.env,LITORA_BASE_PATH:base}});
const directory=path.join(root,'dist'),git=args=>run('git',args,{cwd:directory});
git(['init','-b','gh-pages']);
git(['config','user.name',readGit(['config','user.name'])]);
git(['config','user.email',readGit(['config','user.email'])]);
git(['remote','add','origin',remote]);
// Reuse the source repository's objects locally so existing photographs are not uploaded twice.
git(['fetch','--depth=1',root,'main']);
const exists=spawnSync('git',['ls-remote','--exit-code','--heads',remote,'gh-pages'],{cwd:root,encoding:'utf8'});
if(exists.status===0){git(['fetch','--depth=1','origin','gh-pages']);git(['update-ref','refs/heads/gh-pages','FETCH_HEAD']);}
else if(exists.status!==2)throw Error('Cannot check the existing Pages branch');
git(['add','--all']);
const changed=spawnSync('git',['diff','--cached','--quiet'],{cwd:directory});
if(changed.status===0){console.log('The published files are unchanged.');process.exit(0);}
if(changed.status!==1)throw Error('Cannot inspect the Pages changes');
git(['commit','--quiet','-m',`Publish LITORA from ${readGit(['rev-parse','--short','HEAD'])}`]);
git(['push','origin','HEAD:gh-pages']);
console.log(`Pages branch updated: https://${owner.toLowerCase()}.github.io${base}/`);
