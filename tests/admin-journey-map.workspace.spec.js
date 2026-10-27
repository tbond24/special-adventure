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
 await page.evaluate(()=>{VACANCY_BACKEND.adminVisitorPresence=async()=>({total:0,nodes:[],expiresAt:new Date(Date.now()+1000).toISOString()});window.__mapOriginal=VACANCY_BACKEND.adminJourneyMap;VACANCY_BACKEND.adminJourneyMap=async o=>({...await __mapOriginal(o),nodes:[],edges:[],total:0})});await map.getByRole('button',{name:'Refresh map',exact:true}).click();await expect(map).toContainText('No recorded journeys');
 await page.evaluate(()=>{VACANCY_BACKEND.adminJourneyMap=async o=>({...await __mapOriginal(o),edges:[{from:'find',to:'listing',count:999}]})});await map.getByRole('button',{name:'Refresh map',exact:true}).click();await expect(map).toContainText('Journey map unavailable');await expect(map.locator('.journey-map-node')).toHaveCount(0);
 await page.evaluate(()=>{VACANCY_BACKEND.adminJourneyMap=o=>new Promise(resolve=>{window.__oldMap=async()=>resolve(await __mapOriginal(o))})});await map.getByRole('button',{name:'Refresh map',exact:true}).click();await page.waitForFunction(()=>!!window.__oldMap);
 await page.evaluate(()=>{VACANCY_BACKEND.adminJourneyMap=__mapOriginal});await map.locator('[data-map-device]').selectOption('desktop');await expect(map.locator('.journey-map-centre strong')).toHaveText('120');await page.evaluate(()=>__oldMap());await expect(map.locator('.journey-map-centre strong')).toHaveText('120');
 await page.evaluate(()=>{currentUser=null;document.body.append(document.createElement('span'))});await expect(map.locator('.journey-map-node')).toHaveCount(0);
});
test('admin browser exclusion survives sign-out and prevents telemetry',async({page})=>{
 const toggle=page.getByRole('switch',{name:'Exclude this browser'});await expect(toggle).toBeChecked();await page.goto(base+'/#home');await page.waitForFunction(()=>!!window.VACANCY_BACKEND);expect(await page.evaluate(()=>VACANCY_ANALYTICS_PREFERENCES.disabled)).toBe(true);let sends=0;page.on('request',r=>{if(/rpc\/(record_|track_)/.test(r.url()))sends++});await page.evaluate(async()=>{await VACANCY_BACKEND.trackEvent('vacancy_opened');await VACANCY_BACKEND.recordConnectedJourney([])});expect(sends).toBe(0);
});
test('only fresh presence pulses; historical nodes and failed presence do not',async({page})=>{
 const map=page.getByRole('region',{name:'Visitor journey map'});await map.scrollIntoViewIfNeeded();await expect(map.locator('.journey-map-node.is-active')).toHaveCount(1);await expect(map.locator('.journey-map-node.is-active')).toContainText('Find');await page.evaluate(()=>VACANCY_BACKEND.adminVisitorPresence=async()=>({total:0,nodes:[],expiresAt:new Date(Date.now()+1000).toISOString()}));await map.getByRole('button',{name:'Refresh map',exact:true}).click();await expect(map.locator('.journey-map-node.is-active')).toHaveCount(0);await expect(map.locator('.journey-map-node')).toHaveCount(7);
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

test('listing hooks record Create before Location and preserve linked step transitions',async({page})=>{
 await page.goto(base+'/__offline');await page.setContent('<main id="listingHost"><form id="listingForm"></form></main>');await page.evaluate(()=>{history.replaceState(null,'','#list/new');window.currentUser=null;window.__events=[];window.VACANCY_ANALYTICS_PREFERENCES={disabled:false};window.VACANCY_BACKEND={recordConnectedJourney:async e=>__events.push(...e)};window.render=async()=>{};window.renderList=async()=>{};window.parseHash=()=>({name:'list',id:'new'})});await page.addScriptTag({url:base+'/src/analytics-controls.js'});await page.addScriptTag({url:base+'/src/connected-journey.js'});
 await page.evaluate(async()=>{const form=document.querySelector('form'),chooser=document.createElement('div');chooser.className='listing-start';form.before(chooser);VACANCY_CONNECTED_JOURNEY.step(form,0);await VACANCY_CONNECTED_JOURNEY.flush();if(__events.some(e=>e.event_name==='listing_started'))throw Error('Hidden chooser counted as a reached step');chooser.classList.add('complete');for(const n of [0,1,2])VACANCY_CONNECTED_JOURNEY.step(form,n);await VACANCY_CONNECTED_JOURNEY.flush()});const rows=await page.evaluate(()=>__events);expect(rows.filter(e=>e.event_name!=='lister_session_started').map(e=>e.event_name)).toEqual(['lister_landing_viewed','listing_started','step_ready','step_ready']);const steps=rows.filter(e=>e.journey_id);expect(steps[1].previous_event_id).toBe(steps[0].event_id);expect(steps[2].previous_event_id).toBe(steps[1].event_id);expect(new Set(steps.map(e=>e.session_id)).size).toBe(1);
});

async function readyMap(page){const map=page.locator('.overview-journey-map');await map.scrollIntoViewIfNeeded();await expect(map.locator('.journey-map-centre strong')).toHaveText('120');return map;}
async function retainMap(page){return page.evaluate(()=>{const map=document.querySelector('.overview-journey-map');window.__retainedJourney={graph:map.querySelector('.journey-map-graph'),details:map.querySelector('details'),node:map.querySelector('[data-node]'),height:map.getBoundingClientRect().height,scrollY,focus:document.activeElement};return {height:__retainedJourney.height,scrollY}});}
async function expectRetained(page,before){const state=await page.evaluate(()=>{const map=document.querySelector('.overview-journey-map'),old=__retainedJourney;return {graph:map.querySelector('.journey-map-graph')===old.graph,details:map.querySelector('details')===old.details,node:old.node.isConnected,open:old.details.open,height:map.getBoundingClientRect().height,scrollY,focus:document.activeElement===old.focus}});expect(state).toMatchObject({graph:true,details:true,node:true,open:true,focus:true});expect(Math.abs(state.height-before.height)).toBeLessThan(2);expect(Math.abs(state.scrollY-before.scrollY)).toBeLessThan(2);}

test('manual slow refresh keeps map height, branch, table, nodes and focus',async({page})=>{
 const map=await readyMap(page);await map.locator('[data-node=find]').click();await map.getByText('View transition counts',{exact:true}).click();
 await page.evaluate(()=>{window.__journeyRead=VACANCY_BACKEND.adminJourneyMap;VACANCY_BACKEND.adminJourneyMap=options=>new Promise(resolve=>{window.__finishJourney=async()=>{const report=await __journeyRead(options);report.edges.find(e=>e.from==='find').count=79;resolve(report)}})});
 await map.getByRole('button',{name:'Refresh map',exact:true}).click();await expect(map.locator('[data-map-status]')).toHaveText('Updating…');
 // Capture during the request, then assert the complete view was retained from before it.
 await expect(map.locator('.journey-map-centre span')).toHaveText('Find');await expect(map.locator('details')).toHaveAttribute('open','');await expect(map.locator('[data-node=listing] strong')).toHaveText('80');const before=await retainMap(page);
 await page.evaluate(()=>__finishJourney());await expect(map.locator('[data-node=listing] strong')).toHaveText('79');await expect(map.locator('[data-map-status]')).toContainText('Updated');await expectRetained(page,before);await expect(map.locator('tbody')).toContainText('79');
});

test('automatic shared refresh preserves explored branch and expanded table during and after loading',async({page})=>{
 const map=await readyMap(page);await map.locator('[data-node=find]').click();await map.getByText('View transition counts',{exact:true}).click();
 const before=await retainMap(page);await page.evaluate(()=>{window.__journeyRead=VACANCY_BACKEND.adminJourneyMap;VACANCY_BACKEND.adminJourneyMap=o=>new Promise(resolve=>{window.__finishJourney=async()=>resolve(await __journeyRead(o))});dispatchEvent(new CustomEvent('vacancy:refresh-data',{detail:{at:new Date().toISOString(),initial:false}}))});
 await expect(map.locator('[data-map-status]')).toHaveText('Updating…');await expectRetained(page,before);await page.evaluate(()=>__finishJourney());await expect(map.locator('[data-map-status]')).toContainText('Updated');await expect(map.locator('.journey-map-centre span')).toHaveText('Find');await expectRetained(page,before);
 await map.getByRole('button',{name:'All pages',exact:true}).click();await expect(map.locator('.journey-map-node')).toHaveCount(7);await expect(map.locator('details')).toHaveAttribute('open','');
});

test('failed or timed out refresh retains labelled last data; access denial clears it',async({page})=>{
 const map=await readyMap(page);await map.getByText('View transition counts',{exact:true}).click();await page.evaluate(()=>{window.__journeyRead=VACANCY_BACKEND.adminJourneyMap;VACANCY_BACKEND.adminJourneyMap=async()=>{throw Error('Offline')}});await map.getByRole('button',{name:'Refresh map',exact:true}).click();await expect(map.locator('[data-map-status]')).toContainText('last successful update');await expect(map.locator('.journey-map-centre strong')).toHaveText('120');await expect(map.locator('details')).toHaveAttribute('open','');
 await page.clock.install();await page.evaluate(()=>VACANCY_BACKEND.adminJourneyMap=()=>new Promise(()=>{}));await map.getByRole('button',{name:'Refresh map',exact:true}).click();await page.clock.fastForward(15001);await expect(map.locator('[data-map-status]')).toContainText('last successful update');await expect(map.locator('[data-map-canvas]')).not.toHaveAttribute('aria-busy','true');await expect(map.locator('.journey-map-centre strong')).toHaveText('120');
 await page.evaluate(()=>VACANCY_BACKEND.adminJourneyMap=__journeyRead);await map.getByRole('button',{name:'Refresh map',exact:true}).click();await expect(map.locator('[data-map-status]')).toContainText('Updated');
 await page.evaluate(()=>VACANCY_BACKEND.adminJourneyMap=async()=>{throw Object.assign(Error('Denied'),{status:403})});await map.getByRole('button',{name:'Refresh map',exact:true}).click();await expect(map.locator('.journey-map-node')).toHaveCount(0);await expect(map.locator('[data-map-status]')).toHaveText('Journey map unavailable.');
});

test('filter changes clear old context, ignore an obsolete read and explain a vanished branch',async({page})=>{
 const map=await readyMap(page);await map.locator('[data-node=find]').click();await page.evaluate(()=>{window.__journeyRead=VACANCY_BACKEND.adminJourneyMap;VACANCY_BACKEND.adminJourneyMap=o=>new Promise(resolve=>{window.__finishJourney=async()=>resolve(await __journeyRead(o))})});await map.locator('[data-map-device]').selectOption('mobile');await expect(map.locator('.journey-map-node')).toHaveCount(0);
 await page.evaluate(()=>VACANCY_BACKEND.adminJourneyMap=__journeyRead);await map.locator('[data-map-device]').selectOption('desktop');await expect(map.locator('.journey-map-centre span')).toHaveText('Visitors');await page.evaluate(()=>__finishJourney());await expect(map.locator('[data-map-device]')).toHaveValue('desktop');await expect(map.locator('[data-map-status]')).toContainText('Updated');
 await map.locator('[data-node=create]').click();await page.evaluate(()=>VACANCY_BACKEND.adminJourneyMap=async o=>{const r=await __journeyRead(o);return {...r,nodes:r.nodes.filter(n=>n.id!=='create'),edges:r.edges.filter(e=>e.from!=='create'&&e.to!=='create')}});await map.getByRole('button',{name:'Refresh map',exact:true}).click();await expect(map.locator('.journey-map-centre span')).toHaveText('Visitors');await expect(map.locator('[data-map-status]')).toContainText('Selected page no longer appears');
});

test('hidden Overview cancels pending map updates and catches up on return without losing table state',async({page})=>{
 const map=await readyMap(page);await map.getByText('View transition counts',{exact:true}).click();await page.evaluate(()=>{window.__journeyRead=VACANCY_BACKEND.adminJourneyMap;VACANCY_BACKEND.adminJourneyMap=o=>new Promise(resolve=>{window.__finishJourney=async()=>resolve(await __journeyRead(o))});dispatchEvent(new CustomEvent('vacancy:refresh-data'));document.querySelector('.overview-journey-map').closest('[data-admin-section]').hidden=true});await expect(map.locator('[data-map-status]')).toHaveText('Updates paused.');await page.evaluate(()=>__finishJourney());await expect(map.locator('[data-map-status]')).toHaveText('Updates paused.');
 await page.evaluate(()=>{VACANCY_BACKEND.adminJourneyMap=__journeyRead;document.querySelector('.overview-journey-map').closest('[data-admin-section]').hidden=false});await expect(map.locator('[data-map-status]')).toContainText('Updated');await expect(map.locator('details')).toHaveAttribute('open','');await expect(map.locator('.journey-map-centre strong')).toHaveText('120');
});


test('scheduled minute refresh retains the current exploration and disclosure',async({page})=>{
 await page.clock.install();await page.reload();await page.waitForFunction(()=>window.__visualReady===true);const map=await readyMap(page);await map.locator('[data-node=find]').click();await map.getByText('View transition counts',{exact:true}).click();const before=await retainMap(page);await page.evaluate(()=>{window.__journeyRead=VACANCY_BACKEND.adminJourneyMap;window.__scheduledJourneyReads=0;VACANCY_BACKEND.adminJourneyMap=async o=>{++__scheduledJourneyReads;return __journeyRead(o)}});await page.clock.fastForward(61000);await expect.poll(()=>page.evaluate(()=>__scheduledJourneyReads)).toBeGreaterThan(0);await expect(map.locator('[data-map-status]')).toContainText('Updated');await expect(map.locator('.journey-map-centre span')).toHaveText('Find');await expectRetained(page,before);
});
