const path=require('node:path');
const base=require('./playwright.config.cjs');
module.exports={...base,testMatch:'edit-draft-isolation.spec.js',webServer:undefined,
 reporter:[['line'],['json',{outputFile:path.join(__dirname,'../../test-results/edit-isolation-results.json')}]],
 outputDir:path.join(__dirname,'../../test-results/edit-isolation')};
