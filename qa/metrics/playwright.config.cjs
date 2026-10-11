const path=require('node:path');
const {defineConfig,devices}=require('@playwright/test');
module.exports=defineConfig({webServer:{command:`node ${JSON.stringify(path.join(__dirname,'server.cjs'))} repo 8804`,url:'http://127.0.0.1:8804/qa/metrics/preview.html',reuseExistingServer:false},testDir:'../../tests',testMatch:'owner-metrics-chart.spec.js',timeout:30000,workers:2,outputDir:'../../test-results/owner-metrics-chart',use:{timezoneId:'Africa/Nairobi',trace:'retain-on-failure'},projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['Pixel 7']}}]});
