// Actual backend session functions; all credentials and HTTP responses are synthetic.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('app/src/backend.js','utf8');
const sessionKey='vacancy-session-v01';
const makeSession=(id,{expired=false,revision=1}={})=>({
  access_token:['synthetic',Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+(expired?-60:3600),revision})).toString('base64url'),'synthetic'].join('.'),
  refresh_token:`synthetic-refresh-${id}-${revision}`,user:{id,is_anonymous:false}
});
const subject=token=>JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub;
const response=(data,status=200)=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(data)});
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve}};
function fixture(handler,{stored=new Map()}={}){
  const calls=[],events={};
  const context={Date,URLSearchParams,AbortSignal,console,
    atob:value=>Buffer.from(value,'base64').toString('binary'),
    localStorage:{getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value),removeItem:key=>stored.delete(key)},
    addEventListener:(name,listener)=>(events[name]??=[]).push(listener),
    fetch:async(url,options={})=>{
      const parsed=new URL(url),call={path:parsed.pathname,query:parsed.search,method:options.method||'GET',body:options.body?JSON.parse(options.body):null,owner:options.headers?.Authorization?subject(options.headers.Authorization.slice(7)):null};
      calls.push(call);
      if(handler){const result=await handler(call);if(result!==undefined)return result;}
      if(call.path==='/auth/v1/user')return response({id:call.owner,is_anonymous:false});
      if(call.path==='/auth/v1/logout')return response({});
      throw new Error(`Unexpected synthetic request: ${call.path}${call.query}`);
    }};
  context.window=context;vm.createContext(context);vm.runInContext(source,context);
  return {api:context.VACANCY_BACKEND,stored,calls,
    setSession:value=>value?stored.set(sessionKey,JSON.stringify(value)):stored.delete(sessionKey),
    storageEvent:key=>(events.storage||[]).forEach(listener=>listener({key})),
    owner:()=>{const value=context.VACANCY_BACKEND.session();return value?subject(value.access_token):null;}};
}
const isRefresh=call=>call.path==='/auth/v1/token'&&call.query==='?grant_type=refresh_token';
function delayedRefresh(handler){
  const started=deferred(),release=deferred();
  const f=fixture(async call=>{if(isRefresh(call)){started.resolve();await release.promise;return handler(call)}});
  return {...f,started:started.promise,release:release.resolve};
}

test('a valid same-origin session survives a fresh application instance without a refresh',async()=>{
  const first=fixture();first.setSession(makeSession('A'));
  const second=fixture(undefined,{stored:first.stored});
  assert.equal((await second.api.currentUser()).id,'A');
  assert.equal(second.calls.filter(isRefresh).length,0);
});

test('a persisted expired access token is refreshed and the rotated session is saved',async()=>{
  const first=fixture();first.setSession(makeSession('A',{expired:true}));
  const second=fixture(call=>isRefresh(call)?response(makeSession('A',{revision:2})):undefined,{stored:first.stored});
  assert.equal((await second.api.currentUser()).id,'A');
  assert.equal(second.calls.filter(isRefresh).length,1);
  assert.equal(second.api.session().refresh_token,'synthetic-refresh-A-2');
});

test('concurrent callers share one refresh for the unchanged session',async()=>{
  const f=delayedRefresh(()=>response(makeSession('A',{revision:2})));
  f.setSession(makeSession('A',{expired:true}));
  const first=f.api.currentUser(),second=f.api.currentUser();await f.started;
  assert.equal(f.calls.filter(isRefresh).length,1);f.release();
  assert.equal((await first).id,'A');assert.equal((await second).id,'A');
});

test('a delayed successful refresh cannot restore credentials after explicit logout',async()=>{
  const f=delayedRefresh(()=>response(makeSession('A',{revision:2})));
  f.setSession(makeSession('A',{expired:true}));
  const user=f.api.currentUser();await f.started;await f.api.signOut();
  assert.equal(f.api.session(),null);f.release();
  assert.equal(await user,null);assert.equal(f.api.session(),null);
  assert.equal(f.calls.find(call=>call.path==='/auth/v1/logout').query,'?scope=global');
});

test('a delayed successful refresh cannot overwrite a newer account from another tab',async()=>{
  const f=delayedRefresh(()=>response(makeSession('A',{revision:2})));
  f.setSession(makeSession('A',{expired:true}));const user=f.api.currentUser();await f.started;
  f.setSession(makeSession('B')); // The value check works even before the storage event is delivered.
  f.release();assert.equal((await user).id,'B');assert.equal(f.owner(),'B');
});

test('a delayed successful refresh preserves a newer rotation of the same account',async()=>{
  const f=delayedRefresh(()=>response(makeSession('A',{revision:2})));
  f.setSession(makeSession('A',{expired:true}));const user=f.api.currentUser();await f.started;
  f.setSession(makeSession('A',{revision:3}));f.release();
  assert.equal((await user).id,'A');assert.equal(f.api.session().refresh_token,'synthetic-refresh-A-3');
});

for(const status of [400,401,503])test(`stale refresh ${status} cannot clear or fail a newer account`,async()=>{
  const f=delayedRefresh(()=>response({message:'Synthetic error'},status));
  f.setSession(makeSession('A',{expired:true}));const user=f.api.currentUser();await f.started;
  f.setSession(makeSession('B'));f.release();assert.equal((await user).id,'B');assert.equal(f.owner(),'B');
});

test('a stale refresh network error cannot disturb a newer account',async()=>{
  const f=delayedRefresh(()=>{throw new TypeError('Synthetic network failure')});
  f.setSession(makeSession('A',{expired:true}));const user=f.api.currentUser();await f.started;
  f.setSession(makeSession('B'));f.release();assert.equal((await user).id,'B');assert.equal(f.owner(),'B');
});

test('completion of an obsolete refresh does not release another account’s refresh lock',async()=>{
  const startedA=deferred(),startedB=deferred(),releaseA=deferred(),releaseB=deferred();
  const f=fixture(async call=>{if(isRefresh(call)){
    const isA=call.body.refresh_token==='synthetic-refresh-A-1';
    (isA?startedA:startedB).resolve();await(isA?releaseA:releaseB).promise;
    return response(makeSession(isA?'A':'B',{revision:2}));
  }});
  f.setSession(makeSession('A',{expired:true}));const a=f.api.currentUser();await startedA.promise;
  f.setSession(makeSession('B',{expired:true}));const b=f.api.currentUser();await startedB.promise;
  releaseA.resolve();await new Promise(resolve=>setImmediate(resolve));
  const anotherB=f.api.currentUser();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.calls.filter(isRefresh).length,2);
  releaseB.resolve();assert.equal((await a).id,'B');assert.equal((await b).id,'B');assert.equal((await anotherB).id,'B');
  assert.equal(f.api.session().refresh_token,'synthetic-refresh-B-2');
});

for(const status of [200,503])test(`delayed logout ${status} cannot remove a newer login`,async()=>{
  const started=deferred(),release=deferred();
  const f=fixture(async call=>{if(call.path==='/auth/v1/logout'){started.resolve();await release.promise;return response({},status)}});
  f.setSession(makeSession('A'));const logout=f.api.signOut();const result=logout.then(()=>null,error=>error);await started.promise;
  assert.equal(f.api.session(),null); // Clear immediately, even while remote revocation is pending.
  f.setSession(makeSession('B'));release.resolve();const error=await result;
  assert.equal(Boolean(error),status!==200);assert.equal(f.owner(),'B');
  assert.equal(f.calls[0].owner,'A');assert.equal(f.calls[0].query,'?scope=global');
});

test('a delayed user response cannot restore identity after logout',async()=>{
  const started=deferred(),release=deferred();const f=fixture(async call=>{if(call.path==='/auth/v1/user'){started.resolve();await release.promise;return response({id:'A'})}});
  f.setSession(makeSession('A'));const user=f.api.currentUser();await started.promise;await f.api.signOut();release.resolve();
  assert.equal(await user,null);assert.equal(f.api.session(),null);
});

for(const status of [200,401,503])test(`delayed user ${status} rechecks a newer account rather than returning old identity`,async()=>{
  const started=deferred(),release=deferred();const f=fixture(async call=>{if(call.path==='/auth/v1/user'&&call.owner==='A'){started.resolve();await release.promise;return response(status===200?{id:'A'}:{message:'Synthetic error'},status)}});
  f.setSession(makeSession('A'));const user=f.api.currentUser();await started.promise;f.setSession(makeSession('B'));release.resolve();
  assert.equal((await user).id,'B');assert.equal(f.owner(),'B');assert.equal(f.calls.filter(isRefresh).length,0);
});

test('a delayed retry user failure cannot clear a newer account',async()=>{
  const started=deferred(),release=deferred();let reads=0;
  const f=fixture(async call=>{
    if(isRefresh(call))return response(makeSession('A',{revision:2}));
    if(call.path==='/auth/v1/user'&&call.owner==='A'){
      if(++reads===1)return response({message:'Synthetic expired token'},401);
      started.resolve();await release.promise;return response({message:'Synthetic denied token'},401);
    }
  });
  f.setSession(makeSession('A'));const user=f.api.currentUser();await started.promise;
  f.setSession(makeSession('B'));release.resolve();assert.equal((await user).id,'B');assert.equal(f.owner(),'B');
});

test('switching to an expired newer account during a retry refresh starts its own refresh',async()=>{
  const started=deferred(),release=deferred();let readsA=0;
  const f=fixture(async call=>{
    if(isRefresh(call)){
      if(call.body.refresh_token==='synthetic-refresh-A-1'){started.resolve();await release.promise;return response(makeSession('A',{revision:2}));}
      return response(makeSession('B',{revision:2}));
    }
    if(call.path==='/auth/v1/user'&&call.owner==='A'){readsA++;return response({},401);}
  });
  f.setSession(makeSession('A'));const user=f.api.currentUser();await started.promise;
  f.setSession(makeSession('B',{expired:true}));release.resolve();
  assert.equal((await user).id,'B');assert.equal(readsA,1);
  assert.equal(f.api.session().refresh_token,'synthetic-refresh-B-2');
  assert.equal(f.calls.filter(isRefresh).length,2);
});

test('a newer fresh account receives its own auth retry instead of inheriting a stale retry',async()=>{
  const started=deferred(),release=deferred();let readsB=0;
  const f=fixture(async call=>{
    if(isRefresh(call)){
      if(call.body.refresh_token==='synthetic-refresh-A-1'){started.resolve();await release.promise;return response(makeSession('A',{revision:2}));}
      return response(makeSession('B',{revision:2}));
    }
    if(call.path==='/auth/v1/user'&&(call.owner==='A'||++readsB===1))return response({},401);
  });
  f.setSession(makeSession('A'));const user=f.api.currentUser();await started.promise;
  f.setSession(makeSession('B'));release.resolve();
  assert.equal((await user).id,'B');assert.equal(f.api.session().refresh_token,'synthetic-refresh-B-2');
  assert.equal(f.calls.filter(isRefresh).length,2);
});

for(const status of [400,401])test(`a confirmed refresh rejection ${status} clears only the unchanged session`,async()=>{
  const f=fixture(call=>isRefresh(call)?response({message:'Synthetic invalid refresh'},status):undefined);
  f.setSession(makeSession('A',{expired:true}));assert.equal(await f.api.currentUser(),null);assert.equal(f.api.session(),null);
});

test('a confirmed user rejection after retry clears the unchanged session',async()=>{
  const f=fixture(call=>isRefresh(call)?response(makeSession('A',{revision:2})):response({message:'Synthetic denied token'},401));
  f.setSession(makeSession('A'));assert.equal(await f.api.currentUser(),null);assert.equal(f.api.session(),null);
});

for(const networkFailure of [false,true])test(`transient refresh ${networkFailure?'network':'503'} failure preserves stored credentials`,async()=>{
  const f=fixture(call=>{if(isRefresh(call)){if(networkFailure)throw new TypeError('Synthetic network failure');return response({},503)}});
  f.setSession(makeSession('A',{expired:true}));await assert.rejects(f.api.currentUser());assert.equal(f.owner(),'A');
});

test('a transient user lookup failure preserves a valid persisted session',async()=>{
  const f=fixture(call=>call.path==='/auth/v1/user'?response({},503):undefined);
  f.setSession(makeSession('A'));await assert.rejects(f.api.currentUser());assert.equal(f.owner(),'A');
});

test('a transient retried user failure preserves the successfully refreshed session',async()=>{
  let reads=0;const f=fixture(call=>isRefresh(call)?response(makeSession('A',{revision:2})):response({},++reads===1?401:503));
  f.setSession(makeSession('A'));await assert.rejects(f.api.currentUser());assert.equal(f.api.session().refresh_token,'synthetic-refresh-A-2');
});

test('a cross-tab storage clear invalidates an in-flight refresh',async()=>{
  const f=delayedRefresh(()=>response(makeSession('A',{revision:2})));
  f.setSession(makeSession('A',{expired:true}));const user=f.api.currentUser();await f.started;
  f.setSession(null);f.storageEvent(null);f.release();assert.equal(await user,null);assert.equal(f.api.session(),null);
});

test('two independent tab instances preserve the newest stored rotation when refresh replies reverse',async()=>{
  const stored=new Map(),startedA=deferred(),startedB=deferred(),releaseA=deferred(),releaseB=deferred();
  const first=fixture(async call=>{if(isRefresh(call)){startedA.resolve();await releaseA.promise;return response(makeSession('A',{revision:2}));}},{stored});
  const second=fixture(async call=>{if(isRefresh(call)){startedB.resolve();await releaseB.promise;return response(makeSession('A',{revision:3}));}},{stored});
  first.setSession(makeSession('A',{expired:true}));
  const one=first.api.currentUser(),two=second.api.currentUser();await Promise.all([startedA.promise,startedB.promise]);
  releaseB.resolve();assert.equal((await two).id,'A');
  releaseA.resolve();assert.equal((await one).id,'A');
  assert.equal(first.api.session().refresh_token,'synthetic-refresh-A-3');
  assert.equal(second.api.session().refresh_token,'synthetic-refresh-A-3');
});
