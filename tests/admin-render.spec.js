const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:8776';
test.beforeEach(async({page})=>{
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await page.addInitScript(()=>{window.__oldFrames=0;const sample=()=>{const p=document.querySelector('.admin-page');if(p&&!p.classList.contains('admin-console')&&getComputedStyle(p).visibility!=='hidden'&&!document.querySelector('.admin-render-loading'))window.__oldFrames++;requestAnimationFrame(sample)};requestAnimationFrame(sample)});
 await page.route('**/__admin-visual-fixture.js',async route=>{const r=await route.fetch();let s=await r.text();s=s.replace('  const before=renderAdmin;let panel;',"  VACANCY_BACKEND.ratingReadiness=async()=>{await new Promise(r=>setTimeout(r,450));return {enabled:false}};\n  const before=renderAdmin;let panel;");await route.fulfill({response:r,body:s});});
});
test('slow admin assembles once, refreshes, uses orange and restores public view',async({page},info)=>{
 await page.goto(base+'/__admin-preview');await page.waitForFunction(()=>window.__visualReady);
 expect(await page.evaluate(()=>window.__oldFrames)).toBe(0);
 await expect(page.locator('.admin-render-loading')).toHaveCount(0);
 await expect(page.locator('.console-journey .console-refresh')).toHaveCSS('background-color','rgb(255, 90, 61)');
 await page.locator('#adminRefresh').click();await page.waitForFunction(()=>!document.querySelector('.admin-render-loading'));
 expect(await page.evaluate(()=>window.__oldFrames)).toBe(0);
 await expect(page.locator('.console-sidebar')).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 await page.screenshot({path:'test-results/admin-orange-'+info.project.name+'.png'});
 await page.evaluate(()=>nav('home'));await expect(page.locator('.topbar')).toBeVisible();await expect(page.locator('.admin-console')).toHaveCount(0);
});
test('MFA and non-admin denial remain visible with no dashboard fetch',async({page})=>{
 await page.goto(base+'/__admin-preview');await page.waitForFunction(()=>window.__visualReady);
 await page.evaluate(async()=>{window.__reads=0;VACANCY_BACKEND.adminDashboard=async()=>{window.__reads++;return {}};VACANCY_BACKEND.assuranceLevel=()=> 'aal1';await renderAdmin()});
 await expect(page.locator('.admin-security-gate')).toBeVisible();expect(await page.evaluate(()=>window.__reads)).toBe(0);
 await page.evaluate(async()=>{VACANCY_BACKEND.adminMembership=async()=>false;await renderAdmin()});
 await expect(page.locator('#app')).toContainText('not an authorised operator');expect(await page.evaluate(()=>window.__reads)).toBe(0);
});
test('stylesheet failure leaves retry instead of blocked screen',async({page})=>{
 await page.route('**/admin-console.css*',route=>route.abort());await page.goto(base+'/__admin-preview');
 await expect(page.getByRole('heading',{name:'Administration unavailable'})).toBeVisible();await expect(page.locator('.admin-render-loading')).toHaveCount(0);
 await page.unroute('**/admin-console.css*');await page.locator('#adminRetry').click();await expect(page.locator('.admin-console')).toBeVisible();
});
