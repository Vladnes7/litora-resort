import {defineConfig,devices} from '@playwright/test';
const port=process.env.LITORA_TEST_PORT||'4183';
const prefix=process.env.LITORA_TEST_BASE_PATH??'/litora-resort';
const external=process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:true,forbidOnly:!!process.env.CI,
 retries:process.env.CI?1:0,workers:process.env.CI?2:3,timeout:45_000,
 expect:{timeout:10_000},
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:external||`http://127.0.0.1:${port}${prefix}/`,trace:'retain-on-failure',screenshot:'only-on-failure',video:'retain-on-failure',launchOptions:{args:['--disable-features=PointerLockOptions']},...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})},
 projects:[
  {name:'desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}},
  {name:'mobile',use:{...devices['Pixel 7'],defaultBrowserType:'chromium'}}
 ],
 webServer:external?undefined:{command:'node scripts/serve-test.mjs',url:`http://127.0.0.1:${port}/__litora_health`,reuseExistingServer:false,timeout:30_000}
});
