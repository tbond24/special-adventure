const path=require('node:path');
const base=require('../account-drafts/playwright.config.cjs');
module.exports={...base,testDir:__dirname,testMatch:'*.spec.cjs',timeout:30000,projects:[{name:'chromium'}],workers:2,
 webServer:{command:`VACANCY_PREVIEW_PORT=8799 node "${path.join(__dirname,'../account-drafts/server.cjs')}"`,url:'http://127.0.0.1:8799',reuseExistingServer:false},
 use:{...base.use,baseURL:'http://127.0.0.1:8799'},reporter:[['line'],['json',{outputFile:path.join(__dirname,'../../test-results/map-startup.json')}]],outputDir:path.join(__dirname,'../../test-results/map-startup')};
