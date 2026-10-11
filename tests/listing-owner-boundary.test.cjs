// Real backend authorization boundaries, with every HTTP request answered locally.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const {File} = require('node:buffer');
const backendSource = fs.readFileSync('app/src/backend.js', 'utf8');
const entrySource = fs.readFileSync('app/src/listing-guest-entry.js', 'utf8');
const sessionKey = 'vacancy-session-v01';
const ownerA = 'synthetic-owner-a', ownerB = 'synthetic-owner-b';
const token = id => ['synthetic', Buffer.from(JSON.stringify({sub:id, exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'), 'synthetic'].join('.');
const subject = value => JSON.parse(Buffer.from(value.split('.')[1], 'base64url')).sub;
const response = (body, beforeRead) => ({ok:true,status:200,text:async()=>{beforeRead?.();return JSON.stringify(body);}});
function backendFixture({onUserRead, onMediaRead} = {}) {
  const stored = new Map(), calls = [], media = [];
  let userReads = 0, mediaReads = 0;
  const setOwner = id => id ? stored.set(sessionKey,JSON.stringify({access_token:token(id),user:{id,is_anonymous:false}})) : stored.delete(sessionKey);
  setOwner(ownerA);
  const context = {crypto:webcrypto,File,Blob,Date,URLSearchParams,console,
    atob:value=>Buffer.from(value,'base64').toString('binary'),
    localStorage:{getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value),removeItem:key=>stored.delete(key)},
    fetch:async(url,options={})=>{
      const path = new URL(url).pathname, method = options.method || 'GET';
      const owner = options.headers?.Authorization ? subject(options.headers.Authorization.slice(7)) : null;
      calls.push({path,method,owner});
      if(path==='/auth/v1/user')return response({id:owner,is_anonymous:false},()=>onUserRead?.({number:++userReads,setOwner}));
      if(path==='/rest/v1/vacancies')return response([{id:'vacancy-a',room_id:'room-a',rooms:{properties:{owner_id:ownerA}}}]);
      if(path==='/rest/v1/media'&&method==='GET')return response(media,()=>onMediaRead?.({number:++mediaReads,setOwner}));
      if(path==='/rest/v1/media'&&method==='POST'){
        const row={...JSON.parse(options.body),id:'media-a'};media.push(row);return response([row]);
      }
      if(path.startsWith('/storage/v1/object/room-media/'))return response({});
      throw new Error('Unexpected synthetic request: '+method+' '+path);
    }};
  context.window=context;vm.createContext(context);vm.runInContext(backendSource,context);
  return {api:context.VACANCY_BACKEND,calls,setOwner};
}
const photo = () => new File(['local photo bytes'],'draft.jpg',{type:'image/jpeg',lastModified:1});

test('account verification rejects a stale user response after the stored account changes',async()=>{
  const f=backendFixture({onUserRead:({setOwner})=>setOwner(ownerB)});
  await assert.rejects(f.api.verifyListingAccount(ownerA),/account changed/i);
});

test('account verification rejects sign-out while the user response is in flight',async()=>{
  const f=backendFixture({onUserRead:({setOwner})=>setOwner(null)});
  await assert.rejects(f.api.verifyListingAccount(ownerA),/account changed/i);
});

test('photo upload sends no POST if the account switches after the last media ownership read',async()=>{
  const f=backendFixture({onMediaRead:({number,setOwner})=>{if(number===2)setOwner(ownerB);}});
  await assert.rejects(f.api.withListingAccount(ownerA,()=>f.api.uploadListingImages('vacancy-a',[photo()])),/account changed/i);
  assert.deepEqual(f.calls.filter(call=>call.method==='POST'),[]);
});

test('unchanged owner can upload and link a photo through the real backend functions',async()=>{
  const f=backendFixture();
  await f.api.withListingAccount(ownerA,()=>f.api.uploadListingImages('vacancy-a',[photo()]));
  const writes=f.calls.filter(call=>call.method==='POST');
  assert.equal(writes.length,2);
  assert.ok(writes[0].path.startsWith('/storage/v1/object/room-media/'+ownerA+'/room-a/'));
  assert.equal(writes[1].path,'/rest/v1/media');
  assert.ok(writes.every(call=>call.owner===ownerA));
});

test('publishing reserves its owner lock before asynchronous verification',async()=>{
  const f=backendFixture(),entered=[];let release;
  const first=f.api.withListingAccount(ownerA,()=>new Promise(resolve=>{entered.push('first');release=resolve;}));
  const second=f.api.withListingAccount(ownerA,async()=>{entered.push('second');});
  const resultsPromise=Promise.allSettled([first,second]);
  await new Promise(resolve=>setImmediate(resolve));
  release?.();
  const results=await resultsPromise;
  assert.deepEqual(entered,['first']);
  assert.equal(results[0].status,'fulfilled');
  assert.equal(results[1].status,'rejected');
  assert.match(results[1].reason.message,/already being published/i);
  // A rejected overlapping attempt must not leave the lock stuck.
  await f.api.withListingAccount(ownerA,async()=>{});
});

function entryFixture(hash='#auth') {
  let pending=true,completeAdoption;
  const events={},stored=new Map(),navigation=[];
  const context={URLSearchParams,location:{hash},currentUser:{id:ownerA,is_anonymous:false},
    VACANCY_GUEST_DRAFT:{pending:()=>pending,clearPending:()=>{pending=false;},adopt:()=>new Promise(resolve=>{completeAdoption=resolve;})},
    VACANCY_BACKEND:{verifyListingAccount:async()=>({id:ownerA,is_anonymous:false})},
    sessionStorage:{getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)},
    localStorage:{getItem:()=>null},document:{querySelector:()=>null},renderAuth(){},renderList(){},
    nav:(name,id)=>{navigation.push(id?name+'/'+id:name);context.location.hash='#'+navigation.at(-1);},
    toast(){},clearTimeout,listingDraftTimers:new WeakMap(),
    atob:value=>Buffer.from(value,'base64').toString('binary'),
    addEventListener:(name,fn)=>(events[name]??=[]).push(fn)};
  context.window=context;vm.createContext(context);vm.runInContext(entrySource,context);
  return {context,stored,navigation,pending:()=>pending,
    emit:(name,event)=>events[name]?.forEach(fn=>fn(event)),
    complete:()=>completeAdoption({draftKey:'vacancy-listing-draft-v2:'+ownerA+':new-property:guest-synthetic'})};
}

test('leaving authentication during adoption prevents stale review navigation',async()=>{
  const f=entryFixture(),work=f.context.VACANCY_LISTING_GUEST_ENTRY.resumeAfterAuth();
  f.context.location.hash='#account';f.emit('hashchange');f.complete();await work;
  assert.equal(f.pending(),false);assert.equal(f.stored.size,0);assert.deepEqual(f.navigation,[]);
});

test('an account switch during adoption invalidates it even without an owner form on screen',async()=>{
  const f=entryFixture(),work=f.context.VACANCY_LISTING_GUEST_ENTRY.resumeAfterAuth();
  f.emit('storage',{key:sessionKey,newValue:JSON.stringify({user:{id:ownerB},access_token:token(ownerB)})});
  f.complete();await work;
  assert.equal(f.context.currentUser,null);assert.equal(f.stored.size,0);assert.deepEqual(f.navigation,['auth']);
});

test('a fresh non-auth page cancels stale intent while a credential callback preserves it',()=>{
  assert.equal(entryFixture('#home').pending(),false);
  assert.equal(entryFixture('#access_token=synthetic&refresh_token=synthetic').pending(),true);
});
