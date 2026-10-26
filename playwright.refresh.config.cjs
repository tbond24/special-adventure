const {defineConfig}=require('@playwright/test');
const ui=require('./playwright.ui.config.cjs');
module.exports=defineConfig({...ui,testMatch:['refresh-stability.spec.js'],timeout:90000,
  outputDir:'test-results/refresh',reporter:[['list'],['html',{outputFolder:'playwright-report/refresh',open:'never'}]],
  use:{...ui.use,trace:'on',video:'retain-on-failure'}});
