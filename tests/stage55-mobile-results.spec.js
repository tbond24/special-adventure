const {test,expect}=require('@playwright/test');
const APP_URL=process.env.VACANCY_E2E_URL;

test.use({viewport:{width:320,height:700}});

test('mobile empty results span the listing area and controls clear the edge',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP_URL}/#home`);
  await page.waitForFunction(()=>booting===false);
  const layout=await page.evaluate(()=>{
    const results=document.querySelector('.discovery-results').getBoundingClientRect();
    const empty=document.querySelector('#cards .empty').getBoundingClientRect();
    const view=document.querySelector('.view-switch').getBoundingClientRect();
    return {resultsWidth:results.width,emptyWidth:empty.width,viewRight:innerWidth-view.right};
  });
  expect(layout.emptyWidth).toBeGreaterThan(layout.resultsWidth-25);
  expect(layout.viewRight).toBeGreaterThanOrEqual(10);
});

test('mobile notification appears above the floating navigation',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP_URL}/#home`);
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(()=>toast('Your camera is unavailable'));
  const positions=await page.evaluate(()=>({toast:document.querySelector('#toast').getBoundingClientRect(),nav:document.querySelector('.mobile-nav').getBoundingClientRect()}));
  expect(positions.toast.bottom).toBeLessThanOrEqual(positions.nav.top-4);
});
