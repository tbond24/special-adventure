const path = require('node:path');
const {defineConfig} = require('@playwright/test');
module.exports = defineConfig({
  testDir:path.resolve(__dirname, '../../tests'),
  testMatch:'listing-accordion.spec.js',
  timeout:45000, expect:{timeout:7000}, retries:0, workers:2,
  webServer:{command:`node "${path.join(__dirname, 'server.cjs')}"`, url:'http://127.0.0.1:8777', reuseExistingServer:false},
  reporter:[['line'], ['json', {outputFile:path.join(__dirname, '../../test-results/listing-accordion-results.json')}]],
  outputDir:path.join(__dirname, '../../test-results/listing-accordion-browser'),
  use:{baseURL:'http://127.0.0.1:8777', headless:true, viewport:{width:390,height:844}, launchOptions:process.env.VACANCY_BROWSER_EXECUTABLE ? {executablePath:process.env.VACANCY_BROWSER_EXECUTABLE} : {}, trace:'retain-on-failure', screenshot:'only-on-failure'},
});
