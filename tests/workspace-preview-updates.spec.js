const {test, expect} = require('@playwright/test');

async function updates(context, request) {
  const initial = await (await request.get('/__preview/status')).json();
  const state = {initial, snapshot:initial, disconnected:false};
  await context.route('**/__preview/status', async route => {
    if (state.disconnected) return route.fulfill({status:503, body:'Unavailable'});
    await route.fulfill({json:state.snapshot});
    if (state.once) { state.snapshot = initial; state.once = false; }
  });
  await context.route(url => url.pathname === '/styles.css' && url.searchParams.has('__preview'), async route => {
    const response = await route.fetch();
    await route.fulfill({response, body:await response.text() + '\n#authUnified{outline:3px solid rgb(12, 90, 123)}'});
  });
  state.css = () => { state.snapshot = {...initial, revision:'a'.repeat(12), styles:{...initial.styles, '/styles.css':'b'.repeat(12)}}; };
  state.code = () => { state.snapshot = {...initial, revision:'c'.repeat(12), reloadRevision:'d'.repeat(12)}; };
  return state;
}

async function open(page) {
  await page.goto('/#auth');
  await expect(page.locator('#authUnified')).toBeVisible();
  await expect(page.locator('#vacancy-preview-tools #revision')).toHaveText(/Preview · [a-f0-9]{12}/);
}

test('two device views receive CSS updates without replacing input or the document', async ({page, context, request}) => {
  const state = await updates(context, request);
  const phone = await context.newPage();
  await phone.setViewportSize({width:390, height:844});
  await open(page); await open(phone);
  for (const device of [page, phone]) {
    await device.locator('#authUnified [name=email]').fill('preview@example.invalid');
    await device.evaluate(() => { window.keptPreviewInput = document.querySelector('#authUnified [name=email]'); });
  }
  state.css();
  for (const device of [page, phone]) {
    await expect(device.locator('#vacancy-preview-tools #revision')).toHaveText('Preview · ' + state.snapshot.revision);
    await expect(device.locator('#authUnified')).toHaveCSS('outline-color', 'rgb(12, 90, 123)');
    await expect(device.locator('#authUnified [name=email]')).toHaveValue('preview@example.invalid');
    expect(await device.evaluate(() => window.keptPreviewInput === document.querySelector('#authUnified [name=email]'))).toBe(true);
    expect(await device.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    if (await device.locator('.mobile-nav').isVisible()) {
      const control = await device.locator('#vacancy-preview-tools').boundingBox();
      const navigation = await device.locator('.mobile-nav').boundingBox();
      expect(control.y + control.height).toBeLessThanOrEqual(navigation.y);
    }
  }
  await phone.close();
});

test('code updates wait for edited input and explicit reload keeps the route', async ({page, context, request}) => {
  const state = await updates(context, request);
  await open(page);
  await page.locator('#authUnified [name=email]').fill('preview@example.invalid');
  state.code();
  await expect(page.locator('#vacancy-preview-tools #apply')).toHaveText('Reload — clears unsaved input');
  await expect(page.locator('#authUnified [name=email]')).toHaveValue('preview@example.invalid');
  await page.locator('#vacancy-preview-tools #pause').click();
  await expect(page.locator('#vacancy-preview-tools #status')).toContainText('automatic updates paused');
  await expect(page.locator('#vacancy-preview-tools #apply')).toHaveText('Reload — clears unsaved input');
  state.snapshot = state.initial;
  const nextLoad = page.waitForEvent('load');
  await page.locator('#vacancy-preview-tools #apply').click();
  await nextLoad;
  await expect(page).toHaveURL(/#auth$/);
});

test('code updates automatically reload an idle page on its current route', async ({page, context, request}) => {
  const state = await updates(context, request);
  await open(page);
  await page.evaluate(() => { window.beforePreviewReload = true; document.activeElement.blur(); });
  const nextLoad = page.waitForEvent('load');
  state.code(); state.once = true;
  await nextLoad;
  await expect(page).toHaveURL(/#auth$/);
  expect(await page.evaluate(() => window.beforePreviewReload)).toBeUndefined();
});

test('paused updates and disconnections preserve the page; resume applies pending CSS', async ({page, context, request}) => {
  const state = await updates(context, request);
  await open(page);
  await page.locator('#vacancy-preview-tools summary').click();
  await page.locator('#vacancy-preview-tools #pause').click();
  const original = await page.locator('#vacancy-preview-tools #revision').textContent();
  state.css();
  await expect(page.locator('#vacancy-preview-tools #status')).toContainText('Update ready');
  await expect(page.locator('#vacancy-preview-tools #revision')).toHaveText(original);
  await page.locator('#vacancy-preview-tools #pause').click();
  await expect(page.locator('#vacancy-preview-tools #revision')).toHaveText('Preview · ' + state.snapshot.revision);
  state.disconnected = true;
  await expect(page.locator('#vacancy-preview-tools #status')).toContainText('disconnected');
  await expect(page.locator('#authUnified')).toBeVisible();
  state.disconnected = false;
  await expect(page.locator('#vacancy-preview-tools #status')).toContainText('Up to date');
});
