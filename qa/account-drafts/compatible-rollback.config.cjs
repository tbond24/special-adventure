const path=require('node:path');
const base=require('./playwright.config.cjs');
module.exports={...base,testMatch:'compatible-rollback-media.spec.js',webServer:undefined,
 reporter:[['line'],['json',{outputFile:path.join(__dirname,'../../test-results/compatible-rollback-results.json')}]],
 outputDir:path.join(__dirname,'../../test-results/compatible-rollback')};
