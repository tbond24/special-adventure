const {test, expect} = require('@playwright/test');

test('mobile draft preserves loading geometry and contains long content and larger text', async ({page}) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/__mobile-design');
  await expect(page.getByRole('heading', {name:'Let’s get the basics right.'})).toBeVisible();
  await expect(page.locator('[data-preview-controls] #vacancy-preview-tools')).toBeVisible();
  const action = page.getByRole('button', {name:'Continue', exact:true});
  const before = await action.boundingBox();
  await action.click();
  await expect(action).toHaveAttribute('aria-busy', 'true');
  await expect(action).toBeDisabled();
  const during = await action.boundingBox();
  expect(during.width).toBe(before.width); expect(during.height).toBe(before.height);
  await expect(action).toHaveAttribute('aria-busy', 'false');
  await expect(action).toBeEnabled();
  await page.getByRole('button', {name:'Try a long title', exact:true}).click();
  await expect(page.locator('#sample-listing-title')).toContainText('exceptionallylongunbrokenword');
  await page.locator('#sample-location').fill('Example neighbourhood');
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({width, height:844});
    for (const fontSize of ['100%', '200%']) {
      await page.evaluate(value => { document.documentElement.style.fontSize = value; }, fontSize);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      expect(await page.locator('.mobile-listing').evaluate(card => card.scrollWidth <= card.clientWidth + 1)).toBe(true);
      const bounds = await action.boundingBox(); expect(bounds.height).toBeGreaterThanOrEqual(48);
      await expect(page.locator('#sample-location')).toHaveValue('Example neighbourhood');
    }
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = '100%'; });
  await page.getByRole('button', {name:'Save sample listing', exact:true}).click();
  await expect(page.getByRole('button', {name:'Unsave sample listing', exact:true})).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});
