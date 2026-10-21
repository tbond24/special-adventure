const {defineConfig} = require('@playwright/test');
const workspace = require('./playwright.workspace.config.cjs');

// Inherit the isolated server, never the legacy production-targeting config.
module.exports = defineConfig({
  ...workspace,
  testMatch: ['ui-anomalies.spec.js', 'listing-create-navigation.spec.js'],
  outputDir: 'test-results/ui',
  reporter: [['list'], ['html', {outputFolder:'playwright-report/ui', open:'never'}]],
  snapshotPathTemplate: '{testDir}/ui-snapshots/{platform}/{projectName}/{arg}{ext}',
  use: {
    ...workspace.use,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-GB', timezoneId: 'Australia/Perth',
    reducedMotion: 'reduce', colorScheme: 'light',
  },
  projects: [
    {name:'narrow-320', use:{viewport:{width:320,height:844},isMobile:true,hasTouch:true}},
    {name:'mobile-390', use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
    {name:'tablet-820', use:{viewport:{width:820,height:1180},hasTouch:true}},
    {name:'desktop-1440', use:{viewport:{width:1440,height:1000}}},
  ],
});
