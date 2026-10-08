const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';
const listing={id:'v1',roomId:'r1',propertyId:'p1',media:[1,2,3].map(n=>({id:'m'+n,url:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',storage_path:'synthetic-'+n})),region:'Nairobi',city:'Nairobi',locality:'Kilimani',landmark:'',postal:'',address:'Road',marketCode:'KE',country:'Kenya',propertyType:'Apartment',parkingSpaces:0,waterAvailable:true,electricityAvailable:true,securityAvailable:true,internetAvailable:true,smokingAllowed:false,petsConsidered:false,household:'',unitType:'Studio',roomName:'Studio in Kilimani',rentAmount:25000,rentCurrency:'KES',rentPeriod:'month',deposit:'',availableFrom:'2026-10-01',minimumStayWeeks:'',maxOccupants:1,furnished:null,ensuite:null,billsIncluded:false,smokingAllowedOverride:null,petsConsideredOverride:null,description:'',publicLatitude:-1.29,publicLongitude:36.78,unitDetails:{}};
async function edit(page,overrides={}){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#auth`);await page.waitForFunction(()=>booting===false);
  await page.evaluate(value=>{currentUser={id:'owner'};VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];VACANCY_BACKEND.ownerDashboardMetrics=async()=>({});VACANCY_BACKEND.listingForEdit=async()=>value;VACANCY_BACKEND.listingComparePrice=async()=>({id:'v1',rent_amount:25000,compare_price:null,show_compare_price:false});nav('edit','v1')},{...listing,...overrides});
  await expect(page.locator('#listingForm[data-edit-vacancy="v1"][data-journey101]')).toBeVisible();
}

test('editing uses the current location/details/review journey with prefilled details and retained photos',async({page})=>{
  await edit(page);const form=page.locator('#listingForm');
  await expect(form).toHaveAttribute('data-journey-step','0');await expect(form.locator('h2.journey-current-title')).toHaveText('Location');await expect(form.locator('[name=locality]')).toHaveValue('Kilimani');
  await expect(form.locator('[name=household]')).not.toHaveAttribute('required','');await expect(form.locator('[data-base-name=description]')).not.toHaveAttribute('required','');await expect(form.locator('.edit-existing-photo')).toHaveCount(3);
  await form.locator('.journey-next').click();await expect(form.locator('h2.journey-current-title')).toHaveText('Listing details');await expect(form.locator('[data-base-name=roomName]')).toHaveValue('Studio in Kilimani');
  await form.locator('input[type=file][data-base-name=images]').setInputFiles({name:'edit-photo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD6sAAAAASUVORK5CYII=','base64')});
  await expect(form.locator('.photo-selection-item')).toHaveCount(1);const photo=await form.locator('.photo-selection-item').boundingBox(),box=await form.boundingBox();expect(photo.width).toBeGreaterThan(0);expect(photo.x+photo.width).toBeLessThanOrEqual(box.x+box.width);
  page.once('dialog',dialog=>dialog.accept());await form.locator('[data-photo-remove="0"]').click();await expect(form.locator('.photo-selection-item')).toHaveCount(0);await form.locator('.journey-next').click();await expect(form.locator('h2.journey-current-title')).toHaveText('Review');await expect(form.locator('.unit-draft-preview')).toContainText('KES 25,000');await expect(form.locator('.unit-draft-preview img')).toHaveCount(3);await expect(form.locator('.listing-submit-actions button.primary')).toHaveCount(1);
  await page.evaluate(()=>{window.__editCalls=[];VACANCY_BACKEND.updateListingAtomic=async(id,input,details,name)=>{window.__editCalls.push({id,title:input.roomName,latitude:input.publicLatitude,longitude:input.publicLongitude,details,name});return[{id}]};VACANCY_BACKEND.updateListing=async()=>{throw Error('Edit fields must commit atomically')};VACANCY_BACKEND.createListing=async()=>{throw Error('Editing must not create a listing')};refreshVacancies=async()=>{}});
  await form.locator('.listing-submit-actions button.primary').click();await expect(page).toHaveURL(/#list$/);expect(await page.evaluate(()=>window.__editCalls.map(c=>({id:c.id,title:c.title,lat:Number(c.latitude),lon:Number(c.longitude)})))).toEqual([{id:'v1',title:'Studio in Kilimani',lat:-1.29,lon:36.78}]);
});

test('editing an older listing identifies missing required rent instead of silently blocking review',async({page})=>{
  await edit(page,{rentAmount:''});await page.locator('.journey-next').click();await expect(page.locator('h2.journey-current-title')).toHaveText('Listing details');await page.locator('.journey-next').click();await expect(page.locator('h2.journey-current-title')).toHaveText('Listing details');await expect(page.locator('[data-base-name=rentAmount]')).toBeFocused();await expect(page.locator('#toast')).toContainText('Enter a rent amount for each unit');
});

test('former price requires a higher saved rent and an explicit show choice',async({page})=>{
  await edit(page);await page.evaluate(()=>{VACANCY_BACKEND.setListingComparePrice=async(id,amount,enabled)=>{window.__compareSaved={id,amount,enabled};return[{id}]}});
  await page.locator('.journey-next').click();const editor=page.locator('.listing-compare-editor');await expect(editor).toBeVisible();await expect(editor.locator('input[type=checkbox]')).not.toBeChecked();await editor.locator('input[type=number]').fill('20000');await editor.locator('input[type=checkbox]').check();await editor.getByRole('button',{name:'Save price comparison'}).click();await expect(editor.locator('[role=status]')).toContainText('higher');expect(await page.evaluate(()=>window.__compareSaved)).toBeUndefined();
  await editor.locator('input[type=number]').fill('30000');await editor.getByRole('button',{name:'Save price comparison'}).click();await expect(editor.locator('[role=status]')).toContainText('saved');expect(await page.evaluate(()=>window.__compareSaved)).toEqual({id:'v1',amount:30000,enabled:true});await expect(page).toHaveURL(/#edit\/v1$/);
});
