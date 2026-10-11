const path = require('node:path');
const base = require('./playwright.config.cjs');
const port = Number(process.env.VACANCY_PREVIEW_PORT) || 8797;
module.exports = {
  ...base,
  testMatch: 'listing-first-entry.spec.js',
  fullyParallel: true,
  webServer: {
    command: `VACANCY_PREVIEW_PORT=${port} node "${path.join(__dirname, 'server.cjs')}"`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  reporter: [['line'], ['json', { outputFile: path.join(__dirname, '../../test-results/first-entry.json') }]],
  outputDir: path.join(__dirname, '../../test-results/first-entry'),
};
