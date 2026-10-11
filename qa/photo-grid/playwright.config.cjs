const path=require('node:path');
const base=require('../account-drafts/playwright.config.cjs');
module.exports={...base,fullyParallel:true,testDir:__dirname,testMatch:'photo-grid.spec.cjs',projects:[{name:'chromium'}],reporter:[['line'],['json',{outputFile:path.join(__dirname,'../../test-results/photo-grid-results.json')}]],outputDir:path.join(__dirname,'../../test-results/photo-grid')};
