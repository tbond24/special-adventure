const {test,expect}=require('@playwright/test');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:8876';
const listing={id:'11223344-1234-4567-890a-123456789abc',rentAmount:250,rentCurrency:'AUD',rentPeriod:'week',deposit:50,availableFrom:'2026-10-01',room:{id:'r1',name:'Test studio',roomType:'Studio',description:'Original description',media:[],maxOccupants:1},property:{id:'p1',suburb:'Carlton',city:'Melbourne',country:'Australia',publicLatitude:-37.8,publicLongitude:144.96,parkingSpaces:0},owner:{id:'other',displayName:'Test owner'}};
async function open(page){
  await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(APP).origin?r.continue():r.fulfill({json:[]}));
  await page.goto(APP+'/#auth');
  await page.waitForFunction(()=>!booting);
  await page.evaluate(()=>{VACANCY_BACKEND.conversations=async()=>[];VACANCY_BACKEND.markConversationRead=async()=>{};VACANCY_BACKEND.profile=async()=>({display_name:'Test member'});VACANCY_BACKEND.adminOverview=async()=>({error:'denied'});VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];VACANCY_BACKEND.ownerDashboardMetrics=async()=>({});VACANCY_BACKEND.trackEvent=()=>{};VACANCY_BACKEND.activeVacancies=async()=>vacancies});
}
async function find(page){await open(page);await page.evaluate(v=>{vacancies=[v];marketCode='AU';displayCurrency='AUD';fxRates={AUD:1,USD:0.5,KES:100};nav('home')},listing);await expect(page.locator('#exploreMap')).toBeVisible();await page.waitForFunction(()=>!document.querySelector('#app').hasAttribute('data-page-pending'));}

test('same-ID refresh changes cards and pins while preserving map, viewport and selection',async({page})=>{
  await find(page);
  const result=await page.evaluate(async()=>{
    exploreMap.setView([-37.8,144.96],13,{animate:false});applySearch();
    const map=exploreMap,node=document.querySelector('#exploreMap'),center=map.getCenter(),zoom=map.getZoom();
    const original=vacancies[0];exploreSelectedId=original.id;
    const refreshed={...original,rentAmount:375,room:{...original.room,name:'Updated studio',description:'Changed description',media:[{url:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}]},property:{...original.property,suburb:'Updated suburb',publicLatitude:-37.799}};
    VACANCY_BACKEND.activeVacancies=async()=>[refreshed];saved.add(original.id);
    vacancyInventoryLastRefresh=0;await refreshFindInventory();
    const card=document.querySelector('[data-open-card]'),sameCard=card;
    const cardText=card.textContent,markerText=[...exploreMarkers.values()].map(marker=>marker.getElement()?.textContent).join(' ');
    applySearch();
    return{sameMap:map===exploreMap,sameNode:node===document.querySelector('#exploreMap'),sameViewport:map.getZoom()===zoom&&map.getCenter().equals(center),selected:exploreSelectedId===original.id,cardText,markerText,photo:card.querySelector('img')?.src,save:card.querySelector('[data-save]')?.getAttribute('aria-pressed'),unchangedCard:sameCard===document.querySelector('[data-open-card]')};
  });
  expect(result).toMatchObject({sameMap:true,sameNode:true,sameViewport:true,selected:true,save:'true',unchangedCard:true});
  expect(result.cardText).toContain('375');expect(result.cardText).toContain('Updated suburb');expect(result.markerText).toContain('375');expect(result.photo).toMatch(/^data:image/);
});

test('max rent compares selected currency and normalized periods, with explicit unavailable FX',async({page})=>{
  await find(page);
  const results=await page.evaluate(v=>{
    const scenarios=[
      ['same above',{rentAmount:250,rentCurrency:'AUD',rentPeriod:'week'},'AUD','week','200',false],
      ['same equal',{rentAmount:200,rentCurrency:'AUD',rentPeriod:'week'},'AUD','week','200',true],
      ['foreign above',{rentAmount:125,rentCurrency:'USD',rentPeriod:'week'},'AUD','week','200',false],
      ['foreign equal',{rentAmount:100,rentCurrency:'USD',rentPeriod:'week'},'AUD','week','200',true],
      ['display differs market',{rentAmount:250,rentCurrency:'AUD',rentPeriod:'week'},'USD','week','130',true],
      ['monthly',{rentAmount:100,rentCurrency:'AUD',rentPeriod:'week'},'AUD','month','434.5',true],
      ['yearly',{rentAmount:100,rentCurrency:'AUD',rentPeriod:'week'},'AUD','year','5214',true],
      ['nightly',{rentAmount:30,rentCurrency:'AUD',rentPeriod:'night'},'AUD','week','200',false],
      ['blank',{rentAmount:100000,rentCurrency:'AUD',rentPeriod:'month'},'AUD','month','',true],
      ['zero',{rentAmount:250,rentCurrency:'AUD',rentPeriod:'week'},'AUD','week','0',false]
    ];
    const values=scenarios.map(([name,change,currency,period,max,expected])=>{vacancies=[{...v,...change}];displayCurrency=currency;document.querySelector('#rentPeriod').value=period;document.querySelector('#maxRent').value=max;applySearch();return{name,expected,visible:Boolean(document.querySelector('[data-open-card]'))}});
    vacancies=[{...v,rentAmount:100,rentCurrency:'USD'}];displayCurrency='AUD';document.querySelector('#rentPeriod').value='week';document.querySelector('#maxRent').value='200';fxRates=null;applySearch();const sort=document.querySelector('#listingSort');if(sort){sort.value='price-low';sort.dispatchEvent(new Event('change'))}values.push({name:'unavailable',expected:false,visible:Boolean(document.querySelector('[data-open-card]')),notice:document.querySelector('#resultCount').textContent});
    fxRates={USD:0.5,AUD:1};applySearch();values.push({name:'recovered',expected:true,visible:Boolean(document.querySelector('[data-open-card]')),notice:document.querySelector('#resultCount').textContent});return values;
  },listing);
  for(const r of results)expect(r.visible,r.name).toBe(r.expected);
  expect(results.find(r=>r.name==='unavailable').notice).toContain('exchange rates are unavailable');expect(results.find(r=>r.name==='recovered').notice).not.toContain('exchange rates are unavailable');
});

for(const destination of ['home','account','list'])test(`late initial Inbox success/error cannot overwrite ${destination}`,async({page})=>{
  await open(page);
  for(const fail of [false,true]){
    await page.evaluate(({v,fail})=>{currentUser={id:'member'};vacancies=[v];history.replaceState(null,'','#messages');route=parseHash();window.collectionCalls=0;VACANCY_BACKEND.conversations=()=>{collectionCalls++;return collectionCalls===1?new Promise((resolve,reject)=>window.finishCollection=()=>fail?reject(new Error('Obsolete failure')):resolve([])):Promise.resolve([])};window.inboxWork=renderMessages()}, {v:listing,fail});
    await expect.poll(()=>page.evaluate(()=>collectionCalls)).toBe(1);
    await page.evaluate(destination=>nav(destination),destination);
    await expect(page).toHaveURL(new RegExp('#'+destination+'$'));
    await page.waitForFunction(()=>!document.querySelector('#app').hasAttribute('data-page-pending'));
    await page.evaluate(async()=>{finishCollection();await inboxWork});
    await expect(page.locator('#app')).not.toContainText('No conversations yet');await expect(page.locator('#app')).not.toContainText('Obsolete failure');
  }
});

test('Inbox empty and failure rendering each fetches the collection only once',async({page})=>{
  await open(page);
  const result=await page.evaluate(async()=>{currentUser={id:'member'};history.replaceState(null,'','#messages');route=parseHash();let calls=0;VACANCY_BACKEND.conversations=async()=>{calls++;return[]};await renderMessages();stopMessagesPolling();const empty=document.querySelector('#app').textContent;VACANCY_BACKEND.conversations=async()=>{calls++;throw new Error('Inbox unavailable')};await renderMessages();stopMessagesPolling();return{calls,empty,error:document.querySelector('#app').textContent}});
  expect(result.calls).toBe(2);expect(result.empty).toContain('No conversations yet');expect(result.error).toContain('Inbox unavailable');
});

test('same-route return invalidates a delayed collection and a replaced session',async({page})=>{
  await open(page);
  const result=await page.evaluate(async()=>{currentUser={id:'member'};history.replaceState(null,'','#messages');route=parseHash();let release;VACANCY_BACKEND.conversations=()=>new Promise(resolve=>release=resolve);const work=renderMessages();await Promise.resolve();history.replaceState(null,'','#account');invalidateMessagesRequest();history.replaceState(null,'','#messages');invalidateMessagesRequest();document.querySelector('#app').innerHTML='<p>Newer Inbox</p>';release([]);await work;const returned=document.querySelector('#app').textContent;const next=renderMessages();await Promise.resolve();currentUser={id:'other-member'};release([]);await next;return{returned,session:document.querySelector('#app').textContent}});
  expect(result).toEqual({returned:'Newer Inbox',session:'Newer Inbox'});
});

async function thread(page){
  await open(page);
  await page.evaluate(v=>{currentUser={id:'member'};vacancies=[v];window.messageRows=['a','b'].map(id=>({id,created_at:'2026-10-01T12:00:00Z',vacancies:{id:v.id,rooms:{name:id==='a'?'Room A':'Room B',properties:{owner_id:'other',suburb:'Carlton'}}},conversation_members:[{user_id:'member'}],messages:[{id:'message-'+id,created_at:'2026-10-01T12:00:00Z',sender_id:'other',body:'Hello '+id}]}));VACANCY_BACKEND.conversations=async()=>structuredClone(messageRows);VACANCY_BACKEND.conversationPeer=async()=>({display_name:'Owner'});nav('messages','a')},listing);
  await expect(page.locator('#chatForm')).toBeVisible();
}

test('delayed peer lookup cannot overwrite a newer thread or copy its draft',async({page})=>{
  await thread(page);await page.locator('#chatForm [name=body]').fill('Draft for A');
  await page.evaluate(()=>{stopMessagesPolling();VACANCY_BACKEND.conversationPeer=id=>id==='a'?new Promise(resolve=>window.finishPeer=()=>resolve({display_name:'Old owner'})):Promise.resolve({display_name:'New owner'});window.pollWork=pollMessagesOnce(true)});
  await page.waitForFunction(()=>typeof finishPeer==='function');
  await page.evaluate(()=>nav('messages','b'));await expect(page.locator('.chat-listing')).toContainText('Room B');
  await page.locator('#chatForm [name=body]').fill('Draft for B');
  await page.evaluate(async()=>{finishPeer();await pollWork});
  await expect(page).toHaveURL(/#messages\/b$/);await expect(page.locator('.chat-listing')).toContainText('Room B');await expect(page.locator('#chatForm [name=body]')).toHaveValue('Draft for B');
});

test('poll preserves a current text draft and never replaces a selected photo',async({page})=>{
  await thread(page);await page.locator('#chatForm [name=body]').fill('Keep my draft');
  await page.evaluate(async()=>{stopMessagesPolling();await pollMessagesOnce(true)});
  await expect(page.locator('#chatForm [name=body]')).toHaveValue('Keep my draft');
  await page.locator('#chatForm [name=photo]').setInputFiles({name:'pixel.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD6sAAAAASUVORK5CYII=','base64')});
  const same=await page.evaluate(async()=>{const form=document.querySelector('#chatForm');await pollMessagesOnce(true);return form===document.querySelector('#chatForm')});expect(same).toBe(true);await expect(page.locator('.chat-photo-draft')).toBeVisible();
});

test('detail Save/Unsave settles its captured button and failed Block can retry',async({page})=>{
  await open(page);const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.evaluate(v=>{currentUser={id:'member'};vacancies=[v];VACANCY_BACKEND.saveVacancy=async()=>{};VACANCY_BACKEND.unsaveVacancy=async()=>{};VACANCY_BACKEND.blockUser=async()=>{throw new Error('Block failed')};nav('detail',v.id)},listing);
  const save=page.locator('.quiet-save');await expect(save).toBeVisible();
  await save.click();await expect(save).toHaveAttribute('aria-pressed','true');await expect(save).toHaveAttribute('aria-label','Remove from saved');
  await save.click();await expect(save).toHaveAttribute('aria-pressed','false');await expect(save).toHaveAttribute('aria-label','Save listing');
  await page.evaluate(()=>{VACANCY_BACKEND.saveVacancy=async()=>{throw new Error('Save failed')}});await save.click();await expect(save).toHaveAttribute('aria-pressed','false');await expect(save).toBeEnabled();
  await page.getByRole('button',{name:'Report or block',exact:true}).click();await page.locator('.quiet-block-choice').click();await page.locator('.quiet-block-confirm button').click();await expect(page.locator('.quiet-block-confirm button')).toBeEnabled();await expect(page.locator('#toast')).toContainText('Block failed');
  expect(errors).toEqual([]);
});

test('detail repeated Save is locked and navigation during save does not repaint another page',async({page})=>{
  await open(page);
  await page.evaluate(v=>{currentUser={id:'member'};vacancies=[v];window.saveCalls=0;VACANCY_BACKEND.saveVacancy=()=>{saveCalls++;return new Promise(resolve=>window.finishSave=resolve)};nav('detail',v.id)},listing);
  await expect(page.locator('.quiet-save')).toBeVisible();await page.evaluate(()=>{const b=document.querySelector('.quiet-save');b.click();b.click()});await expect(page.locator('.quiet-save')).toBeDisabled();expect(await page.evaluate(()=>saveCalls)).toBe(1);
  await page.evaluate(()=>nav('account'));await expect(page.locator('.account-identity')).toBeVisible();await page.evaluate(()=>finishSave());await expect(page.locator('.account-identity')).toBeVisible();await expect(page.locator('.quiet-save')).toHaveCount(0);
});

test('auth form stays contained and centered while preserving the large desktop logo',async({page},testInfo)=>{
  await open(page);await page.evaluate(()=>{VACANCY_BACKEND.googleProviderReady=async()=>true;renderAuth()});
  for(const width of [390,768,1165,1440]){
    await page.setViewportSize({width,height:900});
    for(const mode of ['signin','signup']){
      if(mode==='signup')await page.locator('#authUnified .auth-mode-switch').click();
      const box=await page.evaluate(()=>{const r=document.querySelector('#authUnified').getBoundingClientRect(),logo=document.querySelector('.auth-brand .brand-logo-stack').getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,center:r.left+r.width/2,viewport:innerWidth,scroll:document.documentElement.scrollWidth,logo:logo.width}});
      expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(box.viewport);expect(box.width).toBeLessThanOrEqual(420);expect(Math.abs(box.center-box.viewport/2)).toBeLessThan(2);expect(box.scroll).toBeLessThanOrEqual(box.viewport);expect(box.logo).toBe(width>820?840:Math.min(336,width-56));
      await expect(page.locator('#authUnified .google-auth-action')).toBeVisible();await page.getByRole('button',{name:'Show password',exact:true}).click();await expect(page.locator('#authUnified [name=password]')).toHaveAttribute('type','text');await page.getByRole('button',{name:'Hide password',exact:true}).click();
      if(width===1165&&mode==='signin')await page.screenshot({path:testInfo.outputPath('auth-contained-1165.png')});
      if(mode==='signup')await page.locator('#authUnified .auth-mode-switch').click();
    }
  }
});

test('tour entry stays absent and shared account dialogs still work',async({page})=>{
  await find(page);await expect(page.locator('#vacancyTourButton')).toHaveCount(0);await page.evaluate(()=>{currentUser={id:'member'};VACANCY_BACKEND.blockedUsers=async()=>[];nav('account')});await expect(page.locator('#accountSecurity')).toBeVisible();await page.locator('#accountSecurity').click();await expect(page.locator('.vacancy-tour')).toBeVisible();await page.locator('.vacancy-tour .tour-close').click();await expect(page.locator('.vacancy-tour')).toHaveCount(0);await page.locator('#blockedAccounts').click();await expect(page.locator('.vacancy-tour')).toContainText('No blocked accounts');await page.locator('.vacancy-tour .tour-close').click();await page.evaluate(()=>nav('home'));await expect(page.locator('#exploreMap')).toBeVisible();await expect(page.locator('#vacancyTourButton')).toHaveCount(0);
});

test('canonical card detail opens enquiry without reboot or blank content and keeps Back/Forward',async({page})=>{
  await find(page);
  await page.locator(`[data-open-card="${listing.id}"]`).click();await expect(page).toHaveURL(/\/listings\//);await expect(page.locator('.quiet-message')).toBeVisible();
  const before=await page.evaluate(()=>{window.documentSentinel='same-document';window.enquiryFrames=[];window.enquiryWatch=true;const sample=()=>{if(!enquiryWatch)return;if(location.hash.startsWith('#enquire/'))enquiryFrames.push({text:document.querySelector('#app')?.textContent,loading:Boolean(document.querySelector('.loading-screen'))});requestAnimationFrame(sample)};sample();window.scrollTo(0,document.body.scrollHeight);return{history:history.length}});
  await page.locator('.quiet-message').click();await expect(page.locator('#enquiryForm')).toBeVisible();await expect(page.locator('[name=guestName]')).toBeVisible();await expect(page.locator('[name=message]')).toHaveValue('Hi, is this still available?');
  await page.waitForTimeout(50);
  const after=await page.evaluate(()=>({sentinel:documentSentinel,history:history.length,scroll:scrollY,frames:enquiryFrames}));
  expect(after.sentinel).toBe('same-document');expect(after.history).toBe(before.history+1);expect(after.scroll).toBe(0);expect(after.frames.length).toBeGreaterThan(0);expect(after.frames.every(f=>f.text.trim()&&!f.loading)).toBe(true);
  await page.locator('.chat-back').click();await expect(page).toHaveURL(/\/listings\//);await expect(page.locator('.quiet-message')).toBeVisible();await page.goForward();await expect(page.locator('#enquiryForm')).toBeVisible();expect(await page.evaluate(()=>documentSentinel)).toBe('same-document');
  await page.evaluate(()=>enquiryWatch=false);
});


test('finish-account form and password control remain contained',async({page})=>{
  await open(page);await page.evaluate(()=>{currentUser={id:'upgraded-member'};localStorage.setItem('vacancy-guest-upgrade-pending',currentUser.id);renderAuth()});
  await expect(page.getByRole('button',{name:'Finish account',exact:true})).toBeVisible();
  const box=await page.locator('#authUnified').boundingBox();expect(box.width).toBeLessThanOrEqual(420);expect(box.x).toBeGreaterThanOrEqual(0);
  await page.getByRole('button',{name:'Show password',exact:true}).click();await expect(page.locator('#authUnified [name=password]')).toHaveAttribute('type','text');
});

test('A to B to A cannot revive an old poll or its draft',async({page})=>{
  await thread(page);await page.locator('#chatForm [name=body]').fill('Obsolete A draft');
  await page.evaluate(()=>{stopMessagesPolling();let first=true;VACANCY_BACKEND.conversationPeer=id=>id==='a'&&first?(first=false,new Promise(resolve=>window.finishOldA=()=>resolve({display_name:'Obsolete peer'}))):Promise.resolve({display_name:'Current peer'});window.oldPoll=pollMessagesOnce(true)});
  await page.waitForFunction(()=>typeof finishOldA==='function');await page.evaluate(()=>nav('messages','b'));await expect(page.locator('.chat-listing')).toContainText('Room B');await page.evaluate(()=>nav('messages','a'));await expect(page.locator('.chat-listing')).toContainText('Room A');await page.locator('#chatForm [name=body]').fill('Current A draft');
  await page.evaluate(async()=>{finishOldA();await oldPoll});await expect(page.locator('.chat-peer')).toContainText('Current peer');await expect(page.locator('#chatForm [name=body]')).toHaveValue('Current A draft');
});

for(const allSessions of [false,true])test(`${allSessions?'global':'normal'} signout clears local UI and reports remote revocation failure truthfully`,async({page})=>{
  await open(page);const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const fail of [false,true]){
    await page.evaluate(({v,fail})=>{currentUser={id:'member'};saved.add(v.id);vacancies=[v];VACANCY_BACKEND.activeVacancies=async()=>{if(fail)throw new Error('Inventory offline');return[v]};VACANCY_BACKEND.signOut=async()=>{if(fail)throw new Error('Revocation failed')};nav('account')},{v:listing,fail});
    await expect(page.locator('#signout')).toBeVisible();
    if(allSessions){await page.locator('#accountSecurity').click();await page.locator('#signoutAllAction').click()}else await page.locator('#signout').click();
    await expect(page).toHaveURL(/#home$/);expect(await page.evaluate(()=>currentUser===null&&saved.size===0)).toBe(true);
    await expect(page.locator('#toast')).toContainText(fail?'Signed out on this device; other sessions could not be revoked':allSessions?'All sessions signed out':'Signed out');
    await expect(page.locator('.vacancy-tour')).toHaveCount(0);await expect(page.locator('#profileForm')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

for(const allSessions of [false,true])test(`${allSessions?'global':'normal'} signout handles actual HTTP503 and network failures without stale auth UI`,async({page})=>{
  await open(page);const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const failure of ['http503','network']){
    await page.evaluate(({v,failure})=>{
      currentUser={id:'member'};saved.add(v.id);vacancies=[v];localStorage.setItem('vacancy-session-v01',JSON.stringify({access_token:'header.eyJleHAiOjQxMDI0NDQ4MDB9.sig',refresh_token:'synthetic-refresh-token',expires_at:4102444800,user:currentUser}));
      const originalFetch=window.fetch;window.logoutRequests=0;
      window.fetch=async(url,options)=>{if(String(url).includes('/auth/v1/logout')){logoutRequests++;if(failure==='network')throw new TypeError('Network unavailable');return new Response(JSON.stringify({message:'Logout service unavailable'}),{status:503,headers:{'Content-Type':'application/json'}})}return originalFetch(url,options)};
      nav('account');
    },{v:listing,failure});
    await expect(page.locator('#signout')).toBeVisible();if(allSessions){await page.locator('#accountSecurity').click();await page.locator('#signoutAllAction').click()}else await page.locator('#signout').click();
    await expect(page).toHaveURL(/#home$/);await expect(page.locator('#toast')).toContainText('Signed out on this device; other sessions could not be revoked');
    expect(await page.evaluate(()=>({calls:logoutRequests,user:currentUser,saved:saved.size,session:localStorage.getItem('vacancy-session-v01')}))).toEqual({calls:1,user:null,saved:0,session:null});await expect(page.locator('#profileForm')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
