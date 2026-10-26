const {defineConfig, devices} = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  testMatch: ['admin-capacity.workspace.spec.js', 'admin-active-now.workspace.spec.js', 'admin-accuracy.workspace.spec.js', 'admin-theme.workspace.spec.js', 'analytics-identity.workspace.spec.js', 'engagement-client.workspace.spec.js', 'admin-activity-feeds.workspace.spec.js', 'visitor-presence-client.workspace.spec.js', 'live-analytics.workspace.spec.js', 'admin-journey-map.workspace.spec.js', 'workspace-preview.spec.js', 'admin-language-controls.spec.js', 'admin-overview-cards.workspace.spec.js'],
  timeout: 60000,
  retries: 0,
  workers: 2,
  reporter: 'list',
  // Intentionally independent of the legacy config's production default.
  use: {baseURL: 'http://127.0.0.1:8776', trace: 'off', screenshot: 'only-on-failure', serviceWorkers: 'block'},
  webServer: {
    command: 'node scripts/dev-server.mjs',
    url: 'http://127.0.0.1:8776/',
    reuseExistingServer: false,
    env: {VACANCY_DEV_HOST: '127.0.0.1', VACANCY_DEV_PORT: '8776'},
    timeout: 30000
  },
  projects: [
    {name: 'desktop-chromium', use: {...devices['Desktop Chrome']}},
    {name: 'mobile-chromium', use: {...devices['Pixel 7']}}
  ]
});
