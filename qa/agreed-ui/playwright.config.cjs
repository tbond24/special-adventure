const path=require('node:path');
const base=require('../account-drafts/playwright.config.cjs');
module.exports={...base,testMatch:'agreed-ui-controls.spec.js',
 webServer:{command:`VACANCY_PREVIEW_PORT=8816 node "${path.join(__dirname,'../account-drafts/server.cjs')}"`,url:'http://127.0.0.1:8816',reuseExistingServer:false},
 use:{...base.use,baseURL:'http://127.0.0.1:8816'},
 reporter:[['line'],['json',{outputFile:path.join(__dirname,'../../test-results/agreed-ui.json')}]],outputDir:path.join(__dirname,'../../test-results/agreed-ui')};
