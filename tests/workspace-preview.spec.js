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
  await expect(page.locator('.console-topbar h1')).toBeHidden();

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
  await page.locator('.admin-workspace-controls').getByRole('button',{name:'Add card',exact:true}).click();
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
  await page.locator('.admin-workspace-controls').getByRole('button',{name:'Add card',exact:true}).click();
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
        const header=(getComputedStyle(shell.querySelector('.console-topbar')).display==='none'?shell.querySelector('[data-admin-section=overview]'):shell.querySelector('.console-topbar')).getBoundingClientRect();
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
  for(const name of ['Button & page activity','Live activity','Listings by location','Seeker journey','Recorded activity'])await chooser.getByLabel(name,{exact:true}).uncheck();
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
    Storage.prototype.getItem=function(key){return key.startsWith('vacancy-admin-overview-graphs-v3:')?'broken json':read.call(this,key);};
    const write=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){if(key.startsWith('vacancy-admin-overview-graphs-v3:'))throw Error('Storage denied');return write.call(this,key,value);};
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
  await expect(page.locator('.overview-metric-card .overview-card-graph svg')).toHaveCount(5);
  await expect(page.locator('.journey-stats .info-tile-trend svg')).toHaveCount(0);
  await expect(page.locator('.overview-metric-card .overview-card-graph svg').first()).toBeVisible();
  await expect(page.locator('.journey-chart')).toBeVisible();
  const positions=await page.evaluate(()=>({chart:document.querySelector('.journey-chart').getBoundingClientRect().top,sources:document.querySelector('.journey-sources').getBoundingClientRect().top}));
  expect(positions.chart).toBeLessThan(positions.sources);
  const unsupported=await page.evaluate(()=>{
    const root=document.createElement('div');root.innerHTML=VACANCY_ADMIN_CONSOLE.infoTile('Example',10,'Recorded counts');
    return {graphs:root.querySelectorAll('.info-tile-trend svg').length,text:root.textContent};
  });
  expect(unsupported.graphs).toBe(0);expect(unsupported.text).toContain('Trend unavailable');
});

test('live, location and seeker graphs render and adapt without losing desktop spans',async({page})=>{
 await page.goto('/__admin-preview?section=overview');await page.waitForFunction(()=>window.__visualReady===true);
 await expect(page.locator('.overview-live-value')).toHaveText('86');
 await expect(page.locator('.overview-location-bars li')).toHaveCount(3);
 await expect(page.locator('.seeker-journey-graph meter')).toHaveCount(4);
 const stages=await page.locator('.seeker-journey-graph meter').evaluateAll(nodes=>nodes.map(n=>n.value));
 expect(stages).toEqual([120,84,32,18]);
 for(const width of [1920,1440,1280,1024,800,600,390]){
  await page.setViewportSize({width,height:1000});
  for(const selector of ['.overview-live-card svg','.overview-location-bars','.seeker-journey-graph','.overview-activity-graph svg','.overview-card-graph svg','.journey-chart svg'])await expect(page.locator(selector).first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  if(width>=1280){
   const spans=await page.locator('.overview-insight-grid').evaluate(grid=>{
    const track=parseFloat(getComputedStyle(grid).gridTemplateColumns);
    return [...grid.children].map((el,i)=>Math.abs(el.getBoundingClientRect().width-((i===0?2:3)*track+(i===0?1:2)*24))<1);
   });expect(spans).toEqual([true,true]);
  }
 }
 const choices=page.getByRole('group',{name:'Graphs on Overview'});
 await choices.getByLabel('Live activity',{exact:true}).uncheck();await expect(page.locator('.overview-live-card')).toBeHidden();
 await choices.getByLabel('Seeker journey',{exact:true}).uncheck();await expect(page.locator('[data-renter-report]')).toBeHidden();
 await choices.getByRole('button',{name:'Show all graphs'}).click();await expect(page.locator('.overview-live-card')).toBeVisible();await expect(page.locator('[data-renter-report]')).toBeVisible();
});

test('new graph reports distinguish missing, empty and invalid data and recover',async({page})=>{
 await page.goto('/__admin-preview?section=overview');await page.waitForFunction(()=>window.__visualReady===true);
 await expect(page.locator('.overview-live-value')).toHaveText('86');
 await page.evaluate(()=>{
  VACANCY_BACKEND.recentActivity=async()=>({generated_at:new Date().toISOString(),browsers_recent:-1});
  VACANCY_BACKEND.adminVacancies=async()=>{throw Error('Offline');};
  VACANCY_BACKEND.adminRenterJourneys=async()=>({schemaVersion:1,complete:false,generatedAt:new Date().toISOString(),reason:'Collection unavailable for this range'});
 });
 await page.getByRole('button',{name:'Refresh live activity',exact:true}).click();
 await expect(page.locator('[data-live-body]')).toContainText('Live activity unavailable');await expect(page.locator('.overview-live-value')).toHaveCount(0);
 await page.getByRole('button',{name:'Refresh locations',exact:true}).click();await expect(page.locator('[data-location-body]')).toContainText('Location data unavailable');await expect(page.locator('.overview-location-bars')).toHaveCount(0);
 await page.locator('[data-renter-report] [data-refresh]').click();await expect(page.locator('[data-renter-report] [data-body]')).toContainText('Collection unavailable');await expect(page.locator('.seeker-journey-graph')).toHaveCount(0);
 await page.evaluate(()=>{
  VACANCY_BACKEND.recentActivity=async()=>({generated_at:new Date().toISOString(),browsers_recent:0});
  VACANCY_BACKEND.adminVacancies=async()=>[];
  VACANCY_BACKEND.adminRenterJourneys=async()=>({schemaVersion:1,complete:true,generatedAt:new Date().toISOString(),searches:0,withOpen:0,withEnquiry:0,withReply:0,conversations:0,repliedConversations:0,directOpens:0,detailTotal:0,coverage:'No recorded searches',details:[]});
 });
 await page.getByRole('button',{name:'Refresh live activity',exact:true}).click();await expect(page.locator('.overview-live-value')).toHaveText('0');
 await page.getByRole('button',{name:'Refresh locations',exact:true}).click();await expect(page.locator('[data-location-body]')).toContainText('No listings marked active');
 await page.locator('[data-renter-report] [data-refresh]').click();await expect(page.locator('.seeker-journey-graph meter')).toHaveCount(4);
 expect(await page.locator('.seeker-journey-graph meter').evaluateAll(nodes=>nodes.every(n=>n.value===0))).toBe(true);
});

test('live polling pauses when Overview is hidden and stops on account loss',async({page})=>{
 await page.clock.install();
 await page.goto('/__admin-preview?section=overview');await page.waitForFunction(()=>window.__visualReady===true);
 await expect(page.locator('.overview-live-value')).toHaveText('86');
 await page.evaluate(()=>{window.liveReadCount=0;VACANCY_BACKEND.recentActivity=async()=>{window.liveReadCount++;return {generated_at:new Date().toISOString(),browsers_recent:7};};});
 await page.clock.fastForward(31000);await expect(page.locator('.overview-live-value')).toHaveText('7');
 expect(await page.evaluate(()=>liveReadCount)).toBe(1);
 await page.evaluate(()=>document.querySelector('[data-admin-section=overview]').hidden=true);
 await expect(page.locator('[data-live-body]')).toContainText('paused');
 await page.clock.fastForward(60000);expect(await page.evaluate(()=>liveReadCount)).toBe(1);
 await page.evaluate(()=>document.querySelector('[data-admin-section=overview]').hidden=false);
 await expect(page.locator('.overview-live-value')).toHaveText('7');
 expect(await page.evaluate(()=>liveReadCount)).toBe(2);
 await page.evaluate(()=>{currentUser=null;dispatchEvent(new Event('storage'));});
 await expect(page.locator('.overview-live-value')).toHaveCount(0);
 await page.clock.fastForward(60000);expect(await page.evaluate(()=>liveReadCount)).toBe(2);
});

test('reusable cards have interior grey grids and borderless arrow-free controls',async({page})=>{
 await page.goto('/__admin-preview?section=overview');await page.waitForFunction(()=>window.__visualReady===true);
 const card=page.locator('.overview-metric-card').first();await card.locator('[data-card-metric]').selectOption('accounts');await expect(card.locator('.overview-count-chart')).toBeVisible();
 await expect(card.locator('.overview-card-graph .grid-value')).toHaveCount(3);
 await expect(card.locator('.overview-card-graph rect')).toHaveCount(0);
 await expect(card.locator('.overview-card-graph rect')).toHaveCount(0);
 expect(await card.locator('[data-card-metric]').evaluate(el=>({appearance:getComputedStyle(el).appearance,border:getComputedStyle(el).borderTopWidth,background:getComputedStyle(el).backgroundColor}))).toEqual({appearance:'none',border:'0px',background:'rgba(0, 0, 0, 0)'});
 expect(await card.innerText()).not.toMatch(/UTC|↻/);
 await card.locator('[data-card-period]').selectOption('7');await expect(card.locator('.overview-card-graph text')).toHaveCount(4);
 for(const width of [1920,1440,1280,800,390]){
  await page.setViewportSize({width,height:1000});
  const bounds=await card.evaluate(el=>({overflow:el.scrollWidth>el.clientWidth+1,valueSize:parseFloat(getComputedStyle(el.querySelector('[data-metric-value]')).fontSize),graphWidth:el.querySelector('.overview-card-graph svg').getBoundingClientRect().width,bodyWidth:el.querySelector('.overview-card-body').getBoundingClientRect().width}));
  expect(bounds.overflow).toBe(false);expect(bounds.valueSize).toBeGreaterThanOrEqual(26);expect(bounds.valueSize).toBeLessThanOrEqual(38);expect(Math.abs(bounds.graphWidth-bounds.bodyWidth)).toBeLessThan(1);
 }
});

test('daily card ranges follow the browser calendar across timezones',async({browser})=>{
 for(const timeZone of ['Australia/Perth','America/Los_Angeles']){
  const context=await browser.newContext({timezoneId:timeZone,viewport:{width:1440,height:1000}});const page=await context.newPage();
  await page.clock.setFixedTime(new Date('2026-10-21T01:00:00Z'));
  await page.goto('http://127.0.0.1:8776/__admin-preview?section=overview');await page.waitForFunction(()=>window.__visualReady===true);
  const card=page.locator('.overview-metric-card').first();await expect(card.locator('[data-metric-value]')).not.toHaveText('—');
  await card.locator('[data-card-metric]').selectOption('accounts');await card.locator('[data-card-period]').selectOption('today');await expect(card.locator('[data-chart-series]')).toHaveCount(1);
  const range=await page.evaluate(()=>VACANCY_VISITOR_TILE.bounds('today',Date.now()));expect(new Date(range.start).toISOString()).toBe(timeZone==='Australia/Perth'?'2026-10-20T16:00:00.000Z':'2026-10-20T07:00:00.000Z');
  await context.close();
 }
});

test('Overview subtitle is removed and event explorer separates repeats from unique reach',async({page})=>{
 await page.goto('/__admin-preview?section=overview');await page.waitForFunction(()=>window.__visualReady===true);
 await expect(page.locator('.console-topbar p')).toBeHidden();
 await expect(page.locator('.overview-event-explorer svg')).toBeVisible();
 await page.evaluate(()=>{
  const stamp=new Date(Date.now()-60000).toISOString();
  const row=(id,event,visitor,session,journey)=>({id,event_name:event,created_at:stamp,visitor_id:visitor,session_id:session,journey_id:journey});
  const a=row('a','location_started','v1','s1','j1');
  const events=[a,{...a},row('b','location_started','v1','s1','j1'),row('c','location_started','v2','s2','j2'),row('d','listing_details_started','v1','s1','j1')];
  VACANCY_BACKEND.adminListerMarketing=async()=>({events,publications:[]});
 });
 await page.getByRole('button',{name:'Refresh activity',exact:true}).click();
 const total=page.locator('.event-explorer-total strong');await expect(total).toHaveText('2');
 await page.getByLabel('Activity counting method',{exact:true}).selectOption('events');await expect(total).toHaveText('3');
 await page.getByLabel('Activity counting method',{exact:true}).selectOption('sessions');await expect(total).toHaveText('2');
 await page.getByLabel('Activity counting method',{exact:true}).selectOption('journeys');await expect(total).toHaveText('2');
 await expect(page.locator('[data-event-body]')).toContainText('Largest stage difference');
 await page.getByLabel('Activity to track',{exact:true}).selectOption('contact_button_pressed');await expect(page.locator('[data-event-body]')).toContainText('Not collected yet');
 await page.getByLabel('Activity to track',{exact:true}).selectOption('location_started');await expect(total).toHaveText('2');
 for(const width of [1440,800,390]){await page.setViewportSize({width,height:1000});await expect(page.locator('.overview-event-explorer svg')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
});

test('event explorer fails closed on capped data and missing distinct identifiers',async({page})=>{
 await page.goto('/__admin-preview?section=overview');await page.waitForFunction(()=>window.__visualReady===true);await expect(page.locator('.overview-event-explorer svg')).toBeVisible();
 await page.evaluate(()=>{const created_at=new Date(Date.now()-60000).toISOString();VACANCY_BACKEND.adminListerMarketing=async()=>({events:[{id:'a',created_at,event_name:'location_started',visitor_id:null,session_id:'s1',journey_id:'j1'}]});});
 await page.getByRole('button',{name:'Refresh activity',exact:true}).click();await expect(page.locator('[data-event-body]')).toContainText('Distinct count unavailable');
 await page.getByLabel('Activity counting method',{exact:true}).selectOption('events');await expect(page.locator('.event-explorer-total strong')).toHaveText('1');
 await page.evaluate(()=>{const created_at=new Date(Date.now()-60000).toISOString();VACANCY_BACKEND.adminListerMarketing=async()=>({events:Array.from({length:5001},(_,i)=>({id:String(i),created_at,event_name:'location_started',visitor_id:'v1'}))});});
 await page.getByRole('button',{name:'Refresh activity',exact:true}).click();await expect(page.locator('[data-event-body]')).toContainText('unavailable or incomplete');await expect(page.locator('.overview-event-explorer svg')).toHaveCount(0);
});
