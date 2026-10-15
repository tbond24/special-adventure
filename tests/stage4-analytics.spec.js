const {test,expect}=require('@playwright/test'),path=require('node:path');
async function shell(page){await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8776/stage4-test')?route.fulfill({contentType:'text/html',body:'<!doctype html><input id="q" value="Synthetic query"><button id="searchBtn">Search</button><main id="app"><section id="section"></section></main>'}):route.abort());await page.goto('http://127.0.0.1:8776/stage4-test#home');}
async function renter(page,enabled=true){await shell(page);await page.evaluate(enabled=>{
 window.currentUser={id:'synthetic-member'};window.calls=[];window.batches=[];window.parseHash=()=>({name:location.hash==='#admin'?'admin':'home'});
 window.searchMapLocation=async()=>{};document.querySelector('#searchBtn').onclick=()=>searchMapLocation();
 window.renderInformationPage=()=>{document.querySelector('#app').innerHTML='<article class="information-page"></article>'};
 window.VACANCY_BACKEND={trackEvent:async(...args)=>calls.push(args),startEnquiry:async()=>{if(window.failEnquiry)throw Error('Original business error');return '33333333-3333-4333-8333-333333333333'},renterAnalyticsPolicy:async()=>({enabled,retentionDays:30,noticeVersion:'20261016-renter-v1'}),recordRenterJourney:async(events,version)=>{batches.push({events,version});return events.length}};
 },enabled);await page.addScriptTag({path:path.resolve('app/src/analytics-controls.js')});await page.addScriptTag({path:path.resolve('app/src/renter-journey.js')});}
test('disabled server policy collects nothing and introduces no renter identifiers',async({page})=>{
 await renter(page,false);await page.locator('#searchBtn').click();await page.evaluate(async()=>{await VACANCY_BACKEND.trackEvent('vacancy_opened','55555555-5555-4555-8555-555555555555');await VACANCY_RENTER_JOURNEY.flush()});await expect(page.locator('[data-renter-consent]')).toHaveCount(0);
 expect(await page.evaluate(()=>({batches:batches.length,keys:Object.keys(localStorage).filter(k=>k.startsWith('vacancy-renter'))}))).toEqual({batches:0,keys:[]});
});
test('optional consent precedes identity/collection, and decline leaves the product working',async({page})=>{
 await renter(page);await expect(page.locator('[data-renter-consent]')).toBeVisible();await page.locator('#searchBtn').click();await page.evaluate(()=>VACANCY_RENTER_JOURNEY.flush());expect(await page.evaluate(()=>batches.length)).toBe(0);expect(await page.evaluate(()=>localStorage.getItem('vacancy-renter-session-v1'))).toBe(null);
 await page.locator('[data-decline]').click();const result=await page.evaluate(async()=>{const c=await VACANCY_BACKEND.startEnquiry('55555555-5555-4555-8555-555555555555',{message:'Private message'});await VACANCY_RENTER_JOURNEY.flush();return c});expect(result).toBe('33333333-3333-4333-8333-333333333333');expect(await page.evaluate(()=>batches.length)).toBe(0);
});
test('opt-in produces exact parent links without query, form or message contents',async({page})=>{
 await renter(page);await page.locator('[data-accept]').click();await page.locator('#q').fill('');await page.locator('#searchBtn').click();await page.evaluate(()=>VACANCY_RENTER_JOURNEY.flush());expect(await page.evaluate(()=>batches.length)).toBe(0);await page.locator('#q').fill('Private synthetic query');await page.locator('#searchBtn').click();
 await page.evaluate(async()=>{await VACANCY_BACKEND.trackEvent('vacancy_opened','55555555-5555-4555-8555-555555555555','#detail/private-location');await VACANCY_BACKEND.startEnquiry('55555555-5555-4555-8555-555555555555',{message:'Private secret message',intro:'Private introduction'});await VACANCY_RENTER_JOURNEY.flush()});
 const all=await page.evaluate(()=>batches.flatMap(b=>b.events));expect(all.map(e=>e.event_name)).toEqual(['search_used','vacancy_opened','enquiry_linked']);expect(all[1].parent_id).toBe(all[0].event_id);expect(all[2].parent_id).toBe(all[1].event_id);expect(JSON.stringify(all)).not.toMatch(/Private|secret|location|intro/);
});
test('Privacy withdrawal suppresses queued events and preserves original enquiry errors',async({page})=>{
 await renter(page);await page.locator('[data-accept]').click();await page.locator('#searchBtn').click();await page.evaluate(()=>{location.hash='#privacy';renderInformationPage('privacy')});await page.getByRole('button',{name:'Turn off optional renter analytics'}).click();await page.evaluate(()=>VACANCY_RENTER_JOURNEY.flush());expect(await page.evaluate(()=>batches.length)).toBe(0);
 expect(await page.evaluate(async()=>{failEnquiry=true;try{await VACANCY_BACKEND.startEnquiry('id',{})}catch(e){return e.message}})).toBe('Original business error');
});
test('admin preview/routes never collect optional renter events',async({page})=>{
 await renter(page);await page.locator('[data-accept]').click();await page.evaluate(()=>location.hash='#admin');await page.evaluate(async()=>{await VACANCY_BACKEND.trackEvent('vacancy_opened','55555555-5555-4555-8555-555555555555');await VACANCY_RENTER_JOURNEY.flush()});expect(await page.evaluate(()=>batches.length)).toBe(0);await expect(page.locator('[data-renter-consent]')).toHaveCount(0);
});
for(const kind of ['renter','lister'])test(`${kind} manual report cancels obsolete reads and clears stale account results`,async({page})=>{
 await shell(page);await page.evaluate(()=>{location.hash='#admin';window.currentUser={id:'owner'};window.account='owner';window.reads=[];window.escapeHtml=x=>String(x).replaceAll('<','&lt;');window.VACANCY_BACKEND={assuranceLevel:()=> 'aal2',session:()=>({user:{id:account}}),adminRenterJourneys:(_,{signal})=>new Promise(resolve=>reads.push({resolve,signal})),adminConnectedJourneys:(_,{signal})=>new Promise(resolve=>reads.push({resolve,signal}))}});
 await page.addScriptTag({path:path.resolve('app/src/'+(kind==='renter'?'admin-renter-report':'admin-connected-report')+'.js')});await page.evaluate(kind=>window[kind==='renter'?'mountVacancyRenterReport':'mountVacancyConnectedReport'](document.querySelector('#section')),kind);
 await page.locator(kind==='renter'?'[data-period]':'select[name=period]').selectOption('7');await expect.poll(()=>page.evaluate(()=>reads.length)).toBe(2);expect(await page.evaluate(()=>reads[0].signal.aborted)).toBe(true);
 await page.evaluate(kind=>{reads[0].resolve({schemaVersion:kind==='renter'?1:2,complete:false,generatedAt:new Date().toISOString(),reason:'Obsolete results'});reads[1].resolve({schemaVersion:kind==='renter'?1:2,complete:false,generatedAt:new Date().toISOString(),reason:'Current coverage unavailable'})},kind);
 await expect(page.locator('#section')).toContainText('Current coverage unavailable');await expect(page.locator('#section')).not.toContainText('Obsolete results');
 await page.locator(kind==='renter'?'[data-refresh]':'.console-refresh').click();await expect.poll(()=>page.evaluate(()=>reads.length)).toBe(3);await page.evaluate(()=>{currentUser={id:'other'};account='other';document.body.append(document.createElement('span'))});await expect(page.locator('#section')).toHaveText('');expect(await page.evaluate(()=>reads[2].signal.aborted)).toBe(true);
});
