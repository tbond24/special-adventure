const {test,expect}=require('@playwright/test');
const {install,owner}=require('../account-drafts/synthetic-cloud.cjs');
const perth=[-31.95,115.86],sydney=[-33.8688,151.2093],nearPerth=[-31.97,115.88];
const row=(id,point)=>({id,status:'active',rent_amount:300,rent_currency:'AUD',rent_period:'week',deposit:0,available_from:'2026-10-11',rooms:{id:'room-'+id,name:'Synthetic '+id,room_type:'Room',media:[],properties:{id:'property-'+id,suburb:id,city:id,country:'Australia',public_latitude:point[0],public_longitude:point[1],profiles:{}}}});
async function setup(page,context,{points=[sydney],geo={country:'AU',latitude:perth[0],longitude:perth[1]},saved=null,market=null,permission='prompt',signedIn=false,delay=false,fail=false,width=390,mode='',currency=null}={}){
 await page.setViewportSize({width,height:900});
 const state=await install(context,undefined,{signedIn:signedIn?owner:null});
 await page.addInitScript(({saved,market,permission,currency})=>{
  if(saved&&!sessionStorage.getItem('fixture-view-seeded')){sessionStorage.setItem('vacancy-find-map-view',JSON.stringify(saved));sessionStorage.setItem('fixture-view-seeded','true')}
  if(market)localStorage.setItem('vacancy-market-v1',market);
  if(currency){localStorage.setItem('vacancy-currency-v1',currency);localStorage.setItem('vacancy-currency-mode-v1','manual')}
  window.__gpsCalls=0;window.__permissionCalls=0;
  navigator.geolocation.getCurrentPosition=()=>{window.__gpsCalls++};
  navigator.permissions.query=async()=>{window.__permissionCalls++;return{state:permission}};
 },{saved,market,permission,currency});
 await context.route('**/rest/v1/vacancies?**',route=>route.fulfill({json:points.map((point,i)=>row('place-'+i,point))}));
 let release;
 const pending=new Promise(resolve=>release=resolve);
 await context.route('**/api/visitor-country',async route=>{if(delay)await pending;if(fail)return route.fulfill({status:503,json:{}});return route.fulfill({json:geo})});
 await page.goto('/'+mode+'#home');
 await page.waitForFunction(()=>typeof booting!=='undefined'&&!booting&&exploreMap);
 if(!delay&&!saved)await page.waitForTimeout(250);
 return{state,release};
}
async function view(page){return page.evaluate(()=>({center:exploreMap.getCenter(),zoom:exploreMap.getZoom(),bounds:exploreMap.getBounds(),search:searchCenter,gps:window.__gpsCalls,permissions:window.__permissionCalls,markers:exploreMarkers.size,ids:[...document.querySelectorAll('[data-card-id]')].map(n=>n.dataset.cardId)}))}
async function contains(page,points,padding=0){return page.evaluate(({points,padding})=>points.every(point=>{const p=exploreMap.latLngToContainerPoint(point),size=exploreMap.getSize();return p.x>=padding&&p.y>=padding&&p.x<=size.x-padding&&p.y<=size.y-padding}),{points,padding})}
for(const width of [320,390,1280])test(`Perth and only Sydney are both visible with padding at ${width}px`,async({page,context})=>{
 await setup(page,context,{width,market:'AU'});expect(await contains(page,[perth,sydney],40)).toBe(true);
 const unobscured=await page.evaluate(points=>points.every(point=>{const p=exploreMap.latLngToContainerPoint(point),r=exploreMap.getContainer().getBoundingClientRect();return !document.elementFromPoint(r.left+p.x,r.top+p.y)?.closest('.topbar,.mobile-nav,.map-search-panel,.map-type-filter,.discovery-results')}),[perth,sydney]);expect(unobscured).toBe(true);
 const value=await view(page);expect(value.ids).toContain('place-0');expect(value.search).toBe(null);expect(value.zoom).toBeLessThan(7);expect(value.gps).toBe(0);expect(value.permissions).toBe(0);
 await page.screenshot({path:`test-results/map-startup/perth-sydney-${width}.png`});
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
for(const center of [perth,sydney])test(`saved ${center[1]} viewport survives launch, rerender, Back and reload`,async({page,context})=>{
 await setup(page,context,{saved:{lat:center[0],lon:center[1],zoom:12}});const before=await view(page);
 await page.evaluate(()=>renderHome());expect((await view(page)).center).toEqual(before.center);
 await page.evaluate(()=>nav('auth'));await expect(page.locator('[name="email"]')).toBeVisible();await page.goBack();await page.waitForFunction(()=>parseHash().name==='home'&&document.querySelector('#exploreMap'));expect((await view(page)).center).toEqual(before.center);
 await page.reload();await page.waitForFunction(()=>!booting&&exploreMap);expect((await view(page)).center).toEqual(before.center);expect((await view(page)).zoom).toBe(12);
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
