const path=require('node:path');
const {defineConfig,devices}=require('@playwright/test');
module.exports=defineConfig({
  testDir:path.resolve(__dirname,'../../tests'),timeout:60000,retries:0,workers:2,
  webServer:{command:`node "${path.join(__dirname,'server.cjs')}"`,url:'http://127.0.0.1:8776',reuseExistingServer:false},
  reporter:[['line'],['json',{outputFile:process.env.VACANCY_REPORT||path.join(__dirname,'../../test-results/repair-results.json')}]],
  outputDir:process.env.VACANCY_TEST_RESULTS||path.join(__dirname,'../../test-results/repair-browser'),
  use:{baseURL:'http://127.0.0.1:8776',headless:true,launchOptions:process.env.VACANCY_BROWSER_EXECUTABLE?{executablePath:process.env.VACANCY_BROWSER_EXECUTABLE}:{},trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[{name:'desktop-chromium',use:{...devices['Desktop Chrome']}},{name:'mobile-chromium',use:{...devices['Pixel 7']}}]
});
