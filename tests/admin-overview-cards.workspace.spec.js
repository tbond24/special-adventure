const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:8776';
const card=(page,index=0)=>page.locator('.overview-metric-card').nth(index);
async function refresh(page){await page.evaluate(()=>VACANCY_OVERVIEW_CARDS.mount(document.querySelector('.overview-metric-row')).refresh());}
test.beforeEach(async({page},info)=>{
 test.skip(info.project.name!=='desktop-chromium','Desktop-only recovered cards');
 await page.setViewportSize({width:1440,height:1000});
 await page.clock.setFixedTime(new Date('2026-10-19T00:30:00Z'));
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 await page.goto(base+'/__admin-preview');await page.waitForFunction(()=>window.__visualReady===true);
 await page.evaluate(()=>{
  window.__cardReads=[];
  VACANCY_BACKEND.adminDailyMetrics=async(metric)=>{
   __cardReads.push(metric);if(window.__cardFail)throw Error('Synthetic offline');
   const days=window.__cardCap||180,factor={accounts:1,listings:2,enquiries:3,messages:4,images:5}[metric];
   const series=Array.from({length:days},(_,i)=>{
    const ago=days-1-i;let value=(ago<7?10:ago<14?5:2)*factor;
    if(window.__cardZeroPrevious&&ago>=7&&ago<14)value=0;
    if(window.__cardAllZero)value=0;
    return {date:new Date(Date.now()-ago*86400000).toISOString().slice(0,10),value};
   });
   if(window.__cardBad)series[1].date=series[0].date;
   const result={metric,days,total:series.reduce((sum,row)=>sum+row.value,0),series};
   if(metric==='accounts'&&window.__holdCard)return new Promise(resolve=>window.__releaseCard=()=>resolve(result));
   return result;
  };
 });
 await card(page).locator('[data-card-metric]').selectOption('accounts');
 await refresh(page);await expect(card(page).locator('[data-metric-value]')).toHaveText('137');
});
test('five matching cards have independent data and all five periods',async({page},info)=>{
 expect(await page.locator('[data-card-metric]').evaluateAll(nodes=>nodes.map(node=>node.value))).toEqual(['accounts','listings','enquiries','messages','images']);
 await expect(card(page).locator('[data-card-period] option')).toHaveText(['Today','Yesterday','7 days','30 days','90 days']);
 for(const [period,value,change]of [['today','10','No change'],['yesterday','10','No change'],['7','70','+100%'],['30','137','+128.3%'],['90','257','+42.8%']]){
  await card(page).locator('[data-card-period]').selectOption(period);
  await expect(card(page).locator('[data-metric-value]')).toHaveText(value);
  await expect(card(page).locator('.overview-card-change')).toHaveText(change);
  await expect(card(page,1).locator('[data-card-period]')).toHaveValue('30');
  await expect(card(page,1).locator('[data-metric-value]')).toHaveText('274');
  await expect(card(page).locator('circle')).toHaveCount(1);
  await expect(card(page).locator('polyline')).toHaveCount(['today','yesterday'].includes(period)?0:1);
 }
 expect(await page.evaluate(()=>__cardReads.length)).toBe(5);
 expect(await card(page).locator('[data-card-metric] option').evaluateAll(nodes=>nodes.map(n=>n.value))).toEqual(['accounts','visitors',...['contact_button_pressed','text_button_pressed','location_started','listing_details_started','listing_previewed','listing_submitted'].map(id=>'track:'+id)]);
 await expect(card(page,3).locator('[data-card-period]')).toHaveValue('30');
 expect(await page.evaluate(()=>__cardReads.length)).toBe(5);
 await page.screenshot({path:info.outputPath('overview-card-controls.png'),animations:'disabled'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('the existing 30-day reader never becomes invented 90-day history or comparison',async({page})=>{
 await page.evaluate(()=>window.__cardCap=30);await refresh(page);
 await expect(card(page).locator('[data-metric-value]')).toHaveText('137');
 await expect(card(page)).toContainText('Earlier history unavailable');
 await card(page).locator('[data-card-period]').selectOption('90');
 await expect(card(page).locator('[data-metric-value]')).toHaveText('—');
 await expect(card(page)).toContainText('History unavailable for this period');
 await expect(card(page).locator('polyline')).toHaveCount(0);
 await card(page).locator('[data-card-period]').selectOption('7');
 await expect(card(page).locator('[data-metric-value]')).toHaveText('70');
 await expect(card(page)).toContainText('+100%');
});
test('zero baselines, invalid history and read failures remain truthful',async({page})=>{
 await card(page).locator('[data-card-period]').selectOption('7');
 await page.evaluate(()=>window.__cardZeroPrevious=true);await refresh(page);
 await expect(card(page)).toContainText('New · previous 0');
 await page.evaluate(()=>window.__cardAllZero=true);await refresh(page);
 await expect(card(page).locator('[data-metric-value]')).toHaveText('0');
 await expect(card(page)).toContainText('No change');
 expect(await card(page).locator('.metric-series').getAttribute('points')).toMatch(/,70 .*?,70/);
 await page.evaluate(()=>window.__cardBad=true);await refresh(page);
 await expect(card(page).locator('[data-metric-value]')).toHaveText('—');
 await expect(card(page)).toContainText('Data unavailable');
 await page.evaluate(()=>{window.__cardBad=false;window.__cardFail=true});await refresh(page);
 await expect(card(page).locator('[data-metric-value]')).toHaveText('—');
 await page.evaluate(()=>window.__cardFail=false);await refresh(page);
 await expect(card(page).locator('[data-metric-value]')).toHaveText('0');
});
test('late responses cannot replace a new choice and preferences survive reload',async({page})=>{
 await page.evaluate(()=>window.__holdCard=true);await refresh(page);
 await page.waitForFunction(()=>!!window.__releaseCard);
 await card(page).locator('[data-card-period]').selectOption('7');
 await page.evaluate(()=>__releaseCard());
 await expect(card(page).locator('[data-metric-value]')).toHaveText('70');
 await page.reload();await page.waitForFunction(()=>window.__visualReady===true);
 await expect(card(page).locator('[data-card-metric]')).toHaveValue('accounts');
 await expect(card(page).locator('[data-card-period]')).toHaveValue('7');
});
test('the real connected renderer uses the same cards and clears them on account loss',async({page})=>{
 await page.evaluate(async()=>{
  await import('/src/admin-connected-report.js?overview-card-test');
  VACANCY_BACKEND.adminConnectedJourneys=async()=>({schemaVersion:2,complete:false,reason:'Synthetic incomplete journey evidence',generatedAt:new Date().toISOString()});
  const section=document.querySelector('[data-admin-section=overview]');section.querySelector('.console-journey').remove();
  mountVacancyConnectedReport(section);
 });
 await expect(page.locator('.overview-metric-card')).toHaveCount(5);
 await expect(card(page).locator('[data-metric-value]')).toHaveText('137');
 await expect(page.locator('.journey-body')).toContainText('Synthetic incomplete journey evidence');
 await page.evaluate(()=>{currentUser=null;dispatchEvent(new Event('storage'))});
 await expect(page.locator('.overview-metric-card')).toHaveCount(0);
});

test('larger daily activity graph has matching data, periods and desktop grid bounds',async({page})=>{
 const activity=page.locator('.overview-activity-graph');
 await expect(activity.locator('svg')).toBeVisible();
 await expect(activity.locator('polyline')).toHaveCount(3);
 await activity.locator('summary').click();
 await expect(activity.locator('tbody tr')).toHaveCount(30);
 await activity.getByLabel('Activity graph period').selectOption('7');
 await expect(activity.locator('tbody tr')).toHaveCount(7);
 await expect(activity.locator('tbody tr').last().locator('td').first()).toHaveText('10');
 for(const width of [1280,1440,1920]){
  await page.setViewportSize({width,height:1000});
  const layout=await page.locator('.overview-metric-row').evaluate(grid=>({columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,gap:getComputedStyle(grid).columnGap,overflow:document.documentElement.scrollWidth>innerWidth+1}));
  expect(layout).toEqual({columns:5,gap:'24px',overflow:false});
 }
 await page.evaluate(()=>window.__cardCap=30);await refresh(page);
 await activity.getByLabel('Activity graph period').selectOption('90');
 await expect(activity).toContainText('History unavailable for this period');
 await expect(activity.locator('polyline')).toHaveCount(0);
});

test('header is simplified, saved duplicates repair and zero scales stay proportional',async({page})=>{
 await expect(page.locator('.console-design-search,.console-design-history,.console-design-identity,#adminRefresh')).toHaveCount(0);
 await page.evaluate(()=>{
  const key=Object.keys(sessionStorage).find(k=>k.startsWith('vacancy-overview-cards-v1:'));
  sessionStorage.setItem(key,JSON.stringify(Array.from({length:5},()=>({metric:'accounts',period:'7'}))));
 });
 await page.reload();await page.waitForFunction(()=>window.__visualReady===true);
 expect(await page.locator('[data-card-metric]').evaluateAll(nodes=>new Set(nodes.map(n=>n.value)).size)).toBe(5);
 await expect(card(page).locator('[data-card-period]')).toHaveValue('7');
 await expect(card(page).locator('.grid-major')).toHaveCount(6);
 await card(page).locator('[data-card-period]').selectOption('today');
 await expect(card(page).locator('.grid-major')).toHaveCount(7);
 await card(page).locator('[data-card-period]').hover();
 await expect(card(page).locator('[data-card-period]')).toHaveCSS('background-color','rgb(241, 243, 245)');
});

test('visible metric cards refresh every minute and pause when hidden',async({page})=>{
 await page.clock.install({time:new Date('2026-10-19T00:30:00Z')});
 await refresh(page);const before=await page.evaluate(()=>__cardReads.length);
 await page.clock.fastForward(60000);
 await expect.poll(()=>page.evaluate(()=>__cardReads.length)).toBe(before+5);
 await page.evaluate(()=>{document.querySelector('[data-admin-section=overview]').hidden=true});
 await page.clock.fastForward(60000);
 const paused=await page.evaluate(()=>__cardReads.length);
 await page.clock.fastForward(60000);expect(await page.evaluate(()=>__cardReads.length)).toBe(paused);
});

test('tracking points use reusable cards, distinct counts and continuous empty periods',async({page})=>{
 const first=card(page);await first.locator('[data-card-metric]').selectOption('track:location_started');
 await expect(first.locator('[data-metric-value]')).toHaveText('24');
 await expect(first.locator('[data-card-count]')).toBeVisible();
 await first.locator('[data-card-count]').selectOption('browsers');await expect(first.locator('[data-metric-value]')).toHaveText('9');
 expect(await card(page,1).locator('[data-card-metric] option').evaluateAll(options=>options.some(o=>o.value==='track:location_started'))).toBe(false);
 await first.locator('[data-card-period]').selectOption('today');await expect(first.locator('[data-metric-value]')).toHaveText('1');await expect(first.locator('polyline')).toHaveCount(1);
 await page.evaluate(()=>VACANCY_BACKEND.adminElementTracking=async()=>({coverageStart:new Date(Date.now()-180*864e5).toISOString(),events:[]}));await refresh(page);
 await expect(first.locator('[data-metric-value]')).toHaveText('0');
 const points=await first.locator('.metric-series').getAttribute('points');expect(points.split(' ').every(p=>p.endsWith(',70'))).toBe(true);expect(points.split(' ').length).toBe(2);
 await page.evaluate(()=>VACANCY_BACKEND.adminElementTracking=async()=>({coverageStart:null,events:[]}));await refresh(page);await expect(first).toContainText('Tracking unavailable');
});

test('shared collector counts activations and page transitions without text and remains optional',async({page})=>{
 await page.route(base+'/tracking-test',route=>route.fulfill({contentType:'text/html',body:'<main id="app"><button data-track="contact_button_pressed"><span>Contact</span></button><button data-track="text_button_pressed">Text</button><form id="listingForm" data-journey-step="0"></form></main>'}));
 await page.goto(base+'/tracking-test');
 await page.evaluate(()=>{window.currentUser=null;window.renderInformationPage=()=>{};window.sent=[];window.VACANCY_BACKEND={elementTrackingPolicy:async()=>({enabled:true,noticeVersion:'20261021-elements-v1',retentionDays:30}),recordElementTracking:async events=>{sent.push(...events);return events.length},reconfirmVacancy:async()=>true};});
 await page.addScriptTag({url:base+'/src/analytics-controls.js'});await page.addScriptTag({url:base+'/src/element-tracking.js'});await page.evaluate(()=>VACANCY_TRACKING.ready);
 await page.getByText('Contact',{exact:true}).click();await page.evaluate(()=>VACANCY_TRACKING.flush());expect(await page.evaluate(()=>sent.length)).toBe(0);
 expect(await page.evaluate(()=>localStorage.getItem('vacancy-element-browser'))).toBeNull();
 await page.getByRole('button',{name:'Allow analytics',exact:true}).click();
 await page.getByText('Contact',{exact:true}).click();await page.getByText('Contact',{exact:true}).click();await page.getByText('Text',{exact:true}).click();
 await page.evaluate(async()=>{const form=document.querySelector('form');VACANCY_TRACKING.page(form,0);VACANCY_TRACKING.page(form,0);await Promise.resolve();form.dataset.journeyStep='1';VACANCY_TRACKING.page(form,1);await Promise.resolve();form.dataset.journeyStep='0';VACANCY_TRACKING.page(form,0);await Promise.resolve();window.currentUser={id:'new-guest'};await VACANCY_TRACKING.flush()});
 const rows=await page.evaluate(()=>sent);expect(rows.map(r=>r.event_name)).toEqual(['location_started','contact_button_pressed','contact_button_pressed','text_button_pressed','listing_details_started','location_started']);
 expect(new Set(rows.map(r=>r.visitor_id)).size).toBe(1);expect(new Set(rows.map(r=>r.event_id)).size).toBe(6);expect(new Set(rows.filter(r=>r.journey_id).map(r=>r.journey_id)).size).toBe(1);
 expect(Object.keys(rows[0]).sort()).toEqual(['event_id','event_name','journey_id','occurred_at','session_id','visitor_id']);
 await page.evaluate(()=>localStorage.removeItem('vacancy-element-tracking-consent'));await page.getByText('Text',{exact:true}).click();await page.evaluate(()=>VACANCY_TRACKING.flush());expect(await page.evaluate(()=>sent.length)).toBe(6);
 // Feed the captured collector contract into the real reusable card renderer.
 await page.clock.setFixedTime(new Date('2026-10-19T00:31:00Z'));
 await page.goto(base+'/__admin-preview');await page.waitForFunction(()=>window.__visualReady===true);
 await page.evaluate(events=>{VACANCY_BACKEND.adminElementTracking=async()=>({coverageStart:'2026-10-01T00:00:00Z',events})},rows);
 await card(page).locator('[data-card-metric]').selectOption('track:contact_button_pressed');
 await card(page).locator('[data-card-period]').selectOption('today');await expect(card(page).locator('[data-metric-value]')).toHaveText('2');
 await card(page).locator('[data-card-count]').selectOption('browsers');await expect(card(page).locator('[data-metric-value]')).toHaveText('1');
 for(const width of [1440,800,390]){await page.setViewportSize({width,height:1000});expect(await card(page).evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true)}
});

test('first tile defaults to live browsers with a distinct second series and pauses polling',async({page})=>{
 await page.evaluate(()=>sessionStorage.removeItem('vacancy-overview-live-first:'+currentUser.id));
 await page.reload();await page.waitForFunction(()=>window.__visualReady===true);
 const first=card(page);await expect(first.locator('[data-card-metric]')).toHaveValue('visitors');await expect(first.locator('[data-metric-value]')).toHaveText('86');await expect(first.locator('[data-visitor-total]')).toHaveText('321 unique in period');
 await expect(first.locator('[data-visitor-series]')).toHaveCount(2);
 await expect(first.locator('[data-visitor-series=live]')).toHaveAttribute('stroke','#2fa586');await expect(first.locator('[data-visitor-series=unique]')).toHaveAttribute('stroke','#347ef0');
 await first.locator('[data-card-period]').selectOption('today');await expect(first).toContainText('Unique · hour');
 await page.clock.install({time:new Date('2026-10-19T00:30:00Z')});
 await page.evaluate(()=>{window.__visitorReads=0;VACANCY_BACKEND.adminVisitorMetrics=async buckets=>{__visitorReads++;return {generatedAt:new Date().toISOString(),live:0,unique:0,series:buckets.map(b=>({at:b.end,live:0,unique:0}))}}});
 await refresh(page);await expect(first.locator('[data-metric-value]')).toHaveText('0');
 expect((await first.locator('[data-visitor-series=live]').getAttribute('points')).split(' ').every(p=>p.endsWith(',70'))).toBe(true);
 expect(parseFloat((await first.locator('[data-visitor-series=unique]').getAttribute('points')).split(' ').at(-1))).toBeLessThan(160);
 await page.clock.fastForward(30000);await expect.poll(()=>page.evaluate(()=>__visitorReads)).toBe(2);
 await page.evaluate(()=>document.querySelector('[data-admin-section=overview]').hidden=true);await page.clock.fastForward(30000);expect(await page.evaluate(()=>__visitorReads)).toBe(2);
 await page.evaluate(()=>{document.querySelector('[data-admin-section=overview]').hidden=false;VACANCY_BACKEND.adminVisitorMetrics=async()=>({live:0,unique:0,series:[]})});
 await expect(first).toContainText('Data unavailable');
});
