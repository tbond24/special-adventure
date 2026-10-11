const {test,expect}=require('@playwright/test');
const {install,owner}=require('../account-drafts/synthetic-cloud.cjs');
const perth=[-31.95,115.86],sydney=[-33.8688,151.2093],nearPerth=[-31.97,115.88];
const row=(id,point)=>({id,status:'active',rent_amount:300,rent_currency:'AUD',rent_period:'week',deposit:0,available_from:'2026-10-11',rooms:{id:'room-'+id,name:'Synthetic '+id,room_type:'Room',media:[],properties:{id:'property-'+id,suburb:id,city:id,country:'Australia',public_latitude:point[0],public_longitude:point[1],profiles:{}}}});
const LEGACY_KEY='vacancy-find-map-view';
async function ready(page){
 await page.waitForFunction(()=>typeof booting!=='undefined'&&!booting&&exploreMap&&parseHash().name==='home');
 await expect(page.locator('.current-page-loading')).toHaveCount(0);
}
async function setup(page,context,{points=[sydney],geo={country:'AU',latitude:perth[0],longitude:perth[1]},saved=null,market=null,permission='prompt',signedIn=false,delay=false,fail=false,width=390,mode='',currency=null,delayFX=false}={}){
 await page.setViewportSize({width,height:900});
 const state=await install(context,undefined,{signedIn:signedIn?owner:null});
 await page.addInitScript(({saved,market,permission,currency})=>{
  if(saved&&!sessionStorage.getItem('fixture-view-seeded')){sessionStorage.setItem('vacancy-find-map-view',typeof saved==='string'?saved:JSON.stringify(saved));sessionStorage.setItem('fixture-view-seeded','true')}
  if(market)localStorage.setItem('vacancy-market-v1',market);
  if(currency){localStorage.setItem('vacancy-currency-v1',currency);localStorage.setItem('vacancy-currency-mode-v1','manual')}
  window.__gpsCalls=0;window.__permissionCalls=0;
  navigator.geolocation.getCurrentPosition=()=>{window.__gpsCalls++};
  navigator.permissions.query=async()=>{window.__permissionCalls++;return{state:permission}};
 },{saved,market,permission,currency});
 await context.route('**/rest/v1/vacancies?**',route=>route.fulfill({json:points.map((point,i)=>row('place-'+i,point))}));
 const network={geo,fail,delay,geoRequests:0,fxRequests:0};
 let releaseGeo,releaseRates;
 const pending=new Promise(resolve=>releaseGeo=resolve),pendingRates=new Promise(resolve=>releaseRates=resolve);
 await context.route('**/api/visitor-country',async route=>{
  network.geoRequests++;
  if(network.delay)await pending;
  return route.fulfill(network.fail?{status:503,json:{}}:{json:network.geo});
 });
 await context.route('**/api/exchange-rates',async route=>{
  network.fxRequests++;if(delayFX)await pendingRates;
  return route.fulfill({json:{rates:{AUD:1.5,GBP:.75,KES:130,USD:1}}});
 });
 await context.route('**/api/geocode?**',route=>{
  const place=new URL(route.request().url()).searchParams.get('q')==='Sydney'?{lat:sydney[0],lon:sydney[1],label:'Sydney, Australia'}:{lat:51.5,lon:-.12,label:'London, United Kingdom'};
  return route.fulfill({json:new URL(route.request().url()).searchParams.has('suggest')?{suggestions:[place]}:place});
 });
 await page.goto('/'+mode+'#home');
 await ready(page);
 if(!delay)await page.waitForTimeout(250);
 return{state,network,release:()=>{network.delay=false;releaseGeo()},releaseFX:releaseRates};
}
async function view(page){return page.evaluate(()=>({center:exploreMap.getCenter(),zoom:exploreMap.getZoom(),bounds:exploreMap.getBounds(),search:searchCenter,searchKind:searchCenterKind,query:document.querySelector('#q')?.value,gps:window.__gpsCalls,permissions:window.__permissionCalls,markers:exploreMarkers.size,ids:[...document.querySelectorAll('[data-card-id]')].map(n=>n.dataset.cardId)}))}
async function contains(page,points,padding=0){return page.evaluate(({points,padding})=>points.every(point=>{const p=exploreMap.latLngToContainerPoint(point),size=exploreMap.getSize();return p.x>=padding&&p.y>=padding&&p.x<=size.x-padding&&p.y<=size.y-padding}),{points,padding})}
for(const width of [320,390,1280])test(`Perth and only Sydney are both visible with padding at ${width}px`,async({page,context},testInfo)=>{
 await setup(page,context,{width,market:'AU'});expect(await contains(page,[perth,sydney],40)).toBe(true);
 const unobscured=await page.evaluate(points=>points.every(point=>{const p=exploreMap.latLngToContainerPoint(point),r=exploreMap.getContainer().getBoundingClientRect();return !document.elementFromPoint(r.left+p.x,r.top+p.y)?.closest('.topbar,.mobile-nav,.map-search-panel,.map-type-filter,.discovery-results')}),[perth,sydney]);expect(unobscured).toBe(true);
 const value=await view(page);expect(value.ids).toContain('place-0');expect(value.search).toBe(null);expect(value.zoom).toBeLessThan(7);expect(value.gps).toBe(0);expect(value.permissions).toBe(0);
 await page.screenshot({path:testInfo.outputPath(`perth-sydney-${width}.png`)});
});
test('nearest wins over first row, distant cluster, and saved market preference',async({page,context})=>{
 await setup(page,context,{points:[sydney,[-33.87,151.2],nearPerth],market:'AU'});
 expect(await contains(page,[perth,nearPerth],40)).toBe(true);expect(await contains(page,[sydney])).toBe(false);
 expect((await view(page)).zoom).toBe(11);expect((await view(page)).ids).toEqual(['place-2']);
});
for(const permission of ['prompt','granted','denied'])test(`empty inventory anchors locally with zero GPS calls (${permission})`,async({page,context})=>{
 await setup(page,context,{points:[],permission});const v=await view(page);expect(v.center.lat).toBeCloseTo(perth[0],4);expect(v.center.lng).toBeCloseTo(perth[1],4);expect(v.zoom).toBe(6);expect(v.gps).toBe(0);expect(v.permissions).toBe(0);
});
test('invalid coordinates never create null-island markers or select a launch candidate',async({page,context})=>{
 await setup(page,context,{points:[[null,null],['',''],[91,30],[-20,181],['invalid',20]]});expect((await view(page)).markers).toBe(0);expect((await view(page)).center.lat).toBeCloseTo(perth[0],4);
 const checks=await page.evaluate(()=>[validMapPoint(null,null),validMapPoint('',''),validMapPoint(NaN,2),validMapPoint(91,2),validMapPoint(false,true),validMapPoint([],[]),validMapPoint(0,0)]);expect(checks).toEqual([null,null,null,null,null,null,[0,0]]);
});
async function expectView(page,before){
 const after=await view(page);
 expect(after.center.lat).toBeCloseTo(before.center.lat,5);
 expect(after.center.lng).toBeCloseTo(before.center.lng,5);
 expect(after.zoom).toBe(before.zoom);
}
async function panMap(page){
 const box=await page.locator('#exploreMap').boundingBox();
 const x=box.x+box.width*.55,y=box.y+Math.min(box.height*.55,350);
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-80,y-45,{steps:12});await page.waitForTimeout(100);await page.mouse.up();
 await page.waitForTimeout(350);
}
async function searchLondon(page,kind='button'){
 await page.locator('#searchBtn').click();await page.locator('#q').fill('London');
 if(kind==='suggestion')await page.getByRole('option',{name:'London, United Kingdom'}).click();
 else if(kind==='enter')await page.locator('#q').press('Enter');
 else await page.locator('#searchBtn').click();
 await expect.poll(async()=>(await view(page)).center.lat).toBeCloseTo(51.5,4);
 await expect.poll(async()=>(await view(page)).zoom).toBe(13);
}
async function leaveAndBack(page){
 await page.evaluate(()=>nav('auth'));await expect(page.locator('[name="email"]')).toBeVisible();
 await page.goBack();await ready(page);
}
for(const width of [390,1280])test(`manual pan survives rerender, Back and reload at ${width}px`,async({page,context})=>{
 await setup(page,context,{points:[nearPerth],width});const auto=await view(page);
 await panMap(page);const chosen=await view(page);expect(chosen.center).not.toEqual(auto.center);
 await page.evaluate(()=>renderHome());await ready(page);await expectView(page,chosen);
 await leaveAndBack(page);await expectView(page,chosen);
 await page.reload();await ready(page);await expectView(page,chosen);
 expect((await view(page)).search).toBe(null);
});
for(const kind of ['button','enter','suggestion'])test(`manual ${kind} search survives Back and reload with chosen centre`,async({page,context})=>{
 const{release}=await setup(page,context,{delay:true});await searchLondon(page,kind);const chosen=await view(page);
 release();await page.waitForTimeout(250);await expectView(page,chosen);
 await leaveAndBack(page);await expectView(page,chosen);
 await page.reload();await ready(page);await expectView(page,chosen);
 expect((await view(page)).search).toEqual({lat:51.5,lon:-.12});expect((await view(page)).searchKind).toBe('search');
 await page.locator('#searchBtn').click();await expect(page.locator('#q')).toHaveValue(/London/i);
 expect((await view(page)).gps).toBe(0);
});
for(const saved of [
 '{ "lat":20, "lon":0, "zoom":1, "legacy":"neutral" }',
 '{ "lat":-33.8688, "lon":151.2093, "zoom":12, "legacy":"arbitrary" }'
])test(`legacy saved view stays byte-identical and cannot poison fresh launch: ${JSON.parse(saved).legacy}`,async({page,context})=>{
 await setup(page,context,{saved,points:[nearPerth]});
 await expect.poll(async()=>contains(page,[perth,nearPerth],40)).toBe(true);expect((await view(page)).zoom).toBe(11);
 expect(await page.evaluate(key=>sessionStorage.getItem(key),LEGACY_KEY)).toBe(saved);
 await panMap(page);await page.reload();await ready(page);
 expect(await page.evaluate(key=>sessionStorage.getItem(key),LEGACY_KEY)).toBe(saved);
});
test('harmless rerender while IP is pending still applies the eventual area fit',async({page,context})=>{
 const{release}=await setup(page,context,{delay:true});await page.evaluate(()=>renderHome());await ready(page);
 release();await expect.poll(async()=>contains(page,[perth,sydney],40)).toBe(true);
 expect((await view(page)).zoom).toBeLessThan(7);expect((await view(page)).zoom).toBeGreaterThan(1);
});
test('delayed exchange rates rerender before IP cannot cancel first area fit',async({page,context})=>{
 const{release,releaseFX,network}=await setup(page,context,{delay:true,delayFX:true,market:'AU',currency:'GBP'});
 await expect.poll(()=>network.fxRequests).toBeGreaterThan(0);
 await page.evaluate(()=>{window.__mapBeforeRates=exploreMap});releaseFX();
 await page.waitForFunction(()=>fxRates?.GBP===.75&&exploreMap!==window.__mapBeforeRates);await ready(page);
 release();await expect.poll(async()=>contains(page,[perth,sydney],40)).toBe(true);
 expect((await view(page)).zoom).toBeGreaterThan(1);expect(await page.evaluate(()=>displayCurrency)).toBe('GBP');
});
for(const first of ['failed','timed out'])test(`${first} IP followed by healthy reload retries local anchoring`,async({page,context})=>{
 const fixture=await setup(page,context,{fail:first==='failed',delay:first==='timed out',points:[nearPerth]});
 if(first==='timed out')await page.waitForTimeout(4200);
 expect((await view(page)).zoom).toBe(1);
 fixture.network.fail=false;fixture.release();
 await page.reload();await ready(page);
 await expect.poll(async()=>contains(page,[perth,nearPerth],40)).toBe(true);
 expect((await view(page)).zoom).toBe(11);expect(fixture.network.geoRequests).toBeGreaterThanOrEqual(2);
});
test('automatic area is recalculated on reload when IP area changes',async({page,context})=>{
 const fixture=await setup(page,context,{points:[nearPerth,sydney]});expect((await view(page)).zoom).toBe(11);
 fixture.network.geo={country:'AU',latitude:sydney[0],longitude:sydney[1]};
 await page.reload();await ready(page);
 await expect.poll(async()=>contains(page,[sydney],40)).toBe(true);expect(await contains(page,[perth])).toBe(false);
 expect(fixture.network.geoRequests).toBeGreaterThanOrEqual(2);
});
test('fresh document navigation ignores earlier manual viewport',async({page,context})=>{
 await setup(page,context,{points:[nearPerth]});await searchLondon(page);expect((await view(page)).zoom).toBe(13);
 await page.goto('/?new-visit=1#home');await ready(page);
 await expect.poll(async()=>contains(page,[perth,nearPerth],40)).toBe(true);expect((await view(page)).search).toBe(null);
});
test('existing explicit search is preserved and implicit anchor is not a search center',async({page,context})=>{
 const {release}=await setup(page,context,{delay:true});await page.evaluate(()=>{searchCenter={lat:51.5,lon:-.12};searchCenterKind='search';exploreMap.setView([51.5,-.12],13,{animate:false});renderHome()});release();await page.waitForTimeout(200);const v=await view(page);expect(v.center.lat).toBeCloseTo(51.5,4);expect(v.zoom).toBe(13);expect(v.search).toEqual({lat:51.5,lon:-.12});
});
for(const event of ['pointerdown','wheel','touchstart','keydown','search','move','leave'])test(`late IP cannot override ${event}`,async({page,context})=>{
 const {release}=await setup(page,context,{delay:true});
 if(event==='leave'){await page.evaluate(()=>nav('auth'));await expect(page.locator('[name="email"]')).toBeVisible()}
 else if(event==='search')await page.locator('#q').dispatchEvent('input');
 else if(event==='move')await page.evaluate(()=>exploreMap.setView([10,20],9,{animate:false}));
 else await page.locator('#exploreMap').dispatchEvent(event,event==='keydown'?{key:'ArrowRight'}:{});
 const before=await view(page);release();await page.waitForTimeout(250);const after=await view(page);expect(after.center).toEqual(before.center);expect(after.zoom).toBe(before.zoom);
});
test('country-only geo opens an honest overview',async({page,context})=>{await setup(page,context,{geo:{country:'AU'},market:'KE'});expect(await contains(page,[[-43,114],[-11,153]])).toBe(true);expect((await view(page)).search).toBe(null);expect((await view(page)).zoom).toBeLessThan(6)});
test('IP failure without a country keeps a neutral overview',async({page,context})=>{await setup(page,context,{fail:true,market:'AU'});const v=await view(page);expect(v.center.lat).toBe(20);expect(v.center.lng).toBe(0);expect(v.zoom).toBe(1)});
test('nearest distance crosses the dateline and both endpoints remain visible',async({page,context})=>{await setup(page,context,{geo:{latitude:0,longitude:179},points:[[0,160],[0,-179]]});expect(await page.evaluate(()=>nearestLaunchPoint([0,179],vacancies))).toEqual([0,-179]);expect(await contains(page,[[0,179],[0,-179]],40)).toBe(true)});
test('filter, inventory refresh and account rerender never refit a settled launch',async({page,context})=>{
 await setup(page,context);const before=await view(page);await page.evaluate(()=>{vacancies=[];applySearch();currentUser={id:'synthetic-user'};renderHome()});const after=await view(page);expect(after.center).toEqual(before.center);expect(after.zoom).toBe(before.zoom);
});
test('signed-in launch follows the same anchor policy',async({page,context})=>{await setup(page,context,{signedIn:true});expect(await contains(page,[perth,sydney],40)).toBe(true);expect((await view(page)).gps).toBe(0)});
test('optional lite map does not reset launch or restored viewport',async({page,context})=>{await setup(page,context,{mode:'?map=vacancy-lite'});expect(await contains(page,[perth,sydney],40)).toBe(true);const before=await view(page);await page.evaluate(()=>renderHome());const after=await view(page);expect(after.center).toEqual(before.center);expect(after.zoom).toBe(before.zoom)});

test('hung IP never blocks route-away and return to Find',async({page,context})=>{
 const {release}=await setup(page,context,{delay:true});await page.evaluate(()=>nav('auth'));await expect(page.locator('[name="email"]')).toBeVisible();await page.goBack();await expect(page.locator('#exploreMap')).toBeVisible({timeout:1500});expect(await page.locator('.current-page-loading').count()).toBe(0);release();
});

test('coarse map anchoring keeps the existing market currency default',async({page,context})=>{await setup(page,context,{market:'KE'});expect(await page.evaluate(()=>displayCurrency)).toBe('KES');expect(await contains(page,[perth,sydney],40)).toBe(true)});
test('saved manual currency survives launch and explicit location remains usable',async({page,context})=>{
 await setup(page,context,{market:'AU',currency:'GBP'});expect(await page.evaluate(()=>displayCurrency)).toBe('GBP');await page.evaluate(()=>{navigator.geolocation.getCurrentPosition=success=>{window.__gpsCalls++;success({coords:{latitude:-31.95,longitude:115.86}})}});await page.locator('#useLocation').click();await page.waitForFunction(()=>searchCenterKind==='location');const v=await view(page);expect(v.gps).toBe(1);expect(v.search).toEqual({lat:perth[0],lon:perth[1]});expect(await page.evaluate(()=>displayCurrency)).toBe('GBP');
});
test('slow IP times out without blocking Find and never jumps after settling',async({page,context})=>{
 const {release}=await setup(page,context,{delay:true});await expect(page.locator('#exploreMap')).toBeVisible();await page.waitForTimeout(4200);const before=await view(page);release();await page.waitForTimeout(200);const after=await view(page);expect(after.center).toEqual(before.center);expect(after.zoom).toBe(before.zoom);expect(after.zoom).toBe(1);
});

for(const geo of [{country:'AU'},{},{latitude:null,longitude:null},{latitude:91,longitude:181}])test(`unknown precise area offers search/location without fake origin: ${JSON.stringify(geo)}`,async({page,context},testInfo)=>{
 await setup(page,context,{geo,market:'KE'});
 expect((await view(page)).search).toBe(null);expect((await view(page)).gps).toBe(0);expect((await view(page)).permissions).toBe(0);
 await expect(page.locator('.user-location-marker,.user-location-status')).toHaveCount(0);
 await expect(page.locator('#mapLaunchStatus')).toContainText(/Search an area or use your location/);
 await expect(page.locator('#mapLaunchStatus')).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('unknown-area-overview.png')});
 await expect(page.getByRole('button',{name:'Use my location',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Open map search',exact:true})).toBeVisible();
 await page.locator('#searchBtn').click();await expect(page.getByRole('textbox',{name:'Search location'})).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('unknown-area-controls.png')});
});
for(const intent of ['map click','typing','failed search','denied location'])test(`${intent} cancels late IP but does not poison healthy reload`,async({page,context})=>{
 const fixture=await setup(page,context,{delay:true,points:[nearPerth]});
 if(intent==='map click')await page.locator('#exploreMap').click({position:{x:200,y:330}});
 else if(intent==='denied location'){
  await page.evaluate(()=>{navigator.geolocation.getCurrentPosition=(_success,error)=>{window.__gpsCalls++;error({code:1,message:'Denied'})}});
  await page.locator('#useLocation').click();
 }else{
  if(intent==='failed search')await context.route('**/api/geocode?**',route=>route.fulfill({status:503,json:{error:'Synthetic geocode unavailable'}}));
  await page.locator('#searchBtn').click();await page.locator('#q').fill('London');
  if(intent==='failed search'){await page.locator('#searchBtn').click();await expect(page.locator('#searchBtn')).toBeEnabled();}
 }
 const before=await view(page);fixture.release();await page.waitForTimeout(250);await expectView(page,before);
 await page.reload();await ready(page);
 await expect.poll(async()=>contains(page,[perth,nearPerth],40)).toBe(true);expect((await view(page)).zoom).toBe(11);
});
test('currency preference with delayed FX cannot restore an obsolete pre-IP viewport',async({page,context})=>{
 const{release,releaseFX,network}=await setup(page,context,{delay:true,delayFX:true,market:'AU'});
 await page.locator('#resultsFiltersToggle').click();await page.getByRole('combobox',{name:'Display currency'}).selectOption('GBP');
 await expect.poll(()=>network.fxRequests).toBeGreaterThan(0);release();
 await expect.poll(async()=>contains(page,[perth,sydney],40)).toBe(true);const fitted=await view(page);
 releaseFX();await page.waitForFunction(()=>displayCurrency==='GBP'&&fxRates?.GBP===.75);await ready(page);
 await expectView(page,fitted);expect((await view(page)).search).toBe(null);expect((await view(page)).gps).toBe(0);
});
test('manual drag during pending IP survives its late reply and reload',async({page,context})=>{
 const{release}=await setup(page,context,{delay:true});const initial=await view(page);await panMap(page);const chosen=await view(page);
 expect(chosen.center).not.toEqual(initial.center);release();await page.waitForTimeout(250);await expectView(page,chosen);
 await leaveAndBack(page);await expectView(page,chosen);await page.reload();await ready(page);await expectView(page,chosen);
});
test('explicit location choice restores on reload without requesting GPS again',async({page,context})=>{
 const{release}=await setup(page,context,{delay:true});
 await page.evaluate(()=>{navigator.geolocation.getCurrentPosition=success=>{window.__gpsCalls++;success({coords:{latitude:51.5,longitude:-.12}})}});
 await page.locator('#useLocation').click();await expect.poll(async()=>(await view(page)).zoom).toBe(13);const chosen=await view(page);
 expect(chosen.gps).toBe(1);expect(chosen.searchKind).toBe('location');release();await page.waitForTimeout(250);await expectView(page,chosen);
 await page.reload();await ready(page);await expectView(page,chosen);const restored=await view(page);
 expect(restored.search).toEqual({lat:51.5,lon:-.12});expect(restored.searchKind).toBe('location');expect(restored.gps).toBe(0);expect(restored.permissions).toBe(0);
});

test('cross-document Back restores manual search after a fresh entry replaced session state',async({page,context})=>{
 await setup(page,context,{points:[nearPerth]});await searchLondon(page);const chosen=await view(page);
 await page.goto('/?new-visit=history#home');await ready(page);
 await expect.poll(async()=>contains(page,[perth,nearPerth],40)).toBe(true);expect((await view(page)).search).toBe(null);
 await page.goBack();await ready(page);await expectView(page,chosen);
 const returned=await view(page);expect(returned.search).toEqual({lat:51.5,lon:-.12});expect(returned.searchKind).toBe('search');
 await page.goForward();await ready(page);await expect.poll(async()=>contains(page,[perth,nearPerth],40)).toBe(true);
});

async function startHeldSearch(page,context){
 let release,requests=0;const pending=new Promise(resolve=>release=resolve);
 await context.route('**/api/geocode?**',async route=>{
  const url=new URL(route.request().url());
  if(url.searchParams.get('q')!=='London'||url.searchParams.has('suggest'))return route.fallback();
  requests++;await pending;return route.fulfill({json:{lat:51.5,lon:-.12,label:'London, United Kingdom'}});
 });
 await page.locator('#searchBtn').click();await page.locator('#q').fill('London');await page.locator('#searchBtn').click();
 await expect.poll(()=>requests).toBe(1);return release;
}
async function startHeldGPS(page){
 await page.evaluate(point=>{navigator.geolocation.getCurrentPosition=success=>{window.__gpsCalls++;window.__completeGps=()=>success({coords:{latitude:point[0],longitude:point[1]}})}},sydney);
 await page.locator('#useLocation').click();await expect.poll(async()=>(await view(page)).gps).toBe(1);
}
for(const newer of ['pan','search','route'])test(`late geocode cannot override a newer ${newer} choice`,async({page,context})=>{
 await setup(page,context,{points:[nearPerth]});const release=await startHeldSearch(page,context);
 if(newer==='pan')await panMap(page);
 else if(newer==='route')await leaveAndBack(page);
 else{
  await page.locator('#q').fill('Sydney');await page.locator('#q').press('Enter');
  await expect.poll(async()=>(await view(page)).center.lat).toBeCloseTo(sydney[0],4);
 }
 const chosen=await view(page);release();await page.waitForTimeout(250);await expectView(page,chosen);
 expect((await view(page)).search).toEqual(chosen.search);
});
for(const newer of ['pan','map jump','search','route'])test(`late GPS cannot override a newer ${newer} choice`,async({page,context})=>{
 await setup(page,context,{points:[nearPerth]});await startHeldGPS(page);
 if(newer==='pan')await panMap(page);
 else if(newer==='map jump')await page.evaluate(()=>exploreMap.setView([10,20],9,{animate:false}));
 else if(newer==='route')await leaveAndBack(page);
 else await searchLondon(page);
 await expect(page.locator('#useLocation')).toBeEnabled();
 const chosen=await view(page);await page.evaluate(()=>window.__completeGps());await page.waitForTimeout(250);await expectView(page,chosen);
 await expect(page.locator('#useLocation')).toBeEnabled();
 expect((await view(page)).search).toEqual(chosen.search);
});
test('in-flight successful search survives harmless rerender and remains restorable',async({page,context})=>{
 await setup(page,context,{points:[nearPerth]});const release=await startHeldSearch(page,context);
 await page.evaluate(()=>renderHome());await ready(page);release();
 await expect.poll(async()=>(await view(page)).center.lat).toBeCloseTo(51.5,4);
 expect((await view(page)).search).toEqual({lat:51.5,lon:-.12});
 await page.reload();await ready(page);expect((await view(page)).center.lat).toBeCloseTo(51.5,4);
 await page.locator('#searchBtn').click();await expect(page.locator('#q')).toHaveValue(/London/i);
});
test('in-flight successful GPS survives harmless rerender',async({page,context})=>{
 await setup(page,context,{points:[nearPerth]});await startHeldGPS(page);
 await page.evaluate(()=>renderHome());await ready(page);await page.evaluate(()=>window.__completeGps());
 await expect.poll(async()=>(await view(page)).center.lat).toBeCloseTo(sydney[0],4);
 expect((await view(page)).searchKind).toBe('location');expect((await view(page)).gps).toBe(1);
});
