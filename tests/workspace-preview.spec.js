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
  await expect(page.locator('.console-sidebar')).toHaveCSS('background-color','rgb(25, 33, 46)');
  await expect(page.locator('.console-brand img')).toHaveAttribute('src','assets/vacancy-logo.png');
  expect(await page.locator('.console-brand img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  await expect(page.locator('#adminSectionMenu button').first()).toHaveText('Overview');
  await expect(page.locator('[data-admin-section=marketing],#adminSectionMenu [data-section=marketing]')).toHaveCount(0);
  await expect(page.locator('[data-admin-section=overview]')).toHaveCount(1);
  await expect(page.locator('[data-admin-section=overview] .admin-metric-workspace')).toHaveCount(1);
  expect(await page.locator('[data-admin-section=overview]').evaluate(section=>{
    const snapshot=section.querySelector('.admin-stat-grid');
    return ['.console-journey','[data-renter-report]'].every(selector=>Boolean(section.querySelector(selector)?.compareDocumentPosition(snapshot)&Node.DOCUMENT_POSITION_FOLLOWING));
  })).toBe(true);
  expect(await page.locator('.console-topbar h1').evaluate(el=>el.getBoundingClientRect().width>=180)).toBe(true);

  await page.selectOption('#visualScenario', 'error');
  await expect(page.locator('.journey-state[role=alert]')).toContainText('Journey report unavailable');
  await page.selectOption('#visualScenario', 'normal');
  await expect(page.locator('.journey-flow-panel')).toBeVisible();
  expect(await page.evaluate(() => VACANCY_BACKEND.adminMembership())).toBe(true);
});

test('existing admin cards can be arranged, sized, hidden and restored across reload', async ({page}) => {
  await page.goto('/__admin-preview?section=overview');
  await page.waitForFunction(() => window.__visualReady === true);
  const grid=page.locator('.admin-metric-workspace');
  const cards=grid.locator(':scope > .stat:visible');
  await expect(cards).toHaveCount(8);
  const original=await cards.first().getAttribute('data-metric-card');
  await page.getByRole('button',{name:'Arrange metrics',exact:true}).click();
  await cards.first().getByRole('button',{name:/Make wider/}).click();
  await cards.first().getByRole('button',{name:/Move later/}).click();
  await expect(cards.nth(1)).toHaveAttribute('data-metric-card',original);
  await cards.nth(1).getByRole('button',{name:/Hide card/}).click();
  await expect(cards).toHaveCount(7);
  await page.reload();
  await page.waitForFunction(() => window.__visualReady === true);
  await expect(cards).toHaveCount(7);
  await page.getByRole('button',{name:'Arrange metrics',exact:true}).click();
  await page.getByRole('button',{name:'Add card',exact:true}).click();
  await expect(cards).toHaveCount(8);
  await expect(cards.last()).toHaveAttribute('data-metric-card',original);
  await expect(cards.last().getByRole('button',{name:/Make smaller/})).toBeVisible();
  await page.getByRole('button',{name:'Done arranging',exact:true}).click();
  await expect(grid.locator('.metric-layout-controls:visible')).toHaveCount(0);
  expect(await grid.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await page.reload();
  await page.waitForFunction(() => window.__visualReady === true);
  await expect(cards.last()).toHaveAttribute('data-metric-card',original);
});

test('card layout handles corrupt preferences, empty grid and unavailable storage', async ({page}) => {
  await page.addInitScript(()=>{
    localStorage.setItem('vacancy-admin-metric-layout-v1:synthetic-admin','{broken');
  });
  await page.goto('/__admin-preview?section=overview');
  await page.waitForFunction(() => window.__visualReady === true);
  const grid=page.locator('.admin-metric-workspace');
  await page.getByRole('button',{name:'Arrange metrics',exact:true}).click();
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('storage denied');};});
  for(let i=0;i<8;i++)await grid.getByRole('button',{name:/Hide card/}).first().click();
  await expect(page.locator('.metric-workspace-empty')).toBeVisible();
  await expect(page.locator('.admin-workspace-controls [role=status]')).toContainText('could not be saved');
  await page.getByRole('button',{name:'Add card',exact:true}).click();
  await expect(grid.locator(':scope > .stat:visible')).toHaveCount(1);
  await expect(page.locator('.metric-workspace-empty')).toBeHidden();
  expect(await grid.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
});
