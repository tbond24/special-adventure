const {test, expect} = require('@playwright/test');
const {install} = require('../account-drafts/synthetic-cloud.cjs');

// The acceptance checks deliberately derive colors from the shared tokens.
// Changing the palette does not require changing this regression suite.
const types = [
  {type: 'shop', category: 'shop', label: 'Shops'},
  {type: 'room', category: 'room', label: 'Rooms'},
  {type: '1bed', category: '1bed', label: '1 bedroom'},
  {type: '2bed', category: '2bed', label: '2 bedroom'},
  {type: 'house', category: 'home', label: 'Houses'},
  {type: 'apartment', category: 'apartment', label: 'Apartments'},
  {type: 'other', category: 'other', label: 'Other'},
];
const cases = [
  ['Room', 'House', 'room'],
  ['1 bedroom apartment', 'House', '1bed'],
  ['2 bedroom apartment', 'House', '2bed'],
  ['House', 'Apartment block', 'house'],
  ['Studio', 'House', 'apartment'],
  ['Shop', 'House', 'shop'],
  ['Warehouse', 'Apartment block', 'other'],
  ['Parking space', 'House', 'other'],
  ['1 bedroom house', 'Compound', 'house'],
];
const picture = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="tan"/></svg>';
const rows = cases.map(([unit, building, type], i) => ({
  id: `synthetic-filter-${i}`, rentAmount: 10000 + i * 1000, rentCurrency: 'KES', rentPeriod: 'month', deposit: 0,
  availableFrom: '2026-10-11', updatedAt: '2026-10-11T00:00:00Z',
  room: {id: `filter-room-${i}`, name: `Synthetic ${unit}`, roomType: unit, media: [{url: picture}], maxOccupants: 1},
  property: {id: `filter-property-${i}`, propertyType: building, suburb: 'Synthetic area', city: 'Nairobi', country: 'Kenya', publicLatitude: -1.29 + (i % 3) * .02, publicLongitude: 36.75 + Math.floor(i / 3) * .03, parkingSpaces: 0},
  owner: {id: 'synthetic-filter-owner', displayName: 'Synthetic lister'},
}));
const rowIdsFor = type => cases.flatMap((item, i) => item[2] === type ? [rows[i].id] : []).sort();

function contrast(a, b) {
  const luminance = rgb => {
    const v = rgb.slice(0, 3).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; });
    return v[0] * .2126 + v[1] * .7152 + v[2] * .0722;
  };
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

async function paint(locator) {
  return locator.evaluate(element => {
    const context = document.createElement('canvas').getContext('2d');
    function rgba(value) {
      // Parse computed sRGB before canvas alpha premultiplication rounds channels.
      const srgb=value.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/);
      if(srgb)return [Math.round(Number(srgb[1])*255),Math.round(Number(srgb[2])*255),Math.round(Number(srgb[3])*255),Number(srgb[4]??1)*255];
      context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    }
    const rgb = value => rgba(value).slice(0, 3);
    const style = getComputedStyle(element);
    const icon = element.matches('svg') ? element : element.querySelector('svg');
    const label = element.querySelector('span:not(.sr-only):not([aria-hidden="true"])') || element;
    // Model the full possible backdrop range when a surface is translucent.
    // This is stricter than assuming the light synthetic map tile is always behind it.
    const backgrounds = [[], []];
    for (let node = element; node; node = node.parentElement) {
      const color = rgba(getComputedStyle(node).backgroundColor);
      for (const chain of backgrounds) chain.push(color);
      if (color[3] === 255) break;
    }
    const blend = (front, back) => front.slice(0, 3).map((x, i) => x * front[3] / 255 + back[i] * (1 - front[3] / 255));
    const effective = backgrounds.map((chain, index) => chain.reverse().reduce((back, front) => blend(front, back), index ? [255, 255, 255] : [0, 0, 0]));
    return {
      background: rgb(style.backgroundColor),
      foreground: rgb(getComputedStyle(label).color),
      icon: icon ? rgb(getComputedStyle(icon).stroke === 'none' ? getComputedStyle(icon).color : getComputedStyle(icon).stroke) : null,
      effective,
      iconBackground:icon&&rgba(getComputedStyle(icon).backgroundColor)[3]===255?rgb(getComputedStyle(icon).backgroundColor):null,
      borderWidth: style.borderTopWidth,
      outline: [style.outlineStyle, style.outlineWidth, style.outlineColor],
      shadow: style.boxShadow,
      before: getComputedStyle(element, '::before').content,
      after: getComputedStyle(element, '::after').content,
    };
  });
}
function expectReadable(value, label) {
  for (const background of value.effective) {
    expect(contrast(value.foreground, background), `${label} text contrast`).toBeGreaterThanOrEqual(4.5);
    if (value.icon) expect(contrast(value.icon, value.iconBackground||background), `${label} icon contrast`).toBeGreaterThanOrEqual(3);
  }
}
async function tokens(page) {
  return page.evaluate(types => {
    const context = document.createElement('canvas').getContext('2d');
    const root = getComputedStyle(document.documentElement);
    const rgb = value => {context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);};
    return Object.fromEntries([['accent', rgb(root.getPropertyValue('--accent'))], ['ink', rgb(root.getPropertyValue('--ink'))], ...types.map(({category}) => [category, rgb(root.getPropertyValue('--category-' + (category === 'home' ? 'house' : category)))])]);
  }, types);
}
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
  await page.locator('.map-type-current').click();
  await expect(page.locator('.map-type-choices')).toBeVisible();
  return state;
}
async function expectVisibleRows(page, type) {
  await expect.poll(() => page.locator('.vacancy-marker[data-vacancy-id]').evaluateAll(markers => markers.map(marker => marker.dataset.vacancyId).sort())).toEqual(type ? rowIdsFor(type) : rows.map(row => row.id).sort());
}

for (const width of [320, 390, 430, 1280]) for (const dark of [false, true]) {
  test(`${width}px ${dark ? 'dark' : 'light'} filter colors match pins in every selection state`, async ({page, context}, info) => {
    const state = await open(page, context, width, dark);
    const palette = await tokens(page);
    expect(palette.room).toEqual(palette.accent);
    expect(new Set(types.map(({category}) => palette[category].join(','))).size).toBe(types.length);
    const all = page.locator('[data-map-type="all"]');
    await expect(all).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await paint(all)).background).toEqual(palette.ink);
    await expect(page.locator('[data-map-type]')).toHaveCount(types.length + 1);
    for (const {type, category, label} of types) {
      const choice = page.locator(`[data-map-type="${type}"]`);
      await expect(choice).toHaveAttribute('data-map-category', category);
      await expect(choice).toHaveAttribute('aria-pressed', 'false');
      const unselected = await paint(choice);
      expect(unselected.iconBackground, `${label} unselected icon badge`).toEqual(palette[category]);
      expectReadable(unselected, `${label} unselected`);
      const id = rowIdsFor(type)[0];
      const originalPin = await paint(page.locator(`[data-vacancy-id="${id}"] .map-pin`));
      expect(originalPin.background, `${label} pin`).toEqual(palette[category]);
      expectReadable(originalPin, `${label} pin`);
      const pinSymbol = await page.locator(`[data-vacancy-id="${id}"] .marker-category-icon use`).getAttribute('href');
      await expect(page.locator(`[data-card-id="${id}"] .listing-category-title .service-icon use`), `${label} card icon matches pin semantics`).toHaveAttribute('href', pinSymbol);
      await choice.click();
      await expect(choice).toHaveAttribute('aria-pressed', 'true');
      await expect(all).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(async () => (await paint(choice)).background, {message: `${label} settled selected fill`}).toEqual(palette[category]);
      const selected = await paint(choice);
      expect(selected.background, `${label} selected surface`).toEqual(palette[category]);
      expectReadable(selected, `${label} selected`);
      await expectVisibleRows(page, type);
      const badge = page.locator(`.map-type-current [data-map-category="${category}"]`).first();
      await expect(badge).toBeVisible();
      const summary = await paint(badge);
      expect(summary.background, `${label} summary badge`).toEqual(palette[category]);
      // Summary badges contain an icon, not ordinary visible text.
      for (const background of summary.effective) expect(contrast(summary.icon, background), `${label} summary icon`).toBeGreaterThanOrEqual(3);
      await all.click();
      await expectVisibleRows(page, null);
      await expect(all).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.map-type-current')).toHaveAttribute('aria-label', 'All property types');
    }
    for (const {type} of types) await page.locator(`[data-map-type="${type}"]`).click();
    for (const {category, label} of types) {
      const badge = page.locator(`.map-type-current [data-map-category="${category}"]`).first();
      await expect(badge).toBeVisible();
      expect((await paint(badge)).background, `${label} multiselect badge`).toEqual(palette[category]);
    }
    await expect(page.locator('.map-type-choices [aria-pressed="true"]')).toHaveCount(types.length);
    await expectVisibleRows(page, null);
    await page.screenshot({path: info.outputPath('all-types-selected.png'), fullPage: true});
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const bounds = await page.locator('.map-type-current').boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    await all.click();
    await expect(page.locator('.map-type-current [data-map-category]')).toHaveCount(0);
    expect(state.cloud.publicWrites).toEqual([]);
    expect(state.authRequests).toEqual([]);
  });
}

test('keyboard toggles, non-color checks, dismissal, and reset stay accessible', async ({page, context}) => {
  const state = await open(page, context, 390, false);
  const current = page.locator('.map-type-current');
  const choice = page.locator('[data-map-type="room"]');
  await page.keyboard.press('Tab');
  await choice.focus();
  const focus = await paint(choice);
  expect(focus.outline[0]).not.toBe('none');
  expect(parseFloat(focus.outline[1])).toBeGreaterThanOrEqual(2);
  await choice.press('Space');
  await expect(choice).toHaveAttribute('aria-pressed', 'true');
  // A checkmark is a shape cue, independent of the category fill hue.
  const check = await choice.evaluate(button => ({content: getComputedStyle(button, '::after').content, visibility: getComputedStyle(button, '::after').visibility}));
  expect(check.content).toMatch(/[✓✔☑]/);
  expect(check.visibility).toBe('visible');
  await choice.press('Enter');
  await expect(choice).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-map-type="all"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-map-type="other"]').click();
  await expectVisibleRows(page, 'other');
  await current.click();
  await expect(current).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.map-type-choices')).toBeHidden();
  await current.press('Enter');
  await expect(current).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-map-type="other"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-map-type="all"]').click();
  await expectVisibleRows(page, null);
  expect(state.cloud.publicWrites).toEqual([]);
});

test('optional vector DOM marker stylesheet uses the same shared type colors', async ({page, context}) => {
  const state = await open(page, context, 1280, false);
  await page.addStyleTag({url: '/src/stage93-openfreemap-preview.css'});
  const palette = await tokens(page);
  await page.evaluate(types => {
    const host = document.createElement('div');
    host.id = 'synthetic-vector-color-audit';
    host.style.cssText = 'position:fixed;top:100px;left:100px;z-index:9999;display:grid;gap:20px';
    for (const {type, category} of types) {
      const button = document.createElement('button');
      button.className = `vector-listing-marker category-${type}`;
      button.dataset.listingCategory = category;
      button.innerHTML = '<svg class="control-icon" aria-hidden="true"><use href="#icon-building"></use></svg><span>KSh 10,000</span>';
      host.append(button);
    }
    document.body.append(host);
  }, types);
  for (const {category, label} of types) {
    const marker = page.locator(`#synthetic-vector-color-audit [data-listing-category="${category}"]`);
    const normal = await paint(marker);
    expect(normal.background, `${label} vector DOM fill`).toEqual(palette[category]);
    expectReadable(normal, `${label} vector DOM marker`);
    await marker.evaluate(element => element.classList.add('selected'));
    expect((await paint(marker)).background).toEqual(palette[category]);
  }
  expect(state.cloud.publicWrites).toEqual([]);
});

test('optional fast-vector point expression resolves every fine-grained type token', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const source = fs.readFileSync(path.resolve(__dirname, '../../app/src/stage96-openfreemap-fast.mjs'), 'utf8');
  const expression = source.match(/'circle-color':(\['match',\['get','category'\][^\n]+\])/);
  expect(expression, 'fast-vector category color expression exists').not.toBeNull();
  const actual = JSON.parse(JSON.stringify(vm.runInNewContext(expression[1], {color: category => `token:${category}`})));
  expect(actual).toEqual(['match', ['get', 'category'], 'shop', 'token:shop', 'home', 'token:house', 'room', 'token:room', '1bed', 'token:1bed', '2bed', 'token:2bed', 'apartment', 'token:apartment', 'token:other']);
});
