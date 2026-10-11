const path=require('node:path');
const base=require('./playwright.config.cjs');
module.exports={...base,testMatch:'save-exit-durability.spec.js',timeout:45000,
 reporter:[['line'],['json',{outputFile:path.join(__dirname,'../../test-results/save-exit-results.json')}]],
 outputDir:path.join(__dirname,'../../test-results/save-exit')};
