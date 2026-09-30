const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

async function open(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
}

test('owner sees an expired active listing as needing confirmation',async({page})=>{
  await open(page);
  await page.evaluate(async()=>{
    currentUser={id:'owner'};
    document.querySelector('#app').innerHTML='<div id="mine"></div>';
    VACANCY_BACKEND.myVacancies=async()=>[{id:'old-listing',status:'active',expires_at:'2026-09-27T00:00:00Z',rent_amount:12000,rent_currency:'KES',rent_period:'month',rooms:{id:'room',name:'Kilimani studio',properties:{id:'property',title:'Kilimani',suburb:'Kilimani',city:'Nairobi',country:'Kenya'}}}];
    await loadMine();
  });
  await page.locator('.property-tree > summary').click();
  await expect(page.locator('.room-manage')).toContainText('expired - confirm availability');
  await expect(page.locator('[data-reconfirm="old-listing"]')).toBeVisible();
});

test('reactivating a listing renews its expiry through the owner RPC',async({page})=>{
  await open(page);
  let request;
  await page.route('**/rest/v1/rpc/reconfirm_vacancy',route=>{
    request={method:route.request().method(),body:route.request().postDataJSON()};
    return route.fulfill({status:200,contentType:'application/json',body:'null'});
  });
  await page.evaluate(()=>VACANCY_BACKEND.setVacancyStatus('old-listing','active'));
  expect(request).toEqual({method:'POST',body:{p_vacancy_id:'old-listing'}});
});
