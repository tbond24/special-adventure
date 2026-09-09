const { test, expect } = require('@playwright/test');

const APP_URL=process.env.VACANCY_E2E_URL || 'http://127.0.0.1:4173';

async function openApp(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{id:'fixture-one',rent_amount:12000,rent_currency:'KES',rent_period:'month',monthly_rent:12000,deposit:null,bills_included:false,available_from:'2026-09-10',minimum_stay_weeks:4,confirmed_at:'2026-09-01T00:00:00Z',expires_at:'2026-10-01T00:00:00Z',status:'active',rooms:{id:'room-one',name:'Kasarani Bedsitter',room_type:'Bedsitter',unit_type:'Bedsitter',furnished:false,ensuite:true,max_occupants:1,smoking_allowed_override:null,pets_considered_override:null,description:'Fixture vacancy',media:[],properties:{id:'property-one',title:'Fixture property',suburb:'Kasarani',city:'Nairobi',state:'Nairobi County',postcode:'',country:'Kenya',market_code:'KE',property_type:'Apartment',parking_spaces:1,pets_considered:false,smoking_allowed:false,household_summary:'Quiet',landmark:'',water_available:true,electricity_available:true,security_available:true,internet_available:false,public_latitude:-1.22,public_longitude:36.89,owner_id:'owner-one',profiles:{id:'owner-one',display_name:'Owner',bio:''}}}}])}));
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#exploreMap',{timeout:15000});
}
async function exposeComposer(page){await page.evaluate(()=>{document.querySelectorAll('.composer-section').forEach(section=>section.open=true);document.querySelectorAll('.manual-location-field').forEach(field=>field.classList.remove('manual-location-hidden'))})}

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
  await exposeComposer(page);
  const f=page.locator('#listingForm');
  await f.locator('[name=propertyTitle]').fill('QA Property');
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

test('map lookup suggests editable address and keeps the public pin approximate', async ({ page }) => {
  await page.route('**/api/reverse-geocode?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({formattedAddress:'200 Wellington Street, Perth WA 6000, Australia',address:'200 Wellington Street',landmark:'Archie Brothers',locality:'Perth',city:'Perth',region:'Western Australia',postal:'6000',country:'Australia',countryCode:'AU'})}));
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#marketSelect');
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(()=>vacancyInventoryRefreshBusy=true);
  await page.evaluate(()=>{const chain={setView(){return this},on(name,fn){if(name==='click')this.node.addEventListener('click',()=>fn({latlng:{lat:-31.9523,lng:115.8613}}));return this},invalidateSize(){}};window.L={map(node){return Object.assign(Object.create(chain),{node})},tileLayer(){return{addTo(){}}},marker(){return{addTo(){return this},setLatLng(){},off(){},on(){}}}}});
  await page.evaluate(async()=>{currentUser={id:'qa-lister',email:'qa@example.test'};VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];await renderList()});
  await exposeComposer(page);
  const form=page.locator('#listingForm'),map=page.locator('#newPropertyMap'),box=await map.boundingBox();
  await map.click({position:{x:box.width*.55,y:box.height*.45}});
  await expect(page.getByRole('button',{name:'Use this location'})).toBeVisible();
  await page.getByRole('button',{name:'Use this location'}).click();
  await expect(form.locator('[name=region]')).toHaveValue('Western Australia');
  await expect(form.locator('[name=city]')).toHaveValue('Perth');
  await expect(form.locator('[name=postal]')).toHaveValue('6000');
  await expect(form.locator('[name=address]')).toHaveValue('200 Wellington Street');
  await form.locator('[name=address]').fill('Apartment 4, 200 Wellington Street');
  await expect(form.locator('[name=address]')).toHaveValue('Apartment 4, 200 Wellington Street');
  expect(await form.locator('[name=publicLatitude]').inputValue()).toMatch(/^-?\d+\.\d{3}$/);
  expect(await form.locator('[name=publicLongitude]').inputValue()).toMatch(/^-?\d+\.\d{3}$/);
});

test('failed map lookup leaves manual listing entry available', async ({ page }) => {
  await page.route('**/api/reverse-geocode?**',route=>route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'Address lookup is temporarily unavailable. You can still enter the address manually.'})}));
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#marketSelect');
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(()=>vacancyInventoryRefreshBusy=true);
  await page.evaluate(()=>{const chain={setView(){return this},on(name,fn){if(name==='click')this.node.addEventListener('click',()=>fn({latlng:{lat:-1.2197,lng:36.8976}}));return this},invalidateSize(){}};window.L={map(node){return Object.assign(Object.create(chain),{node})},tileLayer(){return{addTo(){}}},marker(){return{addTo(){return this},setLatLng(){},off(){},on(){}}}}});
  await page.evaluate(async()=>{currentUser={id:'qa-lister',email:'qa@example.test'};VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];await renderList()});
  await exposeComposer(page);
  const form=page.locator('#listingForm'),map=page.locator('#newPropertyMap'),box=await map.boundingBox();
  await map.click({position:{x:box.width*.45,y:box.height*.55}});
  await expect(page.locator('[data-address-status]')).toContainText('enter the address manually',{ignoreCase:true});
  await form.locator('[name=region]').fill('Nairobi County');
  await form.locator('[name=address]').fill('Manual private address');
  await expect(form.locator('[name=address]')).toHaveValue('Manual private address');
  await expect(form.locator('[name=publicLatitude]')).not.toHaveValue('');
});

test('display currency converts prices without changing location or inventory', async ({ page }) => {
  await page.route('**/api/exchange-rates',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({base:'USD',date:'2026-09-07',rates:{USD:1,KES:130,AUD:1.5,GBP:.75,UGX:3700,TZS:2500}})}));
  await page.addInitScript(()=>{localStorage.setItem('vacancy-market-v1','KE');localStorage.removeItem('vacancy-currency-v1')});
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#marketSelect');
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(()=>exploreMap=null);
  await page.evaluate(()=>{window.L=undefined;marketCode='KE';displayCurrency='KES';fxRates=null;vacancies=[{id:'fx-one',rentAmount:13000,rentCurrency:'KES',rentPeriod:'month',availableFrom:'2026-09-20',confirmedAt:new Date().toISOString(),minimumStayWeeks:4,room:{id:'room-one',name:'Kasarani Bedsitter',roomType:'Bedsitter',furnished:false,ensuite:true,maxOccupants:1,media:[]},property:{id:'property-one',marketCode:'KE',suburb:'Kasarani',city:'Nairobi',state:'Nairobi County',country:'Kenya',landmark:'',postcode:'',parkingSpaces:0,waterAvailable:true,electricityAvailable:true,securityAvailable:true,internetAvailable:false,petsConsidered:false,publicLatitude:-1.22,publicLongitude:36.89},owner:{id:'owner-one',displayName:'Owner'}}];booting=false;renderHome()});
  await expect(page.locator('.explore-card')).toHaveCount(1);
  await expect(page.locator('.explore-card .price')).toContainText('KSh 13,000');
  await page.getByLabel('Display currency').selectOption('USD');
  await expect(page.locator('.explore-card .price')).toContainText('≈ $ 100');
  await expect(page.locator('#rentPeriod')).toHaveValue('month');
  await expect(page.locator('#q')).toHaveAttribute('placeholder','Search area');
  await expect(page.locator('.explore-card')).toHaveCount(1);
  expect(await page.evaluate(()=>marketCode)).toBe('KE');
});

test('multi-unit builder defaults to one and publishes sibling units under one property', async ({ page }) => {
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#marketSelect');
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(()=>vacancyInventoryRefreshBusy=true);
  await page.evaluate(async()=>{window.L=undefined;currentUser={id:'qa-lister'};window.__unitCalls=[];VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];VACANCY_BACKEND.activeVacancies=async()=>[];VACANCY_BACKEND.createListing=async input=>{window.__unitCalls.push({kind:'property',name:input.roomName,internet:input.internetAvailable});return'vacancy-one'};VACANCY_BACKEND.listingForEdit=async()=>({propertyId:'property-one'});VACANCY_BACKEND.setVacancyPublicLocation=async()=>{};VACANCY_BACKEND.createRoomVacancyForProperty=async(propertyId,input)=>{window.__unitCalls.push({kind:'sibling',propertyId,name:input.roomName,rent:input.rentAmount,internet:input.internetAvailable});return'vacancy-two'};VACANCY_BACKEND.uploadListingImages=async()=>{};VACANCY_BACKEND.trackEvent=()=>{};await renderList()});
  await exposeComposer(page);
  const form=page.locator('#listingForm');
  await form.locator('[name=propertyTitle]').fill('QA Multi Unit Property');
  await expect(form.locator('.unit-editor')).toHaveCount(1);
  await form.getByRole('button',{name:'+ Add another unit',exact:true}).click();
  await expect(form.locator('.unit-editor')).toHaveCount(2);
  await form.locator('[name=region]').fill('Nairobi County');await form.locator('[name=city]').fill('Nairobi');await form.locator('[name=locality]').fill('Kasarani');await form.locator('[name=address]').fill('Private address');await form.locator('[name=household]').fill('Managed property');await page.evaluate(()=>{const control=document.querySelector('[name=internetAvailable]');control.value='true';control.dispatchEvent(new Event('change',{bubbles:true}))});
  await form.locator('[name=roomName]').fill('Unit One');await form.locator('[name=rentAmount]').fill('12000');await form.locator('[name=availableFrom]').fill('2026-09-20');await form.locator('[name=description]').fill('First independent unit');
  await form.locator('[name=unit1_roomName]').fill('Unit Two');await form.locator('[name=unit1_rentAmount]').fill('15000');await form.locator('[name=unit1_availableFrom]').fill('2026-09-22');await form.locator('[name=unit1_description]').fill('Second independent unit');
  await form.locator('[name=publicLatitude]').evaluate(node=>node.value='-1.220');await form.locator('[name=publicLongitude]').evaluate(node=>node.value='36.898');
  await form.getByRole('button',{name:'Publish vacancy'}).click();
  await expect.poll(()=>page.evaluate(()=>window.__unitCalls)).toEqual([{kind:'property',name:'Unit One',internet:true},{kind:'sibling',propertyId:'property-one',name:'Unit Two',rent:'15000',internet:true}]);
});

test('unfinished listing restores on the same device without persisting private address, pin or photos',async({page})=>{
  await openApp(page);
  await page.evaluate(async()=>{window.L=undefined;currentUser={id:'draft-lister'};VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];await renderList()});
  await exposeComposer(page);
  let form=page.locator('#listingForm');
  await form.locator('[name=propertyTitle]').fill('Garden Court');
  await form.locator('[name=city]').fill('Nairobi');
  await form.locator('[name=address]').fill('Private exact address');
  await form.locator('[name=roomName]').fill('Sunny bedsitter');
  await form.getByRole('button',{name:'+ Add another unit',exact:true}).click();
  await form.locator('[name=unit1_roomName]').fill('Quiet studio');
  await expect(form.locator('.listing-draft-status')).toContainText('Draft saved on this device');
  const stored=await page.evaluate(()=>localStorage.getItem('vacancy-listing-draft-v1:draft-lister:new-property'));
  expect(stored).toContain('Garden Court');expect(stored).toContain('Quiet studio');expect(stored).not.toContain('Private exact address');expect(stored).not.toContain('publicLatitude');
  await page.evaluate(()=>renderList());
  await exposeComposer(page);
  form=page.locator('#listingForm');await expect(form.locator('.unit-editor')).toHaveCount(2);
  await expect(form.locator('[name=propertyTitle]')).toHaveValue('Garden Court');await expect(form.locator('[name=roomName]')).toHaveValue('Sunny bedsitter');await expect(form.locator('[name=unit1_roomName]')).toHaveValue('Quiet studio');
  await expect(form.locator('[name=address]')).toHaveValue('');await expect(form.locator('.listing-draft-status')).toContainText('exact address, map pin and photos are not stored');
  await form.getByRole('button',{name:'Discard draft'}).click();expect(await page.evaluate(()=>localStorage.getItem('vacancy-listing-draft-v1:draft-lister:new-property'))).toBeNull();
});

test('listing step navigator exposes the form order and opens a populated preview',async({page})=>{
  await openApp(page);
  await page.evaluate(async()=>{window.L=undefined;currentUser={id:'step-lister'};VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];await renderList()});
  await exposeComposer(page);
  const form=page.locator('#listingForm'),steps=form.locator('.listing-steps');
  await expect(steps.getByRole('button')).toHaveText(['1 Location','2 Property','3 Units','4 Preview']);
  await form.locator('[name=roomName]').fill('Garden studio');await form.locator('[name=rentAmount]').fill('14000');await form.locator('[name=locality]').fill('Kasarani');await form.locator('[name=city]').fill('Nairobi');
  await steps.getByRole('button',{name:'4 Preview'}).click();await expect(form.locator('#listing-preview')).toBeVisible();await expect(form.locator('#listing-preview')).toContainText('Garden studio');await expect(form.locator('#listing-preview')).toContainText('Kasarani, Nairobi');
});

test('listing photos can be reordered and removed before upload',async({page})=>{
  await openApp(page);await page.evaluate(async()=>{window.L=undefined;currentUser={id:'photo-lister'};VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];await renderList()});
  await exposeComposer(page);
  const input=page.locator('#listingForm [name=images]');await input.setInputFiles([{name:'front.jpg',mimeType:'image/jpeg',buffer:Buffer.from('front')},{name:'kitchen.jpg',mimeType:'image/jpeg',buffer:Buffer.from('kitchen')}]);
  const items=page.locator('#listingForm .photo-selection-item');await expect(items).toHaveCount(2);await expect(items.nth(0)).toContainText('front.jpg');
  await items.nth(1).getByRole('button',{name:/Move kitchen.jpg earlier/}).click();await expect(items.nth(0)).toContainText('kitchen.jpg');
  await items.nth(1).getByRole('button',{name:/Remove front.jpg/}).click();await expect(items).toHaveCount(1);expect(await input.evaluate(node=>selectedPhotoFiles(node).map(file=>file.name))).toEqual(['kitchen.jpg']);
});

test('exhausted photo retries keep one published vacancy and show an edit recovery path',async({page})=>{
  await openApp(page);await page.evaluate(async()=>{window.L=undefined;currentUser={id:'photo-retry-lister'};window.__creates=0;window.__uploads=0;VACANCY_BACKEND.myProperties=async()=>[{id:'property-one',title:'Retry House',locality:'Kasarani',city:'Nairobi',marketCode:'KE',waterAvailable:true,electricityAvailable:true,securityAvailable:true,parkingSpaces:0}];VACANCY_BACKEND.myVacancies=async()=>[];VACANCY_BACKEND.activeVacancies=async()=>[];VACANCY_BACKEND.createRoomVacancyForProperty=async()=>{window.__creates++;return'vacancy-photo'};VACANCY_BACKEND.uploadListingImages=async()=>{window.__uploads++;throw new Error('Upload unavailable')};VACANCY_BACKEND.trackEvent=()=>{};await renderList();document.querySelector('.property-select-card').click()});
  const form=page.locator('#existingListingForm');await form.locator('[name=roomName]').fill('Photo retry room');await form.locator('[name=rentAmount]').fill('12000');await form.locator('[name=availableFrom]').fill('2026-09-20');await form.locator('[name=description]').fill('A valid listing whose photo service is unavailable.');await form.locator('[name=images]').setInputFiles({name:'room.jpg',mimeType:'image/jpeg',buffer:Buffer.from('room')});
  await form.getByRole('button',{name:'Publish vacancy'}).click();await expect(page.locator('#toast')).toContainText('Photos could not upload; open Edit to add them.');expect(await page.evaluate(()=>({creates:window.__creates,uploads:window.__uploads}))).toEqual({creates:1,uploads:3});
});

test('partial multi-unit failure keeps only unfinished units and retries under the created property',async({page})=>{
  await openApp(page);
  await page.evaluate(async()=>{window.L=undefined;currentUser={id:'partial-lister'};window.__propertyCreates=0;window.__siblingAttempts=0;window.__siblingRequestIds=[];VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];VACANCY_BACKEND.activeVacancies=async()=>[];VACANCY_BACKEND.createListing=async()=>{window.__propertyCreates++;return'vacancy-one'};VACANCY_BACKEND.listingForEdit=async()=>({propertyId:'property-one'});VACANCY_BACKEND.setVacancyPublicLocation=async()=>{};VACANCY_BACKEND.createRoomVacancyForProperty=async(propertyId,input)=>{window.__siblingAttempts++;window.__siblingRequestIds.push(input.requestId);if(window.__siblingAttempts===1)throw new Error('Temporary network failure');return'vacancy-two'};VACANCY_BACKEND.uploadListingImages=async()=>{};VACANCY_BACKEND.trackEvent=()=>{};await renderList()});
  await exposeComposer(page);
  const form=page.locator('#listingForm');await form.getByRole('button',{name:'+ Add another unit',exact:true}).click();
  const values={propertyTitle:'Retry Court',region:'Nairobi County',city:'Nairobi',locality:'Kasarani',address:'Private address',household:'Managed property',roomName:'Unit One',rentAmount:'12000',availableFrom:'2026-09-20',description:'First unit',unit1_roomName:'Unit Two',unit1_rentAmount:'15000',unit1_availableFrom:'2026-09-22',unit1_description:'Second unit'};
  for(const [name,value] of Object.entries(values))await form.locator('[name='+name+']').fill(value);
  await form.locator('[name=publicLatitude]').evaluate(node=>node.value='-1.220');await form.locator('[name=publicLongitude]').evaluate(node=>node.value='36.898');
  await form.getByRole('button',{name:'Publish vacancy'}).click();await expect(page.locator('#toast')).toContainText('Unfinished units remain here to retry.');
  await expect(form.locator('.unit-editor')).toHaveCount(1);await expect(form.locator('[name=roomName]')).toHaveValue('Unit Two');
  expect(await page.evaluate(()=>window.__propertyCreates)).toBe(1);expect(await page.evaluate(()=>localStorage.getItem('vacancy-listing-draft-v1:partial-lister:property-property-one'))).toContain('Unit Two');
  await form.getByRole('button',{name:'Publish vacancy'}).click();await expect.poll(()=>page.evaluate(()=>({properties:window.__propertyCreates,siblings:window.__siblingAttempts}))).toEqual({properties:1,siblings:2});const requestIds=await page.evaluate(()=>window.__siblingRequestIds);expect(requestIds[0]).toMatch(/^[0-9a-f-]{36}$/);expect(requestIds[1]).toBe(requestIds[0]);
});

test('property composer offers existing property units, a new property path and private nickname', async ({ page }) => {
  await openApp(page);
  await page.evaluate(async()=>{currentUser={id:'qa-lister'};VACANCY_BACKEND.myProperties=async()=>[{id:'property-one',title:'Sunrise Apartments',managerNickname:'Mum’s flats',locality:'Kasarani',city:'Nairobi',marketCode:'KE',waterAvailable:true,electricityAvailable:true,securityAvailable:true,parkingSpaces:1}];VACANCY_BACKEND.myVacancies=async()=>[];await renderList()});
  await expect(page.locator('.property-select-card')).toHaveCount(2);
  await expect(page.locator('.property-select-card').first()).toContainText('Mum’s flats');
  await expect(page.locator('#existingListingForm')).toBeHidden();
  await page.getByRole('button',{name:/Mum’s flats/}).click();
  await expect(page.locator('#existingListingForm')).toBeVisible();
  await page.getByRole('button',{name:/New property/}).click();
  await exposeComposer(page);
  await expect(page.locator('[name=propertyNickname]')).toBeVisible();
  await expect(page.locator('[name=propertyNickname]')).toHaveAttribute('maxlength','80');
  await expect(page.getByText('Only you see this.')).toBeVisible();
});

test('admin dashboard prioritises aged reports and records reasoned listing actions', async ({ page }) => {
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});await page.waitForSelector('#marketSelect');
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(()=>vacancyInventoryRefreshBusy=true);
  await page.evaluate(async()=>{currentUser={id:'admin-one'};VACANCY_BACKEND.adminDashboard=async()=>({users_total:12,properties:3,units:4,active_listings:2,open_reports:1,oldest_report_hours:30,enquiries_7d:3,listings_7d:2,errors_24h:0});VACANCY_BACKEND.adminSearch=async()=>({users:[],listings:[{id:'active-one',name:'Current Unit',title:'Ruiru House',suburb:'Ruiru',city:'Nairobi',status:'active'}]});VACANCY_BACKEND.adminReports=async()=>[{id:'report-one',reason:'Incorrect address',status:'open',vacancy_id:'active-one',created_at:'2026-09-07T00:00:00Z'}];VACANCY_BACKEND.adminAuditLog=async()=>[];VACANCY_BACKEND.adminSetVacancyStatus=async(id,status,reason)=>window.__moderation={id,status,reason};await renderAdmin()});
  await expect(page.locator('.attention-stat')).toHaveCount(2);
  page.once('dialog',dialog=>dialog.accept('Verified owner request'));
  await page.getByRole('button',{name:'Pause'}).click();
  await expect.poll(()=>page.evaluate(()=>window.__moderation)).toEqual({id:'active-one',status:'paused',reason:'Verified owner request'});
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
    VACANCY_BACKEND.updateListing=async()=>{};VACANCY_BACKEND.updateRoomOverrides=async()=>{};VACANCY_BACKEND.setVacancyPublicLocation=async()=>{};VACANCY_BACKEND.uploadListingImages=async(id,files)=>window.__editPhotos={id,names:[...files].map(file=>file.name)};VACANCY_BACKEND.activeVacancies=async()=>[];VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];
    await renderEdit('v1');
  });
  await expect(page.locator('[name=maxOccupants]')).toHaveAttribute('max','4');
  await page.locator('#editListingForm [name=images]').setInputFiles({name:'new-room.jpg',mimeType:'image/jpeg',buffer:Buffer.from('new room')});await page.locator('#editListingForm').getByRole('button',{name:'Save changes'}).click();await expect.poll(()=>page.evaluate(()=>window.__editPhotos)).toEqual({id:'v1',names:['new-room.jpg']});
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
  await page.evaluate(()=>{
    const payload=btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    localStorage.setItem('vacancy-session-v01',JSON.stringify({access_token:`qa.${payload}.signature`}));
  });
  await page.evaluate(async()=>{
    const file=new File([new Uint8Array([1,2,3])],'qa.jpg',{type:'image/jpeg'});
    await VACANCY_BACKEND.uploadListingImages('v1',[file]);
  });
  expect(mediaPayload.room_id).toBe('r1');
  expect(Object.prototype.hasOwnProperty.call(mediaPayload,'property_id')).toBeFalsy();
});
