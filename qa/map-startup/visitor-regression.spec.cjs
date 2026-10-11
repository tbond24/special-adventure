// Reuse the existing visitor-map tests with a loopback app and synthetic APIs.
// No production data, accounts, geolocation or map-tile services are contacted.
const {test}=require('@playwright/test');
const {install}=require('../account-drafts/synthetic-cloud.cjs');
process.env.VACANCY_E2E_URL=`http://127.0.0.1:${Number(process.env.VACANCY_PREVIEW_PORT)||8799}`;
test.describe('existing visitor-map regressions',()=>{
 test.beforeEach(async({context})=>{await install(context)});
 require('../../tests/visitor-country-map.spec.js');
});
