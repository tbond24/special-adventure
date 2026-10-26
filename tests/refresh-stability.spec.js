const {test,expect}=require('@playwright/test');
const {install,owner}=require('../qa/account-drafts/synthetic-cloud.cjs');
const listing={id:'60000000-0000-4000-8000-000000000006',rentAmount:25000,rentCurrency:'KES',rentPeriod:'month',deposit:25000,availableFrom:'2026-10-12',minimumStayWeeks:4,
 room:{name:'Synthetic refresh test room',roomType:'Room',description:'Synthetic description',maxOccupants:1,media:[{url:'/assets/vacancy-logo.png'},{url:'/assets/vacancy-logo.png'}]},
 property:{id:'40000000-0000-4000-8000-000000000004',suburb:'Westlands',city:'Nairobi',country:'Kenya',propertyType:'House',publicLatitude:-1.26,publicLongitude:36.8,parkingSpaces:0},
 owner:{id:'70000000-0000-4000-8000-000000000007',displayName:'Synthetic lister'}};
const rates={USD:1,KES:130,AUD:1.5,GBP:0.75};
const documentLoads=new WeakMap();
async function boot(page,context,{lateRates=false}={}){
 documentLoads.set(page,0);page.on('domcontentloaded',()=>documentLoads.set(page,documentLoads.get(page)+1));
 await install(context);
 await context.addInitScript(({lateRates})=>{
  localStorage.setItem('vacancy-market-v1','KE');localStorage.setItem('vacancy-currency-v1',lateRates?'USD':'KES');
  localStorage.setItem('vacancy-currency-mode-v1','manual');localStorage.setItem('vacancy-theme-v1','light');
  window.__refreshEvidence=[];window.__refreshErrors=[];window.__browserPerformance=[];
  for(const type of ['layout-shift','longtask'])if(PerformanceObserver.supportedEntryTypes.includes(type)){
   new PerformanceObserver(list=>{for(const entry of list.getEntries())if(__browserPerformance.length<200)__browserPerformance.push({type:entry.entryType,at:Math.round(entry.startTime),duration:Math.round(entry.duration),value:entry.value,recentInput:entry.hadRecentInput})}).observe({type,buffered:true});
  }
  addEventListener('error',e=>__refreshErrors.push(e.message));addEventListener('unhandledrejection',e=>__refreshErrors.push(String(e.reason)));
 },{lateRates});
 let releaseRates,requested=false;
 const rateGate=new Promise(resolve=>releaseRates=resolve);
 await page.route('**/api/exchange-rates',async route=>{requested=true;const status=lateRates?await rateGate:200;await route.fulfill({status,json:status===200?{rates}:{error:'Synthetic rate interruption'}})});
 await page.goto('/#auth');await expect(page.locator('#authUnified')).toBeVisible();await page.waitForFunction(()=>!booting);
 await page.evaluate(({listing,user})=>{
  vacancies=[listing,{...structuredClone(listing),id:'60000000-0000-4000-8000-000000000009',room:{...listing.room,name:'Synthetic second room'}}];
  window.__threads=[{id:'synthetic-conversation',created_at:'2026-10-21T01:00:00Z',vacancies:{id:listing.id,rooms:{name:listing.room.name,properties:{suburb:'Westlands',owner_id:listing.owner.id}}},
   conversation_members:[{user_id:user.id,last_read_at:null}],messages:[{id:'message-one',sender_id:listing.owner.id,body:'Synthetic opening message',created_at:'2026-10-21T01:00:00Z'}]}];
  VACANCY_BACKEND.conversations=async()=>structuredClone(__threads);
  VACANCY_BACKEND.conversationPeer=async()=>({display_name:'Synthetic peer'});VACANCY_BACKEND.markConversationRead=async()=>{};
  VACANCY_BACKEND.activeVacancies=async()=>structuredClone(vacancies);
  VACANCY_BACKEND.profile=async()=>({display_name:'Synthetic member'});VACANCY_BACKEND.blockedUsers=async()=>[];VACANCY_BACKEND.adminMembership=async()=>false;
  const record=(kind,extra={})=>{if(__refreshEvidence.length<500)__refreshEvidence.push({at:Math.round(performance.now()),route:parseHash().name,kind,scroll:Math.round(scrollY),...extra})};
  for(const kind of ['focus','blur','online','offline','hashchange','popstate'])addEventListener(kind,()=>record(kind));
  document.addEventListener('visibilitychange',()=>record('visibility',{hidden:document.hidden}));
  for(const name of ['render','layout','applySearch','pollMessagesOnce','refreshFindInventory']){
   const original=window[name];window[name]=function(...args){record(name,{caller:new Error().stack.split('\n').slice(2,5).join('\n')});return original.apply(this,args)};
  }
  new MutationObserver(records=>{const removed=records.flatMap(r=>[...r.removedNodes]).filter(n=>n.nodeType===1);if(removed.length)record('nodes-replaced',{count:removed.length,composerRemoved:removed.some(n=>n.id==='chatForm'||n.querySelector?.('#chatForm'))})}).observe(document.querySelector('#app'),{subtree:true,childList:true});
 },{listing,user:owner});
 return {releaseRates,statusRequested:()=>requested};
}
async function open(page,name,id){await page.evaluate(({name,id})=>nav(name,id),{name,id});await expect(page).toHaveURL(new RegExp('#'+name+(id?'/'+id:'')+'$'));}
async function thread(page){await page.evaluate(user=>{currentUser=user},owner);await open(page,'messages','synthetic-conversation');await expect(page.locator('#chatForm')).toBeVisible();}
async function settled(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
test.afterEach(async({page},info)=>{
 if(page.isClosed())return;
 expect(documentLoads.get(page),'Unexpected full-document reload').toBe(1);
 await info.attach('refresh-timeline',{body:JSON.stringify(await page.evaluate(()=>({events:window.__refreshEvidence,performance:window.__browserPerformance,errors:window.__refreshErrors,width:innerWidth,scroll:scrollY,route:location.hash})),null,2),contentType:'application/json'});
 expect(await page.evaluate(()=>window.__refreshErrors||[]),'Uncaught browser errors').toEqual([]);
});
for(const status of [200,503])test(`late currency restoration ${status} preserves the sign-in draft`,async({page,context})=>{
 const fx=await boot(page,context,{lateRates:true});expect(fx.statusRequested()).toBe(true);
 const email=page.locator('#authUnified [name=email]');await email.fill('synthetic@example.test');await email.focus();
 await page.evaluate(()=>{window.__originalForm=document.querySelector('#authUnified')});fx.releaseRates(status);
 await expect.poll(()=>page.evaluate(()=>fxRates!==null||displayCurrency==='KES')).toBe(true);await settled(page);
 await expect(email).toHaveValue('synthetic@example.test');expect(await page.evaluate(()=>__originalForm===document.querySelector('#authUnified'))).toBe(true);
});
test('late currency restoration preserves an enquiry draft after navigation',async({page,context})=>{
 const fx=await boot(page,context,{lateRates:true});await open(page,'enquire',listing.id);
 const message=page.locator('#enquiryMessage');await message.fill('Keep my synthetic viewing question');
 await page.evaluate(()=>{window.__originalForm=document.querySelector('#enquiryForm')});fx.releaseRates(200);
 await page.waitForFunction(()=>fxRates!==null);await settled(page);await expect(message).toHaveValue('Keep my synthetic viewing question');
 expect(await page.evaluate(()=>__originalForm===document.querySelector('#enquiryForm'))).toBe(true);
});
test('delayed currency selection cannot redraw the page visited meanwhile',async({page,context})=>{
 await boot(page,context);let release;const gate=new Promise(resolve=>release=resolve);
 await page.route('**/api/exchange-rates',async route=>{await gate;await route.fulfill({json:{rates}})});
 await page.evaluate(()=>{window.__currencyChange=setDisplayCurrency('USD')});await open(page,'enquire',listing.id);
 await page.locator('#enquiryMessage').fill('Preserve this synthetic draft');release();await page.evaluate(()=>__currencyChange);await settled(page);
 await expect(page.locator('#enquiryMessage')).toHaveValue('Preserve this synthetic draft');
});

test('message polling preserves typing done during a delayed peer read',async({page,context})=>{
 await boot(page,context);await thread(page);await page.waitForFunction(()=>!vacancyMessagesPollBusy);
 const input=page.locator('#chatForm [name=body]');await input.fill('Starting draft');
 await page.evaluate(()=>{
  window.__originalComposer=document.querySelector('#chatForm');
  __threads[0].messages.push({id:'message-two',sender_id:__threads[0].messages[0].sender_id,body:'Synthetic new reply',created_at:'2026-10-21T01:01:00Z'});
  VACANCY_BACKEND.conversationPeer=()=>new Promise(resolve=>{window.__finishPeer=()=>resolve({display_name:'Synthetic peer'})});
  window.__poll=pollMessagesOnce(false);
 });
 await page.waitForFunction(()=>window.__finishPeer);await input.fill('Typed while the reply was loading');
 await input.evaluate(el=>{el.focus();el.setSelectionRange(6,11)});
 await page.evaluate(()=>__finishPeer());await page.evaluate(()=>__poll);await settled(page);
 await expect(input).toHaveValue('Typed while the reply was loading');
 expect(await page.evaluate(()=>__originalComposer===document.querySelector('#chatForm')),'Composer was replaced').toBe(true);
 expect(await input.evaluate(el=>({start:el.selectionStart,end:el.selectionEnd,focused:document.activeElement===el}))).toEqual({start:6,end:11,focused:true});
 await expect(page.locator('.chat-log')).toContainText('Synthetic new reply');
});
test('another conversation changing cannot replace the open composer',async({page,context})=>{
 await boot(page,context);await thread(page);await page.waitForFunction(()=>!vacancyMessagesPollBusy);
 await page.locator('#chatForm [name=body]').fill('Keep this conversation draft');
 await page.evaluate(async()=>{window.__originalComposer=document.querySelector('#chatForm');__threads.push({...structuredClone(__threads[0]),id:'another-conversation'});await pollMessagesOnce(false)});
 expect(await page.evaluate(()=>__originalComposer===document.querySelector('#chatForm')),'Unrelated conversation replaced the open composer').toBe(true);
});
test('a photo selected during a delayed poll survives the response',async({page,context})=>{
 await boot(page,context);await thread(page);await page.waitForFunction(()=>!vacancyMessagesPollBusy);
 await page.evaluate(()=>{
  __threads[0].messages.push({id:'message-two',sender_id:__threads[0].messages[0].sender_id,body:'Synthetic reply',created_at:'2026-10-21T01:01:00Z'});
  VACANCY_BACKEND.conversationPeer=()=>new Promise(resolve=>{window.__finishPeer=()=>resolve({display_name:'Synthetic peer'})});window.__poll=pollMessagesOnce(false);
 });
 await page.waitForFunction(()=>window.__finishPeer);
 await page.locator('#chatForm [name=photo]').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64')});
 await page.evaluate(()=>__finishPeer());await page.evaluate(()=>__poll);
 expect(await page.locator('#chatForm [name=photo]').evaluate(el=>el.files.length)).toBe(1);await expect(page.locator('.chat-photo-draft')).toBeVisible();
});
test('background replies cannot replace an in-flight Send or enable a duplicate',async({page,context})=>{
 await boot(page,context);await thread(page);await page.waitForFunction(()=>!vacancyMessagesPollBusy);
 await page.evaluate(()=>{window.__sendCount=0;VACANCY_BACKEND.sendMessage=()=>{__sendCount++;return new Promise(resolve=>{window.__finishSend=resolve})}});
 await page.locator('#chatForm [name=body]').fill('Synthetic in-flight message');await page.locator('#chatForm .primary').click();await page.waitForFunction(()=>window.__finishSend);
 await page.evaluate(async()=>{window.__originalComposer=document.querySelector('#chatForm');__threads[0].messages.push({id:'message-two',sender_id:__threads[0].messages[0].sender_id,body:'Synthetic reply',created_at:'2026-10-21T01:01:00Z'});await pollMessagesOnce(false)});
 expect(await page.evaluate(()=>__originalComposer===document.querySelector('#chatForm'))).toBe(true);await expect(page.locator('#chatForm .primary')).toBeDisabled();
 await page.locator('#chatForm').evaluate(form=>form.requestSubmit());expect(await page.evaluate(()=>__sendCount)).toBe(1);
 await page.evaluate(()=>__finishSend());
});
test('Find background updates preserve unchanged cards and their gallery position',async({page,context})=>{
 await boot(page,context);await open(page,'home');await expect(page.locator('#cards [data-open-card]')).toHaveCount(2);await settled(page);
 const card=page.locator(`#cards [data-open-card="${listing.id}"]`),gallery=card.locator('[data-gallery]');
 await gallery.evaluate(el=>el.scrollTo({left:el.clientWidth,behavior:'instant'}));await expect.poll(()=>gallery.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
 const offset=await gallery.evaluate(el=>el.scrollLeft);
 await card.getByRole('button',{name:'Previous listing image',exact:true}).focus();
 await page.evaluate(id=>{window.__viewedCard=document.querySelector(`[data-open-card="${id}"]`);VACANCY_BACKEND.activeVacancies=async()=>vacancies.map(row=>row.id===id?structuredClone(row):{...structuredClone(row),rentAmount:28000});vacancyInventoryLastRefresh=0;},listing.id);
 await page.evaluate(()=>refreshFindInventory());await settled(page);
 expect(await page.evaluate(id=>__viewedCard===document.querySelector(`[data-open-card="${id}"]`),listing.id),'An unchanged card was replaced').toBe(true);
 expect(await gallery.evaluate(el=>el.scrollLeft)).toBeCloseTo(offset,0);
 await expect(card.getByRole('button',{name:'Previous listing image',exact:true})).toBeFocused();
 await expect(page.locator('#cards')).toContainText('28,000');
});

test('late rates update Find prices without clearing search or filters',async({page,context})=>{
 const fx=await boot(page,context,{lateRates:true});await open(page,'home');await expect(page.locator('#cards [data-open-card]')).toHaveCount(2);
 await page.locator('#searchBtn').click();await page.locator('#q').fill('Westlands');
 await page.evaluate(()=>{document.querySelector('#maxRent').value='1000';window.__searchField=document.querySelector('#q')});
 fx.releaseRates(200);await page.waitForFunction(()=>fxRates?.USD);await settled(page);
 await expect(page.locator('#q')).toHaveValue('Westlands');await expect(page.locator('#maxRent')).toHaveValue('1000');
 expect(await page.evaluate(()=>__searchField===document.querySelector('#q'))).toBe(true);await expect(page.locator('#cards')).toContainText('192.31');
});
for(const screen of ['account','create'])test(`late rates preserve active ${screen} fields`,async({page,context})=>{
 const fx=await boot(page,context,{lateRates:true});let field;
 if(screen==='account'){
  await page.evaluate(user=>{currentUser=user},owner);await open(page,'account','profile');field=page.locator('#displayName');await expect(field).toBeVisible();
 }else{
  await open(page,'list','new');await page.locator('[data-listing-type=Residential]').click();await page.locator('[data-preset=Studio]').click();await page.getByRole('button',{name:'New property',exact:true}).click();field=page.locator('#listingForm [name=address]');
 }
 await field.fill('Synthetic retained field');fx.releaseRates(200);await page.waitForFunction(()=>fxRates?.USD);await settled(page);await expect(field).toHaveValue('Synthetic retained field');
});
test('Find keeps a changed listing gallery while showing its fresh price',async({page,context})=>{
 await boot(page,context);await open(page,'home');await expect(page.locator('#cards [data-open-card]')).toHaveCount(2);await settled(page);
 const card=page.locator(`#cards [data-open-card="${listing.id}"]`),gallery=card.locator('[data-gallery]');
 await gallery.evaluate(el=>el.scrollTo({left:el.clientWidth,behavior:'instant'}));await expect.poll(()=>gallery.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
 await page.evaluate(id=>{VACANCY_BACKEND.activeVacancies=async()=>vacancies.map(row=>row.id===id?{...structuredClone(row),rentAmount:31000}:structuredClone(row));vacancyInventoryLastRefresh=0;},listing.id);
 await page.evaluate(()=>refreshFindInventory());await settled(page);
 await expect(card).toContainText('31,000');expect(await gallery.evaluate(el=>Math.round(el.scrollLeft/el.clientWidth))).toBe(1);
 await expect(card.locator('[data-gallery-current]')).toHaveText('2');
});
test('a failed or obsolete Find refresh cannot replace the current form',async({page,context})=>{
 await boot(page,context);await open(page,'home');await expect(page.locator('#cards [data-open-card]')).toHaveCount(2);
 await page.evaluate(async()=>{window.__card=document.querySelector('#cards [data-open-card]');VACANCY_BACKEND.activeVacancies=async()=>{throw Error('Synthetic inventory interruption')};vacancyInventoryLastRefresh=0;await refreshFindInventory()});
 expect(await page.evaluate(()=>__card===document.querySelector('#cards [data-open-card]'))).toBe(true);
 await page.evaluate(()=>{VACANCY_BACKEND.activeVacancies=()=>new Promise(resolve=>{window.__finishInventory=()=>resolve(structuredClone(vacancies))});vacancyInventoryLastRefresh=0;window.__inventory=refreshFindInventory()});
 await page.waitForFunction(()=>window.__finishInventory);await open(page,'enquire',listing.id);await page.locator('#enquiryMessage').fill('Keep the new page draft');
 await page.evaluate(()=>__finishInventory());await page.evaluate(()=>__inventory);await expect(page.locator('#enquiryMessage')).toHaveValue('Keep the new page draft');
});
test('new replies preserve older-message scroll position and shared-photo controls',async({page,context})=>{
 await boot(page,context);
 await page.evaluate(()=>{
  __threads[0].messages=Array.from({length:40},(_,i)=>({id:'synthetic-message-'+i,sender_id:__threads[0].messages[0].sender_id,body:'Synthetic historical message '+i,created_at:new Date(Date.UTC(2026,9,21,1,i)).toISOString(),...(i===2?{media_path:'synthetic-photo'}:{})}));
  VACANCY_BACKEND.conversationPhotoUrl=async()=>'/assets/vacancy-logo.png';
 });await thread(page);await page.waitForFunction(()=>!vacancyMessagesPollBusy);
 const photo=page.getByRole('button',{name:'Open shared photo',exact:true});await expect(photo.locator('img')).toBeVisible();await photo.click();await expect(page.locator('.chat-photo-viewer')).toBeVisible();await page.getByRole('button',{name:'Close photo',exact:true}).click();
 await page.evaluate(()=>{window.scrollTo({top:300,behavior:'instant'});window.__oldPhoto=document.querySelector('[data-chat-photo]')});await settled(page);const top=await page.evaluate(()=>scrollY);
 await page.evaluate(async()=>{__threads[0].messages.push({id:'synthetic-new',sender_id:__threads[0].messages[0].sender_id,body:'Synthetic fresh reply',created_at:'2026-10-21T03:00:00Z'});await pollMessagesOnce(false)});await settled(page);
 expect(await page.evaluate(()=>scrollY)).toBeCloseTo(top,0);expect(await page.evaluate(()=>__oldPhoto===document.querySelector('[data-chat-photo]'))).toBe(true);
 await photo.scrollIntoViewIfNeeded();await photo.click();await expect(page.locator('.chat-photo-viewer')).toHaveCount(1);await page.getByRole('button',{name:'Close photo',exact:true}).click();
});
test('real polling timers and mixed-page interactions retain drafts @soak',async({page,context},info)=>{
 await boot(page,context);await thread(page);await page.waitForFunction(()=>!vacancyMessagesPollBusy);
 await page.evaluate(()=>{window.__originalComposer=document.querySelector('#chatForm');window.__timerReads=0;VACANCY_BACKEND.conversations=async()=>{__timerReads++;await new Promise(resolve=>setTimeout(resolve,100));return structuredClone(__threads)}});
 const input=page.locator('#chatForm [name=body]');await input.fill('Synthetic ongoing draft');
 // Real 4-second polling timers remain untouched; focus events are simulated explicitly.
 for(let cycle=0;cycle<5;cycle++){
  await page.waitForTimeout(4200);
  if(cycle===1)await page.evaluate(()=>__threads[0].messages.push({id:'soak-reply',sender_id:__threads[0].messages[0].sender_id,body:'Synthetic timed reply',created_at:'2026-10-21T03:00:00Z'}));
  await page.evaluate(()=>{dispatchEvent(new Event('blur'));dispatchEvent(new Event('focus'));dispatchEvent(new Event('focus'))});
  await expect(input).toHaveValue('Synthetic ongoing draft');
  expect(await page.evaluate(()=>__originalComposer===document.querySelector('#chatForm'))).toBe(true);
 }
 await expect(page.locator('.chat-log')).toContainText('Synthetic timed reply');expect(await page.evaluate(()=>__timerReads)).toBeGreaterThanOrEqual(5);expect(await page.evaluate(()=>__timerReads)).toBeLessThanOrEqual(12);
 await info.attach('stable-conversation',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
 await open(page,'account','profile');const profile=page.locator('#displayName');await expect(profile).toBeVisible();await profile.fill('Synthetic unsaved profile');
 for(let i=0;i<3;i++){await page.evaluate(()=>{dispatchEvent(new Event('focus'));setVacancyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark')});await page.waitForTimeout(1500);await expect(profile).toHaveValue('Synthetic unsaved profile')}
 await open(page,'enquire',listing.id);await page.locator('#enquiryMessage').fill('Synthetic unsent enquiry');
 const alternate=await context.newPage();await alternate.goto('about:blank');await alternate.bringToFront();await page.waitForTimeout(2200);await page.bringToFront();await alternate.close();await expect(page.locator('#enquiryMessage')).toHaveValue('Synthetic unsent enquiry');
 await page.evaluate(()=>{window.__inventoryReads=0;VACANCY_BACKEND.activeVacancies=async()=>{__inventoryReads++;return structuredClone(vacancies)}});
 await open(page,'home');await expect(page.locator('#cards [data-open-card]')).toHaveCount(2);
 // Exercise the actual 30-second inventory gate without advancing or replacing the clock.
 if(!await page.evaluate(()=>__inventoryReads)){
  const remaining=await page.evaluate(()=>Math.max(0,30100-(Date.now()-vacancyInventoryLastRefresh)));
  await page.waitForTimeout(remaining);await page.evaluate(()=>dispatchEvent(new Event('focus')));
 }
 await expect.poll(()=>page.evaluate(()=>__inventoryReads)).toBeGreaterThanOrEqual(1);
 await page.evaluate(async id=>{currentUser=null;await VACANCY_FAVOURITES.toggleGuest(id)},listing.id);await open(page,'saved');await expect(page.locator('.saved-heading')).toBeVisible();
 await open(page,'detail',listing.id);await expect(page.locator('.quiet-gallery')).toBeVisible();await open(page,'list','new');await page.locator('[data-listing-type=Residential]').click();await page.locator('[data-preset=Studio]').click();await page.getByRole('button',{name:'New property',exact:true}).click();
 const address=page.locator('#listingForm [name=address]');await address.fill('Synthetic retained create address');await page.waitForTimeout(4200);await expect(address).toHaveValue('Synthetic retained create address');
 expect(await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth)).toBeLessThanOrEqual(1);
});

 test('reused Find cards keep gallery and keyboard actions after repeated updates',async({page,context})=>{
  await boot(page,context);await open(page,'home');await expect(page.locator('#cards [data-open-card]')).toHaveCount(2);
  for(let i=0;i<4;i++)await page.evaluate(async({id,i})=>{VACANCY_BACKEND.activeVacancies=async()=>vacancies.map(row=>row.id===id?structuredClone(row):{...structuredClone(row),rentAmount:28000+i});vacancyInventoryLastRefresh=0;await refreshFindInventory()},{id:listing.id,i});
  const card=page.locator(`#cards [data-open-card="${listing.id}"]`);await card.getByRole('button',{name:'Next listing image',exact:true}).click();await expect(card.locator('[data-gallery-current]')).toHaveText('2');
  const before=await page.evaluate(()=>history.length);await card.press('Enter');await expect(page.locator('.quiet-gallery')).toBeVisible();expect(await page.evaluate(()=>history.length)).toBe(before+1);
 });

test('4x CPU slowdown and delayed replies preserve active typing @stress',async({page,context},info)=>{
 await boot(page,context);const session=await context.newCDPSession(page);await session.send('Emulation.setCPUThrottlingRate',{rate:4});
 try{
  await thread(page);await page.waitForFunction(()=>!vacancyMessagesPollBusy);
  await page.evaluate(()=>{window.__originalComposer=document.querySelector('#chatForm');VACANCY_BACKEND.conversations=async()=>{await new Promise(resolve=>setTimeout(resolve,1200));return structuredClone(__threads)}});
  const input=page.locator('#chatForm [name=body]');
  for(let step=0;step<3;step++){
   await page.waitForFunction(()=>!vacancyMessagesPollBusy);
   await page.evaluate(step=>{__threads[0].messages.push({id:'cpu-reply-'+step,sender_id:__threads[0].messages[0].sender_id,body:'Synthetic slow reply '+step,created_at:new Date(Date.UTC(2026,9,21,4,step)).toISOString()});window.__slowPoll=pollMessagesOnce(false)},step);
   await input.fill('Synthetic typing during slow reply '+step);await page.evaluate(()=>__slowPoll);
   await expect(input).toHaveValue('Synthetic typing during slow reply '+step);expect(await page.evaluate(()=>__originalComposer===document.querySelector('#chatForm'))).toBe(true);
  }
  await open(page,'account','profile');await expect(page.locator('#displayName')).toBeVisible();await page.locator('#displayName').fill('Synthetic slow profile edit');await page.evaluate(()=>dispatchEvent(new Event('focus')));await expect(page.locator('#displayName')).toHaveValue('Synthetic slow profile edit');
  await info.attach('slow-cpu-profile',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
 }finally{await session.send('Emulation.setCPUThrottlingRate',{rate:1});await session.detach()}
});

test('polling updates edited messages and listing labels without replacing the draft',async({page,context})=>{
 await boot(page,context);await thread(page);await page.waitForFunction(()=>!vacancyMessagesPollBusy);
 await page.locator('#chatForm [name=body]').fill('Keep synthetic draft');
 await page.evaluate(async()=>{__threads[0].messages[0].body='Synthetic corrected message';__threads[0].vacancies.rooms.name='Synthetic updated listing label';await pollMessagesOnce(false)});
 await expect(page.locator('.chat-log')).toContainText('Synthetic corrected message');await expect(page.locator('.chat-listing strong')).toHaveText('Synthetic updated listing label');await expect(page.locator('#chatForm [name=body]')).toHaveValue('Keep synthetic draft');
});
