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

test('desktop shell keeps navigation on one of six equal columns across sections', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop layout constraints only');
  for (const width of [1280, 1440, 1920]) {
    await page.setViewportSize({width, height:900});
    await page.goto('/__admin-preview?section=overview');
    await page.waitForFunction(() => window.__visualReady === true);
    for (const section of ['overview', 'activity', 'design', 'overview']) {
      await page.locator(`#adminSectionMenu [data-section="${section}"]`).click();
      const bounds=await page.evaluate(() => {
        const shell=document.querySelector('.admin-console');
        const rail=shell.querySelector('.console-sidebar').getBoundingClientRect();
        const header=shell.querySelector('.console-topbar').getBoundingClientRect();
        return {width:shell.getBoundingClientRect().width, nav:rail.width, left:header.left, right:header.right,
          overflow:document.documentElement.scrollWidth > innerWidth + 1,
          columns:getComputedStyle(shell).gridTemplateColumns.split(' ').length};
      });
      expect(bounds.columns).toBe(6);
      expect(Math.abs(bounds.nav-bounds.width/6)).toBeLessThan(1);
      expect(Math.abs(bounds.left-bounds.nav-24)).toBeLessThan(1);
      expect(Math.abs(bounds.right-width+24)).toBeLessThan(1);
      expect(bounds.overflow).toBe(false);
    }
  }
});

test('desktop data cards use five tracks and wide cards retain two-track sizing', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop card constraints only');
  for (const width of [1280,1440,1920]) {
    await page.setViewportSize({width,height:1000});
    await page.goto('/__admin-preview?section=overview');
    await page.waitForFunction(() => window.__visualReady === true);
    await expect(page.locator('.journey-stats')).toBeVisible();
    for (const selector of ['.journey-stats','.journey-insights','.admin-metric-workspace']) {
      const grid=page.locator(selector);
      const measurements=await grid.evaluate(el=>{
        const style=getComputedStyle(el),cards=[...el.children].filter(c=>!c.hidden);
        return {tracks:style.gridTemplateColumns.split(' ').map(Number.parseFloat),gap:style.columnGap,
          widths:cards.map(c=>c.getBoundingClientRect().width),heights:cards.map(c=>c.getBoundingClientRect().height)};
      });
      expect(measurements.tracks).toHaveLength(5);
      expect(measurements.gap).toBe('24px');
      for(const w of measurements.widths) expect(Math.abs(w-measurements.tracks[0])).toBeLessThan(1);
      for(const h of measurements.heights) expect(h).toBeGreaterThanOrEqual(144);
    }
    await page.getByRole('button',{name:'Arrange metrics',exact:true}).click();
    const first=page.locator('.admin-metric-workspace > .stat').first();
    await first.getByRole('button',{name:/Make wider/}).click();
    const sizing=await first.evaluate(card=>{
      const grid=card.parentElement,track=parseFloat(getComputedStyle(grid).gridTemplateColumns);
      return {width:card.getBoundingClientRect().width,expected:2*track+24};
    });
    expect(Math.abs(sizing.width-sizing.expected)).toBeLessThan(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.evaluate(()=>localStorage.clear());
  }
});

test('desktop graph choices persist through refresh, errors and reload with grid-aligned spans', async ({page}, testInfo) => {
  test.skip(testInfo.project.name!=='desktop-chromium','Desktop graph selection only');
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/__admin-preview?section=overview');
  await page.waitForFunction(()=>window.__visualReady===true);
  const chooser=page.getByRole('group',{name:'Graphs on Overview'});
  await expect(chooser).toBeVisible();
  for(const width of [1280,1440,1920]){
    await page.setViewportSize({width,height:1000});
    await expect(page.locator('.journey-sources')).toBeVisible();
    const sizes=await page.locator('.journey-flow-layout').evaluate(grid=>{
      const track=parseFloat(getComputedStyle(grid).gridTemplateColumns),gap=24;
      return [...grid.children].map(el=>({width:el.getBoundingClientRect().width,
        expected:el.matches('.journey-sources')?track*2+gap:el.matches('.journey-outcomes')?track*3+gap*2:track*5+gap*4}));
    });
    for(const size of sizes)expect(Math.abs(size.width-size.expected)).toBeLessThan(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  await chooser.getByLabel('Acquisition sources',{exact:true}).uncheck();
  await expect(page.locator('.journey-sources')).toBeHidden();
  await page.selectOption('#visualScenario','error');
  await expect(page.locator('.journey-state[role=alert]')).toBeVisible();
  await expect(chooser).toBeVisible();
  await page.selectOption('#visualScenario','normal');
  await expect(page.locator('.journey-sources')).toBeHidden();
  await expect(page.locator('.journey-outcomes')).toBeVisible();
  await chooser.getByLabel('Publication outcomes',{exact:true}).uncheck();
  await chooser.getByLabel('Listing milestone flow',{exact:true}).uncheck();
  await expect(chooser.getByRole('status')).toContainText('No graphs selected');
  await page.reload();await page.waitForFunction(()=>window.__visualReady===true);
  await expect(chooser.getByLabel('Listing milestone flow',{exact:true})).not.toBeChecked();
  await expect(page.locator('.journey-flow-panel')).toBeHidden();
  await chooser.getByRole('button',{name:'Show all graphs'}).click();
  await expect(page.locator('.journey-sources')).toBeVisible();
  await expect(page.locator('.journey-chart')).toBeVisible();
  await page.locator('[data-stage="0"]').click();
  await expect(page.locator('.journey-selection')).toContainText('Location');
});

test('desktop graph choices tolerate corrupt and blocked storage', async ({page}, testInfo) => {
  test.skip(testInfo.project.name!=='desktop-chromium','Desktop graph selection only');
  await page.setViewportSize({width:1440,height:1000});
  await page.addInitScript(()=>{
    const read=Storage.prototype.getItem;
    Storage.prototype.getItem=function(key){return key.startsWith('vacancy-admin-overview-graphs-v1:')?'broken json':read.call(this,key);};
    const write=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){if(key.startsWith('vacancy-admin-overview-graphs-v1:'))throw Error('Storage denied');return write.call(this,key,value);};
  });
  await page.goto('/__admin-preview?section=overview');await page.waitForFunction(()=>window.__visualReady===true);
  const chooser=page.getByRole('group',{name:'Graphs on Overview'});
  await expect(chooser.getByLabel('Acquisition sources',{exact:true})).toBeChecked();
  await chooser.getByLabel('Acquisition sources',{exact:true}).uncheck();
  await expect(page.locator('.journey-sources')).toBeHidden();
  await expect(chooser.getByRole('status')).toContainText('could not be saved');
  await chooser.getByRole('button',{name:'Show all graphs'}).click();
  await expect(page.locator('.journey-sources')).toBeVisible();
});

test('desktop info tile anatomy stays readable on the five-column grid', async ({page}, testInfo) => {
  test.skip(testInfo.project.name!=='desktop-chromium','Desktop info tile only');
  for(const width of [1280,1440,1920]){
    await page.setViewportSize({width,height:1000});
    await page.goto('/__admin-preview?section=overview');await page.waitForFunction(()=>window.__visualReady===true);
    const tiles=page.locator('.journey-stats > .info-tile');await expect(tiles).toHaveCount(5);
    const boxes=await tiles.evaluateAll(tiles=>tiles.map(tile=>{
      const box=tile.getBoundingClientRect();return {height:box.height,top:box.top,
        overflow:tile.scrollWidth>tile.clientWidth+1,label:tile.querySelector('.info-tile-label').textContent,
        note:tile.querySelector('.info-tile-note').textContent,icon:tile.querySelector('svg').getAttribute('aria-hidden')};
    }));
    for(const box of boxes){expect(box.height).toBeGreaterThanOrEqual(160);expect(box.top).toBe(boxes[0].top);expect(box.height).toBe(boxes[0].height);expect(box.overflow).toBe(false);expect(box.label).toBeTruthy();expect(box.note).toBeTruthy();expect(box.icon).toBe('true');}
  }
  const escaped=await page.evaluate(()=>{
    const host=document.createElement('div');host.innerHTML=VACANCY_ADMIN_CONSOLE.infoTile('<img src=x>',0,'<script>bad</script>');
    return {images:host.querySelectorAll('img,script').length,value:host.querySelector('.info-tile-value').textContent,label:host.querySelector('.info-tile-label').textContent};
  });
  expect(escaped).toEqual({images:0,value:'0',label:'<img src=x>'});
  await page.selectOption('#visualScenario','error');await expect(page.locator('.journey-state[role=alert]')).toBeVisible();
  await expect(page.locator('.journey-stats .info-tile')).toHaveCount(0);
});

test('desktop preview shows tile sparklines and puts the large graph before supporting cards', async ({page}, testInfo) => {
  test.skip(testInfo.project.name!=='desktop-chromium','Desktop graph visibility only');
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/__admin-preview?section=overview');await page.waitForFunction(()=>window.__visualReady===true);
  await expect(page.locator('.journey-stats .info-tile-trend svg')).toHaveCount(4);
  await expect(page.locator('.journey-stats .info-tile-trend').last()).toContainText('Trend unavailable');
  await expect(page.locator('.journey-stats .info-tile-trend svg').first()).toBeVisible();
  const positions=await page.evaluate(()=>({chart:document.querySelector('.journey-chart').getBoundingClientRect().top,sources:document.querySelector('.journey-sources').getBoundingClientRect().top}));
  expect(positions.chart).toBeLessThan(positions.sources);
  const unsupported=await page.evaluate(()=>{
    const root=document.createElement('div');root.innerHTML=VACANCY_ADMIN_CONSOLE.infoTile('Example',10,'Recorded counts');
    return {graphs:root.querySelectorAll('.info-tile-trend svg').length,text:root.textContent};
  });
  expect(unsupported.graphs).toBe(0);expect(unsupported.text).toContain('Trend unavailable');
});
