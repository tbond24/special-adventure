const path=require('node:path'),base=require('./playwright.config.cjs');
module.exports={...base,testMatch:['listing-create-leave-guard.spec.js','listing-create-save-local.spec.js','listing-guest-dashboard.spec.js'],
 reporter:[['line'],['json',{outputFile:path.join(__dirname,'../../test-results/create-leave-guard.json')}]],
 outputDir:path.join(__dirname,'../../test-results/create-leave-guard')};
