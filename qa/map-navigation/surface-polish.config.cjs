const path=require('node:path');
const base=require('../account-drafts/playwright.config.cjs');
module.exports={...base,testDir:__dirname,testMatch:'surface-polish.spec.cjs',workers:2,projects:[{name:'chromium'}],webServer:{command:`VACANCY_PREVIEW_PORT=8801 node "${path.join(__dirname,'../account-drafts/server.cjs')}"`,url:'http://127.0.0.1:8801',reuseExistingServer:false},use:{...base.use,baseURL:'http://127.0.0.1:8801'},reporter:[['line'],['json',{outputFile:path.join(__dirname,'../../test-results/surface-polish.json')}]],outputDir:path.join(__dirname,'../../test-results/surface-polish')};
