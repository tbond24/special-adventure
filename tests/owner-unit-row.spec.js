const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

test('owner rows keep unit, price and actions aligned; pause requires confirmation',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(APP+'/#home');await page.waitForFunction(()=>booting===false);
  await page.evaluate(async()=>{
    currentUser={id:'owner'};
    const property={id:'property-1',title:'Plot 10',suburb:'Westlands',city:'Nairobi',country:'Kenya'};
    const rows=[1,2].map(index=>({id:'unit-'+index,status:'active',rent_amount:20000+index*1000,rent_currency:'KES',rent_period:'month',rooms:{name:'Studio '+index,privateName:'Flamingo A'+index,properties:property}}));
    VACANCY_BACKEND.myProperties=async()=>[property];VACANCY_BACKEND.myVacancies=async()=>rows;
    VACANCY_BACKEND.ownerDashboardMetrics=async()=>({impressions:0,clicks:0,messages:0});
    window.__statusCalls=[];VACANCY_BACKEND.setVacancyStatus=async(id,status)=>window.__statusCalls.push([id,status]);
    await renderList();
  });
  await page.locator('#mine .property-tree summary').click();
  const rows=page.locator('#mine .room-manage');
  await expect(rows).toHaveCount(2);
  await expect(rows.first().locator('.room-manage-copy')).toContainText('Flamingo A1');
  await expect(rows.first().locator('.room-manage-price')).toContainText('21,000');
  await expect(rows.first().locator('.room-manage-actions button')).toHaveCount(2);
  page.once('dialog',dialog=>dialog.dismiss());
  await rows.first().getByRole('button',{name:/Pause/}).click();
  expect(await page.evaluate(()=>window.__statusCalls)).toEqual([]);
});
