const path=require('node:path');
const {defineConfig,devices}=require('@playwright/test');
const base=require('../account-drafts/playwright.config.cjs');
const appOrigin='http://127.0.0.1:8806',previewOrigin='http://127.0.0.1:8807';
process.env.VACANCY_METRICS_PREVIEW_URL=previewOrigin;
module.exports=defineConfig({
 ...base,
 testDir:path.resolve(__dirname,'../../tests'),
 testMatch:['owner-metrics-chart.spec.js','owner-metrics-listing.spec.js','dashboard-photo-copy.spec.js'],
 webServer:[
  {command:`node ${JSON.stringify(path.join(__dirname,'server.cjs'))} app 8806`,url:appOrigin,reuseExistingServer:false},
  {command:`node ${JSON.stringify(path.join(__dirname,'server.cjs'))} repo 8807`,url:previewOrigin+'/qa/metrics/preview.html',reuseExistingServer:false}
 ],
 reporter:[['line'],['json',{outputFile:path.join(__dirname,'../../test-results/dashboard-photo-copy-results.json')}]],
 outputDir:path.join(__dirname,'../../test-results/dashboard-photo-copy'),
 use:{...base.use,baseURL:appOrigin,timezoneId:'Africa/Nairobi'},
 projects:[{name:'desktop-chromium',use:{...devices['Desktop Chrome']}},{name:'mobile-chromium',use:{...devices['Pixel 7']}}]
});
