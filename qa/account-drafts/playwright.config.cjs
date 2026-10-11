const path=require('node:path'),fs=require('node:fs');
const localBrowser='/workspace/shared/vacancy-browser-cache/chromium_headless_shell-1193/chrome-linux/headless_shell';
const executablePath=process.env.VACANCY_BROWSER_EXECUTABLE||(fs.existsSync(localBrowser)?localBrowser:null);
const {defineConfig,devices}=require('@playwright/test');
module.exports=defineConfig({
 testDir:path.resolve(__dirname,'../../tests'),testMatch:'account-draft-flow.spec.js',timeout:60000,retries:0,workers:2,
 webServer:{command:`node "${path.join(__dirname,'server.cjs')}"`,url:'http://127.0.0.1:8784',reuseExistingServer:false},
 reporter:[['line'],['json',{outputFile:path.join(__dirname,'../../test-results/account-draft-results.json')}]],
 outputDir:path.join(__dirname,'../../test-results/account-drafts'),
 use:{baseURL:'http://127.0.0.1:8784',headless:true,serviceWorkers:'block',launchOptions:executablePath?{executablePath}:{},trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'desktop-chromium',use:{...devices['Desktop Chrome']}},{name:'mobile-chromium',use:{...devices['Pixel 7']}}]
});
