const {test,expect}=require('@playwright/test');
const {createCloud,install,owner,otherOwner,tokenFor,sessionFor}=require('../qa/account-drafts/synthetic-cloud.cjs');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
const photos=[1,2,3].map(index=>({name:`old-ui-studio-${index}.png`,mimeType:'image/png',buffer:Buffer.concat([png,Buffer.from(`photo-${index}`)])}));
async function ready(page){await page.waitForFunction(()=>typeof booting!=='undefined'&&booting===false);}
async function chooseNew(page){
 await page.locator('[data-listing-type=Residential]').click();await page.locator('[data-preset=Studio]').click();await page.getByRole('button',{name:'New property',exact:true}).click();
 const form=page.locator('#listingForm');await expect(form).toHaveAttribute('data-journey-step','0');await expect(form).not.toHaveClass(/listing-accordion/);await expect(form.locator('.journey-current-title')).toHaveText('Location');return form;
}
async function enterNew(page){await page.goto('/#list/new');await ready(page);return chooseNew(page);}
async function fillReady(page,form){
 await form.evaluate(node=>{for(const [name,value]of Object.entries({country:'Kenya',region:'Nairobi',city:'Nairobi',locality:'Westlands',address:'Synthetic Garden Road'}))if(node.elements[name])node.elements[name].value=value;node.querySelector('#newPropertyMap')._vacancySetLocation(-1.26,36.8,false);});
 await form.locator('.journey-next').click();await expect(form).toHaveAttribute('data-journey-step','1');await expect(form.locator('.journey-current-title')).toHaveText('Listing details');
 const unit=form.locator('.unit-editor');await unit.locator('.unit-name-input').fill('Garden A1');await unit.locator('.title-mode-toggle').click();await unit.locator('[data-base-name=roomName]').fill('Garden studio in Westlands');
 await unit.locator('[data-base-name=description]').fill('A bright studio composed in the original three-step listing interface.');
 await unit.locator('.unit-features > summary').click();await unit.locator('[data-unit-amenity=Balcony]').click();
 for(const name of ['rentAmount','deposit']){const input=unit.locator(`[data-base-name=${name}]`);await input.focus();await input.fill('25000');}
 await unit.locator('input[type=file]').setInputFiles(photos);await expect(form.locator('.photo-selection-item')).toHaveCount(3);
}
async function snapshot(form){return form.evaluate(async node=>({
 location:Object.fromEntries(['country','region','city','locality','address','publicLatitude','publicLongitude'].map(name=>[name,node.elements[name]?.value||''])),
 units:await Promise.all([...node.querySelectorAll('.unit-editor')].map(async unit=>({requestId:unit.dataset.requestId,privateName:unit.querySelector('.unit-name-input').value,
  fields:Object.fromEntries(['roomName','unitType','description','rentCurrency','rentPeriod','availableFrom'].map(name=>[name,unit.querySelector(`[data-base-name=${name}]`)?.value||''])),
  rent:unit.querySelector('[data-base-name=rentAmount]').value.replace(/,/g,''),deposit:unit.querySelector('[data-base-name=deposit]').value.replace(/,/g,''),
  options:JSON.parse(unit.querySelector('[data-base-name=unitDetails]').value),photos:await Promise.all(selectedPhotoFiles(unit.querySelector('input[type=file]')).map(async file=>({name:file.name,type:file.type,lastModified:file.lastModified,bytes:[...new Uint8Array(await file.arrayBuffer())]})))
 })))
}));}
async function toReview(form){for(let i=0;i<2&&await form.getAttribute('data-journey-step')!=='2';i++)await form.locator('.journey-next').click();await expect(form).toHaveAttribute('data-journey-step','2');await expect(form.locator('.journey-current-title')).toHaveText('Review');}
async function guestPublish(page,form){await toReview(form);await form.locator('.listing-submit-actions .primary').click();await expect(page).toHaveURL(/#auth$/);await expect(page.locator('#listingAuthNotice')).toHaveCount(0);await expect(page.locator('#returnToListingDraft')).toBeVisible();}
async function signIn(page,{signup=false,user=owner}={}){if(signup){await page.locator('#authUnified .auth-mode-switch').click();await page.locator('#authUnified [name=name]').fill('Synthetic Publisher');}await page.locator('#authUnified [name=email]').fill(user.email);await page.locator('#authUnified [name=password]').fill('SyntheticPassword123');await page.locator('#authUnified button.primary').click();}
function expectNoPublication(state){expect(state.calls.filter(call=>!['ownerMediaLibrary','mediaLibraryFiles'].includes(call.method))).toEqual([]);expect(state.cloud.publicWrites).toEqual([]);expect(state.cloud.requests.filter(req=>['begin_listing_draft_publish','listing_draft_publish_action','publish_listing_draft_unit','finish_listing_draft_publish'].some(name=>req.path.endsWith('/'+name)))).toEqual([]);}
async function resumedReview(page,before){await expect(page).toHaveURL(/#list\/new$/);const form=page.locator('#listingForm');await expect(form).toHaveAttribute('data-journey-step','2');await expect(form).not.toHaveClass(/listing-accordion/);await expect(form.locator('.photo-selection-item')).toHaveCount(3);await expect(form.locator('.listing-publish-account')).toHaveCount(0);expect(await snapshot(form)).toEqual(before);return form;}
function completeHeads(cloud){return [...cloud.heads.values()].filter(head=>head.revision>0&&head.current_transfer_id);}
async function waitCloud(cloud){await expect.poll(()=>completeHeads(cloud).length).toBe(1);await expect.poll(()=>cloud.objects.size).toBe(3);}

test('guest keeps old Location → Listing details → Review controls and exact local photo bytes without account writes',async({page,context},testInfo)=>{
 const state=await install(context);const form=await enterNew(page);await expect(form).not.toContainText('An account is required to publish. Until then, your draft and photos stay on this device.');await expect(form.getByRole('button',{name:'Discard device draft'})).toBeVisible();await page.screenshot({path:testInfo.outputPath('old-ui-location.png'),fullPage:true});
 await fillReady(page,form);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);await page.screenshot({path:testInfo.outputPath('old-ui-listing-details.png'),fullPage:true});const before=await snapshot(form);
 await toReview(form);await page.screenshot({path:testInfo.outputPath('old-ui-review.png'),fullPage:true});
 await expect(form.locator('.listing-accordion-section')).toHaveCount(0);await guestPublish(page,form);expectNoPublication(state);expect(state.authRequests).toEqual([]);expect(state.cloud.heads.size).toBe(0);expect(state.cloud.objects.size).toBe(0);
 await page.locator('#returnToListingDraft').click();await expect(page).toHaveURL(/#list\/new$/);await expect(form.locator('.photo-selection-item')).toHaveCount(3);expect(await snapshot(form)).toEqual(before);
});

for(const method of ['password','signup','oauth'])test(`${method} verifies account, acknowledges full private fields/photos, resumes Review, and requires second explicit Publish`,async({page,context})=>{
 const state=await install(context);const form=await enterNew(page);await fillReady(page,form);const before=await snapshot(form);await guestPublish(page,form);expectNoPublication(state);
 if(method==='oauth')await page.goto('/?synthetic-oauth=1#access_token='+tokenFor(owner)+'&refresh_token=synthetic-refresh&expires_in=3600');else await signIn(page,{signup:method==='signup'});
 const resumed=await resumedReview(page,before);await waitCloud(state.cloud);expectNoPublication(state);
 const head=completeHeads(state.cloud)[0],manifest=state.cloud.manifests.get(head.id+'/'+head.current_transfer_id);
 expect(manifest.payload.units[0]._requestId).toBe(before.units[0].requestId);expect(manifest.assets.map(asset=>asset.fileName)).toEqual(before.units[0].photos.map(file=>file.name));
 for(const asset of manifest.assets){expect(state.cloud.objects.get(asset.path).owner).toBe(owner.id);expect([...state.cloud.objects.get(asset.path).bytes]).toEqual(before.units[0].photos[asset.order].bytes);}
 await page.evaluate(()=>window.__allowSyntheticPublish=true);await resumed.locator('.listing-submit-actions .primary').click();
 await expect.poll(()=>state.cloud.requests.filter(req=>req.path.endsWith('/listing_draft_publish_action')&&req.body.p_action==='publish_unit').length).toBe(1);
 await expect(page).toHaveURL(/#list$/);expect([...state.cloud.heads.values()][0].state).toBe('published');
 expect(state.calls.filter(call=>call.method==='createListing')).toHaveLength(1);expect(state.calls.find(call=>call.method==='createListing').args[0].requestId).toBe(before.units[0].requestId);
});

for(const failure of ['indexeddb','quota','session-storage'])test(`guest ${failure} failure keeps original editor, fields and files and never opens auth`,async({page,context})=>{
 const state=await install(context),form=await enterNew(page);await fillReady(page,form);const before=await snapshot(form);await toReview(form);
 await page.evaluate(kind=>{if(kind==='indexeddb'){const original=indexedDB.open;indexedDB.open=()=>{throw new DOMException('Synthetic IndexedDB unavailable','UnknownError')};window.__restoreStorage=()=>indexedDB.open=original;}else if(kind==='quota'){const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=()=>{throw new DOMException('Synthetic quota exceeded','QuotaExceededError')};window.__restoreStorage=()=>IDBObjectStore.prototype.put=original;}else{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(this===sessionStorage)throw new DOMException('Synthetic session storage unavailable','QuotaExceededError');return original.call(this,key,value)};window.__restoreStorage=()=>Storage.prototype.setItem=original;}},failure);
 await form.locator('.listing-submit-actions .primary').click();await expect(page.locator('#toast')).toContainText(/save|storage|draft/i);await expect(page).toHaveURL(/#list\/new$/);expect(await snapshot(form)).toEqual(before);expectNoPublication(state);expect(state.authRequests).toEqual([]);
 await page.evaluate(()=>window.__restoreStorage());await guestPublish(page,form);expectNoPublication(state);
});

test('cancel, failed sign-in and same-tab reload retain guest work and retry succeeds',async({page,context})=>{
 const state=await install(context),form=await enterNew(page);await fillReady(page,form);const before=await snapshot(form);await guestPublish(page,form);await page.locator('#returnToListingDraft').click();await expect(form.locator('.photo-selection-item')).toHaveCount(3);expect(await snapshot(form)).toEqual(before);
 await page.reload();await ready(page);await expect(form.locator('.photo-selection-item')).toHaveCount(3);expect(await snapshot(form)).toEqual(before);
 await guestPublish(page,form);state.failAuth=true;await signIn(page);await expect(page.locator('#toast')).toContainText('Synthetic sign-in failure');await expect(page).toHaveURL(/#auth$/);expectNoPublication(state);
 state.failAuth=false;await signIn(page);await resumedReview(page,before);await waitCloud(state.cloud);expectNoPublication(state);
});

for(const failure of ['upload','commit','corrupt-download'])test(`${failure} blocks guest adoption without losing local bytes and can retry safely`,async({page,context})=>{
 const cloud=createCloud(),state=await install(context,cloud),form=await enterNew(page);await fillReady(page,form);const before=await snapshot(form);const guestId=await form.getAttribute('data-guest-draft-id');await guestPublish(page,form);
 cloud.failUpload=failure==='upload';cloud.failCommit=failure==='commit';cloud.corruptDownload=failure==='corrupt-download';await signIn(page);
 await expect(page.locator('#listingResumeStatus')).toContainText(/draft|storage|photo|saved/i);expectNoPublication(state);
 await expect(page.locator('#retryListingResume')).toBeVisible();
 const durable=await page.evaluate(async id=>{const saved=await draftMediaStore('get','vacancy-guest-listing-bundle-v1:'+id);return {discarded:saved?.discarded||false,files:await Promise.all((saved?.media||[]).flatMap(row=>row.files).map(async file=>[...new Uint8Array(await file.arrayBuffer())]))}},guestId);expect(durable.discarded).toBe(false);expect(durable.files).toEqual(before.units[0].photos.map(photo=>photo.bytes));
 cloud.failUpload=false;cloud.failCommit=false;cloud.corruptDownload=false;
 await page.locator('#retryListingResume').click();await resumedReview(page,before);await waitCloud(cloud);expectNoPublication(state);
});

test('signed-in autosave and Save and exit restore full fields and exact bytes on a clean second device',async({page,context,browser})=>{
 const cloud=createCloud(),state=await install(context,cloud,{signedIn:owner}),form=await enterNew(page);await fillReady(page,form);const before=await snapshot(form);await waitCloud(cloud);expectNoPublication(state);
 await form.locator('.journey-save-exit').click();await expect(page).toHaveURL(/#list$/);
 const second=await browser.newContext({baseURL:'http://127.0.0.1:8784',viewport:page.viewportSize(),serviceWorkers:'block'});
 try{const secondState=await install(second,cloud,{signedIn:owner}),other=await second.newPage();await other.goto('/#list');await ready(other);
  expect(await other.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('vacancy-listing-draft')))).toEqual([]);
  await expect(other.locator('[data-open-account-draft]')).toHaveCount(1);await other.locator('[data-open-account-draft]').click();
  const restored=other.locator('#listingForm');await expect(restored.locator('.photo-selection-item')).toHaveCount(3);expect(await snapshot(restored)).toEqual(before);await expect(restored).not.toHaveClass(/listing-accordion/);expectNoPublication(secondState);
 }finally{await second.close();}
});

test('a stale second-device save cannot overwrite a newer complete cloud head and keeps its local edits',async({page,context,browser})=>{
 const cloud=createCloud();await install(context,cloud,{signedIn:owner});const form=await enterNew(page);await fillReady(page,form);await form.locator('.journey-save-exit').click();await expect(page).toHaveURL(/#list$/);await waitCloud(cloud);
 const second=await browser.newContext({baseURL:'http://127.0.0.1:8784',serviceWorkers:'block'});
 try{await install(second,cloud,{signedIn:owner});const other=await second.newPage();await other.goto('/#list');await ready(other);await other.locator('[data-open-account-draft]').click();const stale=other.locator('#listingForm');await expect(stale.locator('.photo-selection-item')).toHaveCount(3);
  await page.locator('[data-open-account-draft]').click();await expect(form.locator('.photo-selection-item')).toHaveCount(3);if(await form.getAttribute('data-journey-step')==='0')await form.locator('.journey-next').click();await form.locator('[data-base-name=description]').fill('Newer device one description');await form.locator('.journey-save-exit').click();await expect(page).toHaveURL(/#list$/);const revision=completeHeads(cloud)[0].revision;
  if(await stale.getAttribute('data-journey-step')==='0')await stale.locator('.journey-next').click();await stale.locator('[data-base-name=description]').fill('Unsynced second-device description');const local=await snapshot(stale);await stale.locator('.journey-save-exit').click();await expect(other.locator('#toast')).toContainText(/another device|conflict|changed/i);await expect(other).toHaveURL(/#list\/new$/);expect(await snapshot(stale)).toEqual(local);expect(completeHeads(cloud)[0].revision).toBe(revision);
  await expect(stale.locator('[data-save-draft-copy]')).toBeVisible();await stale.locator('[data-save-draft-copy]').click();await expect.poll(()=>completeHeads(cloud).length).toBe(2);await expect(stale.locator('[data-account-draft-status]')).toHaveAttribute('data-save-state','saved');
  const copies=completeHeads(cloud),requestSets=copies.map(head=>cloud.manifests.get(head.id+'/'+head.current_transfer_id).payload.units.map(unit=>unit._requestId));expect(requestSets[0].filter(id=>requestSets[1].includes(id))).toEqual([]);expect(copies[0].source_draft_id).not.toBe(copies[1].source_draft_id);expect(copies[0].revision).toBe(revision);expect((await snapshot(stale)).units[0].photos).toEqual(local.units[0].photos);
 }finally{await second.close();}
});

test('ordinary sign-in is unrelated to listing drafts and still returns home',async({page,context})=>{
 const state=await install(context);await page.goto('/#auth');await ready(page);await signIn(page);await expect(page).toHaveURL(/#home$/);expectNoPublication(state);expect(state.cloud.heads.size).toBe(0);
});

test('guest stays on auth and retains its durable source until exact full cloud commit acknowledgment',async({page,context})=>{
 const cloud=createCloud(),state=await install(context,cloud),form=await enterNew(page);await fillReady(page,form);const before=await snapshot(form);const guestId=await form.getAttribute('data-guest-draft-id');await guestPublish(page,form);
 let release;cloud.holdCommit=new Promise(resolve=>release=resolve);await signIn(page);
 try{await expect.poll(()=>cloud.requests.filter(req=>req.path.endsWith('/commit_listing_draft')).length).toBeGreaterThan(0);await expect(page).toHaveURL(/#auth$/);expectNoPublication(state);
  const source=await page.evaluate(async id=>{const saved=await draftMediaStore('get','vacancy-guest-listing-bundle-v1:'+id);return {discarded:saved?.discarded||false,files:await Promise.all((saved?.media||[]).flatMap(row=>row.files).map(async file=>[...new Uint8Array(await file.arrayBuffer())]))}},guestId);
  expect(source.discarded).toBe(false);expect(source.files).toEqual(before.units[0].photos.map(photo=>photo.bytes));
 }finally{cloud.holdCommit=null;release();}
 await resumedReview(page,before);await waitCloud(cloud);expectNoPublication(state);
});

test('photo-only additions and reordering autosave their exact bytes and order to the account',async({page,context})=>{
 const cloud=createCloud();await install(context,cloud,{signedIn:owner});const form=await enterNew(page);await fillReady(page,form);await waitCloud(cloud);await expect(form.locator('[data-account-draft-status]')).toHaveAttribute('data-save-state','saved');
 const extra={name:'fourth-photo.png',mimeType:'image/png',buffer:Buffer.concat([png,Buffer.from('fourth-photo')])};await form.locator('input[type=file]').setInputFiles(extra);await expect(form.locator('.photo-selection-item')).toHaveCount(4);
 await expect.poll(()=>{const head=completeHeads(cloud)[0];return cloud.manifests.get(head.id+'/'+head.current_transfer_id)?.assets.length}).toBe(4);
 await form.locator('[data-photo-main="3"]').click();const before=await snapshot(form);
 await expect.poll(()=>{const head=completeHeads(cloud)[0];return cloud.manifests.get(head.id+'/'+head.current_transfer_id)?.assets[0]?.fileName}).toBe('fourth-photo.png');
 const head=completeHeads(cloud)[0],manifest=cloud.manifests.get(head.id+'/'+head.current_transfer_id);expect(manifest.assets.map(asset=>asset.fileName)).toEqual(before.units[0].photos.map(photo=>photo.name));
 for(const asset of manifest.assets)expect([...cloud.objects.get(asset.path).bytes]).toEqual(before.units[0].photos[asset.order].bytes);
});

test('account switching during a delayed save removes the old editor and never applies its response to the new account',async({page,context})=>{
 const cloud=createCloud();await install(context,cloud,{signedIn:owner});const form=await enterNew(page);await fillReady(page,form);await waitCloud(cloud);await expect(form.locator('[data-account-draft-status]')).toHaveAttribute('data-save-state','saved');
 let release;cloud.holdCommit=new Promise(resolve=>release=resolve);const count=cloud.requests.filter(req=>req.path.endsWith('/commit_listing_draft')).length;
 await form.locator('[data-base-name=description]').fill('Owner one unsynced change');await expect.poll(()=>cloud.requests.filter(req=>req.path.endsWith('/commit_listing_draft')).length).toBeGreaterThan(count);
 const switcher=await context.newPage();try{await switcher.goto('/#home');await ready(switcher);await switcher.evaluate(value=>localStorage.setItem('vacancy-session-v01',JSON.stringify(value)),sessionFor(otherOwner));
  await expect(page.locator('#listingForm')).not.toBeVisible();cloud.holdCommit=null;release();await page.goto('/#list');await ready(page);await expect(page.locator('.account-draft-row')).toHaveCount(0);await expect(page.locator('#app')).not.toContainText('Owner one unsynced change');
  expect([...cloud.heads.values()].every(head=>head.owner_id===owner.id)).toBe(true);expect(cloud.requests.filter(req=>req.method==='POST'&&req.uid===otherOwner.id&&req.path.includes('listing_draft'))).toEqual([]);
 }finally{cloud.holdCommit=null;release();await switcher.close();}
});

test('guest enquiries still use the separate anonymous chat flow and do not touch listing drafts',async({page,context})=>{
 const state=await install(context);await page.goto('/#home');await ready(page);
 await page.evaluate(()=>{
  const vacancy={id:'guest-v',rentAmount:18000,rentCurrency:'KES',rentPeriod:'month',deposit:0,billsIncluded:false,availableFrom:'2026-10-01',minimumStayWeeks:null,room:{id:'r',name:'Guest-ready studio',roomType:'Studio',furnished:false,ensuite:false,maxOccupants:1,description:'A test vacancy',media:[]},property:{id:'p',title:'Guest house',suburb:'Kasarani',city:'Nairobi',state:'Nairobi',country:'Kenya',parkingSpaces:0,petsConsidered:false,smokingAllowed:false,householdSummary:'Quiet property',waterAvailable:true,electricityAvailable:true,securityAvailable:true,internetAvailable:false,publicLatitude:-1.2,publicLongitude:36.9},owner:{id:'owner',displayName:'Owner',bio:''}};
  vacancies=[vacancy];window.__enquiryCalls=[];
  VACANCY_BACKEND.signInGuest=async name=>{window.__enquiryCalls.push(['guest',name]);currentUser={id:'guest',is_anonymous:true};return {}};VACANCY_BACKEND.currentUser=async()=>currentUser;VACANCY_BACKEND.savedIds=async()=>[];
  VACANCY_BACKEND.startEnquiry=async(id,input)=>{window.__enquiryCalls.push(['enquiry',id,input.message]);return 'conversation-1'};
  VACANCY_BACKEND.conversations=async()=>[{id:'conversation-1',created_at:new Date().toISOString(),vacancies:{id:'guest-v',rooms:{name:'Guest-ready studio',properties:{suburb:'Kasarani',owner_id:'owner'}}},conversation_members:[{user_id:'guest',last_read_at:null}],messages:[{id:'message-1',sender_id:'guest',body:'Can I view this studio on Saturday?',created_at:new Date().toISOString()}]}];VACANCY_BACKEND.conversationPeer=async()=>({display_name:'Owner',avatar_path:null,last_read_at:null});nav('enquire',vacancy.id);
 });
 await page.getByLabel('Your name').fill('Amina');await page.getByLabel('Message',{exact:true}).fill('Can I view this studio on Saturday?');await page.getByRole('button',{name:'Send message',exact:true}).click();await expect(page).toHaveURL(/#messages\/conversation-1$/);await expect(page.locator('.chat-log')).toContainText('Can I view this studio on Saturday?');
 expect(await page.evaluate(()=>window.__enquiryCalls)).toEqual([['guest','Amina'],['enquiry','guest-v','Can I view this studio on Saturday?']]);expect(state.cloud.heads.size).toBe(0);expect(state.cloud.objects.size).toBe(0);
});

test('signed-in local metadata quota keeps edited fields and avoids claiming the unsaved edit is saved on this device',async({page,context})=>{
 const cloud=createCloud();await install(context,cloud,{signedIn:owner});const form=await enterNew(page);await fillReady(page,form);await waitCloud(cloud);await expect(form.locator('[data-account-draft-status]')).toHaveAttribute('data-save-state','saved');const revision=completeHeads(cloud)[0].revision;
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(this===localStorage&&key.startsWith('vacancy-listing-draft'))throw new DOMException('Synthetic local metadata quota exceeded','QuotaExceededError');return original.call(this,key,value)};window.__restoreLocalMetadata=()=>Storage.prototype.setItem=original;});
 await form.locator('[data-base-name=description]').fill('Not yet durable under quota failure');const before=await snapshot(form);await form.locator('.journey-save-exit').click();await expect(page).toHaveURL(/#list\/new$/);await expect(page.locator('#toast')).toContainText(/quota|save/i);expect(await snapshot(form)).toEqual(before);expect(completeHeads(cloud)[0].revision).toBe(revision);
 await expect(form.locator('[data-account-draft-status]')).not.toContainText('Saved on this device.');
 await page.evaluate(()=>window.__restoreLocalMetadata());await form.locator('.journey-save-exit').click();await expect(page).toHaveURL(/#list$/);expect(completeHeads(cloud)[0].revision).toBeGreaterThan(revision);
});

test('signed-in explicit Publish uses the revision-fenced gateway for every listing mutation and only then public photo storage',async({page,context})=>{
 const cloud=createCloud(),state=await install(context,cloud,{signedIn:owner});const form=await enterNew(page);await fillReady(page,form);const before=await snapshot(form);await toReview(form);await waitCloud(cloud);expectNoPublication(state);
 await page.evaluate(()=>window.__allowSyntheticPublish=true);await form.locator('.listing-submit-actions .primary').click();await expect(page).toHaveURL(/#list$/);
 const actions=cloud.requests.filter(req=>req.path.endsWith('/listing_draft_publish_action'));
 expect(actions[0].body.p_action).toBe('create_listing');expect(actions.filter(req=>req.body.p_action==='link_media')).toHaveLength(3);expect(actions.at(-1).body.p_action).toBe('publish_unit');
 expect(actions.every(req=>req.uid===owner.id&&req.body.p_request===before.units[0].requestId)).toBe(true);expect(actions[0].body.p_args.p_request_id).toBe(before.units[0].requestId);
 expect(cloud.publicWrites.every(req=>req.path.startsWith('/storage/v1/object/room-media/'))).toBe(true);expect(cloud.publicObjects.size).toBe(3);expect([...cloud.publicObjects.keys()].every(path=>!path.includes('/undefined/'))).toBe(true);expect(completeHeads(cloud)[0].state).toBe('published');
});

test('new fields and photos entered during an in-flight cloud save remain recoverable after sign-out',async({page,context})=>{
 const cloud=createCloud();await install(context,cloud,{signedIn:owner});const form=await enterNew(page);await fillReady(page,form);await waitCloud(cloud);await expect(form.locator('[data-account-draft-status]')).toHaveAttribute('data-save-state','saved');
 const key=await form.evaluate(node=>listingDraftKey(node));let release;cloud.holdCommit=new Promise(resolve=>release=resolve);const initialCommits=cloud.requests.filter(req=>req.path.endsWith('/commit_listing_draft')).length;
 await form.locator('[data-base-name=description]').fill('Captured by the in-flight save');await expect.poll(()=>cloud.requests.filter(req=>req.path.endsWith('/commit_listing_draft')).length).toBeGreaterThan(initialCommits);
 await form.locator('[data-base-name=description]').fill('Newer fields must remain local after sign-out');await form.locator('input[type=file]').setInputFiles({name:'newer-unsynced.png',mimeType:'image/png',buffer:Buffer.concat([png,Buffer.from('newer-unsynced')])});const before=await snapshot(form);
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key))?.units?.[0]?.description,key)).toBe('Newer fields must remain local after sign-out');
 try{await page.evaluate(()=>nav('account'));await page.locator('#signout').click();await expect(page).toHaveURL(/#home$/);cloud.holdCommit=null;release();
  const preserved=await page.evaluate(async key=>({data:JSON.parse(localStorage.getItem(key)||'null'),files:await Promise.all((await draftMediaStore('get',JSON.parse(localStorage.getItem(key)||'null')?._draftMediaKey||key)||[]).flatMap(row=>row.files).map(async file=>({name:file.name,bytes:[...new Uint8Array(await file.arrayBuffer())]})))}),key);
  expect(preserved.data?.units?.[0]?.description).toBe('Newer fields must remain local after sign-out');expect(preserved.data?._accountDraft?.synced).toBe(false);expect(preserved.files).toEqual(before.units[0].photos.map(({name,bytes})=>({name,bytes})));
 }finally{cloud.holdCommit=null;release();}
});

const youButton=page=>page.locator('[data-nav="account"]:visible').first();
function setSyntheticProfile(cloud,user=owner){cloud.profiles.set(user.id,{id:user.id,display_name:user===owner?'Synthetic Publisher':'Other Publisher',avatar_path:user.id+'/avatar.png'});}

test('account navigation avatar decorates the unchanged You target and still opens the account',async({page,context})=>{
 const cloud=createCloud();setSyntheticProfile(cloud);await install(context,cloud,{signedIn:owner});await page.goto('/#home');await ready(page);const button=youButton(page);await expect(button).toHaveAccessibleName('You');await expect(button.locator('.account-nav-avatar')).toBeVisible();await expect(button.locator('.account-nav-avatar')).toHaveAttribute('alt','');await expect(button.locator('.account-nav-avatar')).toHaveAttribute('aria-hidden','true');await button.click();await expect(page).toHaveURL(/#account$/);await expect(page.locator('#app')).toContainText(owner.email);
});

for(const failure of ['guest','missing-profile','profile-error','image-error'])test(`account navigation preserves the You icon for ${failure}`,async({page,context})=>{
 const cloud=createCloud();if(failure==='image-error')setSyntheticProfile(cloud);cloud.failProfile=failure==='profile-error';cloud.failAvatarImages=failure==='image-error';await install(context,cloud,{signedIn:failure==='guest'?null:owner});await page.goto('/#home');await ready(page);
 const button=youButton(page);await expect(button).toHaveAccessibleName('You');await expect(button.locator('svg.nav-icon')).toBeVisible();await expect(button.locator('.account-nav-avatar')).not.toBeVisible();await button.click();await expect(page).toHaveURL(failure==='guest'?/#auth$/:/#account$/);
});

test('sign-out clears every account navigation photo and restores the You icon',async({page,context})=>{
 const cloud=createCloud();setSyntheticProfile(cloud);await install(context,cloud,{signedIn:owner});await page.goto('/#home');await ready(page);await expect(youButton(page).locator('.account-nav-avatar')).toBeVisible();await youButton(page).click();await page.locator('#signout').click();await expect(page).toHaveURL(/#home$/);await expect(page.locator('.account-nav-avatar')).toHaveCount(0);await expect(youButton(page).locator('svg.nav-icon')).toBeVisible();await expect(youButton(page)).toHaveAccessibleName('You');
});

test('a delayed previous-account profile cannot repaint its photo after a cross-tab account switch',async({page,context})=>{
 const cloud=createCloud();setSyntheticProfile(cloud);setSyntheticProfile(cloud,otherOwner);let release;cloud.holdProfile=new Promise(resolve=>release=resolve);await install(context,cloud,{signedIn:owner});await page.goto('/#home');await ready(page);await expect.poll(()=>cloud.requests.filter(req=>req.path==='/rest/v1/profiles'&&req.uid===owner.id).length).toBeGreaterThan(0);
 const switcher=await context.newPage();try{await switcher.goto('/#home');await ready(switcher);await switcher.evaluate(value=>localStorage.setItem('vacancy-session-v01',JSON.stringify(value)),sessionFor(otherOwner));const delivered=page.waitForResponse(response=>response.url().includes('/rest/v1/profiles'));cloud.holdProfile=null;release();await (await delivered).finished();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await expect(page.locator(`.account-nav-avatar[src*="${owner.id}"]`)).toHaveCount(0);
  await page.evaluate(async()=>{await refreshIdentity();bindHeader();});await expect(youButton(page).locator('.account-nav-avatar')).toHaveAttribute('src',new RegExp(otherOwner.id));await expect(page.locator(`.account-nav-avatar[src*="${owner.id}"]`)).toHaveCount(0);await expect(youButton(page)).toHaveAccessibleName('You');
 }finally{cloud.holdProfile=null;release();await switcher.close();}
});

test('retrying all publication photos after the first link reuses revision-tagged paths without duplicate active media',async({page,context})=>{
 const cloud=createCloud(),state=await install(context,cloud,{signedIn:owner});const form=await enterNew(page);await fillReady(page,form);const before=await snapshot(form);await toReview(form);await waitCloud(cloud);expectNoPublication(state);cloud.failPublicUploadOnceAt=2;
 await page.evaluate(()=>window.__allowSyntheticPublish=true);await form.locator('.listing-submit-actions .primary').click();await expect(page).toHaveURL(/#list$/);
 expect(state.calls.filter(call=>call.method==='uploadListingImages')).toHaveLength(2);expect(cloud.publicUploadAttempts).toBe(4);expect(cloud.publicObjects.size).toBe(3);expect(cloud.media).toHaveLength(3);expect(new Set(cloud.media.map(item=>item.storage_path)).size).toBe(3);
 const links=cloud.requests.filter(req=>req.path.endsWith('/listing_draft_publish_action')&&req.body.p_action==='link_media');expect(links).toHaveLength(4);expect(links[0].body.p_args.p_path).toBe(links[1].body.p_args.p_path);expect(links[1].body.p_expected).toBeGreaterThan(links[0].body.p_expected);
 expect(completeHeads(cloud)[0].state).toBe('published');expect(new Set([...cloud.publicObjects.values()].map(object=>object.bytes.toString('base64')))).toEqual(new Set(before.units[0].photos.map(photo=>Buffer.from(photo.bytes).toString('base64'))));
});

function seedPublishedListing(cloud){
 const id='60000000-0000-4000-8000-000000000006',roomId='70000000-0000-4000-8000-000000000007',propertyId='40000000-0000-4000-8000-000000000004';
 const media=[1,2,3].map(index=>({id:`80000000-0000-4000-8000-${String(index).padStart(12,'0')}`,room_id:roomId,storage_path:`${owner.id}/${roomId}/existing-${index}.png`,mime_type:'image/png',sort_order:index-1,status:'active',url:`https://xtutkwiivqkgkqjpkxvj.supabase.co/storage/v1/object/public/room-media/${owner.id}/${roomId}/existing-${index}.png`}));
 const listing={id,roomId,propertyId,privateName:'Existing Garden A1',roomName:'Published Garden studio',unitType:'Studio',description:'Original published description',rentAmount:22000,rentCurrency:'KES',rentPeriod:'month',deposit:22000,availableFrom:'2026-10-15',minimumStayWeeks:'',maxOccupants:1,unitDetails:{parkingSpaces:0,amenities:[],utilities:[],rules:[],recurringFees:{}},locality:'Westlands',city:'Nairobi',region:'Nairobi',country:'Kenya',marketCode:'KE',address:'Existing Garden Road',propertyType:'Apartment',publicLatitude:-1.26,publicLongitude:36.8,parkingSpaces:0,waterAvailable:true,electricityAvailable:true,securityAvailable:true,internetAvailable:false,media};
 cloud.editListings.set(id,listing);cloud.media.push(...media);cloud.published.set('existing-seed',{id,room_id:roomId,rooms:{id:roomId,property_id:propertyId,properties:{id:propertyId,owner_id:owner.id}}});return listing;
}

test('published edit draft restores added private photos on a clean device and explicit Save preserves existing photos',async({page,context,browser})=>{
 const cloud=createCloud(),listing=seedPublishedListing(cloud),state=await install(context,cloud,{signedIn:owner});await page.goto('/#edit/'+listing.id);await ready(page);const form=page.locator('#listingForm');await expect(form).toHaveAttribute('data-edit-vacancy',listing.id);await expect(form.locator('.edit-existing-photo')).toHaveCount(3);await form.locator('.journey-next').click();await form.locator('[data-base-name=description]').fill('Edited description preserved across devices');await form.locator('[data-base-name=rentAmount]').fill('27000');await form.locator('input[type=file]').setInputFiles(photos.slice(0,2));const before=await snapshot(form);
 await form.locator('.journey-save-exit').click();await expect(page).toHaveURL(/#list$/);expectNoPublication(state);await expect.poll(()=>completeHeads(cloud).length).toBe(1);expect(cloud.objects.size).toBe(2);
 const second=await browser.newContext({baseURL:'http://127.0.0.1:8784',viewport:page.viewportSize(),serviceWorkers:'block'});
 try{const secondState=await install(second,cloud,{signedIn:owner}),other=await second.newPage();await other.goto('/#list');await ready(other);await other.locator('[data-open-account-draft]').click();const restored=other.locator('#listingForm');await expect(other).toHaveURL(new RegExp('#edit/'+listing.id+'$'));await expect(restored.locator('.edit-existing-photo')).toHaveCount(3);await expect(restored.locator('.photo-selection-item')).toHaveCount(2);expect(await snapshot(restored)).toEqual(before);expectNoPublication(secondState);
  await toReview(restored);await other.evaluate(()=>window.__allowSyntheticPublish=true);await restored.locator('.listing-submit-actions .primary').click();await expect(other).toHaveURL(/#list$/);
  const actions=cloud.requests.filter(req=>req.path.endsWith('/listing_draft_publish_action'));expect(actions.filter(req=>req.body.p_action==='edit_listing')).toHaveLength(1);expect(actions.filter(req=>req.body.p_action==='complete_edit')).toHaveLength(1);expect(actions.filter(req=>req.body.p_action.startsWith('create_'))).toHaveLength(0);expect(cloud.media).toHaveLength(5);expect(listing.media.every(old=>cloud.media.some(saved=>saved.id===old.id&&saved.storage_path===old.storage_path))).toBe(true);expect(completeHeads(cloud)[0].state).toBe('published');
 }finally{await second.close();}
});

test('partial two-unit publication saves only the unfinished unit for cloud resume on a clean device',async({page,context,browser})=>{
 const cloud=createCloud(),state=await install(context,cloud,{signedIn:owner}),form=await enterNew(page);await fillReady(page,form);await form.locator('.unit-add-choices > summary').click();await form.locator('[data-new-unit]').click();await expect(form.locator('.unit-editor')).toHaveCount(2);const secondUnit=form.locator('.unit-editor').last();await secondUnit.locator('.unit-name-input').fill('Garden A2');await secondUnit.locator('[data-base-name=rentAmount]').fill('28000');await secondUnit.locator('[data-base-name=description]').fill('Second unit must remain recoverable');await secondUnit.locator('input[type=file]').setInputFiles(photos.map((file,index)=>({...file,name:`second-unit-${index}.png`,buffer:Buffer.concat([file.buffer,Buffer.from('second')])})));const before=await snapshot(form);cloud.failActionRequest=before.units[1].requestId;await toReview(form);await page.evaluate(()=>window.__allowSyntheticPublish=true);await form.locator('.listing-submit-actions .primary').click();await expect(page.locator('#toast')).toContainText(/1 published|Unfinished units/i);await expect(form.locator('.unit-editor')).toHaveCount(1);
 const head=completeHeads(cloud)[0];expect(head.state).toBe('editing');expect(Object.keys(head.published_units)).toEqual([before.units[0].requestId]);const manifest=cloud.manifests.get(head.id+'/'+head.current_transfer_id);expect(manifest.payload.units.map(unit=>unit._requestId)).toEqual([before.units[1].requestId]);expect(manifest.assets).toHaveLength(3);expect((await snapshot(form)).units).toEqual([before.units[1]]);
 const second=await browser.newContext({baseURL:'http://127.0.0.1:8784',viewport:page.viewportSize(),serviceWorkers:'block'});
 try{await install(second,cloud,{signedIn:owner});const other=await second.newPage();await other.goto('/#list');await ready(other);await other.locator('[data-open-account-draft]').click();const restored=other.locator('#existingListingForm');await expect(restored.locator('.unit-editor')).toHaveCount(1);await expect(restored.locator('.photo-selection-item')).toHaveCount(3);expect((await snapshot(restored)).units).toEqual([before.units[1]]);
  cloud.failActionRequest=null;await toReview(restored);await other.evaluate(()=>window.__allowSyntheticPublish=true);await restored.locator('.listing-submit-actions .primary').click();await expect(other).toHaveURL(/#list$/);expect(completeHeads(cloud)[0].state).toBe('published');expect(Object.keys(completeHeads(cloud)[0].published_units).sort()).toEqual(before.units.map(unit=>unit.requestId).sort());expect(cloud.published.size).toBe(2);expect(cloud.media).toHaveLength(6);
 }finally{await second.close();}
});
