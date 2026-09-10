const {test,expect}=require('@playwright/test');
const APP_URL=process.env.VACANCY_E2E_URL||'http://127.0.0.1:4173';

async function openApp(page){
  await page.route('**/rest/v1/vacancies?**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.addInitScript(()=>localStorage.setItem('vacancy-market-v1','KE'));
  await page.goto(APP_URL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>booting===false);
}
async function openCreate(page,properties=[]){await openApp(page);await page.evaluate(async properties=>{currentUser={id:'stage52'};VACANCY_BACKEND.myProperties=async()=>properties;VACANCY_BACKEND.myVacancies=async()=>properties.map((property,index)=>({id:`existing-${index}`,status:'active',rooms:{id:`room-${index}`,name:'Existing unit',properties:{id:property.id,title:property.title,suburb:property.locality,city:property.city,country:'Kenya'}}}));await renderList()},properties);await page.getByRole('button',{name:'Studio',exact:true}).click();await page.getByRole('button',{name:properties.length?'Existing property':'New property',exact:true}).click()}
const editRecord={id:'v1',roomId:'r1',propertyId:'p1',region:'Nairobi',city:'Nairobi',locality:'Kasarani',landmark:'',postal:'',marketCode:'KE',country:'Kenya',address:'Private',publicLatitude:-1.22,publicLongitude:36.89,propertyType:'Apartment',parkingSpaces:0,waterAvailable:true,electricityAvailable:true,securityAvailable:true,internetAvailable:false,smokingAllowed:false,petsConsidered:false,household:'Quiet',unitType:'Bedsitter',roomName:'Unit',rentAmount:12000,rentCurrency:'KES',rentPeriod:'month',deposit:'',availableFrom:'2026-09-20',minimumStayWeeks:8,maxOccupants:1,furnished:false,ensuite:true,billsIncluded:false,smokingAllowedOverride:null,petsConsideredOverride:null,description:'Bright room'};

test('creation and edit share compact money, stay, service and quantity controls',async({page})=>{
  await openCreate(page);const create=page.locator('#listingForm');
  await expect(create.locator('.rent-control')).toHaveCount(1);await expect(create.locator('.rent-control select').last()).toHaveValue('month');await expect(create.locator('.rent-control select').last().locator('option').first()).toHaveText('Monthly');
  await expect(create.locator('.deposit-control')).toHaveCount(1);await expect(create.locator('.stay-control')).toHaveCount(1);await expect(create.locator('.unit-editor .advanced-unit-settings')).not.toHaveAttribute('open','');
  await page.evaluate(()=>{const unit=[...document.querySelectorAll('.composer-section')].find(section=>section.textContent.includes('Unit & availability'));unit.open=true});await create.locator('.unit-editor .advanced-unit-settings summary').click();await create.getByRole('button',{name:'Increase maximum occupants'}).click();await expect(create.locator('[name=maxOccupants]')).toHaveValue('2');
  await expect(create.locator('.service-choice')).toHaveCount(9);
  await page.evaluate(async record=>{VACANCY_BACKEND.listingForEdit=async()=>record;await renderEdit('v1')},editRecord);const edit=page.locator('#editListingForm');
  await expect(edit.locator('.rent-control,.deposit-control,.stay-control')).toHaveCount(3);await expect(edit.locator('.service-choice')).toHaveCount(11);await expect(edit.locator('.advanced-unit-settings').first()).not.toHaveAttribute('open','');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('inherited choices default visibly to property and update without a dropdown',async({page})=>{
  await openCreate(page,[{id:'p1',title:'Sunrise',locality:'Kasarani',city:'Nairobi',waterAvailable:true,electricityAvailable:true,securityAvailable:true,parkingSpaces:1}]);await page.getByRole('button',{name:/Sunrise/}).click();
  const smoking=page.locator('.service-choice').filter({hasText:'Smoking'}).first();await expect(smoking.locator('em')).toHaveText('From property');await expect(smoking.locator('select')).toBeHidden();
  await smoking.getByRole('button',{name:'Change Smoking'}).click();await expect(smoking.locator('select')).toHaveValue('true');await expect(smoking.locator('.service-state')).toHaveText('Yes');await expect(smoking.locator('em')).toBeHidden();
});

test('save draft is explicit and distinct from publish',async({page})=>{
  await openCreate(page);const form=page.locator('#listingForm');await expect(form.locator('.listing-submit-actions')).toBeVisible();await expect(form.getByRole('button',{name:'Save draft'})).toBeVisible();await expect(form.getByRole('button',{name:'Publish vacancy'})).toBeVisible();
  await page.evaluate(()=>document.querySelector('#listingForm [name=rentAmount]').value='18000');await form.getByRole('button',{name:'Save draft'}).click();await expect(page.locator('#toast')).toContainText('Draft saved');expect(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.startsWith('vacancy-listing-draft')))).toBeTruthy();
  const corners=await form.locator('.listing-submit-actions button').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).borderRadius));expect(corners).toEqual(['0px','0px']);
});

test('vacancy groups start closed and controls remain on one line',async({page})=>{
  await openApp(page);await page.evaluate(async()=>{currentUser={id:'stage52'};const property={id:'p1',title:'Sunrise',suburb:'Kasarani',city:'Nairobi',country:'Kenya'};VACANCY_BACKEND.myVacancies=async()=>[{id:'v1',status:'active',rent_amount:12000,rent_currency:'KES',rent_period:'month',rooms:{name:'Unit 1',properties:property}}];await renderList()});
  await expect(page.locator('.property-tree')).not.toHaveAttribute('open','');const centres=await page.locator('#vacancyFilter,#vacancyViewToggle').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect();return box.top+box.height/2}));expect(Math.max(...centres)-Math.min(...centres)).toBeLessThan(1);
});

test('detail uses full width and photos open a navigable lightbox',async({page})=>{
  await openApp(page);await page.evaluate(()=>{const base={id:'v1',rentAmount:12000,rentCurrency:'KES',rentPeriod:'month',deposit:null,billsIncluded:false,availableFrom:'2026-09-10',minimumStayWeeks:4,status:'active',room:{id:'r1',name:'Test unit',roomType:'Bedsitter',unitType:'Bedsitter',furnished:false,ensuite:true,maxOccupants:1,description:'Description',media:[{url:'data:image/gif;base64,R0lGODlhAQABAAAAACw='},{url:'data:image/gif;base64,R0lGODlhAQABAAAAACw='}]},property:{id:'p1',title:'Test',suburb:'Kasarani',city:'Nairobi',state:'Nairobi',country:'Kenya',propertyType:'Apartment',parkingSpaces:1,petsConsidered:false,smokingAllowed:false,householdSummary:'Quiet',waterAvailable:true,electricityAvailable:true,securityAvailable:true,internetAvailable:true,publicLatitude:-1.22,publicLongitude:36.89},owner:{id:'o1',displayName:'Owner',bio:''}};vacancies=[base];renderDetail('v1')});
  const summary=await page.locator('.detail-summary').boundingBox(),main=await page.locator('main').boundingBox();expect(summary.width).toBeGreaterThan(main.width*.9);await page.locator('.detail-gallery-slide img').first().click();await expect(page.locator('.listing-lightbox')).toBeVisible();await expect(page.locator('.listing-lightbox>span')).toHaveText('1 / 2');await page.getByRole('button',{name:'Next photo'}).click();await expect(page.locator('.listing-lightbox>span')).toHaveText('2 / 2');
});
