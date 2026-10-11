const path=require('node:path');
const base=require('./playwright.config.cjs');
module.exports={...base,testMatch:'listing-create-navigation.spec.js',workers:2,
 reporter:[['line'],['json',{outputFile:path.join(__dirname,'../../test-results/create-navigation.json')}]],
 outputDir:path.join(__dirname,'../../test-results/create-navigation'),
 projects:[320,390,430,1280].map(width=>({name:`width-${width}`,use:{viewport:{width,height:844}}}))};
