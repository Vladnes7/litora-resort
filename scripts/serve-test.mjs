import {spawnSync} from 'node:child_process';
process.env.LITORA_BASE_PATH=process.env.LITORA_TEST_BASE_PATH??'/litora-resort';
process.env.SERVE_DIST='1';
process.env.PORT=process.env.LITORA_TEST_PORT||'4183';
const built=spawnSync(process.execPath,['build.mjs'],{stdio:'inherit',env:process.env});
if(built.status!==0)process.exit(built.status||1);
const {createServer}=await import('../server.mjs');
createServer().listen(Number(process.env.PORT),'127.0.0.1',()=>console.log('LITORA production test server ready'));
