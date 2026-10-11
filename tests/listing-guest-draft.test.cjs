const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {randomUUID} = require('node:crypto');
const {File} = require('node:buffer');
const source = fs.readFileSync('app/src/listing-guest-draft.js', 'utf8');
const ACTIVE = 'vacancy-guest-listing-active-v1';
const PENDING = 'vacancy-guest-listing-auth-v1';
const bundleKey = id => 'vacancy-guest-listing-bundle-v1:' + id;
const ownedKey = (id, owner = 'owner-a') => `vacancy-listing-draft-v1:${owner}:new-property:guest-${id}`;
const clone = value => value instanceof File ? value : Array.isArray(value) ? value.map(clone) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) : value;
function storage(entries) {
  const values = new Map(entries);
  return {values,failWrite:false,failRead:false,getItem(key){if(this.failRead)throw Error('Blocked');return values.get(key) ?? null;},setItem(key,value){if(this.failWrite)throw Error('Quota');values.set(key,String(value));},removeItem(key){values.delete(key);}};
}
// Minimal transactional IDB double: serialized transactions, structured value
// copies, commit-only visibility and rollback. No external package or network.
function database() {
  const records = new Map(), queue = [];
  let active = null;
  const state = {records,failOpen:false,failWrite:null,delay:0,commits:0};
  function pump() {
    if (active || !queue.length) return;
    active = queue.shift();
    active.view = new Map([...records].map(([key,value]) => [key,clone(value)]));
    setTimeout(() => step(active),state.delay);
  }
  function finish(tx, failed) {
    if (active !== tx) return;
    if (!failed && tx.mode !== 'readonly') {records.clear();for(const [key,value] of tx.view)records.set(key,value);state.commits++;}
    active = null;
    if (failed) tx.onabort?.(); else tx.oncomplete?.();
    setImmediate(pump);
  }
  function step(tx) {
    if (!tx || active !== tx) return;
    if (tx.aborted) return finish(tx,true);
    const op = tx.ops.shift();
    if (!op) return finish(tx,false);
    try {
      if (op.kind === 'get') op.request.result = clone(tx.view.get(op.key));
      else {
        if (state.failWrite?.(op.key,op.value)) throw Error('Synthetic quota failure');
        if (op.kind === 'add' && tx.view.has(op.key)) throw Error('ConstraintError');
        tx.view.set(op.key,clone(op.value));
      }
      op.request.onsuccess?.();
    } catch (cause) {tx.error=cause;tx.aborted=true;}
    setImmediate(() => step(tx));
  }
  const db = {objectStoreNames:{contains:()=>true},close(){},transaction(_store,mode){
    const tx = {mode,ops:[],aborted:false,abort(){this.aborted=true;},objectStore(){
      const enqueue=(kind,key,value)=>{const request={};tx.ops.push({kind,key,value,request});return request;};
      return {get:key=>enqueue('get',key),put:(value,key)=>enqueue('put',key,value),add:(value,key)=>enqueue('add',key,value)};
    }};
    queue.push(tx);setImmediate(pump);return tx;
  }};
  state.api = {open(){const request={};setImmediate(()=>{if(state.failOpen){request.error=Error('Blocked');request.onerror?.();}else{request.result=db;request.onsuccess?.();}});return request;}};
  return state;
}
function form() {
  const ids = [randomUUID(),randomUUID()];
  const editors = ids.map((id,index)=>({dataset:{requestId:id},input:{files:[new File([`photo-${index}`],`unit-${index}.jpg`,{type:'image/jpeg',lastModified:index+1})]},querySelector(){return this.input;}}));
  return {dataset:{draftScope:'new-property',locationLabel:'Westlands'},isConnected:true,editors,
    data:{version:1,scope:'new-property',editVacancy:null,shared:{address:'Private address',city:'Nairobi'},units:ids.map((id,index)=>({_requestId:id,roomName:`Unit ${index+1}`,rentAmount:'25000',unitDetails:JSON.stringify({amenities:[{label:'Balcony',icon:'balcony'}]})}))},
    querySelector(selector){return selector==='#newPropertyMap'?this.map:null;},querySelectorAll(selector){return selector==='.unit-editor'?editors:[];}};
}
function fixture({db=database(),local=storage(),session=storage()}={}) {
  let now = 1800000000000;
  class Clock extends Date {static now(){return now;}}
  const context={window:{},indexedDB:db.api,localStorage:local,sessionStorage:session,crypto:{randomUUID},Date:Clock,listingDraftData:form=>({...clone(form.data),savedAt:new Date(now).toISOString()}),selectedPhotoFiles:input=>input.files};
  vm.runInNewContext(source,context);
  return {api:context.window.VACANCY_GUEST_DRAFT,db,local,session,context,advance:ms=>{now+=ms;}};
}
const user = {id:'owner-a',is_anonymous:false};
const verified = async()=>user;

test('active ID persists in this tab independently of pending auth and ordinary saves',async()=>{
  const f=fixture(),first=form(),id=f.api.ensureId(first);
  assert.match(id,/^[0-9a-f-]{36}$/);assert.equal(first.dataset.draftStorageKey,`vacancy-listing-draft-v1:guest:${id}`);
  const ticket=await f.api.checkpoint(first,{forAuth:false});assert.equal(ticket.revision,1);assert.equal(f.api.pending(),null);assert.equal(f.local.values.size,0);
  const refreshed=form();assert.equal(f.api.ensureId(refreshed),id);
  const loaded=await f.api.load(refreshed);assert.equal(loaded.data.shared.address,'Private address');assert.equal(loaded.media[0].files[0].name,'unit-0.jpg');assert.equal(await loaded.media[0].files[0].text(),'photo-0');
  assert.equal(refreshed.dataset.guestDraftRevision,'1');
});
test('checkpoint atomically commits fields, File order and request IDs before issuing an auth ticket',async()=>{
  const f=fixture(),editor=form();f.db.delay=15;
  const work=f.api.prepareAuth(editor);await new Promise(resolve=>setImmediate(resolve));assert.equal(f.api.pending(),null);
  const ticket=await work,bundle=f.db.records.get(bundleKey(ticket.draftId));
  assert.equal(bundle.data.units[0]._requestId,bundle.media[0].id);assert.equal(bundle.data.savedMedia,true);assert.equal(bundle.data.locationLabel,'Westlands');assert.equal(bundle.media[1].files[0].lastModified,2);assert.equal(f.api.pending().revision,1);
});
test('IDB failure leaves the old atomic snapshot intact and creates no auth ticket',async()=>{
  const f=fixture(),editor=form();await f.api.checkpoint(editor,{forAuth:false});
  editor.data.shared.address='Changed';f.db.failWrite=()=>true;
  await assert.rejects(f.api.prepareAuth(editor),/storage failed/i);
  assert.equal(f.api.pending(),null);assert.equal(f.db.records.get(bundleKey(editor.dataset.guestDraftId)).data.shared.address,'Private address');
});
test('blocked tab storage fails before navigation readiness and leaves durable source intact',async()=>{
  const f=fixture(),editor=form();await f.api.checkpoint(editor,{forAuth:false});f.session.failWrite=true;
  await assert.rejects(f.api.prepareAuth(editor),/could not be saved in this tab/);assert.equal(f.api.pending(),null);assert.equal(f.db.records.size,1);
});
test('unavailable tab storage does not stop in-memory editing but cannot authorize leaving',async()=>{
  const f=fixture(),editor=form();f.session.failRead=true;f.session.failWrite=true;
  const id=f.api.ensureId(editor);assert.match(id,/^[0-9a-f-]{36}$/);assert.equal(f.api.ensureId(editor),id);
  assert.equal(await f.api.load(editor),null);await assert.rejects(f.api.prepareAuth(editor),/could not be saved in this tab/);
  assert.equal(f.db.records.get(bundleKey(id)).data.shared.address,'Private address');
});
test('waits for pending media and map work; edits during saving cannot issue a ticket',async()=>{
  const f=fixture(),editor=form();let release;editor._draftMediaRestore=new Promise(resolve=>{release=resolve;});
  const work=f.api.prepareAuth(editor);await new Promise(resolve=>setImmediate(resolve));assert.equal(f.db.records.size,0);release();await work;
  f.api.clearPending();f.db.delay=20;const next=f.api.prepareAuth(editor);await new Promise(resolve=>setTimeout(resolve,5));editor.data.shared.address='New input';
  await assert.rejects(next,/changed while saving/);assert.equal(f.api.pending(),null);
});
test('pending ticket expires without deleting the source or active pointer',async()=>{
  const f=fixture(),editor=form();const ticket=await f.api.prepareAuth(editor);f.advance(24*60*60*1000);
  assert.equal(f.api.pending(),null);assert.equal(f.session.getItem(ACTIVE),ticket.draftId);assert.ok(f.db.records.get(bundleKey(ticket.draftId)));
});
test('malformed/future/foreign pending values never become a restore destination',()=>{
  const f=fixture();for(const value of ['https://evil.invalid','{}','null',JSON.stringify({version:1,draftId:'other-key',revision:1,createdAt:1800000000000,expiresAt:1800086400000})]){f.session.setItem(PENDING,value);assert.equal(f.api.pending(),null);}
});
test('verified adoption copies to a unique owned key, retains a claimed source and clears tab pointers',async()=>{
  const f=fixture(),editor=form();const ticket=await f.api.prepareAuth(editor);let checks=0;
  const result=await f.api.adopt({user,verifyAccount:async()=>{checks++;return user;}});
  assert.equal(result.draftKey,ownedKey(ticket.draftId));assert.equal(result.ownerId,user.id);assert.equal(result.data.scope,'new-property');assert.equal(result.data._guestDraft.id,ticket.draftId);assert.equal(result.media[0].files[0].size,7);
  const source=f.db.records.get(bundleKey(ticket.draftId));assert.equal(source.ownerId,user.id);assert.ok(source.adoptedAt);assert.ok(source.media);assert.equal(JSON.parse(f.local.getItem(result.draftKey)).shared.address,'Private address');assert.equal(f.api.pending(),null);assert.equal(f.session.getItem(ACTIVE),null);assert.equal(checks,4);
});
test('unverified or anonymous identity never claims the source',async()=>{
  const f=fixture(),editor=form();const ticket=await f.api.prepareAuth(editor);
  await assert.rejects(f.api.adopt({user}),/Verify a permanent/);
  await assert.rejects(f.api.adopt({user:{id:'guest',is_anonymous:true},verifyAccount:verified}),/Verify a permanent/);
  await assert.rejects(f.api.adopt({user,verifyAccount:async()=>({id:'owner-b',is_anonymous:false})}),/account changed/);
  assert.equal(f.db.records.get(bundleKey(ticket.draftId)).ownerId,undefined);assert.equal(f.local.values.size,0);
});
test('account change after the media copy keeps the source bound and never adopts into the second account',async()=>{
  const f=fixture(),editor=form();const ticket=await f.api.prepareAuth(editor);let n=0;
  await assert.rejects(f.api.adopt({user,verifyAccount:async()=>++n===1?user:{id:'owner-b'}}),/account changed/);
  assert.equal(f.local.values.size,0);assert.equal(f.db.records.get(bundleKey(ticket.draftId)).ownerId,user.id);assert.ok(f.api.pending());
  await assert.rejects(f.api.adopt({user:{id:'owner-b'},verifyAccount:async()=>({id:'owner-b'})}),/linked to another account/);
  const result=await f.api.adopt({user,verifyAccount:verified});assert.equal(result.ownerId,user.id);
});
test('account metadata quota failure retains the source and supports safe same-owner retry',async()=>{
  const f=fixture(),editor=form();const ticket=await f.api.prepareAuth(editor);f.local.failWrite=true;
  await assert.rejects(f.api.adopt({user,verifyAccount:verified}),/original local draft is still safe/);assert.equal(f.api.pending().draftId,ticket.draftId);assert.equal(f.db.records.get(bundleKey(ticket.draftId)).media.length,2);
  f.local.failWrite=false;const result=await f.api.adopt({user,verifyAccount:verified});assert.equal(result.draftKey,ownedKey(ticket.draftId));
});
test('existing metadata or photos are never overwritten by adoption',async()=>{
  for(const collision of ['metadata','media']){
    const f=fixture(),editor=form(),ticket=await f.api.prepareAuth(editor),key=ownedKey(ticket.draftId);
    if(collision==='metadata')f.local.setItem(key,JSON.stringify({existing:true}));else f.db.records.set(key,[{existing:true}]);
    await assert.rejects(f.api.adopt({user,verifyAccount:verified}),/not been replaced/);
    assert.equal(f.db.records.get(bundleKey(ticket.draftId)).ownerId,undefined);
    if(collision==='metadata')assert.equal(f.local.getItem(key),' {"existing":true}'.trim());else assert.deepEqual(f.db.records.get(key),[{existing:true}]);
  }
});
test('stale-tab writes and stale auth tickets are rejected without overwriting the latest bundle',async()=>{
  const f=fixture(),first=form();const ticket=await f.api.prepareAuth(first);
  const other=fixture({db:f.db,local:f.local,session:storage(f.session.values)}),second=form();await other.api.load(second);
  first.data.shared.address='First newer address';await f.api.checkpoint(first,{forAuth:false});
  await assert.rejects(other.api.checkpoint(second,{forAuth:false}),/changed in another tab/);
  await assert.rejects(other.api.adopt({user,verifyAccount:verified}),/changed after sign-in began/);
  assert.equal(f.db.records.get(bundleKey(ticket.draftId)).data.shared.address,'First newer address');
});
test('two tabs cannot adopt one source into different accounts',async()=>{
  const f=fixture(),editor=form();const ticket=await f.api.prepareAuth(editor);
  const other=fixture({db:f.db,local:f.local,session:storage(f.session.values)}),b={id:'owner-b'};
  const results=await Promise.allSettled([f.api.adopt({user,verifyAccount:verified}),other.api.adopt({user:b,verifyAccount:async()=>b})]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(results.filter(result=>result.status==='rejected').length,1);
  assert.equal(f.local.values.size,1);assert.ok(f.db.records.get(bundleKey(ticket.draftId)).ownerId);
});
test('same-owner repeated adoption does not overwrite subsequent account edits',async()=>{
  const f=fixture(),editor=form();await f.api.prepareAuth(editor);const savedTicket=f.session.getItem(PENDING);
  const result=await f.api.adopt({user,verifyAccount:verified}),data=JSON.parse(f.local.getItem(result.draftKey));data.shared.address='Edited after adoption';f.local.setItem(result.draftKey,JSON.stringify(data));
  f.session.setItem(PENDING,savedTicket);const again=await f.api.adopt({user,verifyAccount:verified});assert.equal(again.data.shared.address,'Edited after adoption');
});
test('discard is source-only and its tombstone prevents stale-tab resurrection',async()=>{
  const f=fixture(),editor=form();const ticket=await f.api.prepareAuth(editor),stale=form();stale.dataset={...editor.dataset};
  await f.api.discard(editor);assert.equal(f.api.pending(),null);assert.equal(f.session.getItem(ACTIVE),null);assert.equal(editor.dataset.guestDraftId,undefined);assert.equal(f.db.records.get(bundleKey(ticket.draftId)).media,undefined);
  await assert.rejects(f.api.checkpoint(stale,{forAuth:false}),/discarded/);
});
test('successful-publication cleanup is idempotent, owner checked, and never deletes the owned draft',async()=>{
  const f=fixture(),editor=form();const ticket=await f.api.prepareAuth(editor);const result=await f.api.adopt({user,verifyAccount:verified});
  await assert.rejects(f.api.completeOwned(ticket.draftId,'owner-b'),/different account/);
  await f.api.completeOwned(ticket.draftId,user.id);await f.api.completeOwned(ticket.draftId,user.id);
  assert.equal(f.db.records.get(bundleKey(ticket.draftId)).media,undefined);assert.ok(f.local.getItem(result.draftKey));assert.ok(f.db.records.get(result.draftKey));
});
test('guest checkpoints reject edit/existing-property scope and invalid unit identity',async()=>{
  for(const mutate of [f=>{f.data.scope='property-other';},f=>{f.data.editVacancy='existing';},f=>{f.editors[1].dataset.requestId=f.editors[0].dataset.requestId;}]){
    const f=fixture(),editor=form();mutate(editor);await assert.rejects(f.api.prepareAuth(editor));assert.equal(f.db.records.size,0);assert.equal(f.api.pending(),null);
  }
});
test('cancelling during deferred identity verification prevents every adoption write',async()=>{
  const f=fixture(),editor=form(),ticket=await f.api.prepareAuth(editor);
  let release;const identity=new Promise(resolve=>{release=resolve;});
  const work=f.api.adopt({user,verifyAccount:()=>identity});f.api.clearPending();release(user);
  await assert.rejects(work,/cancelled or expired/);
  const saved=f.db.records.get(bundleKey(ticket.draftId));assert.equal(saved.ownerId,undefined);assert.equal(saved.media.length,2);assert.equal(f.db.records.has(ownedKey(ticket.draftId)),false);assert.equal(f.local.values.size,0);
});
test('expiry during identity verification prevents claiming the source',async()=>{
  const f=fixture(),editor=form(),ticket=await f.api.prepareAuth(editor);
  let release;const identity=new Promise(resolve=>{release=resolve;});
  const work=f.api.adopt({user,verifyAccount:()=>identity});f.advance(24*60*60*1000);release(user);
  await assert.rejects(work,/cancelled or expired/);assert.equal(f.db.records.get(bundleKey(ticket.draftId)).ownerId,undefined);assert.equal(f.local.values.size,0);
});
test('cancelling while a claim transaction waits prevents its media writes',async()=>{
  const f=fixture(),editor=form(),ticket=await f.api.prepareAuth(editor);f.db.delay=30;
  const work=f.api.adopt({user,verifyAccount:verified});await new Promise(resolve=>setTimeout(resolve,5));f.api.clearPending();
  await assert.rejects(work,/cancelled or expired/);assert.equal(f.db.records.get(bundleKey(ticket.draftId)).ownerId,undefined);assert.equal(f.db.records.has(ownedKey(ticket.draftId)),false);assert.equal(f.local.values.size,0);
});
test('cancelling after a claim keeps the source safe and stops metadata copy',async()=>{
  const f=fixture(),editor=form(),ticket=await f.api.prepareAuth(editor);
  let release,entered;const started=new Promise(resolve=>{entered=resolve;}),identity=new Promise(resolve=>{release=resolve;});let checks=0;
  const work=f.api.adopt({user,verifyAccount:()=>{if(++checks===2){entered();return identity;}return Promise.resolve(user);}});
  await started;f.api.clearPending();release(user);await assert.rejects(work,/cancelled or expired/);
  const saved=f.db.records.get(bundleKey(ticket.draftId));assert.equal(saved.ownerId,user.id);assert.equal(saved.media.length,2);assert.equal(f.local.values.size,0);assert.ok(f.db.records.get(ownedKey(ticket.draftId)));
});
async function interruptedClaim(f) {
  const editor=form(),ticket=await f.api.prepareAuth(editor);let checks=0;
  await assert.rejects(f.api.adopt({user,verifyAccount:async()=>{if(++checks===2)f.api.clearPending();return user;}}),/cancelled or expired/);
  return ticket;
}
test('same verified owner can explicitly recover an interrupted claim without automatic copying',async()=>{
  const f=fixture(),original=await interruptedClaim(f);f.advance(1000);
  const info=await f.api.recoveryInfo({user,verifyAccount:verified});assert.equal(info.draftId,original.draftId);assert.equal(info.ownerId,user.id);assert.equal(Object.hasOwn(info,'data'),false);assert.equal(f.api.pending(),null);
  const ticket=await f.api.recoverPending({user,verifyAccount:verified});assert.equal(ticket.draftId,original.draftId);assert.equal(ticket.revision,original.revision);assert.ok(ticket.createdAt>original.createdAt);assert.equal(f.local.values.size,0);
  const result=await f.api.adopt({user,verifyAccount:verified});assert.equal(result.data.shared.address,'Private address');assert.equal(result.media.length,2);
});
test('another account cannot discover or recover a claimed guest source',async()=>{
  const f=fixture(),ticket=await interruptedClaim(f),other={id:'owner-b',is_anonymous:false};
  assert.equal(await f.api.recoveryInfo({user:other,verifyAccount:async()=>other}),null);
  assert.equal(await f.api.recoverPending({user:other,verifyAccount:async()=>other}),null);assert.equal(f.api.pending(),null);assert.equal(f.local.values.size,0);assert.equal(f.db.records.get(bundleKey(ticket.draftId)).ownerId,user.id);
});
test('recovery only reads the same-tab active source and never scans saved bundles',async()=>{
  const f=fixture();await interruptedClaim(f);f.session.removeItem(ACTIVE);
  assert.equal(await f.api.recoveryInfo({user,verifyAccount:verified}),null);assert.equal(await f.api.recoverPending({user,verifyAccount:verified}),null);
  f.session.setItem(ACTIVE,randomUUID());assert.equal(await f.api.recoverPending({user,verifyAccount:verified}),null);assert.equal(f.api.pending(),null);
});
test('explicit recovery cancelled during account verification cannot recreate a ticket',async()=>{
  const f=fixture();await interruptedClaim(f);let release;const identity=new Promise(resolve=>{release=resolve;});
  const work=f.api.recoverPending({user,verifyAccount:()=>identity});f.api.clearPending();release(user);
  await assert.rejects(work,/recovery was cancelled/);assert.equal(f.api.pending(),null);assert.equal(f.local.values.size,0);
});
test('unclaimed recovery exposes only metadata and discarded sources are not offered',async()=>{
  const f=fixture(),editor=form(),ticket=await f.api.prepareAuth(editor);const info=await f.api.recoveryInfo({user,verifyAccount:verified});assert.equal(info.ownerId,null);assert.equal(info.draftId,ticket.draftId);assert.equal(Object.hasOwn(info,'data'),false);assert.equal(Object.hasOwn(info,'media'),false);assert.equal(Object.hasOwn(info,'accountId'),false);
  await f.api.discard(ticket.draftId);f.session.setItem(ACTIVE,ticket.draftId);assert.equal(await f.api.recoveryInfo({user,verifyAccount:verified}),null);
});
test('an expired unclaimed auth ticket can be explicitly resumed after same-tab sign-in',async()=>{
  const f=fixture(),editor=form(),original=await f.api.prepareAuth(editor);f.advance(24*60*60*1000);assert.equal(f.api.pending(),null);
  const info=await f.api.recoveryInfo({user,verifyAccount:verified});assert.equal(info.ownerId,null);assert.equal(info.draftId,original.draftId);assert.equal(f.api.pending(),null);assert.equal(f.local.values.size,0);
  const ticket=await f.api.recoverPending({user,verifyAccount:verified});assert.equal(ticket.draftId,original.draftId);assert.ok(ticket.createdAt>original.createdAt);assert.equal(f.db.records.get(bundleKey(original.draftId)).ownerId,undefined);assert.equal(f.local.values.size,0);
  const result=await f.api.adopt({user,verifyAccount:verified});assert.equal(result.ownerId,user.id);assert.equal(result.data.shared.address,'Private address');assert.equal(result.media.length,2);
});
test('unclaimed recovery stops if another account claims the source during verification',async()=>{
  const f=fixture(),editor=form(),ticket=await f.api.prepareAuth(editor);f.api.clearPending();let checks=0;
  await assert.rejects(f.api.recoverPending({user,verifyAccount:async()=>{if(++checks===3)f.db.records.get(bundleKey(ticket.draftId)).ownerId='owner-b';return user;}}),/saved draft changed/);
  assert.equal(f.api.pending(),null);assert.equal(f.local.values.size,0);assert.equal(f.db.records.get(bundleKey(ticket.draftId)).ownerId,'owner-b');
});
