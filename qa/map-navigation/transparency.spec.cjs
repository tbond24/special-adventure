const {test, expect} = require('@playwright/test');
const {install} = require('../account-drafts/synthetic-cloud.cjs');

const types = [
  ['shop', 'shop', 'Shop'], ['room', 'room', 'Room'], ['1bed', '1bed', '1 bedroom apartment'],
  ['2bed', '2bed', '2 bedroom apartment'], ['house', 'home', 'House'],
  ['apartment', 'apartment', 'Studio'], ['other', 'other', 'Warehouse'],
];
const rows = types.map(([type, category, roomType], i) => ({
  id: `synthetic-transparency-${type}`, rentAmount: 10000 + i * 1000, rentCurrency: 'KES', rentPeriod: 'month', deposit: 0,
  availableFrom: '2026-10-11', updatedAt: '2026-10-11T00:00:00Z',
  room: {id: `transparency-room-${type}`, name: `Synthetic ${roomType}`, roomType, media: [{url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="tan"/></svg>'}], maxOccupants: 1},
  property: {id: `transparency-property-${type}`, propertyType: 'House', suburb: 'Synthetic area', city: 'Nairobi', country: 'Kenya', publicLatitude: -1.29 + (i % 3) * .02, publicLongitude: 36.75 + Math.floor(i / 3) * .03, parkingSpaces: 0},
  owner: {id: 'synthetic-transparency-owner', displayName: 'Synthetic lister'},
}));

async function open(page, context, width, dark) {
  await page.setViewportSize({width, height: 900});
  const state = await install(context);
  await context.route(/https:\/\/[^/]*tile\.openstreetmap\.org\//, route => route.fulfill({status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e9ece4"/></svg>'}));
  await page.goto('/#home');
  await page.waitForFunction(() => typeof booting !== 'undefined' && !booting);
  await page.evaluate(({rows, dark}) => {
    vacancies = rows;
    VACANCY_BACKEND.activeVacancies = async () => rows;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    renderHome();
    exploreMap.fitBounds(rows.map(v => [v.property.publicLatitude, v.property.publicLongitude]), {padding: [90, 90], maxZoom: 13, animate: false});
    applySearch();
  }, {rows, dark});
  await expect(page.locator('.map-pin')).toHaveCount(rows.length);
  return state;
}

async function surface(locator) {
  return locator.evaluate(element => {
    const style = getComputedStyle(element);
    const context = document.createElement('canvas').getContext('2d');
    const color = value => {
      context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
      const pixel = [...context.getImageData(0, 0, 1, 1).data];
      const alpha = value.includes('/') ? Number(value.match(/\/\s*([\d.]+)/)[1]) : value.startsWith('rgba(') ? Number(value.match(/[\d.]+/g)[3]) : value === 'transparent' ? 0 : 1;
      return {rgb: pixel.slice(0, 3), alpha};
    };
    const ancestors = [];
    for (let node = element; node; node = node.parentElement) ancestors.push(Number(getComputedStyle(node).opacity));
    return {
      background: color(style.backgroundColor), foreground: color(style.color),
      children: [...element.querySelectorAll('span, svg, use, path')].map(node => ({opacity: Number(getComputedStyle(node).opacity), color: color(getComputedStyle(node).color)})),
      ancestors, blur: style.backdropFilter, shadow: style.boxShadow,
      outline: [style.outlineStyle, style.outlineWidth],
    };
  });
}

function contrast(front, back) {
  const luminance = rgb => {
    const c = rgb.map(v => {v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;});
    return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
  };
  const a = luminance(front), b = luminance(back);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
function worstContrast(paint) {
  return Math.min(...[0, 255].map(backdrop => contrast(paint.foreground.rgb, paint.background.rgb.map(v => v * paint.background.alpha + backdrop * (1 - paint.background.alpha)))));
}
function opaqueContent(paint) {
  expect(paint.ancestors.every(value => value === 1), 'control and all ancestors have opacity 1').toBe(true);
  expect(paint.foreground.alpha, 'foreground color remains fully opaque').toBe(1);
  expect(paint.children.every(child => child.opacity === 1 && child.color.alpha === 1), 'child text/icons remain fully opaque').toBe(true);
}
async function translucent(locator) {
  await locator.evaluate(async element => {await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {})));});
  await expect.poll(async () => (await surface(locator)).background.alpha).toBeCloseTo(.9, 4);
  const paint = await surface(locator);
  opaqueContent(paint);
  return paint;
}

for (const width of [320, 390, 430, 1280]) for (const dark of [false, true]) {
  test(`${width}px ${dark ? 'dark' : 'light'} Find surfaces are 90% opaque in every filter/search state`, async ({page, context}, info) => {
    const state = await open(page, context, width, dark);
    const current = page.locator('.map-type-current');
    await translucent(current);
    const location = await translucent(page.locator('#useLocation'));
    const search = await translucent(page.locator('#searchBtn'));
    expect(worstContrast(location)).toBeGreaterThanOrEqual(4.5);
    expect(worstContrast(search)).toBeGreaterThanOrEqual(4.5);
    // Find intentionally has no zoom/reset controls; detail-map controls are out of scope.
    await expect(page.locator('.map-first-shell .leaflet-control-zoom, .map-first-shell .detail-map-reset, #searchArea')).toHaveCount(0);
    await current.click();
    const all = page.locator('[data-map-type="all"]');
    expect(worstContrast(await translucent(all))).toBeGreaterThanOrEqual(4.5);
    for (const [type, category] of types) {
      const button = page.locator(`[data-map-type="${type}"]`);
      expect(worstContrast(await translucent(button))).toBeGreaterThanOrEqual(4.5);
      const optionBadge = await surface(button.locator('.control-icon'));
      expect(optionBadge.background.alpha, 'category icon badges stay fully opaque').toBe(1);
      opaqueContent(optionBadge);
      expect(worstContrast(optionBadge), 'category badge icon contrast').toBeGreaterThanOrEqual(3);
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      // Use the white/black backdrop extremes instead of assuming a uniform map tile.
      expect.soft(worstContrast(await translucent(button)), `${type} selected contrast`).toBeGreaterThanOrEqual(4.5);
      await translucent(current);
      const badge = await surface(current.locator(`[data-map-category="${category}"]`).first());
      expect(badge.background.alpha, 'summary category badges retain their solid fill').toBe(1);
      opaqueContent(badge);
      await all.click();
    }
    // Multiselect and repeated dismissal must retain alpha and category badges.
    for (const [type] of types) await page.locator(`[data-map-type="${type}"]`).click();
    await expect(page.locator('.map-type-choices [aria-pressed="true"]')).toHaveCount(types.length);
    await translucent(current);
    await current.click();
    await expect(page.locator('.map-type-choices')).toBeHidden();
    await current.press('Enter');
    await expect(page.locator('.map-type-choices')).toBeVisible();
    await page.locator('.map-type-choices button').evaluateAll(async buttons => {await Promise.all(buttons.flatMap(button => button.getAnimations()).map(animation => animation.finished.catch(() => {})));});
    if (width === 320) {
      const summaryBounds = await current.boundingBox();
      const locationBounds = await page.locator('#useLocation').boundingBox();
      expect(summaryBounds.x + summaryBounds.width, 'all seven summary badges must not overlap location control').toBeLessThanOrEqual(locationBounds.x);
    }
    await page.screenshot({path: info.outputPath('all-types-selected.png'), fullPage: true});
    await all.click();
    await page.locator('.map-type-choices button').evaluateAll(async buttons => {await Promise.all(buttons.flatMap(button => button.getAnimations()).map(animation => animation.finished.catch(() => {})));});
    await page.screenshot({path: info.outputPath('filter-surfaces.png'), fullPage: true});
    await current.click();

    await page.locator('#searchBtn').click();
    await expect(page.locator('#q')).toBeFocused();
    expect(worstContrast(await translucent(page.locator('#q')))).toBeGreaterThanOrEqual(4.5);
    await expect.poll(async () => (await surface(page.locator('#searchBtn'))).background.alpha).toBe(0);
    const expandedSearch = await surface(page.locator('#searchBtn'));
    expect(expandedSearch.background.alpha, 'expanded submit shares the input surface, avoiding doubled alpha').toBe(0);
    opaqueContent(expandedSearch);
    await page.locator('#searchBtn').click();
    await expect(page.locator('.map-search-compact')).not.toHaveClass(/search-expanded/);
    await translucent(page.locator('#searchBtn'));

    if (width <= 820) {
      const nav = await translucent(page.locator('.mobile-nav'));
      expect(nav.blur).toContain('blur(');
      expect(nav.shadow).not.toBe('none');
      await expect(page.locator('.mobile-nav [data-nav="home"]')).toHaveAttribute('aria-current', 'page');
      const navContrast = await page.locator('.mobile-nav button').evaluateAll(buttons => buttons.map(button => ({label: button.textContent.trim(), color: getComputedStyle(button).color})));
      await info.attach('nav-foreground-inventory', {body: JSON.stringify(navContrast, null, 2), contentType: 'application/json'});
    }
    for (const selector of ['.map-pin', '.listing-card', '.listing-card img']) {
      for (const node of await page.locator(selector).all()) {
        const paint = await surface(node);
        opaqueContent(paint);
        if (selector !== '.listing-card img') expect(paint.background.alpha, `${selector} keeps solid background`).toBe(1);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(state.cloud.publicWrites).toEqual([]);
    expect(state.authRequests).toEqual([]);
  });
}

test('keyboard focus and shadows persist; map surfaces stay Find-only and nav stays translucent', async ({page, context}) => {
  const state = await open(page, context, 390, false);
  await page.keyboard.press('Tab');
  await page.locator('.map-type-current').focus();
  const focus = await surface(page.locator('.map-type-current'));
  expect(focus.outline[0]).not.toBe('none');
  expect(parseFloat(focus.outline[1])).toBeGreaterThanOrEqual(2);
  expect(focus.shadow).not.toBe('none');
  // Removing Find's shell disables only the map selectors. The floating nav stays 90% opaque on every page.
  await page.locator('.map-first-shell').evaluate(node => node.classList.remove('map-first-shell'));
  expect((await surface(page.locator('.mobile-nav'))).background.alpha).toBeCloseTo(.9, 4);
  await expect.poll(async () => (await surface(page.locator('.map-type-current'))).background.alpha).toBeCloseTo(.94, 4);
  await page.locator('.mobile-nav [data-nav="saved"]').click();
  // Guest Saved navigation intentionally opens sign-in; the global nav remains translucent there.
  await expect(page).toHaveURL(/#auth$/);
  await expect(page.locator('#authUnified')).toBeVisible();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => {document.documentElement.dataset.theme = theme;}, theme);
    await translucent(page.locator('.mobile-nav'));
  }
  await page.locator('.mobile-nav [data-nav="home"]').click();
  await expect(page.locator('.map-first-shell')).toBeVisible();
  await translucent(page.locator('.map-type-current'));
  expect(state.cloud.publicWrites).toEqual([]);
});
