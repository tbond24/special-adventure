const {test,expect}=require('@playwright/test');
const {createCloud,install,owner}=require('../qa/account-drafts/synthetic-cloud.cjs');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
const photos=[1,2,3].map(index=>({name:`photo-helper-${index}.png`,mimeType:'image/png',buffer:Buffer.concat([png,Buffer.from(`photo-${index}`)])}));
const hint=unit=>unit.locator('.unit-photo-hint > .muted');
async function ready(page){await page.waitForFunction(()=>typeof booting!=='undefined'&&!booting);}
async function newListing(page){
 await page.goto('/#list/new');await ready(page);
 await page.locator('[data-listing-type=Residential]').click();await page.locator('[data-preset=Studio]').click();await page.getByRole('button',{name:'New property',exact:true}).click();
 const form=page.locator('#listingForm');
 await form.evaluate(node=>{for(const [name,value]of Object.entries({country:'Kenya',region:'Nairobi',city:'Nairobi',locality:'Westlands',address:'Synthetic Garden Road'}))if(node.elements[name])node.elements[name].value=value;node.querySelector('#newPropertyMap')._vacancySetLocation(-1.26,36.8,false);});
 await form.locator('.journey-next').click();await expect(form).toHaveAttribute('data-journey-step','1');
 await form.locator('[data-base-name=rentAmount]').fill('25000');return form;
}
function noPublication(state){expect(state.cloud.publicWrites).toEqual([]);expect(state.calls.filter(call=>!['ownerMediaLibrary','mediaLibraryFiles'].includes(call.method))).toEqual([]);}
function seedEdit(cloud,count){
 const id='00000000-0000-4000-8000-000000007001';
 cloud.editListings.set(id,{id,roomId:'00000000-0000-4000-8000-000000007002',propertyId:'00000000-0000-4000-8000-000000007003',privateName:'Synthetic photo listing',roomName:'Photo helper studio',unitType:'Studio',description:'Synthetic edit fixture',rentAmount:22000,rentCurrency:'KES',rentPeriod:'month',deposit:0,availableFrom:'2026-10-15',minimumStayWeeks:'',maxOccupants:1,unitDetails:{},locality:'Westlands',city:'Nairobi',region:'Nairobi',country:'Kenya',marketCode:'KE',address:'Synthetic Garden Road',propertyType:'Apartment',publicLatitude:-1.26,publicLongitude:36.8,parkingSpaces:0,media:Array.from({length:count},(_,index)=>({id:`photo-${index}`,url:`https://synthetic.invalid/photo-${index}.png`}))});
 return id;
}

test('minimum photo hint follows add, reorder, remove, and restore while validation remains enforced',async({page,context},info)=>{
 const state=await install(context),form=await newListing(page),unit=form.locator('.unit-editor');
 page.on('dialog',dialog=>dialog.accept());
 await expect(hint(unit)).toBeVisible();
 await unit.locator('input[type=file]').setInputFiles(photos.slice(0,2));await expect(unit.locator('.photo-selection-item')).toHaveCount(2);await expect(hint(unit)).toBeVisible();
 await form.locator('.journey-next').click();await expect(form).toHaveAttribute('data-journey-step','1');await expect(page.locator('#toast')).toContainText('Add at least 3 photos');
 await unit.locator('input[type=file]').setInputFiles(photos[2]);await expect(unit.locator('.photo-selection-item')).toHaveCount(3);await expect(hint(unit)).toBeHidden();
 await expect(page.locator('#toast')).not.toHaveClass(/show/);await page.screenshot({path:info.outputPath('three-photos-helper-hidden.png'),fullPage:true});
 await unit.locator('[data-photo-up="2"]').click();await expect(hint(unit)).toBeHidden();
 await form.locator('.journey-next').click();await expect(form).toHaveAttribute('data-journey-step','2');
 await form.locator('.journey-back').click();await expect(form).toHaveAttribute('data-journey-step','1');
 await unit.locator('[data-photo-remove="2"]').click();await expect(unit.locator('.photo-selection-item')).toHaveCount(2);await expect(hint(unit)).toBeVisible();
 await form.locator('.journey-next').click();await expect(form).toHaveAttribute('data-journey-step','1');
 await unit.locator('input[type=file]').setInputFiles(photos[1]);await expect(unit.locator('.photo-selection-item')).toHaveCount(3);await expect(hint(unit)).toBeHidden();
 await page.waitForFunction(async()=>{const node=document.querySelector('#listingForm'),saved=await VACANCY_GUEST_DRAFT.load(node);return saved?.media?.[0]?.files?.length===3;});
 await page.reload();await ready(page);await expect(form.locator('.photo-selection-item')).toHaveCount(3);
 await expect(hint(form.locator('.unit-editor'))).toHaveAttribute('hidden','');noPublication(state);
});

test('each unit has its own photo minimum and translated helper preserves visibility',async({page,context})=>{
 const state=await install(context),form=await newListing(page),first=form.locator('.unit-editor').first();
 await first.locator('input[type=file]').setInputFiles(photos);await expect(hint(first)).toBeHidden();
 await form.locator('.unit-add-choices > summary').click();await form.locator('[data-new-unit]').click();await expect(form.locator('.unit-editor')).toHaveCount(2);
 const second=form.locator('.unit-editor').last();await expect(hint(second)).toBeVisible();await expect(hint(first)).toBeHidden();
 await page.getByLabel('Listing language').selectOption('fr');await expect(hint(second)).toHaveText('Ajoutez au moins 3 photos.');
 await second.locator('input[type=file]').setInputFiles(photos);await expect(hint(second)).toBeHidden();
 page.on('dialog',dialog=>dialog.accept());await second.locator('[data-photo-remove="2"]').click();await expect(hint(second)).toBeVisible();await expect(hint(second)).toHaveText('Ajoutez au moins 3 photos.');await expect(hint(first)).toBeHidden();noPublication(state);
});

for(const count of [2,3])test(`edit counts ${count} existing photos together with new files`,async({page,context},info)=>{
 const cloud=createCloud(),id=seedEdit(cloud,count),state=await install(context,cloud,{signedIn:owner});
 await page.goto('/#edit/'+id);await ready(page);const form=page.locator('#listingForm'),unit=form.locator('.unit-editor');
 await expect(form).toHaveAttribute('data-edit-vacancy',id);await expect(unit.locator('.edit-existing-photo')).toHaveCount(count);await form.locator('.journey-next').click();await expect(form).toHaveAttribute('data-journey-step','1');
 if(count===3){await expect(hint(unit)).toBeHidden();await page.screenshot({path:info.outputPath('existing-photos-helper-hidden.png'),fullPage:true});}
 else {
  await expect(hint(unit)).toBeVisible();await unit.locator('input[type=file]').setInputFiles(photos[0]);await expect(hint(unit)).toBeHidden();
  await form.locator('.journey-next').click();await expect(form).toHaveAttribute('data-journey-step','2');await form.locator('.journey-back').click();
  page.on('dialog',dialog=>dialog.accept());await unit.locator('[data-photo-remove="0"]').click();await expect(hint(unit)).toBeVisible();
  await form.locator('.journey-next').click();await expect(form).toHaveAttribute('data-journey-step','1');await expect(page.locator('#toast')).toContainText('Add at least 3 photos');
 }
 noPublication(state);
});

for(const outcome of ['success','failure'])for(const state of ['detached','draftLocationFrozen','draftExited'])test(`late forward-geocode ${outcome} cannot change a ${state} form`,async({page,context})=>{
 const boundary=await install(context),form=await newListing(page);
 const before=await form.evaluate((node,outcome)=>{
  window.__geocodeForm=node;
  const snapshot=()=>({country:node.elements.country?.value||null,latitude:node.elements.publicLatitude?.value||null,longitude:node.elements.publicLongitude?.value||null,label:node.dataset.locationLabel});
  window.__geocodeSnapshot=snapshot;
  const original=window.fetch;
  window.fetch=(...args)=>String(args[0]).startsWith('/api/geocode?q=')?new Promise((resolve,reject)=>{window.__releaseGeocode=()=>outcome==='failure'?reject(new Error('Late synthetic location failure')):resolve({ok:true,json:async()=>({country:'Australia',locality:'Sydney',lat:-33.86,lon:151.2})});}):original(...args);
  node.elements.address.value='Delayed synthetic address';node.elements.address.dispatchEvent(new Event('change',{bubbles:true}));
  return snapshot();
 },outcome);
 await page.waitForFunction(()=>typeof window.__releaseGeocode==='function');
 await page.evaluate(async state=>{const node=window.__geocodeForm;if(state==='detached')node.remove();else node.dataset[state]='true';window.__releaseGeocode();await node.querySelector('#newPropertyMap')._vacancyForwardLookup;},state);
 expect(await page.evaluate(()=>window.__geocodeSnapshot())).toEqual(before);await expect(page.locator('#toast')).not.toContainText('Late synthetic location failure');noPublication(boundary);
});
