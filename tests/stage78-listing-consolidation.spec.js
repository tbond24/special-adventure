const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

test('editing restarts at location with prefilled details, then review',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);await page.waitForFunction(()=>booting===false);
  await page.evaluate(async()=>{currentUser={id:'owner'};VACANCY_BACKEND.listingForEdit=async()=>({id:'v1',roomId:'r1',propertyId:'p1',media:[],region:'Nairobi',city:'Nairobi',locality:'Kilimani',landmark:'',postal:'',address:'Road',marketCode:'KE',country:'Kenya',propertyType:'Apartment',parkingSpaces:0,waterAvailable:true,electricityAvailable:true,securityAvailable:true,internetAvailable:true,smokingAllowed:false,petsConsidered:false,household:'',unitType:'Studio',roomName:'Studio in Kilimani',rentAmount:25000,rentCurrency:'KES',rentPeriod:'month',deposit:'',availableFrom:'2026-10-01',minimumStayWeeks:'',maxOccupants:1,furnished:null,ensuite:null,billsIncluded:false,smokingAllowedOverride:null,petsConsideredOverride:null,description:'',publicLatitude:-1.29,publicLongitude:36.78});await renderEdit('v1')});
  const form=page.locator('#editListingForm');
  await expect(form).toHaveAttribute('data-consolidated-edit','true');
  await expect(form).toHaveAttribute('data-edit-restart','true');
  await expect(form.locator('.edit-restart-stage')).toHaveCount(3);
  await expect(form.locator('.edit-restart-stage:visible h2.journey-current-title')).toHaveText('Location');
  await expect(form.locator('[name=locality]')).toHaveValue('Kilimani');
  await expect(form.locator('[name=household]')).not.toHaveAttribute('required','');
  await expect(form.locator('[name=description]')).not.toHaveAttribute('required','');
  await form.locator('.edit-restart-next:visible').click();
  await expect(form.locator('.edit-restart-stage:visible h2.journey-current-title')).toHaveText('Listing details');
  await expect(form.locator('[name=roomName]')).toHaveValue('Studio in Kilimani');
  await form.locator('[name=images]').setInputFiles({name:'edit-photo.png',mimeType:'image/png',buffer:Buffer.from('preview')});
  await expect(form.locator('.photo-selection-item')).toHaveCount(1);
  expect((await form.locator('.photo-selection-item').boundingBox()).width).toBeLessThanOrEqual(100);
  await form.locator('[data-photo-remove="0"]').click();
  await form.locator('.edit-restart-next:visible').click();
  await expect(form.locator('.edit-restart-stage:visible h2.journey-current-title')).toHaveText('Review');
  await expect(form.locator('.edit-restart-summary')).toContainText('KES 25,000');
  await expect(form.getByRole('button',{name:'Save changes'})).toHaveCount(1);
  await page.evaluate(()=>{window.__editCalls=[];VACANCY_BACKEND.updateListing=async(id,input)=>window.__editCalls.push(['update',id,input.roomName]);VACANCY_BACKEND.updateRoomOverrides=async id=>window.__editCalls.push(['overrides',id]);VACANCY_BACKEND.setVacancyPublicLocation=async id=>window.__editCalls.push(['location',id]);refreshVacancies=async()=>{}});
  await form.getByRole('button',{name:'Save changes'}).click();
  await expect(page).toHaveURL(/#list$/);
  expect(await page.evaluate(()=>window.__editCalls)).toEqual([['update','v1','Studio in Kilimani'],['overrides','r1'],['location','v1']]);
});

test('editing an older listing reveals a missing required field instead of silently blocking Save',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);await page.waitForFunction(()=>booting===false);
  await page.evaluate(async()=>{
    currentUser={id:'owner'};
    VACANCY_BACKEND.listingForEdit=async()=>({id:'v1',roomId:'r1',propertyId:'p1',media:[],region:'Nairobi',city:'Nairobi',locality:'Kilimani',landmark:'',postal:'',address:'',marketCode:'KE',country:'Kenya',propertyType:'Apartment',parkingSpaces:0,waterAvailable:true,electricityAvailable:true,securityAvailable:true,internetAvailable:true,smokingAllowed:false,petsConsidered:false,household:'',unitType:'Studio',roomName:'Studio in Kilimani',rentAmount:25000,rentCurrency:'KES',rentPeriod:'month',deposit:'',availableFrom:'2026-10-01',minimumStayWeeks:'',maxOccupants:1,furnished:null,ensuite:null,billsIncluded:false,smokingAllowedOverride:null,petsConsideredOverride:null,description:'',publicLatitude:-1.29,publicLongitude:36.78});
    await renderEdit('v1');
  });
  await page.locator('.edit-restart-next:visible').click();
  await expect(page.locator('.edit-restart-stage:visible h2.journey-current-title')).toHaveText('Location');
  await expect(page.locator('[name="address"]')).toBeFocused();
});

test('former price requires a higher saved rent and an explicit show choice',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);await page.waitForFunction(()=>booting===false);
  await page.evaluate(async()=>{
    currentUser={id:'owner'};
    VACANCY_BACKEND.listingForEdit=async()=>({id:'v1',roomId:'r1',propertyId:'p1',media:[],region:'Nairobi',city:'Nairobi',locality:'Kilimani',landmark:'',postal:'',address:'Road',marketCode:'KE',country:'Kenya',propertyType:'Apartment',parkingSpaces:0,waterAvailable:true,electricityAvailable:true,securityAvailable:true,internetAvailable:true,smokingAllowed:false,petsConsidered:false,household:'',unitType:'Studio',roomName:'Studio in Kilimani',rentAmount:25000,rentCurrency:'KES',rentPeriod:'month',deposit:'',availableFrom:'2026-10-01',minimumStayWeeks:'',maxOccupants:1,furnished:null,ensuite:null,billsIncluded:false,description:'',publicLatitude:-1.29,publicLongitude:36.78});
    VACANCY_BACKEND.listingComparePrice=async()=>({id:'v1',rent_amount:25000,compare_price:null,show_compare_price:false});
    VACANCY_BACKEND.setListingComparePrice=async(id,amount,enabled)=>{window.__compareSaved={id,amount,enabled};return[{id}]};
    await renderEdit('v1');
  });
  const editor=page.locator('.listing-compare-editor');
  await page.locator('.edit-restart-next:visible').click();
  await expect(editor).toBeVisible();
  await editor.locator('input[type=number]').fill('20000');
  await editor.locator('input[type=checkbox]').check();
  await editor.getByRole('button',{name:'Save price comparison'}).click();
  await expect(editor.locator('[role=status]')).toContainText('higher');
  expect(await page.evaluate(()=>window.__compareSaved)).toBeUndefined();
  await editor.locator('input[type=number]').fill('30000');
  await editor.getByRole('button',{name:'Save price comparison'}).click();
  await expect(editor.locator('[role=status]')).toContainText('saved');
  expect(await page.evaluate(()=>window.__compareSaved)).toEqual({id:'v1',amount:30000,enabled:true});
});
