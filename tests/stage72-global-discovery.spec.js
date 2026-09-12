const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

const vacancy=(id,marketCode,city,latitude,longitude,currency)=>({
  id,rentAmount:1000,rentCurrency:currency,rentPeriod:'month',availableFrom:'2026-01-01',minimumStayWeeks:1,
  updatedAt:'2026-09-12T00:00:00Z',
  room:{name:`${city} room`,roomType:'Room',media:[],furnished:false,ensuite:false,maxOccupants:1},
  property:{marketCode,country:marketCode==='KE'?'Kenya':'Australia',suburb:city,city,state:'',landmark:'',postcode:'',parkingSpaces:0,publicLatitude:latitude,publicLongitude:longitude},
  owner:{}
});

test.beforeEach(async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','AU'));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
});

test('browser market does not hide valid listings from other countries',async({page})=>{
  await page.evaluate(([kenya,australia])=>{
    vacancies=[kenya,australia];
    renderHome();
  },[
    vacancy('ke','KE','Nairobi',-1.2864,36.8172,'KES'),
    vacancy('au','AU','Sydney',-33.8688,151.2093,'AUD')
  ]);
  await expect(page.locator('.listing-card')).toHaveCount(2);
  await expect(page.locator('#resultCount')).toHaveText('2 vacancies found');
  await expect(page.locator('.vacancy-marker')).toHaveCount(2);
});

test('location text filters globally regardless of browser market',async({page})=>{
  await page.evaluate(([kenya,australia])=>{
    vacancies=[kenya,australia];
    renderHome();
  },[
    vacancy('ke','KE','Nairobi',-1.2864,36.8172,'KES'),
    vacancy('au','AU','Sydney',-33.8688,151.2093,'AUD')
  ]);
  await page.locator('#q').fill('Nairobi');
  await expect(page.locator('.listing-card')).toHaveCount(1);
  await expect(page.locator('.listing-card')).toContainText('Nairobi');
  await expect(page.locator('.vacancy-marker')).toHaveCount(1);
});
