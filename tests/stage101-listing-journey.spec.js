const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

async function openListing(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(async()=>{history.replaceState(null,'','#list');currentUser={id:'owner'};VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];await renderList();nav('list','new')});
  await expect(page.locator('[data-listing-type=Residential]')).toBeVisible();
}

test('the map control stays inside the map and a new pin replaces stale address fields',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await openListing(page);
  await page.locator('[data-listing-type=Residential]').click();
  await page.locator('[data-preset=Room]').click();
  await page.getByRole('button',{name:'New property'}).click();
  const form=page.locator('#listingForm');
  await expect(page.locator('#ownerListSummary')).toBeHidden();
  const control=form.getByRole('button',{name:'Use current location'});
  await expect(control).toBeVisible();
  expect(await control.evaluate(button=>button.parentElement.parentElement.contains(document.querySelector('#newPropertyMap')))).toBe(true);
  let lookups=0;
  await page.route('**/api/reverse-geocode?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(++lookups===1
    ? {country:'Kenya',region:'Nairobi',city:'Nairobi',locality:'Westlands',landmark:'Mall',postal:'00100',address:'First Road'}
    : {country:'Kenya',region:'Mombasa',city:'Mombasa',locality:'Nyali',address:'Second Road'})}));
  await page.evaluate(()=>document.querySelector('#newPropertyMap')._vacancySetLocation(-1.26,36.8,true));
  await expect(form.locator('[name=landmark]')).toHaveValue('Mall');
  await page.evaluate(()=>document.querySelector('#newPropertyMap')._vacancySetLocation(-4.04,39.7,true));
  await expect(form.locator('[name=city]')).toHaveValue('Mombasa');
  await expect(form.locator('[name=landmark]')).toHaveValue('');
  await expect(form.locator('[name=postal]')).toHaveValue('');
});

test('a map pin with only a general country can advance without address fields',async({page})=>{
  await openListing(page);
  await page.locator('[data-listing-type=House]').click();
  await page.getByRole('button',{name:'New property'}).click();
  const form=page.locator('#listingForm');
  await page.route('**/api/reverse-geocode?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({country:'Tanzania',formattedAddress:'Tanzania'})}));
  await page.evaluate(()=>document.querySelector('#newPropertyMap')._vacancySetLocation(-6.8,39.2,true));
  await expect(form.locator('[name=city]')).toHaveValue('');
  await expect(form.locator('[name=address]')).toHaveValue('Tanzania');
  await form.locator('.journey-next').click();
  await expect(form).toHaveAttribute('data-journey-step','1');
  await expect(form.locator('[data-base-name=roomName]')).toHaveValue(/Tanzania/);
  await form.locator('.journey-back').click();
  await form.locator('[name=city]').fill('Mwanza');
  await form.locator('.journey-next').click();
  await expect(form.locator('[data-base-name=roomName]')).toHaveValue(/Mwanza/);
});

test('active mobile destination keeps its icon outlined and orange',async({page})=>{
  await openListing(page);
  await page.evaluate(()=>nav('saved'));
  const saved=page.locator('.mobile-nav [data-nav=saved]');
  await expect(saved).toHaveAttribute('aria-current','page');
  const appearance=await saved.locator('svg').evaluate(svg=>({fill:getComputedStyle(svg).fill,stroke:getComputedStyle(svg).stroke}));
  expect(appearance.fill).toBe('none');
  expect(appearance.stroke).not.toBe('none');
});

test('lister keeps renter-style navigation and sees a dashboard on List',async({page})=>{
  await openListing(page);
  await page.evaluate(()=>nav('list'));
  await expect(page.locator('.mobile-nav [data-nav=home]')).toContainText('Find');
  await expect(page.locator('.mobile-nav [data-nav=saved]')).toContainText('Saved');
  await expect(page.getByRole('heading',{name:'Dashboard'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Create new listing'})).toBeVisible();
  await expect(page.locator('#app .site-footer')).toHaveCount(0);
});

test('footer links appear on Find only',async({page})=>{
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
  await expect(page.locator('#app .site-footer a[href="#privacy"]')).toBeVisible();
  await page.evaluate(()=>nav('saved'));
  await expect(page.locator('#app .site-footer')).toHaveCount(0);
});

test('existing property keeps its identity and starts a unit without requesting a new map pin',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);await page.waitForFunction(()=>booting===false);
  await page.evaluate(async()=>{
    history.replaceState(null,'','#list');
    currentUser={id:'owner'};
    const property={id:'p1',title:'Westlands House',locality:'Westlands',city:'Nairobi',country:market().label,marketCode:marketCode,waterAvailable:true,electricityAvailable:true,securityAvailable:true,parkingSpaces:0};
    VACANCY_BACKEND.myProperties=async()=>[property];
    VACANCY_BACKEND.myVacancies=async()=>[{id:'v1',status:'active',rent_amount:25000,rent_currency:'KES',rent_period:'month',rooms:{name:'Existing room',properties:property}},{id:'v2',status:'archived',rent_amount:21000,rent_currency:'KES',rent_period:'month',rooms:{name:'Archived room',properties:property}}];
    await renderList();
  });
  await expect(page.locator('#mine [data-edit][title="Edit unit"]')).toHaveCount(1);
  await expect(page.locator('#mine [data-edit][title="Edit unit"]')).toContainText('Existing room');
  await expect(page.locator('#mine [data-edit][aria-label="Edit listing"]')).toHaveCount(1);
  await page.locator('#vacancyFilter').selectOption('archived');
  await expect(page.locator('#mine [data-edit][title="Edit unit"]')).toContainText('Archived room');
  await expect(page.locator('#mine [data-edit][aria-label="Edit listing"]')).toHaveCount(1);
  await expect(page.locator('#mine [data-delete] svg')).toHaveCount(1);
  await page.locator('#vacancyFilter').selectOption('all');
  await expect(page.locator('#mine [data-edit][title="Edit unit"]')).toHaveCount(1);
  await expect(page.locator('#mine [data-edit][title="Edit unit"]')).toContainText('Existing room');
  await page.evaluate(()=>nav('list','new'));
  await expect(page.locator('[data-listing-type=Residential]')).toBeVisible();
  await page.locator('[data-listing-type=Residential]').click();
  await page.locator('[data-preset=Room]').click();
  await page.getByRole('button',{name:'Existing property'}).click();
  const form=page.locator('#existingListingForm');
  await expect(form).toHaveAttribute('data-journey-step','0');
  await expect(form.locator('#propertyChoice')).toHaveValue('p1');
  await form.locator('.journey-next').click();
  await expect(form).toHaveAttribute('data-journey-step','1');
  await expect(page.locator('.journey-current-title')).toHaveText('Listing details');
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeLessThan(5);
  await form.locator('.journey-back').click();
  await expect(form).toHaveAttribute('data-journey-step','0');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
});

test('residential preset selects the matching apartment and unit types',async({page})=>{
  await openListing(page);
  await page.locator('[data-listing-type=Residential]').click();
  await expect(page.locator('.listing-home-preset')).toBeVisible();
  await page.locator('[data-preset="2 bedroom apartment"]').click();
  await page.getByRole('button',{name:'New property'}).click();
  await expect(page.locator('.listing-choice-breadcrumb')).toContainText('2 bedroom apartment');
  await expect(page.locator('#listingForm [name=propertyType]')).toHaveValue('Apartment');
  await expect(page.locator('#listingForm [data-base-name=unitType]')).toHaveValue('2 bedroom');
});

test('other property types continue directly without a room preset',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await openListing(page);
  await page.locator('[data-listing-type=House]').click();
  await expect(page.locator('.listing-home-preset')).toBeHidden();
  await page.getByRole('button',{name:'New property'}).click();
  await expect(page.locator('#listingForm [name=propertyType]')).toHaveValue('House');
  await expect(page.locator('.listing-journey-page > .page-back')).toBeHidden();
});

test('a new unit starts blank and a saved draft keeps its private unit name',async({page})=>{
  await openListing(page);
  await page.locator('[data-listing-type=House]').click();
  await page.getByRole('button',{name:'New property'}).click();
  const form=page.locator('#listingForm');
  await page.evaluate(()=>{const form=document.querySelector('#listingForm');for(const [key,value] of Object.entries({region:'Nairobi',city:'Nairobi',locality:'Westlands',address:'Example Road'}))form.elements[key].value=value;form.querySelector('#newPropertyMap')._vacancySetLocation(-1.26,36.8,false)});
  await form.locator('.journey-next').click();
  await form.locator('.unit-name-input').fill('Garden A1');
  await form.locator('.unit-features > summary').click();
  await form.locator('.unit-option-grid [data-unit-amenity=Balcony]').click();
  await form.locator('.unit-add-choices > summary').click();
  await form.locator('[data-new-unit]').click();
  await expect(form.locator('.unit-editor')).toHaveCount(2);
  const fresh=form.locator('.unit-editor').last();
  await expect(fresh.locator('.unit-name-input')).toHaveValue('Unit 2');
  await fresh.locator('[data-base-name=unitType]').selectOption('Shop');
  await expect(fresh.locator('[data-base-name=roomName]')).toHaveValue(/Shop in Westlands/);
  await expect(form.locator('.unit-editor').first().locator('[data-base-name=unitType]')).not.toHaveValue('Shop');
  await expect(fresh.locator('[data-unit-amenity=Balcony]')).toHaveAttribute('aria-pressed','false');
  page.once('dialog',dialog=>dialog.accept());
  await form.locator('.unit-editor').last().locator('.unit-delete').click();
  await expect(form.locator('.unit-editor')).toHaveCount(1);
  await page.evaluate(()=>saveListingDraft(document.querySelector('#listingForm')));
  await page.evaluate(()=>renderList());
  await expect(page.locator('#mine .local-draft-row')).toHaveCount(1);
  await page.locator('[data-listing-type=House]').click();
  await page.getByRole('button',{name:'New property'}).click();
  await expect(page.locator('#listingForm .unit-name-input')).toHaveValue('Garden A1');
});

test('duplicate unit copies details but starts without the first unit photos',async({page})=>{
  await openListing(page);
  await page.locator('[data-listing-type=House]').click();
  await page.getByRole('button',{name:'New property'}).click();
  const form=page.locator('#listingForm');
  await page.evaluate(()=>{const form=document.querySelector('#listingForm');form.elements.city.value='Nairobi';form.querySelector('#newPropertyMap')._vacancySetLocation(-1.26,36.8,false)});
  await form.locator('.journey-next').click();
  const original=form.locator('.unit-editor').first();
  await original.locator('.unit-name-input').fill('Garden A1');
  await original.locator('input[type=file]').setInputFiles({name:'garden.jpg',mimeType:'image/jpeg',buffer:Buffer.from('one')});
  await form.locator('.unit-add-choices > summary').click();
  await form.locator('[data-copy-unit="0"]').click();
  await expect(form.locator('.unit-editor')).toHaveCount(2);
  const copy=form.locator('.unit-editor').last();
  await expect(copy.locator('.unit-name-input')).toHaveValue('Garden A1 (copy)');
  await expect(copy.locator('.photo-selection-item')).toHaveCount(0);
});
test('duplicate listing into a new property copies unit details but requires a new location and photos',async({page})=>{
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);await page.waitForFunction(()=>booting===false);
  await page.evaluate(async()=>{
    history.replaceState(null,'','#list');
    currentUser={id:'owner'};
    const property={id:'p1',title:'Original House',locality:'Westlands',city:'Nairobi',country:market().label,marketCode:marketCode,waterAvailable:true,electricityAvailable:true,securityAvailable:true,parkingSpaces:0};
    VACANCY_BACKEND.myProperties=async()=>[property];
    VACANCY_BACKEND.myVacancies=async()=>[{id:'v1',status:'active',rent_amount:25000,rent_currency:'KES',rent_period:'month',rooms:{name:'Original room',properties:property}}];
    VACANCY_BACKEND.listingForEdit=async()=>({id:'v1',roomId:'r1',propertyId:'p1',roomName:'Original room',unitType:'Studio',rentAmount:25000,rentCurrency:'KES',rentPeriod:'month',deposit:5000,availableFrom:'2026-10-01',minimumStayWeeks:8,maxOccupants:2,furnished:true,ensuite:false,billsIncluded:false,description:'Bright room',smokingAllowedOverride:null,petsConsideredOverride:null,media:[{id:'m1'}]});
    await renderList();
  });
  await page.locator('#mine .property-tree summary').click();
  await page.locator('#mine [data-duplicate]').click();
  await expect(page.locator('.duplicate-destination-note')).toContainText('Original room');
  await page.getByRole('button',{name:'New property'}).click();
  const form=page.locator('#listingForm');
  await expect(form).toHaveAttribute('data-journey-step','0');
  await expect(form.locator('[data-base-name="roomName"]')).toHaveValue('Original room');
  await expect(form.locator('[data-base-name="rentAmount"]')).toHaveValue('25000');
  await expect(form.locator('[data-base-name="furnished"]')).toHaveValue('true');
  await expect(form.locator('[name="address"]')).toBeEmpty();
  await expect(form.locator('.property-media-grid img')).toHaveCount(0);
  await page.evaluate(()=>{history.replaceState(null,'','#list');return renderList()});
  await page.locator('#mine .property-tree summary').click();
  await page.locator('#mine [data-duplicate]').click();
  await page.getByRole('button',{name:'Existing property'}).click();
  const existing=page.locator('#existingListingForm');
  await expect(existing.locator('#propertyChoice')).toHaveValue('p1');
  await expect(existing.locator('[data-base-name="roomName"]')).toHaveValue('Original room');
  await expect(existing.locator('[data-base-name="deposit"]')).toHaveValue('5000');
  await expect(existing.locator('.property-media-grid img')).toHaveCount(0);
});
test('map selection fills the address and a changed address updates the pin',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('**/api/reverse-geocode?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({address:'Example Road',formattedAddress:'Example Road, Westlands, Nairobi, Kenya',locality:'Westlands',city:'Nairobi',region:'Nairobi County',country:'Kenya'})}));
  await page.route('**/api/geocode?**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({lat:-1.29,lon:36.81,label:'Another Street, Nairobi, Kenya'})}));
  await openListing(page);
  await page.locator('[data-listing-type=House]').click();
  await page.getByRole('button',{name:'New property'}).click();
  const form=page.locator('#listingForm');
  await page.evaluate(()=>document.querySelector('#newPropertyMap')._vacancySetLocation(-1.26,36.8,true));
  await expect(form.locator('[name=address]')).toHaveValue('Example Road');
  await expect(form.locator('[name=locality]')).toHaveValue('Westlands');
  await expect(form).toHaveAttribute('data-journey-step','0');
  await form.locator('[name=address]').fill('Another Street');
  await expect(form.locator('[name=publicLatitude]')).toHaveValue('');
  await form.locator('[name=address]').press('Tab');
  await expect(form.locator('[name=publicLatitude]')).toHaveValue('-1.290');
  await form.locator('.journey-next').click();
  await expect(form).toHaveAttribute('data-journey-step','1');
  await expect(form.locator('.chosen-property-address')).toContainText('Westlands, Nairobi, Kenya');
  await expect(form.locator('.chosen-property-address')).not.toContainText('Example Road');
});
