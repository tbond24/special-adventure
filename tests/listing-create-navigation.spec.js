const {test,expect}=require('@playwright/test');
const {createCloud,install,owner}=require('../qa/account-drafts/synthetic-cloud.cjs');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
const photos=[1,2,3].map(n=>({name:`nav-${n}.png`,mimeType:'image/png',buffer:Buffer.concat([png,Buffer.from(String(n))])}));
async function boot(page,context,{signedIn=false,dark=false,route='#list/new',cloud=createCloud()}={}){
 const state=await install(context,cloud,{signedIn:signedIn?owner:null});
 await context.addInitScript(dark=>localStorage.setItem('vacancy-theme-v1',dark?'dark':'light'),dark);
 await page.goto('/'+route);await page.waitForFunction(()=>typeof booting!=='undefined'&&!booting);return state;
}
function nav(page){return page.locator(page.viewportSize().width<=820?'.mobile-nav':'.desktop-nav');}
async function navigationVisible(page){await expect(nav(page)).toBeVisible();await expect(nav(page).locator('[data-nav=home]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);}
async function accessibleAction(page,button){
 await button.evaluate(el=>el.scrollIntoView({block:'end',behavior:'instant'}));await expect(button).toBeVisible();
 const measured=await button.evaluate(el=>{const r=el.getBoundingClientRect(),bar=document.querySelector('.mobile-nav'),b=bar.getBoundingClientRect();return{hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),overlap:getComputedStyle(bar).display!=='none'&&r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top};});
 expect(measured).toEqual({hit:true,overlap:false});await navigationVisible(page);
}
async function choose(page){await page.locator('[data-listing-type=Residential]').click();await page.locator('[data-preset=Studio]').click();await page.getByRole('button',{name:'New property',exact:true}).click();const form=page.locator('#listingForm');await expect(form).toHaveAttribute('data-journey-step','0');return form;}
async function location(form){await form.evaluate(f=>{for(const [key,value]of Object.entries({country:'Kenya',region:'Nairobi',city:'Nairobi',locality:'Westlands',address:'Synthetic navigation test'}))if(f.elements[key])f.elements[key].value=value;f.querySelector('#newPropertyMap')._vacancySetLocation(-1.26,36.8,false)});}
async function details(form){await form.locator('[data-base-name=rentAmount]').fill('25000');await form.locator('[data-base-name=description]').fill('Synthetic retained navigation draft');await form.locator('input[type=file]').setInputFiles(photos);}
function noPublication(state){expect(state.cloud.publicWrites).toEqual([]);expect(state.calls.filter(c=>!['ownerMediaLibrary','mediaLibraryFiles'].includes(c.method))).toEqual([]);}

for(const signedIn of [false,true])for(const dark of [false,true])test(`${signedIn?'account':'guest'} chooser and all create stages retain clear navigation, ${dark?'dark':'light'}`,async({page,context},info)=>{
 const state=await boot(page,context,{signedIn,dark});await navigationVisible(page);await expect(page.locator('.listing-guest-notice')).toHaveCount(0);
 await expect(page.getByText('Add your details first.',{exact:false})).toHaveCount(0);await page.screenshot({path:info.outputPath('chooser.png')});
 const form=await choose(page);await navigationVisible(page);await accessibleAction(page,form.locator('.journey-next'));await location(form);await form.locator('.journey-next').click();
 await expect(form).toHaveAttribute('data-journey-step','1');await navigationVisible(page);await details(form);await accessibleAction(page,form.locator('.journey-next'));await form.locator('.journey-next').click();
 await expect(form).toHaveAttribute('data-journey-step','2');const publish=form.locator('.listing-submit-actions .primary');await accessibleAction(page,publish);await page.screenshot({path:info.outputPath('review-actions.png')});
 await form.locator('.journey-back').click();await expect(form).toHaveAttribute('data-journey-step','1');await expect(form.locator('[data-base-name=description]')).toHaveValue('Synthetic retained navigation draft');await expect(form.locator('.photo-selection-item')).toHaveCount(3);noPublication(state);
});

test('guest Publish authentication and return preserve navigation, fields and photos',async({page,context})=>{
 const state=await boot(page,context),form=await choose(page);await location(form);await form.locator('.journey-next').click();await details(form);await form.locator('.journey-next').click();await form.locator('.listing-submit-actions .primary').click();
 await expect(page).toHaveURL(/#auth$/);await expect(page.locator('#listingAuthNotice')).toBeVisible();noPublication(state);await page.locator('#returnToListingDraft').click();
 await expect(page).toHaveURL(/#list\/new$/);await navigationVisible(page);await expect(form.locator('.photo-selection-item')).toHaveCount(3);await expect(form.locator('[data-base-name=description]')).toHaveValue('Synthetic retained navigation draft');noPublication(state);
});

test('saved guest draft survives Find navigation and browser Back',async({page,context})=>{
 const state=await boot(page,context),form=await choose(page);await location(form);await form.locator('.journey-next').click();await details(form);
 await form.evaluate(f=>VACANCY_GUEST_DRAFT.checkpoint(f,{forAuth:false}));await nav(page).locator('[data-nav=home]').click();await expect(page).toHaveURL(/#home$/);await page.goBack();await expect(page).toHaveURL(/#list\/new$/);
 await expect(form.locator('.photo-selection-item')).toHaveCount(3);await expect(form.locator('[data-base-name=description]')).toHaveValue('Synthetic retained navigation draft');await navigationVisible(page);noPublication(state);
});

test('edit mode still hides navigation and account dashboard retains it',async({page,context})=>{
 const cloud=createCloud(),id='00000000-0000-4000-8000-000000006001';cloud.editListings.set(id,{id,roomId:'00000000-0000-4000-8000-000000006011',propertyId:'00000000-0000-4000-8000-000000006013',privateName:'Synthetic edit',roomName:'Synthetic edit',unitType:'Studio',description:'Unchanged edit navigation',rentAmount:22000,rentCurrency:'KES',rentPeriod:'month',deposit:22000,availableFrom:'2026-10-15',maxOccupants:1,unitDetails:{},locality:'Westlands',city:'Nairobi',region:'Nairobi',country:'Kenya',marketCode:'KE',address:'Synthetic address',propertyType:'Apartment',publicLatitude:-1.26,publicLongitude:36.8,media:[]});
 const state=await boot(page,context,{signedIn:true,route:'#edit/'+id,cloud});await expect(page.locator('#listingHost')).toHaveAttribute('data-mode','edit');await expect(page.locator('.topbar')).toBeHidden();await expect(page.locator('.mobile-nav')).toBeHidden();
 await page.goto('/#list');await expect(page.locator('#listingHost')).toHaveAttribute('data-mode','dashboard');await navigationVisible(page);noPublication(state);
});
