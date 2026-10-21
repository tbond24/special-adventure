const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:8776';
test.beforeEach(async({page})=>{await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());await page.goto(base+'/__admin-preview');await page.waitForFunction(()=>window.__visualReady===true)});
test('journey map occupies the next row, explores transitions and filters reports',async({page})=>{
 const map=page.getByRole('region',{name:'Visitor journey map'});await map.scrollIntoViewIfNeeded();
 await expect(map.locator('.journey-map-centre strong')).toHaveText('120');
 await expect(map.locator('.journey-map-node').first()).toHaveCSS('border-radius','50%');await expect(map.locator('.journey-map-node').first()).toHaveCSS('border-top-width','0px');await expect(map.getByRole('switch')).toHaveCSS('width','32px');
 expect(await map.evaluate(el=>el.previousElementSibling.matches('.overview-metric-row'))).toBe(true);
 for(const width of [1920,1440,1280,800,390]){await page.setViewportSize({width,height:1000});expect(await map.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);expect(await map.evaluate(el=>Math.abs(el.getBoundingClientRect().width-el.previousElementSibling.getBoundingClientRect().width)<2)).toBe(true)}
 await map.getByRole('button',{name:'Location: 40 browsers. Explore next steps',exact:true}).click();
 await expect(map.locator('.journey-map-node')).toHaveCount(1);await expect(map.locator('.journey-map-node')).toContainText('Details');
 await map.getByRole('button',{name:'Details: 30 browsers. Explore next steps',exact:true}).click();await expect(map.locator('.journey-map-node')).toContainText('Review');
 await map.getByRole('button',{name:'All pages',exact:true}).click();await expect(map.locator('.journey-map-node')).toHaveCount(7);
 await page.evaluate(()=>{window.__mapReads=[];const original=VACANCY_BACKEND.adminJourneyMap;VACANCY_BACKEND.adminJourneyMap=async o=>{__mapReads.push(o);return original(o)}});
 await map.locator('[data-map-device]').selectOption('mobile');await expect(map.locator('.journey-map-centre strong')).toHaveText('120');expect(await page.evaluate(()=>__mapReads.at(-1).p_device)).toBe('mobile');
 await map.locator('[data-map-period]').selectOption('7');await expect(map.locator('.journey-map-centre strong')).toHaveText('120');expect(await page.evaluate(()=>{const o=__mapReads.at(-1);return Date.parse(o.p_to)-Date.parse(o.p_from)})).toBeLessThanOrEqual(7*86400000);
});
test('map fails closed, handles zero history, ignores stale reads and clears on account loss',async({page})=>{
 const map=page.getByRole('region',{name:'Visitor journey map'});await map.scrollIntoViewIfNeeded();await expect(map.locator('.journey-map-centre strong')).toHaveText('120');
 await page.evaluate(()=>{window.__mapOriginal=VACANCY_BACKEND.adminJourneyMap;VACANCY_BACKEND.adminJourneyMap=async o=>({...await __mapOriginal(o),nodes:[],edges:[],total:0})});await map.getByRole('button',{name:'Refresh map',exact:true}).click();await expect(map).toContainText('No recorded journeys');
 await page.evaluate(()=>{VACANCY_BACKEND.adminJourneyMap=async o=>({...await __mapOriginal(o),edges:[{from:'find',to:'listing',count:999}]})});await map.getByRole('button',{name:'Refresh map',exact:true}).click();await expect(map).toContainText('Journey map unavailable');await expect(map.locator('.journey-map-node')).toHaveCount(0);
 await page.evaluate(()=>{VACANCY_BACKEND.adminJourneyMap=o=>new Promise(resolve=>{window.__oldMap=async()=>resolve(await __mapOriginal(o))})});await map.getByRole('button',{name:'Refresh map',exact:true}).click();await page.waitForFunction(()=>!!window.__oldMap);
 await page.evaluate(()=>{VACANCY_BACKEND.adminJourneyMap=__mapOriginal});await map.locator('[data-map-device]').selectOption('desktop');await expect(map.locator('.journey-map-centre strong')).toHaveText('120');await page.evaluate(()=>__oldMap());await expect(map.locator('.journey-map-centre strong')).toHaveText('120');
 await page.evaluate(()=>{currentUser=null;document.body.append(document.createElement('span'))});await expect(map.locator('.journey-map-node')).toHaveCount(0);
});
test('browser analytics bypass survives reload without installing trackers or writing telemetry',async({page})=>{
 const toggle=page.getByRole('switch',{name:'Analytics in this browser'});await expect(toggle).toBeChecked();await toggle.uncheck();await page.waitForFunction(()=>window.__visualReady===true&&window.VACANCY_ANALYTICS_PREFERENCES.disabled===true);await expect(page.getByRole('switch',{name:'Analytics in this browser'})).not.toBeChecked();
 const telemetry=[];page.on('request',request=>{if(/\/(track_|record_|renter_analytics_policy|element_tracking_policy)/.test(request.url()))telemetry.push(request.url())});
 await page.goto(base+'/#home');await page.waitForFunction(()=>!!window.VACANCY_BACKEND&&!!window.VACANCY_TRACKING);
 const result=await page.evaluate(async()=>{const before=localStorage.getItem('vacancy-connected-visitor');let sends=0;const queue=VACANCY_ANALYTICS.queue(async()=>{sends++});queue.push({event_id:'synthetic-event'});await queue.flush();await VACANCY_BACKEND.trackEvent('vacancy_opened','test');await VACANCY_BACKEND.recordListerJourney([]);await VACANCY_BACKEND.recordError('synthetic');await VACANCY_BACKEND.recordConnectedJourney([]);await VACANCY_BACKEND.recordRenterJourney([],'test');await VACANCY_BACKEND.recordElementTracking([],'test');return {disabled:VACANCY_ANALYTICS_PREFERENCES.disabled,excluded:VACANCY_ANALYTICS.excluded(),sends,before,after:localStorage.getItem('vacancy-connected-visitor'),tracking:VACANCY_TRACKING.track('contact_button_pressed'),connected:VACANCY_CONNECTED_JOURNEY.track('lister_landing_viewed')}});
 expect(result).toMatchObject({disabled:true,excluded:true,sends:0,tracking:null,connected:null});expect(result.after).toBe(result.before);expect(telemetry).toEqual([]);
 await page.goto(base+'/__admin-preview');await page.waitForFunction(()=>window.__visualReady===true);await page.getByRole('switch',{name:'Analytics in this browser'}).check();await page.waitForFunction(()=>window.__visualReady===true&&window.VACANCY_ANALYTICS_PREFERENCES.disabled===false);await expect(page.getByRole('switch',{name:'Analytics in this browser'})).toBeChecked();
});

test('page tracking waits for completed renders and deduplicates route groups',async({page})=>{
 await page.goto(base+'/__offline');await page.setContent('<main id="app"></main>');
 await page.evaluate(()=>{
  window.currentUser=null;window.__captured=[];window.VACANCY_BACKEND={recordConnectedJourney:async rows=>__captured.push(...rows),createListing:async()=>{},createRoomVacancyForProperty:async()=>{},uploadListingImages:async()=>{},reconfirmVacancy:async()=>{}};
  window.renderList=async()=>{};window.parseHash=()=>({name:'home'});window.render=()=>new Promise(resolve=>{window.__finish=resolve});
 });
 await page.addScriptTag({url:base+'/src/analytics-controls.js'});await page.addScriptTag({url:base+'/src/connected-journey.js'});
 await page.evaluate(()=>{render()});expect(await page.evaluate(()=>__captured.length)).toBe(0);
 await page.evaluate(async()=>{__finish();await Promise.resolve();await VACANCY_CONNECTED_JOURNEY.flush()});
 expect(await page.evaluate(()=>__captured.filter(e=>e.event_name==='lister_landing_viewed').map(e=>e.route))).toEqual(['find']);
 await page.evaluate(async()=>{render();__finish();await Promise.resolve();await VACANCY_CONNECTED_JOURNEY.flush()});expect(await page.evaluate(()=>__captured.filter(e=>e.event_name==='lister_landing_viewed').length)).toBe(1);
 await page.evaluate(()=>{history.replaceState(null,'','#list/new');render()});
 await page.evaluate(async()=>{__finish();await Promise.resolve();await VACANCY_CONNECTED_JOURNEY.flush()});expect(await page.evaluate(()=>__captured.filter(e=>e.event_name==='lister_landing_viewed').map(e=>e.route))).toEqual(['find','create']);
 await page.evaluate(()=>{history.replaceState(null,'','#auth');render();history.replaceState(null,'','#home')});await page.evaluate(async()=>{__finish();await Promise.resolve();await VACANCY_CONNECTED_JOURNEY.flush()});expect(await page.evaluate(()=>__captured.filter(e=>e.event_name==='lister_landing_viewed').length)).toBe(2);
});
