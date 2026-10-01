const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

test('owner can choose an existing photo from Add media in the current listing journey',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(()=>{
    currentUser={id:'owner'};
    VACANCY_BACKEND.myProperties=async()=>[];
    VACANCY_BACKEND.myVacancies=async()=>[];
    VACANCY_BACKEND.ownerDashboardMetrics=async()=>({impressions:0,clicks:0,messages:0});
    VACANCY_BACKEND.ownerMediaLibrary=async()=>[{id:'m1',url:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',label:'Garden Court · Unit 2'}];
    VACANCY_BACKEND.mediaLibraryFiles=async()=>[new File(['reuse'],'reused.jpg',{type:'image/jpeg'})];
    nav('list','new');
  });
  await page.locator('[data-listing-type=Residential]').click();
  await page.locator('[data-preset=Room]').click();
  await page.getByRole('button',{name:'New property'}).click();
  await page.locator('#listingForm [name=region]').fill('Nairobi');
  await page.locator('#listingForm [name=city]').fill('Nairobi');
  await page.locator('#listingForm [name=locality]').fill('Kilimani');
  await page.locator('#listingForm [name=address]').fill('Main Road');
  await page.locator('#listingForm [name=publicLatitude]').evaluate(input=>input.value='-1.2');
  await page.locator('#listingForm [name=publicLongitude]').evaluate(input=>input.value='36.8');
  await page.locator('#listingForm .journey-next').click();
  await page.locator('#listingForm .unit-media-toolbar > button').click();
  await page.locator('#listingForm [data-media-library]').click();
  await page.getByRole('button',{name:/Garden Court/}).click();
  await page.getByRole('button',{name:'Add selected photos'}).click();
  await expect(page.locator('#listingForm .unit-editor .photo-selection-item')).toHaveCount(1);
});
