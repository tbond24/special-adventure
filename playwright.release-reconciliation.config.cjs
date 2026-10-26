// Exact curated candidate only. No hosted services or production data.
const {defineConfig}=require('@playwright/test');
const ui=require('./playwright.ui.config.cjs');
module.exports=defineConfig({...ui,
 testMatch:['ui-anomalies.spec.js','ui-rest.spec.js','refresh-stability.spec.js','messaging-safety.spec.js'],
 grepInvert:/@visual/,
 timeout:90000,
 outputDir:'test-results/release-reconciliation',
 reporter:[['list']],
 use:{...ui.use,baseURL:'http://127.0.0.1:8785',trace:'off',video:'off'},
 webServer:{command:'node scripts/test-production-candidate-server.mjs',url:'http://127.0.0.1:8785/',reuseExistingServer:false,timeout:30000}
});
