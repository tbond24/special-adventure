const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

async function boot(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.goto(APP+'/#home');
  await page.waitForFunction(()=>booting===false);
  await page.evaluate(()=>{
    currentUser={id:'owner'};
    VACANCY_BACKEND.myProperties=async()=>[];
    VACANCY_BACKEND.myVacancies=async()=>[];
    VACANCY_BACKEND.ownerDashboardMetrics=async()=>({impressions:12,clicks:4,messages:2});
  });
}

test('List opens a dashboard and Create opens the clean current journey',async({page})=>{
  await boot(page);
  await page.evaluate(()=>nav('list'));
  await expect(page.getByRole('heading',{name:'Dashboard'})).toBeVisible();
  await expect(page.locator('.owner-list-metrics')).toContainText('12');
  await page.getByRole('button',{name:'Create new listing'}).click();
  await expect(page.getByRole('heading',{name:'What are you listing?'})).toBeVisible();
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('.mobile-nav')).toBeHidden();
  await page.locator('[data-listing-type=Residential]').click();
  await page.locator('[data-preset=Room]').click();
  await page.getByRole('button',{name:'New property'}).click();
  await expect(page.locator('#listingForm[data-journey101]')).toBeVisible();
  await page.locator('.listing-choice-breadcrumb button').click();
  await expect(page.getByRole('heading',{name:'What are you listing?'})).toBeVisible();
});

test('editing an existing listing uses the same journey and retains its photos',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{
    VACANCY_BACKEND.listingForEdit=async()=>({id:'v1',roomId:'r1',propertyId:'p1',media:[{id:'m1',url:'https://example.com/one.jpg',storage_path:'one.jpg'},{id:'m2',url:'https://example.com/two.jpg',storage_path:'two.jpg'},{id:'m3',url:'https://example.com/three.jpg',storage_path:'three.jpg'}],region:'Nairobi',city:'Nairobi',locality:'Kilimani',marketCode:'KE',country:'Kenya',address:'Road',publicLatitude:-1.2,publicLongitude:36.8,propertyType:'Apartment',parkingSpaces:0,waterAvailable:true,electricityAvailable:true,securityAvailable:true,internetAvailable:false,smokingAllowed:false,petsConsidered:false,household:'',unitType:'Studio',roomName:'Studio',rentAmount:10000,rentCurrency:'KES',rentPeriod:'month',deposit:10000,availableFrom:'2026-10-01',minimumStayWeeks:8,maxOccupants:1,furnished:false,ensuite:false,billsIncluded:false,smokingAllowedOverride:null,petsConsideredOverride:null,description:'A studio',unitDetails:{amenities:[{label:'Balcony',icon:'balcony'}]}});
    const listingForEdit=VACANCY_BACKEND.listingForEdit;
    VACANCY_BACKEND.listingForEdit=async()=>({...await listingForEdit(),availableFrom:null});
    history.replaceState(null,'','#edit/v1');
  });
  await page.evaluate(()=>renderEdit('v1'));
  await expect(page.locator('#listingForm[data-edit-vacancy=v1][data-journey101]')).toBeVisible();
  await expect(page.locator('.edit-existing-photo')).toHaveCount(3);
  await expect(page.locator('[data-base-name=availableFrom]')).toHaveValue('');
  await expect(page.locator('[data-base-name=rentAmount]')).toHaveValue('10000');
  await expect(page.locator('[data-unit-amenity="Balcony"]')).toHaveAttribute('aria-pressed','true');
  await page.evaluate(()=>{
    window.__editCalls=[];
    VACANCY_BACKEND.updateListing=async(id,input)=>window.__editCalls.push({kind:'update',id,title:input.roomName,rent:input.rentAmount});
    VACANCY_BACKEND.updateRoomOverrides=async()=>{};
    VACANCY_BACKEND.saveUnitListingDetails=async()=>{};
    VACANCY_BACKEND.setVacancyPublicLocation=async()=>{};
    VACANCY_BACKEND.createListing=async()=>{throw new Error('Editing must not create a listing')};
    VACANCY_BACKEND.myVacancies=async()=>[];
    VACANCY_BACKEND.activeVacancies=async()=>[];
  });
  await page.locator('.journey-next').click();
  const photoWidths=await page.locator('.edit-existing-photo').evaluateAll(items=>items.map(item=>Math.round(item.getBoundingClientRect().width)));
  expect(photoWidths[0]).toBeGreaterThan(photoWidths[1]);
  expect(photoWidths[1]).toBe(photoWidths[2]);
  await page.locator('[data-base-name=roomName]').fill('Revised studio');
  await page.locator('.journey-next').click();
  await expect(page.locator('.unit-draft-preview')).toContainText('Revised studio');
  await expect(page.locator('.unit-draft-preview img')).toHaveCount(3);
  await page.locator('.unit-draft-preview [data-preview-step="1"]').click();
  await expect.poll(()=>page.locator('.unit-draft-preview [data-preview-track]').evaluate(track=>track.scrollLeft)).toBeGreaterThan(0);
  await page.locator('#listingForm').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  await expect.poll(()=>page.evaluate(()=>window.__editCalls)).toEqual([{kind:'update',id:'v1',title:'Revised studio',rent:'10000'}]);
});

test('expanded features do not show a Show less control',async({page})=>{
  await boot(page);
  const state=await page.evaluate(()=>{
    const section=document.createElement('section');
    section.className='quiet-features';
    section.innerHTML='<details class="quiet-more" open><summary>Show less</summary><ul><li>Balcony</li></ul></details>';
    document.body.append(section);
    const summary=section.querySelector('summary');
    return {display:getComputedStyle(summary).display,margin:getComputedStyle(section.querySelector('details')).marginTop};
  });
  expect(state).toEqual({display:'none',margin:'0px'});
});

test('new image selections append and preview has arrows',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{history.replaceState(null,'','#list/new');return renderList()});
  await page.locator('[data-listing-type=Residential]').click();
  await page.locator('[data-preset=Room]').click();
  await page.getByRole('button',{name:'New property'}).click();
  const input=page.locator('#listingForm .unit-editor input[type=file]').first();
  await input.setInputFiles([{name:'first.jpg',mimeType:'image/jpeg',buffer:Buffer.from('one')},{name:'second.jpg',mimeType:'image/jpeg',buffer:Buffer.from('two')}]);
  await input.setInputFiles({name:'third.jpg',mimeType:'image/jpeg',buffer:Buffer.from('three')});
  await expect(page.locator('#listingForm .unit-editor .photo-selection-item')).toHaveCount(3);
  await page.locator('#listingForm .listing-preview-action').evaluate(button=>button.click());
  await expect(page.locator('.unit-draft-preview img')).toHaveCount(3);
  await expect(page.locator('.unit-draft-preview [data-preview-step]')).toHaveCount(2);
});

test('reuse existing photos adds to the current selection',async({page})=>{
  await boot(page);
  await page.evaluate(()=>{
    history.replaceState(null,'','#list/new');
    VACANCY_BACKEND.ownerMediaLibrary=async()=>[{id:'reuse-one',url:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',label:'Studio · balcony'}];
    VACANCY_BACKEND.mediaLibraryFiles=async()=>[new File(['reuse'],'reused.jpg',{type:'image/jpeg'})];
    return renderList();
  });
  await page.locator('[data-listing-type=Residential]').click();
  await page.locator('[data-preset=Room]').click();
  await page.getByRole('button',{name:'New property'}).click();
  const input=page.locator('#listingForm .unit-editor input[type=file]').first();
  await input.setInputFiles({name:'new.jpg',mimeType:'image/jpeg',buffer:Buffer.from('new')});
  await page.locator('#listingForm [name=region]').fill('Nairobi');
  await page.locator('#listingForm [name=city]').fill('Nairobi');
  await page.locator('#listingForm [name=locality]').fill('Kilimani');
  await page.locator('#listingForm [name=address]').fill('Main Road');
  await page.locator('#listingForm [name=publicLatitude]').evaluate(input=>input.value='-1.2');
  await page.locator('#listingForm [name=publicLongitude]').evaluate(input=>input.value='36.8');
  await page.locator('#listingForm .journey-next').click();
  await page.locator('#listingForm .unit-media-toolbar > button').click();
  await page.locator('#listingForm [data-media-library]').click();
  await page.getByRole('button',{name:/Studio · balcony/}).click();
  await page.getByRole('button',{name:'Add selected photos'}).click();
  await expect(page.locator('#listingForm .unit-editor .photo-selection-item')).toHaveCount(2);
});
