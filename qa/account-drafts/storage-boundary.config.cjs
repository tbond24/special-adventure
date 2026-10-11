const path=require('node:path');
const base=require('./playwright.config.cjs');
module.exports={...base,testMatch:'listing-storage-boundary.spec.js',
 webServer:{command:`VACANCY_PREVIEW_PORT=8793 node "${path.join(__dirname,'server.cjs')}"`,url:'http://127.0.0.1:8793',reuseExistingServer:false},
 use:{...base.use,baseURL:'http://127.0.0.1:8793'},
 reporter:[['line'],['json',{outputFile:path.join(__dirname,'../../test-results/storage-boundary-results.json')}]],
 outputDir:path.join(__dirname,'../../test-results/storage-boundary')};
