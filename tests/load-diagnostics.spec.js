const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

test('boot failure keeps Retry and records the failed stage without request details',async({page})=>{
  let recorded;
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:503,json:{message:'unavailable'}}));
  await page.route('**/rest/v1/rpc/record_client_error',route=>{recorded=route.request().postDataJSON();return route.fulfill({status:204,body:''})});
  await page.goto(`${APP}/#home`);
  await expect(page.getByRole('button',{name:'Retry'})).toBeVisible();
  await expect.poll(()=>recorded?.p_error_code).toBe('boot_inventory_http_503');
  expect(recorded.p_route).toBe('#home');
});

test('listing failure keeps Retry and records only an error category',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,json:[]}));
  await page.goto(`${APP}/#home`);
  await expect(page.locator('#exploreMap')).toBeVisible();
  const code=await page.evaluate(async()=>{
    currentUser={id:'test-owner'};
    history.replaceState(null,'','#list');
    VACANCY_BACKEND.myProperties=async()=>{const error=new Error('private details');error.status=503;throw error};
    VACANCY_BACKEND.myVacancies=async()=>[];
    VACANCY_BACKEND.recordError=(value)=>{window.__recordedLoadCode=value};
    await renderList();
    return window.__recordedLoadCode;
  });
  await expect(page.getByRole('button',{name:'Try again'})).toBeVisible();
  expect(code).toBe('list_load_http_503');
});
