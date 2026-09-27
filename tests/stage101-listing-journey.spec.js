const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

async function openListing(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(async()=>{currentUser={id:'owner'};VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];await renderList()});
}

test('mobile listing starts at the top and guides the existing form through five stages',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await openListing(page);
  await expect(page.locator('.mobile-nav [data-nav="list"]')).toHaveCount(1);
  await expect(page.locator('.topbar .list-action')).toBeHidden();
  const navCenters=await page.evaluate(()=>{const nav=document.querySelector('.mobile-nav').getBoundingClientRect(),list=document.querySelector('.mobile-nav [data-nav=list]').getBoundingClientRect();return [nav.left+nav.width/2,list.left+list.width/2]});
  expect(Math.abs(navCenters[0]-navCenters[1])).toBeLessThan(2);
  await expect(page.locator('.mobile-nav [data-nav="list"] svg')).toHaveAttribute('viewBox','0 0 24 24');
  await expect(page.locator('.listing-home-preset')).toBeHidden();
  await page.locator('[data-listing-type=Residential]').click();
  await expect(page.locator('.listing-home-preset')).toBeVisible();
  await page.locator('[data-preset=Room]').click();
  await expect(page.locator('.selected-home-pill')).toHaveText('Room');
  await expect(page.locator('.selected-home-pill')).toBeVisible();
  await page.getByRole('button',{name:'New property'}).click();
  const form=page.locator('#listingForm');
  await expect(form).toHaveAttribute('data-journey-step','0');
  await expect(page.locator('.listing-journey-rail')).toHaveCount(0);
  await expect(page.locator('.listing-journey-page > .page-back')).toBeHidden();
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeLessThan(5);
  await expect(page.locator('.listing-top-stepper')).toBeHidden();
  await expect(page.locator('.journey-current-title')).toHaveText('Location');
  await expect(page.locator('#newPropertyMap')).toBeVisible();
  await expect(page.locator('.property-media-pool')).toBeHidden();
  await form.locator('.journey-next').click();
  await expect(form).toHaveAttribute('data-journey-step','0');
  await page.evaluate(()=>{const form=document.querySelector('#listingForm');for(const [key,value] of Object.entries({region:'Nairobi',city:'Nairobi',locality:'Westlands',address:'Example Road'}))form.elements[key].value=value;form.querySelector('#newPropertyMap')._vacancySetLocation(-1.26,36.8,false)});
  await form.locator('.journey-next').click();
  await expect(form).toHaveAttribute('data-journey-step','1');
  await expect(page.locator('.journey-current-title')).toHaveText('Property details');
  await expect(page.locator('.property-media-pool')).toBeVisible();
  await form.locator('.journey-next').click();
  await expect(form).toHaveAttribute('data-journey-step','1');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
});

test('property photos flow into the unit and a complete listing can reach publish',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await openListing(page);
  await page.locator('[data-listing-type=Residential]').click();
  await page.locator('[data-preset=Room]').click();
  await page.getByRole('button',{name:'New property'}).click();
  const form=page.locator('#listingForm');
  await page.evaluate(()=>{const form=document.querySelector('#listingForm');for(const [key,value] of Object.entries({region:'Nairobi',city:'Nairobi',locality:'Westlands',address:'Example Road'}))form.elements[key].value=value;form.querySelector('#newPropertyMap')._vacancySetLocation(-1.26,36.8,false)});
  await form.locator('.journey-next').click();
  await expect(form).toHaveAttribute('data-journey-step','1');
  await form.locator('[name="propertyTitle"]').fill('Example House');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
  await form.locator('.property-media-input').setInputFiles([1,2,3].map(number=>({name:`photo${number}.png`,mimeType:'image/png',buffer:png})));
  await expect(form.locator('.property-media-grid img')).toHaveCount(3);
  await form.locator('.journey-next').click();
  await expect(form).toHaveAttribute('data-journey-step','2');
  await expect(form.locator('.journey-current-title')).toHaveText('Example House details');
  await form.locator('.journey-next').click();
  await expect(form).toHaveAttribute('data-journey-step','3');
  await form.locator('[data-base-name="rentAmount"]').fill('25000');
  await form.locator('.journey-next').click();
  await expect(form).toHaveAttribute('data-journey-step','4');
  await expect(form.locator('.listing-draft-preview')).toBeVisible();
  await expect(form.locator('.listing-draft-preview img')).toHaveCount(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
  await page.evaluate(()=>{window.__published=[];VACANCY_BACKEND.createListing=async input=>{window.__published.push(input);return 'listing-test'};VACANCY_BACKEND.listingForEdit=async()=>({propertyId:'property-test'});VACANCY_BACKEND.uploadListingImages=async()=>[];VACANCY_BACKEND.setPropertyFeatures=async()=>{};VACANCY_BACKEND.trackEvent=()=>{};});
  await form.locator('.listing-submit-actions button.primary').click();
  await expect.poll(()=>page.evaluate(()=>window.__published.length)).toBe(1);
});

test('existing property keeps its identity and starts a unit without requesting a new map pin',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(`${APP}/#home`);await page.waitForFunction(()=>booting===false);
  await page.evaluate(async()=>{
    currentUser={id:'owner'};
    const property={id:'p1',title:'Westlands House',locality:'Westlands',city:'Nairobi',country:market().label,marketCode:marketCode,waterAvailable:true,electricityAvailable:true,securityAvailable:true,parkingSpaces:0};
    VACANCY_BACKEND.myProperties=async()=>[property];
    VACANCY_BACKEND.myVacancies=async()=>[{id:'v1',status:'active',rent_amount:25000,rent_currency:'KES',rent_period:'month',rooms:{name:'Existing room',properties:property}}];
    await renderList();
  });
  await page.locator('[data-listing-type=Residential]').click();
  await page.locator('[data-preset=Room]').click();
  await page.getByRole('button',{name:'Existing property'}).click();
  const form=page.locator('#existingListingForm');
  await expect(form).toHaveAttribute('data-journey-step','0');
  await expect(form.locator('#propertyChoice')).toHaveValue('p1');
  await form.locator('.journey-next').click();
  await expect(form).toHaveAttribute('data-journey-step','1');
  await expect(page.locator('.journey-current-title')).toHaveText('Property details');
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

test('features are one-tap, parking is grouped, and the local draft is discarded in Your vacancies',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await openListing(page);
  await page.locator('[data-listing-type=House]').click();
  await page.getByRole('button',{name:'New property'}).click();
  const form=page.locator('#listingForm');
  await expect(form.locator('.listing-draft-status')).toHaveCount(0);
  await page.evaluate(()=>{const form=document.querySelector('#listingForm');for(const [key,value] of Object.entries({region:'Nairobi',city:'Nairobi',locality:'Westlands',address:'Example Road'}))form.elements[key].value=value;form.querySelector('#newPropertyMap')._vacancySetLocation(-1.26,36.8,false)});
  await form.locator('.journey-next').click();
  await form.locator('[name=propertyTitle]').fill('Garden House');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
  await form.locator('.property-media-input').setInputFiles([1,2,3].map(number=>({name:'photo'+number+'.png',mimeType:'image/png',buffer:png})));
  await form.locator('.journey-next').click();
  await expect(form.locator('.journey-current-title')).toHaveText('Garden House details');
  await form.locator('.unit-editor').first().locator('.title-mode-toggle').click();
  await form.locator('.unit-editor').first().locator('[data-base-name=roomName]').fill('Garden room');
  await page.evaluate(()=>{document.querySelector('.unit-editor [data-base-name=rentAmount]').value='24000'});
  await form.locator('.duplicate-unit-menu').first().locator('summary').click();
  await form.locator('.duplicate-same-property').first().click();
  await expect(form.locator('.unit-editor')).toHaveCount(2);
  await expect(form.locator('.unit-editor').last().locator('[data-base-name=rentAmount]')).toHaveValue('24000');
  await expect(form.locator('.unit-editor').last().locator('[data-base-name=roomName]')).toHaveValue('Garden room');
  await expect(form.locator('.unit-editor').last().locator('[data-base-name=roomName]')).toBeEditable();
  expect(await page.evaluate(()=>selectedPhotoFiles(document.querySelectorAll('.unit-editor input[type=file]')[1]).length)).toBe(3);
  await expect(form.locator('.property-features [name=parkingSpaces]')).toHaveCount(1);
  await expect(form.locator('.property-features .add-more-choice')).toHaveCount(0);
  await form.locator('.property-features summary').click();
  await form.locator('[data-feature=balcony]').click();
  await expect(form.locator('[name=customFeatures]')).toHaveValue('[{"label":"Balcony","icon":"balcony"}]');
  await form.locator('.add-feature-action').click();
  await form.locator('[aria-label="Your feature name"]').fill('Rooftop terrace');
  await expect(form.locator('[name=customFeatures]')).toHaveValue(/Rooftop terrace/);
  await form.locator('.save-draft-action').click();
  await expect.poll(()=>page.locator('#mine .local-draft-row').count()).toBe(1);
  await expect(page.locator('#mine .local-draft-row')).toContainText('Garden House');
  await page.evaluate(()=>renderList());
  await page.locator('[data-listing-type=House]').click();
  await page.getByRole('button',{name:'New property'}).click();
  await expect(page.locator('#listingForm [data-feature=balcony]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#listingForm [aria-label="Your feature name"]')).toHaveValue('Rooftop terrace');
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#mine [data-delete-draft]').click();
  await expect(page.locator('#mine .local-draft-row')).toHaveCount(0);
});
