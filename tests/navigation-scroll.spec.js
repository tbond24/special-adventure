const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const {install,owner}=require('../qa/account-drafts/synthetic-cloud.cjs');
const listing={id:'60000000-0000-4000-8000-000000000006',rentAmount:25000,rentCurrency:'KES',rentPeriod:'month',deposit:25000,availableFrom:'2026-10-12',minimumStayWeeks:4,
 room:{name:'Synthetic garden studio',roomType:'Studio',description:'A synthetic listing used only for navigation regression coverage. '.repeat(25),maxOccupants:1,media:[]},
 property:{id:'40000000-0000-4000-8000-000000000004',suburb:'Westlands',city:'Nairobi',country:'Kenya',propertyType:'House',publicLatitude:-1.26,publicLongitude:36.8,parkingSpaces:0},owner:{id:'synthetic-lister',displayName:'Synthetic lister'}};
async function start(page,context,route='#terms'){
 const state=await install(context,undefined,{signedIn:owner});
 await context.addInitScript(id=>localStorage.setItem('vacancy-list-entry-account-v1:'+id,'1'),owner.id);
 await page.goto('/'+route);await page.waitForFunction(()=>!booting);
 // History restoration needs scroll room independently of viewport/text length.
 await page.addStyleTag({content:'.information-page{min-height:calc(100dvh + 900px)}'});
 await expect(page.locator('.information-page')).toBeVisible();await top(page);
 return state;
}
async function top(page){await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);await frames(page);}
async function frames(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function scroll(page,y){await page.evaluate(value=>window.scrollTo(0,value),y);await frames(page);expect(await page.evaluate(()=>scrollY)).toBe(y);}
async function navigate(page,name){await page.evaluate(value=>nav(value),name);await expect(page).toHaveURL(new RegExp('#'+name+'$'));}

test('new async pages start at top on desktop and mobile',async({page,context})=>{
 const state=await start(page,context);
 await scroll(page,600);await navigate(page,'account');await expect(page.locator('.account-identity')).toBeVisible();await top(page);
 await navigate(page,'terms');await expect(page.locator('.information-page')).toBeVisible();await top(page);await scroll(page,600);
 await navigate(page,'list');await expect(page.getByRole('heading',{name:'Dashboard',exact:true})).toBeVisible();await top(page);
 await navigate(page,'terms');await expect(page.locator('.information-page')).toBeVisible();await top(page);await scroll(page,600);
 await navigate(page,'messages');await expect(page.getByText('No conversations yet.')).toBeVisible();await top(page);
 expect(state.cloud.publicWrites.filter(request=>request.path!=='/rest/v1/rpc/admin_overview')).toEqual([]);expect(state.authRequests).toEqual([]);
});

test('Back and Forward restore distinct history entries after delayed async layouts',async({page,context})=>{
 await start(page,context);
 // Keep this history contract independent of the intentionally compact You page.
 await page.evaluate(()=>{const original=renderAccount;renderAccount=async function(...args){const result=await original.apply(this,args);const app=document.querySelector('#app');if(app?.querySelector('.account-identity')){const spacer=document.createElement('div');spacer.dataset.scrollHistorySpacer='';spacer.style.height='1200px';spacer.setAttribute('aria-hidden','true');app.append(spacer)}return result}});
 await scroll(page,600);
 await navigate(page,'account');await expect(page.locator('.account-identity')).toBeVisible();await top(page);await scroll(page,300);
 await page.evaluate(()=>{const original=VACANCY_BACKEND.profile;VACANCY_BACKEND.profile=async()=>{await new Promise(r=>setTimeout(r,160));return original()}});
 await navigate(page,'terms');await expect(page.locator('.information-page')).toBeVisible();await top(page);await scroll(page,400);
 await page.goBack();await expect(page.locator('.account-identity')).toBeVisible();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(300);
 await page.goBack();await expect(page.locator('.information-page')).toBeVisible();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(600);
 await page.goForward();await expect(page.locator('.account-identity')).toBeVisible();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(300);
 await page.goForward();await expect(page.locator('.information-page')).toBeVisible();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(400);
 // A new visit to the same URL is a new entry, not the old Terms position.
 await navigate(page,'account');await expect(page.locator('.account-identity')).toBeVisible();await top(page);
 await navigate(page,'terms');await expect(page.locator('.information-page')).toBeVisible();await top(page);
});

for(const reject of [false,true])test(`obsolete delayed Inbox ${reject?'failure':'completion'} cannot scroll a newer route`,async({page,context})=>{
 await start(page,context);
 await page.evaluate(()=>{VACANCY_BACKEND.conversations=()=>new Promise((resolve,reject)=>{window.finishInbox={resolve,reject}})});
 await navigate(page,'messages');await page.waitForFunction(()=>window.finishInbox);
 await navigate(page,'terms');await expect(page.locator('.information-page')).toBeVisible();await top(page);await scroll(page,400);
 await page.evaluate(fail=>fail?finishInbox.reject(new Error('Synthetic delayed read failure')):finishInbox.resolve([]),reject);
 await page.waitForTimeout(300);await expect(page).toHaveURL(/#terms$/);await expect(page.locator('.information-page')).toBeVisible();expect(await page.evaluate(()=>scrollY)).toBe(400);
});

test('a user scroll during a pending renderer is not undone on completion',async({page,context})=>{
 await start(page,context);
 await page.evaluate(()=>{const original=renderInformationPage;renderInformationPage=function(name){original(name);return new Promise(resolve=>{window.finishInformation=resolve})}});
 await navigate(page,'privacy');await expect(page.locator('.information-page h1')).toHaveText('Privacy');
 await page.mouse.wheel(0,250);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(100);
 await frames(page);const position=await page.evaluate(()=>scrollY);
 await page.evaluate(()=>finishInformation());await page.waitForTimeout(250);expect(await page.evaluate(()=>scrollY)).toBe(position);
});

test('keyboard hash links and history back preserve the expected route positions',async({page,context})=>{
 await start(page,context);await scroll(page,600);
 const navButton=page.locator((page.viewportSize().width<=820?'.mobile-nav':'.desktop-nav')+' [data-nav=account]');
 await navButton.evaluate(node=>node.focus({preventScroll:true}));await page.keyboard.press('Enter');await expect(page.locator('.account-identity')).toBeVisible();await top(page);
 await page.goBack();await expect(page.locator('.information-page')).toBeVisible();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(600);
 // The actual Find hash anchor remains keyboard-activatable.
 const link=page.locator('.information-page .back-link');await link.focus();await link.press('Enter');
 await expect(page.locator('#exploreMap')).toBeVisible();await top(page);
});

test('clean listing pushState and direct hash links start at top; in-page location anchors stay put',async({page,context})=>{
 await start(page,context);await page.evaluate(value=>{vacancies=[value];VACANCY_BACKEND.contactOptions=async()=>({in_app:true})},listing);
 await scroll(page,600);await page.evaluate(id=>openListingCard(id),listing.id);await expect(page.locator('.quiet-gallery')).toBeVisible();await top(page);
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.quiet-location').click();await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(150);
 const position=await page.evaluate(()=>scrollY);await page.waitForTimeout(300);expect(await page.evaluate(()=>scrollY)).toBe(position);
 await page.goBack();await expect(page.locator('.information-page')).toBeVisible();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(600);
 await navigate(page,'detail/'+listing.id);await expect(page.locator('.quiet-gallery')).toBeVisible();await top(page);
});

test('fresh public listing deep links open at top through the real app shell',async({page,context,baseURL})=>{
 await install(context,undefined,{signedIn:owner});
 // Resolve assets at the root as the production base href does, while keeping
 // the isolated preview's stricter base-uri denial and sanitized backend.
 const {isolatedText,policy}=await import('../scripts/dev-server.mjs');
 const html=isolatedText(fs.readFileSync(path.join(__dirname,'../app/index.html'),'utf8')).replace(/\b(src|href)="(?![a-z]+:|\/|#)([^"]+)"/gi,'$1="/$2"');
 await context.route(baseURL+'/listings/**',route=>route.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':policy},body:html}));
 await context.route('**/rest/v1/vacancies?**',route=>route.fulfill({json:[{
   id:listing.id,status:'active',rent_amount:25000,rent_currency:'KES',rent_period:'month',available_from:'2026-10-12',
   rooms:{id:'synthetic-room',name:listing.room.name,unit_type:'Studio',description:listing.room.description,media:[],
     properties:{id:listing.property.id,suburb:'Westlands',city:'Nairobi',country:'Kenya',market_code:'KE',property_type:'House',owner_id:'synthetic-lister',public_latitude:-1.26,public_longitude:36.8}},
 }]}));
 await page.goto('/listings/'+listing.id+'/synthetic-garden-studio');await page.waitForFunction(()=>!booting);await expect(page.locator('.quiet-gallery')).toBeVisible();await top(page);
});

test('form steps, validation focus, and same-page mutations do not trigger route resets',async({page,context})=>{
 const state=await install(context);await page.goto('/#list/new');await page.waitForFunction(()=>!booting);
 await page.locator('[data-listing-type=Residential]').click();await page.locator('[data-preset=Studio]').click();await page.getByRole('button',{name:'New property',exact:true}).click();
 const form=page.locator('#listingForm');await expect(form).toHaveAttribute('data-journey-step','0');await top(page);
 await form.evaluate(node=>{for(const [name,value] of Object.entries({country:'Kenya',region:'Nairobi',city:'Nairobi',locality:'Westlands',address:'Synthetic Garden Road'}))if(node.elements[name])node.elements[name].value=value;node.querySelector('#newPropertyMap')._vacancySetLocation(-1.26,36.8,false)});
 await form.locator('.journey-next').click();await expect(form).toHaveAttribute('data-journey-step','1');await top(page);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
 await form.locator('.unit-editor input[type=file]').setInputFiles([1,2,3].map(i=>({name:`scroll-${i}.png`,mimeType:'image/png',buffer:Buffer.concat([png,Buffer.from(String(i))])})));await expect(form.locator('.photo-selection-item')).toHaveCount(3);
 const input=form.locator('[data-base-name=description]');await input.focus();await input.fill('A synthetic local draft.');await scroll(page,200);
 const before=await page.evaluate(()=>scrollY);expect(before).toBeGreaterThan(0);
 await page.evaluate(()=>{toast('Synthetic status update');const node=document.createElement('span');node.textContent='Updated';document.querySelector('#toast').append(node)});
 await page.waitForTimeout(300);await expect(input).toBeFocused();expect(await page.evaluate(()=>scrollY)).toBe(before);
 await form.locator('.journey-next').click();await expect(form).toHaveAttribute('data-journey-step','1');
 await expect(form.locator('[data-base-name=rentAmount]')).toBeFocused();await expect(page.locator('#toast')).toContainText('Enter a rent amount');
 const invalid=await page.evaluate(()=>({top:document.activeElement.getBoundingClientRect().top,y:scrollY}));
expect(invalid.top).toBeGreaterThanOrEqual(0);await page.waitForTimeout(300);expect(await page.evaluate(()=>scrollY)).toBe(invalid.y);
 expect(state.cloud.publicWrites.filter(request=>request.path!=='/rest/v1/rpc/admin_overview')).toEqual([]);expect(state.authRequests).toEqual([]);
});
