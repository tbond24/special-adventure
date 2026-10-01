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
    localStorage.setItem('vacancy-listing-draft-v1:draft-owner:new-property',JSON.stringify({version:1,scope:'new-property',shared:{propertyTitle:'Sunrise Court',city:'Nairobi',locality:'Kilimani'},units:[{roomName:'Studio in Kilimani',unitType:'Studio',rentAmount:'18000',rentCurrency:'KES',rentPeriod:'month',deposit:'18000',unitDetails:JSON.stringify({recurringFees:{water:{amount:'500',period:'monthly',days:['Mon','Wed']}}}),_titleMode:'manual',_privateName:'Unit A1'}]}));
    nav('list');
  });
  await expect(page.getByRole('button',{name:'Edit draft'})).toBeVisible();
  await page.getByRole('button',{name:'Edit draft'}).click();
  await expect(page).toHaveURL(/#list\/new$/);
  await expect(page.locator('#listingHost')).toBeVisible();
  await expect(page.locator('#listingForm')).toBeVisible();
  await expect(page.locator('#listingForm [name="propertyTitle"]')).toHaveValue('Sunrise Court');
  await expect(page.locator('#listingForm [data-base-name="rentAmount"]')).toHaveValue('18000');
  await expect(page.locator('#listingForm [data-recurring-kind="water"] .recurring-enabled')).toBeChecked();
  await expect(page.locator('#listingForm [data-recurring-kind="water"] .recurring-amount')).toHaveValue('500');
  await expect(page.locator('#listingForm [data-recurring-kind="garbage"] .recurring-fields')).toBeHidden();
  await page.locator('#listingForm [data-recurring-kind="garbage"] .recurring-enabled').evaluate(input=>{input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));});
  await expect(page.locator('#listingForm [data-recurring-kind="garbage"] .recurring-fields')).not.toHaveAttribute('hidden','');
  await expect.poll(()=>page.locator('#listingForm [data-base-name="unitDetails"]').inputValue().then(value=>Boolean(JSON.parse(value).recurringFees.garbage))).toBe(true);
});

test('existing-property draft pencil opens the same listing journey',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP_URL}/#home`);
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(()=>{
    currentUser={id:'draft-owner',is_anonymous:false};
    VACANCY_BACKEND.myProperties=async()=>[{id:'property-one',title:'Sunrise Court',city:'Nairobi',country:'Kenya'}];
    VACANCY_BACKEND.myVacancies=async()=>[];
    VACANCY_BACKEND.ownerDashboardMetrics=async()=>({impressions:0,clicks:0,messages:0});
    localStorage.setItem('vacancy-listing-draft-v1:draft-owner:property-property-one',JSON.stringify({version:1,scope:'property-property-one',shared:{propertyTitle:'Sunrise Court'},units:[{roomName:'Studio',unitType:'Studio',rentAmount:'20000',rentCurrency:'KES',rentPeriod:'month',deposit:'10000'}]}));
    nav('list');
  });
  await page.getByRole('button',{name:'Edit draft'}).click();
  await expect(page).toHaveURL(/#list\/new$/);
  await expect(page.locator('#listingHost')).toBeVisible();
  await expect(page.locator('#existingListingForm [data-base-name="rentAmount"]')).toHaveValue('20000');
});
