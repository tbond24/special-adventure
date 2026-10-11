const path=require('node:path');const base=require('./playwright.config.cjs');
module.exports={...base,testMatch:'listing-storage-boundary.spec.js',reporter:[['line'],['json',{outputFile:path.join(__dirname,'../../test-results/storage-boundary-results.json')}]],outputDir:path.join(__dirname,'../../test-results/storage-boundary')};
