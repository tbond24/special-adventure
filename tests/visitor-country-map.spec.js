const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

test('Find opens around the visitor country without requesting precise location',async({page})=>{
  await page.addInitScript(()=>{
    navigator.geolocation.getCurrentPosition=()=>{window.__preciseLocationRequested=true};
  });
  await page.route('**/api/visitor-country',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({country:'TZ',latitude:-6.8,longitude:39.2})}));
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(APP+'/#home');
  await page.waitForFunction(()=>booting===false&&exploreMap&&Math.abs(exploreMap.getCenter().lat+6.8)<1);
  const state=await page.evaluate(()=>({center:exploreMap.getCenter(),zoom:exploreMap.getZoom(),precise:!!window.__preciseLocationRequested}));
  expect(state.center.lng).toBeCloseTo(39.2,0);
  expect(state.zoom).toBeLessThanOrEqual(6);
  expect(state.precise).toBe(false);
});

test('Find keeps its map position when the page is opened again',async({page})=>{
  await page.route('**/api/visitor-country',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({country:'AU',latitude:-31.95,longitude:115.86})}));
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(APP+'/#home');
  await page.waitForFunction(()=>booting===false&&exploreMap);
  await page.evaluate(()=>{exploreMap.setView([-1.29,36.82],10,{animate:false});nav('saved');nav('home')});
  await page.waitForFunction(()=>exploreMap&&Math.abs(exploreMap.getCenter().lat+1.29)<.01);
  const state=await page.evaluate(()=>({center:exploreMap.getCenter(),zoom:exploreMap.getZoom()}));
  expect(state.center.lng).toBeCloseTo(36.82,1);
  expect(state.zoom).toBe(10);
  await page.reload();
  await page.waitForFunction(()=>booting===false&&exploreMap);
  const afterReload=await page.evaluate(()=>({center:exploreMap.getCenter(),zoom:exploreMap.getZoom()}));
  expect(afterReload.center.lat).toBeCloseTo(-1.29,1);
  expect(afterReload.center.lng).toBeCloseTo(36.82,1);
  expect(afterReload.zoom).toBe(10);
});

test('long listing and map-summary text stays inside card margins',async({page})=>{
  await page.goto(APP+'/#home');
  const fits=await page.evaluate(()=>{
    const host=document.createElement('div');host.style.width='260px';host.innerHTML='<article class="listing-card"><div class="card-body"><div class="listing-location">VeryLongSydneySuburbNameThatWouldOtherwiseRunIntoTheCardEdgeWithoutBreaking</div><h3>VeryLongPropertyTypeAndNameThatWouldOtherwiseRunIntoTheCardEdge</h3><div class="listing-price">AUD 123,456,789 per month with a long description</div></div></article><div class="marker-summary"><strong>VeryLongListingNameThatWouldOtherwiseOverflowTheMapTooltip</strong><span>VeryLongSydneySuburbNameThatWouldOtherwiseOverflowTheMapTooltip</span></div>';document.body.append(host);
    const right=host.getBoundingClientRect().right;
    const children=[...host.querySelectorAll('.listing-location,h3,.listing-price,.marker-summary,.marker-summary strong,.marker-summary span')];
    const okay=children.every(item=>item.getBoundingClientRect().right<=right+1);
    host.remove();return okay;
  });
  expect(fits).toBe(true);
});
