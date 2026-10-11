// Synthetic regression coverage for existing account, recovery and MFA contracts.
require('../repair-oct08/safe-fixtures.cjs');
process.env.VACANCY_E2E_URL='http://127.0.0.1:8800';
const path=require('node:path');
const base=require('../account-drafts/playwright.config.cjs');
module.exports={...base,
 grep:/account|profile|YOU|signout|MFA|admin route|setup |Google|name retained|stored photo|deletion|guarded endpoint|cached former/,
 testMatch:/(find-list-account-stability|stage58-marketplace|stage77-admin-mfa|stage79-contact-preferences|stage86-ratings-gate|stage36-experience|google-account-name|account-deletion-unavailable|oct08-ui-repairs)\.spec\.js$/,
 webServer:{command:`VACANCY_PREVIEW_PORT=8800 node "${path.join(__dirname,'../account-drafts/server.cjs')}"`,url:'http://127.0.0.1:8800',reuseExistingServer:false},
 reporter:[['line'],['json',{outputFile:path.join(__dirname,'../../test-results/you-page-legacy-results.json')}]],
 outputDir:path.join(__dirname,'../../test-results/you-page-legacy'),
 use:{...base.use,baseURL:'http://127.0.0.1:8800'}
};
