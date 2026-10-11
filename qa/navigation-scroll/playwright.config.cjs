const path=require('node:path');
const base=require('../account-drafts/playwright.config.cjs');
module.exports={...base,testMatch:'navigation-scroll.spec.js',workers:2,
 webServer:{command:`VACANCY_PREVIEW_PORT=8790 node "${path.join(__dirname,'../account-drafts/server.cjs')}"`,url:'http://127.0.0.1:8790',reuseExistingServer:false},
 reporter:[['line'],['json',{outputFile:path.join(__dirname,'../../test-results/navigation-scroll-results.json')}]],
 outputDir:path.join(__dirname,'../../test-results/navigation-scroll'),
 use:{...base.use,baseURL:'http://127.0.0.1:8790'}
};
