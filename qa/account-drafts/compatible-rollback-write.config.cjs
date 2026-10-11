const path = require('node:path');
const base = require('./playwright.config.cjs');
const evidence = process.env.APP_ROOT ? 'compatible-rollback-write-main-diagnostic' : 'compatible-rollback-write';

// Separate evidence from the cfa2a34 reader-only rollback run.
module.exports = {
  ...base,
  testMatch: 'compatible-rollback-write.spec.js',
  webServer: undefined,
  reporter: [['line'], ['json', {
    outputFile: path.join(__dirname, '../../test-results/' + evidence + '-results.json'),
  }]],
  outputDir: path.join(__dirname, '../../test-results/' + evidence),
};
