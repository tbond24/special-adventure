const {test, expect} = require('@playwright/test');

async function ready(page) {
  await page.goto('/__find-preview#home');
  await expect(page.locator('#cards .listing-card')).toHaveCount(2);
  await page.waitForFunction(() => !booting);
}
async function dimensions(page) {
  return page.evaluate(() => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
    return {viewport:innerWidth, page:document.documentElement.scrollWidth,
      results:rect('.discovery-results'), toolbar:rect('.listing-toolbar'), rail:rect('#cards'),
      cards:[...document.querySelectorAll('#cards .listing-card')].map(node => node.getBoundingClientRect().toJSON()),
      columns:getComputedStyle(document.querySelector('#cards')).gridTemplateColumns.split(' ').length};
  });
}

test.describe('mobile Find grid contract', () => {
  test.beforeEach(async ({}, info) => test.skip(info.project.name !== 'mobile-chromium', 'Mobile design scope'));

  test('equal columns, shared gutters and contained filters from 320 to 820px', async ({page}) => {
    await ready(page);
    for (const width of [320,360,390,430,768,820]) {
      await page.setViewportSize({width,height:844});
      const d = await dimensions(page);
      expect(d.page, 'page overflow at ' + width).toBe(width);
      expect(d.columns).toBe(2);
      expect(d.rail.x).toBe(16);
      expect(d.rail.right).toBe(width - 16);
      expect(d.toolbar.x).toBe(d.rail.x);
      expect(d.toolbar.right).toBe(d.rail.right);
      expect(d.cards[0].width).toBeCloseTo((width - 44) / 2, 1);
      expect(d.cards[1].x - d.cards[0].right).toBeCloseTo(12, 1);
      expect(d.rail.y - d.toolbar.bottom).toBeCloseTo(12, 1);
      expect(await page.locator('#viewToggle').evaluate(node => node.getBoundingClientRect().width)).toBe(44);
      expect((await page.locator('.brand').boundingBox()).x).toBe(16);
      const theme = await page.locator('#themeToggle').boundingBox();
      expect(theme.x + theme.width).toBe(width - 16);
      expect((await page.locator('.map-type-filter').boundingBox()).x).toBe(16);
      for (const selector of ['#themeToggle','#useLocation','#searchBtn','#resultsFiltersToggle','.heart-action','.gallery-arrow']) {
        const target = await page.locator(selector).first().boundingBox();
        expect(target.width,selector + ' width at ' + width).toBeGreaterThanOrEqual(44);
        expect(target.height,selector + ' height at ' + width).toBeGreaterThanOrEqual(44);
      }
      expect(await page.locator('.listing-card .card-body').first().evaluate(node => ({padding:getComputedStyle(node).padding,gap:getComputedStyle(node).gap}))).toEqual({padding:'12px',gap:'4px'});
      expect(await page.locator('.listing-price,.deposit-card-pill').evaluateAll(nodes => nodes.every(node => node.scrollWidth <= node.clientWidth + 1)), 'Clipped monetary value at ' + width).toBe(true);
      await page.locator('#resultsFiltersToggle').click();
      await expect(page.locator('#discoveryFilters')).toBeVisible();
      for (const field of await page.locator('#discoveryFilters input:not([type="checkbox"]),#discoveryFilters select').all()) {
        expect((await field.boundingBox()).height).toBeGreaterThanOrEqual(48);
      }
      expect(await page.locator('.compact-searchbar').evaluate(form => {
        const bounds = form.getBoundingClientRect();
        return [...form.querySelectorAll('input,select')].every(node => {
          const r = node.getBoundingClientRect(); return r.left >= bounds.left - 1 && r.right <= bounds.right + 1;
        });
      }), 'filter control containment at ' + width).toBe(true);
      await page.keyboard.press('Escape');
    }
  });

  test('search, location loading, gallery actions and filters preserve usable aligned controls', async ({page}) => {
    await page.setViewportSize({width:320,height:740});
    await ready(page);
    await page.evaluate(() => Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,reject){window.__rejectLocation=reject}}}));
    const location = page.locator('#useLocation'), locationBefore = await location.boundingBox();
    await location.click();
    await expect(location).toBeDisabled();
    expect(await location.boundingBox()).toEqual(locationBefore);
    await page.evaluate(() => __rejectLocation({code:1,message:'Synthetic location denial'}));
    await expect(location).toBeEnabled();
    expect(await location.boundingBox()).toEqual(locationBefore);
    await page.locator('#searchBtn').click();
    await expect(page.locator('#q')).toBeVisible();
    expect((await location.boundingBox()).y).toBe(locationBefore.y);
    expect((await page.locator('#q').boundingBox()).height).toBe(48);
    await page.locator('#q').fill('Westlands');
    await expect(page.locator('#mapLocationSuggestions [role="option"]').first()).toBeVisible();
    expect((await page.locator('#mapLocationSuggestions [role="option"]').first().boundingBox()).height).toBeGreaterThanOrEqual(44);
    await page.locator('#mapLocationSuggestions [role="option"]').first().click();
    await page.locator('#resultsFiltersToggle').click();
    await expect(page.locator('#maxDeposit')).toBeVisible();
    await page.locator('#maxDeposit').fill('30000');
    await page.locator('.more-filters>summary').click();
    await expect(page.locator('#furnished')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#maxDeposit')).toHaveValue('30000');
    const actions = await page.locator('.listing-card').first().evaluate(node => [...node.querySelectorAll('.heart-action,.gallery-arrow')].map(n => n.getBoundingClientRect().toJSON()));
    for (let i=0;i<actions.length;i++) for (let j=i+1;j<actions.length;j++) {
      const a=actions[i], b=actions[j];
      expect(Math.min(a.right,b.right)<=Math.max(a.left,b.left)||Math.min(a.bottom,b.bottom)<=Math.max(a.top,b.top),'Photo actions overlap').toBe(true);
    }
    expect((await dimensions(page)).page).toBe(320);
  });

  test('one card keeps its width; empty and long content stay within the grid', async ({page}) => {
    await page.setViewportSize({width:390,height:844});
    await ready(page);
    const before = await dimensions(page);
    await page.evaluate(() => VACANCY_FIND_PREVIEW.setScenario('one'));
    await expect(page.locator('#cards .listing-card')).toHaveCount(1);
    expect((await dimensions(page)).cards[0].width).toBe(before.cards[0].width);
    await page.evaluate(() => VACANCY_FIND_PREVIEW.setScenario('long'));
    expect((await dimensions(page)).page).toBe(390);
    expect(await page.locator('#cards').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await page.evaluate(() => {vacancies[0].rentAmount=1234567890123;vacancies[0].deposit=1234567890123;applySearch()});
    expect(await page.locator('.listing-price,.deposit-card-pill').evaluateAll(nodes => nodes.every(node => node.scrollWidth <= node.clientWidth + 1)), 'Long monetary values must remain readable').toBe(true);
    await page.evaluate(() => VACANCY_FIND_PREVIEW.setScenario('empty'));
    const empty = await page.locator('#cards>.empty').boundingBox();
    expect(empty.x).toBe(16);
    expect(empty.width).toBe(358);
    expect((await dimensions(page)).toolbar.height).toBe(before.toolbar.height);
  });

  test('larger root text reflows cards; short viewport retains the grid and focused field', async ({page}) => {
    await ready(page);
    for (const width of [320,360,390,430]) {
      await page.setViewportSize({width,height:844});
      await page.evaluate(() => document.documentElement.style.fontSize = '200%');
      const d = await dimensions(page);
      expect(d.columns).toBe(1);
      expect(d.page).toBe(width);
      expect(d.cards[0].width).toBe(width - 32);
    }
    await page.locator('#resultsFiltersToggle').click();
    await page.locator('#maxDeposit').fill('30000');
    await page.locator('#maxDeposit').focus();
    await page.setViewportSize({width:430,height:440});
    await expect(page.locator('#maxDeposit')).toBeFocused();
    await expect(page.locator('#maxDeposit')).toHaveValue('30000');
    expect((await dimensions(page)).page).toBe(430);
  });

  test('view preference survives reload and unchanged inventory retains nodes and gallery', async ({page}) => {
    await page.setViewportSize({width:390,height:844});
    await ready(page);
    await page.locator('#viewToggle').click();
    await expect(page.locator('#cards')).toHaveClass(/list-view/);
    await page.reload();
    await expect(page.locator('#cards.list-view .listing-card')).toHaveCount(2);
    expect((await dimensions(page)).columns).toBe(1);
    await page.locator('#viewToggle').click();
    await page.evaluate(() => {
      window.__gridCard = document.querySelector('#cards .listing-card');
      window.__gridGallery = __gridCard.querySelector('[data-gallery]');
      __gridGallery.scrollLeft = __gridGallery.clientWidth;
      window.__gridScroll = __gridGallery.scrollLeft;
      window.__gridFocus = __gridCard.querySelector('[data-save]');
      __gridFocus.focus({preventScroll:true});
    });
    expect(await page.evaluate(() => __gridFocus === document.activeElement)).toBe(true);
    expect(await page.evaluate(() => __gridScroll)).toBeGreaterThan(0);
    const before = await dimensions(page);
    await page.evaluate(async () => { await refreshVacancies(); applySearch(); });
    expect(await page.evaluate(() => ({same:__gridCard === document.querySelector('#cards .listing-card'),
      focused:__gridFocus === document.activeElement, scroll:__gridGallery.scrollLeft === __gridScroll}))).toEqual({same:true,focused:true,scroll:true});
    expect((await dimensions(page)).cards).toEqual(before.cards);
    await page.reload();
    await expect(page.locator('#cards.card-view .listing-card')).toHaveCount(2);
    expect((await dimensions(page)).cards).toEqual(before.cards);
  });

  test('Find owns its geometry, guides do not move it and Auth retains its header state', async ({page}) => {
    await ready(page);
    const competing = await page.evaluate(() => {
      const nodes = ['#app','.discovery-results','.listing-toolbar','#cards','.listing-card','.topbar','.brand','.map-search-panel','.map-search-field','.map-type-filter','.card-body'].map(selector => document.querySelector(selector));
      const properties = ['display','position','inset','width','min-width','max-width','height','min-height','max-height','margin','padding','gap','grid-template-columns','grid-template-rows','flex'];
      const found = [];
      function walk(rules, href) {
        for (const rule of rules) {
          if (rule instanceof CSSMediaRule && !matchMedia(rule.conditionText).matches) continue;
          if (rule instanceof CSSSupportsRule && !CSS.supports(rule.conditionText)) continue;
          if (rule.cssRules) walk(rule.cssRules, href);
          if (rule.selectorText && nodes.some(node => node.matches(rule.selectorText))) {
            const layout = properties.filter(name => rule.style.getPropertyValue(name));
            if (layout.length && !href.endsWith('/src/mobile-grid.css')) found.push({href,selector:rule.selectorText,properties:layout});
          }
        }
      }
      for (const sheet of document.styleSheets) if (sheet.href) walk(sheet.cssRules, new URL(sheet.href).pathname);
      return found;
    });
    expect(competing).toEqual([]);
    const before = await dimensions(page);
    await page.locator('#vacancy-preview-tools summary').click();
    await expect(page.locator('html')).toHaveAttribute('data-preview-grid','');
    await page.getByRole('button', {name:'Hide alignment grid'}).click();
    await expect(page.locator('html')).not.toHaveAttribute('data-preview-grid');
    expect(await dimensions(page)).toEqual(before);
    await page.getByRole('button', {name:'Show alignment grid'}).click();
    await expect(page.locator('html')).toHaveAttribute('data-preview-grid','');
    expect(await dimensions(page)).toEqual(before);
    await expect(page.getByText('Sample Find · real page renderer.', {exact:false})).toBeVisible();
    await page.evaluate(() => nav('auth'));
    await expect(page.locator('#authUnified')).toBeVisible();
    await expect(page.locator('.topbar .brand')).toBeHidden();
  });
});

test('desktop Find retains the measured pre-migration geometry', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'Preservation check only');
  await page.setViewportSize({width:1440,height:844});
  await ready(page);
  const d = await dimensions(page);
  expect(d.results.x).toBe(130); expect(d.results.y).toBe(721); expect(d.results.width).toBe(1180);
  expect(d.toolbar.x).toBe(130); expect(d.toolbar.y).toBe(763); expect(d.toolbar.height).toBe(44);
  expect(d.cards[0].width).toBe(340); expect(d.cards[0].y).toBe(825);
  expect(await page.locator('#cards').evaluate(node => getComputedStyle(node).display)).toBe('flex');
});
