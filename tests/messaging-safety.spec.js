// Reuses the reviewed refresh fixture/scenarios from 2ee9bc7. Synthetic only.
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
 await context.addInitScript(()=>localStorage.setItem('vacancy-analytics-disabled','true'));await install(context);
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
test('polling updates edited messages and listing labels without replacing the draft',async({page,context})=>{
 await boot(page,context);await thread(page);await page.waitForFunction(()=>!vacancyMessagesPollBusy);
 await page.locator('#chatForm [name=body]').fill('Keep synthetic draft');
 await page.evaluate(async()=>{__threads[0].messages[0].body='Synthetic corrected message';__threads[0].vacancies.rooms.name='Synthetic updated listing label';await pollMessagesOnce(false)});
 await expect(page.locator('.chat-log')).toContainText('Synthetic corrected message');await expect(page.locator('.chat-listing strong')).toHaveText('Synthetic updated listing label');await expect(page.locator('#chatForm [name=body]')).toHaveValue('Keep synthetic draft');
});
test('draft text and selected photo survive navigation back; detached forms cannot send',async({page,context})=>{
 await boot(page,context);await thread(page);await page.locator('#chatForm [name=body]').fill('Retained unsent draft');await page.locator('#chatForm [name=photo]').setInputFiles({name:'draft.png',mimeType:'image/png',buffer:Buffer.from('synthetic')});await page.evaluate(()=>{window.__detachedComposer=document.querySelector('#chatForm');window.__sends=0;VACANCY_BACKEND.sendMessage=VACANCY_BACKEND.sendConversationPhoto=async()=>__sends++});await open(page,'privacy');await page.evaluate(()=>__detachedComposer.dispatchEvent(new Event('submit',{cancelable:true})));expect(await page.evaluate(()=>__sends)).toBe(0);await thread(page);await expect(page.locator('#chatForm [name=body]')).toHaveValue('Retained unsent draft');expect(await page.locator('#chatForm [name=photo]').evaluate(n=>n.files.length)).toBe(1);await expect(page.locator('.chat-photo-draft')).toBeVisible();
});
test('failed photo send retains its file and draft for an explicit retry',async({page,context})=>{
 await boot(page,context);await thread(page);await page.evaluate(()=>{window.__attempts=0;VACANCY_BACKEND.sendConversationPhoto=async()=>{__attempts++;throw Error('Synthetic photo failure')}});await page.locator('#chatForm [name=body]').fill('Retained photo caption');await page.locator('#chatForm [name=photo]').setInputFiles({name:'draft.png',mimeType:'image/png',buffer:Buffer.from('synthetic')});await page.locator('#chatForm .primary').click();await expect(page.locator('#toast')).toContainText('Synthetic photo failure');await expect(page.locator('#chatForm [name=body]')).toHaveValue('Retained photo caption');expect(await page.locator('#chatForm [name=photo]').evaluate(n=>n.files.length)).toBe(1);await expect(page.locator('#chatForm .primary')).toBeEnabled();expect(await page.evaluate(()=>__attempts)).toBe(1);
});
test('typing a next draft during Send is preserved when the first send completes',async({page,context})=>{
 await boot(page,context);await thread(page);await page.evaluate(()=>VACANCY_BACKEND.sendMessage=()=>new Promise(resolve=>window.__finishSend=resolve));await page.locator('#chatForm [name=body]').fill('First message');await page.locator('#chatForm .primary').click();await page.waitForFunction(()=>window.__finishSend);await page.locator('#chatForm [name=body]').fill('Next unsent message');await page.evaluate(()=>__finishSend());await expect(page.locator('#chatForm .primary')).toBeEnabled();await expect(page.locator('#chatForm [name=body]')).toHaveValue('Next unsent message');
});
test('hidden conversations stop polling and resume on visibility',async({page,context})=>{
 await page.clock.install();await boot(page,context);await thread(page);await page.waitForFunction(()=>!vacancyMessagesPollBusy);await page.evaluate(()=>{window.__hiddenReads=0;VACANCY_BACKEND.conversations=async()=>{__hiddenReads++;return structuredClone(__threads)};Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});await page.clock.runFor(12100);expect(await page.evaluate(()=>__hiddenReads)).toBe(0);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))});await expect.poll(()=>page.evaluate(()=>__hiddenReads)).toBe(1);
});
test('returning to a thread while its cancelled request settles cannot submit twice',async({page,context})=>{
 await boot(page,context);await thread(page);await page.evaluate(()=>{window.__sends=0;VACANCY_BACKEND.sendMessage=()=>{__sends++;return new Promise(resolve=>window.__finishPending=resolve)}});await page.locator('#chatForm [name=body]').fill('One pending message');await page.locator('#chatForm .primary').click();await page.waitForFunction(()=>window.__finishPending);await open(page,'privacy');await thread(page);await expect(page.locator('#chatForm .primary')).toBeDisabled();await page.locator('#chatForm').evaluate(f=>f.requestSubmit());expect(await page.evaluate(()=>__sends)).toBe(1);await page.evaluate(()=>__finishPending());await expect(page.locator('#chatForm .primary')).toBeEnabled();
});
