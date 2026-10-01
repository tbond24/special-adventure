const {test,expect}=require('@playwright/test');
const APP_URL=process.env.VACANCY_E2E_URL;

test('visitor sees enabled recurring fees and can read deposit terms',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP_URL}/#home`);
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(()=>{
    vacancies.push({id:'fee-example',rentAmount:18000,rentCurrency:'KES',rentPeriod:'month',deposit:18000,room:{name:'Studio',roomType:'Studio',media:[],unitDetails:{depositTerms:'Returned within 14 days after inspection',recurringFees:{water:{amount:'500',period:'monthly',days:['Mon','Wed']},garbage:{amount:'',period:'weekly',days:['Fri']}}}},property:{country:'Kenya',city:'Nairobi',suburb:'Kilimani'},owner:{displayName:'Lister'}});
    nav('detail','fee-example');
  });
  await expect(page.getByRole('heading',{name:'Rental details'})).toBeVisible();
  await expect(page.locator('.quiet-terms')).toContainText('Water');
  await expect(page.locator('.quiet-terms')).toContainText('500');
  await expect(page.locator('.quiet-terms')).toContainText('Mon, Wed');
  await expect(page.locator('.quiet-terms')).toContainText('Collected Fri');
  await page.locator('.quiet-terms .quiet-deposit-info').click();
  await expect(page.getByRole('dialog')).toContainText('Returned within 14 days after inspection');
});
