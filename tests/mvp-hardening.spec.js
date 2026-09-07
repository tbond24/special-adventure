const { test, expect } = require('@playwright/test');

const APP_URL=process.env.VACANCY_E2E_URL || 'http://127.0.0.1:4173';

async function openApp(page){
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#exploreMap',{timeout:15000});
}

test('new listing without public pin never calls createListing', async ({ page }) => {
  await openApp(page);
  await page.evaluate(async()=>{
    currentUser={id:'qa-lister',email:'qa@example.test'};
    window.__createCalls=0;
    VACANCY_BACKEND.myProperties=async()=>[];
    VACANCY_BACKEND.myVacancies=async()=>[];
    VACANCY_BACKEND.createListing=async()=>{window.__createCalls++;return 'should-not-run'};
    await renderList();
  });
  const f=page.locator('#listingForm');
  await f.locator('[name=region]').fill('Nairobi');
  await f.locator('[name=city]').fill('Nairobi');
  await f.locator('[name=locality]').fill('Kasarani');
  await f.locator('[name=address]').fill('Private exact address');
  await f.locator('[name=household]').fill('QA property');
  await f.locator('[name=roomName]').fill('QA unit');
  await f.locator('[name=rentAmount]').fill('12000');
  await f.locator('[name=availableFrom]').fill('2026-09-20');
  await f.locator('[name=description]').fill('QA description');
  await f.getByRole('button',{name:'Publish vacancy'}).click();
  await expect(page.locator('#toast')).toContainText('Choose an approximate public map location');
  expect(await page.evaluate(()=>window.__createCalls)).toBe(0);
});

test('only active vacancies expose reconfirm action', async ({ page }) => {
  await openApp(page);
  await page.evaluate(async()=>{
    currentUser={id:'qa-lister'};
    document.querySelector('#app').innerHTML='<div id="mine"></div>';
    const property={id:'p1',title:'QA Property',suburb:'Kasarani',city:'Nairobi',country:'Kenya'};
    const mk=(id,status)=>({id,status,rent_amount:12000,rent_currency:'KES',rent_period:'month',rooms:{name:`Unit ${id}`,properties:property}});
    VACANCY_BACKEND.myVacancies=async()=>[mk('active-one','active'),mk('paused-one','paused'),mk('filled-one','filled')];
    await loadMine();
  });
  await expect(page.locator('[data-reconfirm]')).toHaveCount(1);
  await expect(page.locator('[data-reconfirm]')).toHaveAttribute('data-reconfirm','active-one');
});

test('edit form occupant limit matches database constraint', async ({ page }) => {
  await openApp(page);
  await page.evaluate(async()=>{
    currentUser={id:'qa-lister'};
    VACANCY_BACKEND.listingForEdit=async()=>({
      id:'v1',roomId:'r1',propertyId:'p1',region:'Nairobi',city:'Nairobi',locality:'Kasarani',landmark:'',postal:'',marketCode:'KE',country:'Kenya',address:'Private address',publicLatitude:-1.22,publicLongitude:36.89,propertyType:'Apartment',parkingSpaces:0,waterAvailable:true,electricityAvailable:true,securityAvailable:true,internetAvailable:false,smokingAllowed:false,petsConsidered:false,household:'QA property',unitType:'Bedsitter',roomName:'QA unit',rentAmount:12000,rentCurrency:'KES',rentPeriod:'month',deposit:'',availableFrom:'2026-09-20',minimumStayWeeks:8,maxOccupants:1,furnished:false,ensuite:false,billsIncluded:false,smokingAllowedOverride:null,petsConsideredOverride:null,description:'QA description'
    });
    await renderEdit('v1');
  });
  await expect(page.locator('[name=maxOccupants]')).toHaveAttribute('max','4');
});

test('radius search excludes listings without public coordinates', async ({ page }) => {
  await openApp(page);
  await page.evaluate(()=>{
    const sample=vacancies[0];
    vacancies.push({...sample,id:'qa-no-coords',room:{...sample.room,id:'qa-room',name:'QA No Coordinates'},property:{...sample.property,id:'qa-property',marketCode:'KE',publicLatitude:null,publicLongitude:null}});
    searchCenter={lat:-1.22,lon:36.89};
    radiusValue=100;
    syncRadiusUI();
    applySearch();
  });
  await expect(page.locator('[data-card-id="qa-no-coords"]')).toHaveCount(0);
});

test('image upload writes media against room only', async ({ page }) => {
  await openApp(page);
  let mediaPayload=null;
  await page.route('**/auth/v1/user',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'u1',email:'qa@example.test'})}));
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{id:'v1',room_id:'r1',rooms:{id:'r1',property_id:'p1',properties:{owner_id:'u1'}}}])}));
  await page.route('**/storage/v1/object/room-media/**',route=>route.fulfill({status:200,body:''}));
  await page.route('**/rest/v1/media',async route=>{
    mediaPayload=route.request().postDataJSON();
    await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify([mediaPayload])});
  });
  await page.evaluate(()=>localStorage.setItem('vacancy-session-v01',JSON.stringify({access_token:'qa-token'})));
  await page.evaluate(async()=>{
    const file=new File([new Uint8Array([1,2,3])],'qa.jpg',{type:'image/jpeg'});
    await VACANCY_BACKEND.uploadListingImages('v1',[file]);
  });
  expect(mediaPayload.room_id).toBe('r1');
  expect(Object.prototype.hasOwnProperty.call(mediaPayload,'property_id')).toBeFalsy();
});
