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
