const {test, expect} = require('@playwright/test');

test('public auth and error pages render while external browser connections are denied', async ({page, context}) => {
  // No network mocks: CSP itself must deny browser egress.
  const external = [];
  context.on('response', response => {
    if (!response.url().startsWith('http://127.0.0.1:8776/')) external.push(response.url());
  });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#auth');
  await expect(page.locator('#authUnified')).toBeVisible();
  await expect(page.locator('#authUnified [name=email]')).toBeVisible();
  expect(await page.locator('.brand-logo').first().evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  const result = await page.evaluate(async () => {
    try { await fetch('https://example.invalid/workspace-egress-probe'); return 'allowed'; }
    catch { return 'denied'; }
  });
  expect(result).toBe('denied');
  await page.goto('/404.html');
  await expect(page.getByRole('link', {name:'Back to Find', exact:true})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('synthetic admin supports failure and recovery without hosted services', async ({page}) => {
  await page.goto('/__admin-preview');
  await page.waitForFunction(() => window.__visualReady === true);
  await expect(page.locator('.visual-fixture-banner')).toContainText('SYNTHETIC DATA');
  await expect(page.locator('.journey-flow-panel')).toBeVisible();
  await page.selectOption('#visualScenario', 'error');
  await expect(page.locator('.journey-state[role=alert]')).toContainText('Journey report unavailable');
  await page.selectOption('#visualScenario', 'normal');
  await expect(page.locator('.journey-flow-panel')).toBeVisible();
  expect(await page.evaluate(() => VACANCY_BACKEND.adminMembership())).toBe(true);
});
