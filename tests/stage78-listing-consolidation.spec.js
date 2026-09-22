const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

test('editing uses one compact staged journey with optional legacy text',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);await page.waitForFunction(()=>booting===false);
  await page.evaluate(async()=>{currentUser={id:'owner'};VACANCY_BACKEND.listingForEdit=async()=>({id:'v1',roomId:'r1',propertyId:'p1',media:[],region:'Nairobi',city:'Nairobi',locality:'Kilimani',landmark:'',postal:'',address:'Road',marketCode:'KE',country:'Kenya',propertyType:'Apartment',parkingSpaces:0,waterAvailable:true,electricityAvailable:true,securityAvailable:true,internetAvailable:true,smokingAllowed:false,petsConsidered:false,household:'',unitType:'Studio',roomName:'Studio in Kilimani',rentAmount:25000,rentCurrency:'KES',rentPeriod:'month',deposit:'',availableFrom:'2026-10-01',minimumStayWeeks:'',maxOccupants:1,furnished:null,ensuite:null,billsIncluded:false,smokingAllowedOverride:null,petsConsideredOverride:null,description:'',publicLatitude:-1.29,publicLongitude:36.78});await renderEdit('v1')});
  const form=page.locator('#editListingForm');
  await expect(form).toHaveAttribute('data-consolidated-edit','true');
  await expect(form.locator('.edit-listing-stepper')).toContainText('Property & location');
  await expect(form.locator('.edit-listing-stepper')).toContainText('Photos');
  await expect(form.locator('.unified-edit-section[open]')).toHaveCount(1);
  await expect(form.locator('[name=household]')).not.toHaveAttribute('required','');
  await expect(form.locator('[name=description]')).not.toHaveAttribute('required','');
  await form.locator('[data-edit-step="photos"]').click();
  await expect(form.locator('.unified-edit-section[open] summary strong')).toHaveText('Photos');
  await expect(form.getByRole('button',{name:'Save changes'})).toHaveCount(1);
});
