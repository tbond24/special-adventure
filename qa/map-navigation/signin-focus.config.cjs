const path = require('node:path');
const base = require('../account-drafts/playwright.config.cjs');
module.exports = {
  ...base,
  testDir: __dirname,
  testMatch: 'signin-focus.spec.cjs',
  webServer: {
    ...base.webServer,
    command: `VACANCY_PREVIEW_PORT=8793 node "${path.join(__dirname, '../account-drafts/server.cjs')}"`,
    url: 'http://127.0.0.1:8793'
  },
  use: { ...base.use, baseURL: 'http://127.0.0.1:8793' },
  reporter: [['line'], ['json', { outputFile: path.join(__dirname, '../../test-results/signin-focus.json') }]],
  outputDir: path.join(__dirname, '../../test-results/signin-focus')
};
