const path=require('node:path');
const base=require('../account-drafts/playwright.config.cjs');
const label=process.env.VACANCY_MAP_TEST_LABEL||'map-startup';
const port=Number(process.env.VACANCY_PREVIEW_PORT)||8799,baseURL=`http://127.0.0.1:${port}`;
module.exports={...base,testDir:__dirname,testMatch:'*.spec.cjs',timeout:30000,fullyParallel:true,projects:[{name:'chromium'}],workers:2,
 webServer:{command:`VACANCY_PREVIEW_PORT=${port} node "${path.join(__dirname,'server.cjs')}"`,url:baseURL,reuseExistingServer:false},
 use:{...base.use,baseURL},reporter:[['line'],['json',{outputFile:path.join(__dirname,`../../test-results/${label}.json`)}]],outputDir:path.join(__dirname,`../../test-results/${label}`)};
