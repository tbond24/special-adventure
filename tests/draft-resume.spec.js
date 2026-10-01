const {test,expect}=require('@playwright/test');
const APP_URL=process.env.VACANCY_E2E_URL;

test('draft pencil opens the current visible listing journey with saved values',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP_URL}/#home`);
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(()=>{
    currentUser={id:'draft-owner',is_anonymous:false};
    VACANCY_BACKEND.myProperties=async()=>[];
    VACANCY_BACKEND.myVacancies=async()=>[];
    VACANCY_BACKEND.ownerDashboardMetrics=async()=>({impressions:0,clicks:0,messages:0});
    localStorage.setItem('vacancy-listing-draft-v1:draft-owner:new-property',JSON.stringify({version:1,scope:'new-property',shared:{propertyTitle:'Sunrise Court',city:'Nairobi',locality:'Kilimani'},units:[{roomName:'Studio in Kilimani',unitType:'Studio',rentAmount:'18000',rentCurrency:'KES',rentPeriod:'month',deposit:'18000',_titleMode:'manual',_privateName:'Unit A1'}]}));
    nav('list');
  });
  await expect(page.getByRole('button',{name:'Edit draft'})).toBeVisible();
  await page.getByRole('button',{name:'Edit draft'}).click();
  await expect(page).toHaveURL(/#list\/new$/);
  await expect(page.locator('#listingHost')).toBeVisible();
  await expect(page.locator('#listingForm')).toBeVisible();
  await expect(page.locator('#listingForm [name="propertyTitle"]')).toHaveValue('Sunrise Court');
  await expect(page.locator('#listingForm [data-base-name="rentAmount"]')).toHaveValue('18000');
});
