const path=require('node:path'),base=require('../account-drafts/playwright.config.cjs');
module.exports={...base,testDir:__dirname,testMatch:'palette.spec.cjs',projects:[{name:'chromium'}],reporter:[['line'],['json',{outputFile:path.join(__dirname,'../../test-results/map-palette.json')}]],outputDir:path.join(__dirname,'../../test-results/map-palette')};
