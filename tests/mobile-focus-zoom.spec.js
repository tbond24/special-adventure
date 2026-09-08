const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4178';
const widths=[320,375,390,430];

async function open(page,hash='home'){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#${hash}`,{waitUntil:'domcontentloaded'});await page.waitForSelector('#app');
}

async function assertNoFocusZoomControls(page,label){
  const offenders=await page.locator('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), select, textarea').evaluateAll(nodes=>nodes.filter(node=>{const style=getComputedStyle(node);return style.display!=='none'&&style.visibility!=='hidden'&&Number.parseFloat(style.fontSize)<16}).map(node=>({tag:node.tagName,id:node.id,name:node.getAttribute('name'),size:getComputedStyle(node).fontSize})));
  expect(offenders,`${label} has controls below the iOS 16px focus threshold`).toEqual([]);
}

test.beforeEach(({page})=>test.skip(page.viewportSize().width>820,'mobile focus zoom audit only'));

for(const width of widths)test(`${width}px home, filters, auth and recovery controls avoid focus zoom`,async({page})=>{
  await page.setViewportSize({width,height:844});
  await open(page);await assertNoFocusZoomControls(page,`${width}px home`);
  await page.getByRole('button',{name:'Map tools'}).click();await assertNoFocusZoomControls(page,`${width}px filters`);
  await open(page,'auth');await assertNoFocusZoomControls(page,`${width}px auth`);
  await open(page,'forgot-password');await assertNoFocusZoomControls(page,`${width}px recovery`);
  expect(await page.evaluate(()=>({scale:visualViewport.scale,meta:document.querySelector('meta[name="viewport"]').content}))).toEqual({scale:1,meta:'width=device-width,initial-scale=1,viewport-fit=cover'});
});

test('account settings currency control avoids focus zoom',async({page})=>{
  await open(page);await page.evaluate(()=>{currentUser={id:'zoom-user',email:'zoom@test.invalid'};VACANCY_BACKEND.adminOverview=async()=>({error:'admin required'});renderAccount()});
  await assertNoFocusZoomControls(page,'account settings');await expect(page.locator('#settingCurrency')).toHaveCSS('font-size','16px');
});

test('listing composer text, date, number and select fields avoid focus zoom',async({page})=>{
  await open(page);await page.evaluate(async()=>{currentUser={id:'zoom-owner',email:'owner@test.invalid'};VACANCY_BACKEND.ownerProperties=async()=>[];await renderList()});
  await expect(page.locator('#listingForm')).toBeVisible();await assertNoFocusZoomControls(page,'listing composer');
});

test('ordinary controls prevent double-tap page zoom while map gestures stay owned by Leaflet',async({page})=>{
  await open(page);await expect(page.getByRole('button',{name:'Search map'})).toHaveCSS('touch-action','manipulation');
  const mapTouch=await page.locator('#exploreMap').evaluate(node=>getComputedStyle(node).touchAction);expect(mapTouch).not.toBe('manipulation');
});
