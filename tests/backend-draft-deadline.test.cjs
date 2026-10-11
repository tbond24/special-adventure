// Actual backend code, fake clock and synthetic responses; no live account or network.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('app/src/backend.js','utf8');
const sessionKey='vacancy-session-v01';
const draftPath='/rest/v1/rpc/commit_listing_draft';
const response=(value,status=200)=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(value)});
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve}};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const subject=token=>JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub;
const isRefresh=call=>call.path==='/auth/v1/token';
const isDraft=call=>call.path===draftPath;
function fixture(handler){
  let now=Date.now(),nextTimer=0;
  const timers=new Map(),stored=new Map(),calls=[];
  class Clock extends Date{static now(){return now}}
  const makeSession=(owner='A',{expired=false,revision=1}={})=>({
    access_token:['synthetic',Buffer.from(JSON.stringify({sub:owner,exp:Math.floor(now/1000)+(expired?-60:3600),revision})).toString('base64url'),'synthetic'].join('.'),
    refresh_token:`synthetic-refresh-${owner}-${revision}`
  });
  const setSession=value=>value?stored.set(sessionKey,JSON.stringify(value)):stored.delete(sessionKey);
  const context={Date:Clock,URLSearchParams,AbortController,console,
    setTimeout:(run,delay)=>{const id=++nextTimer;timers.set(id,{run,at:now+delay});return id},
    clearTimeout:id=>timers.delete(id),
    atob:value=>Buffer.from(value,'base64').toString('binary'),
    localStorage:{getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value),removeItem:key=>stored.delete(key)},
    fetch:async(url,options={})=>{
      const parsed=new URL(url),call={path:parsed.pathname,query:parsed.search,...options};calls.push(call);
      const supplied=await handler?.(call);if(supplied!==undefined)return supplied;
      if(call.path==='/auth/v1/user')return response({id:subject(call.headers.Authorization.slice(7))});
      if(call.path==='/auth/v1/logout')return response({});
      if(isDraft(call))return response({saved:true});
      throw new Error('Unexpected synthetic request: '+call.path);
    }};
  context.window=context;vm.createContext(context);vm.runInContext(source,context);setSession(makeSession());
  return {api:context.VACANCY_BACKEND,calls,timers,setSession,makeSession,
    advance:(ms,{run=true}={})=>{now+=ms;if(run)for(const [id,timer] of [...timers])if(timer.at<=now&&timers.delete(id))timer.run()},
    draft:options=>context.VACANCY_BACKEND.draftRequest('A',draftPath,{method:'POST',body:'{}',...options})};
}
const timeout=code=>error=>error.name==='TimeoutError'&&error.code===code;

test('successful draft requests retain owner authorization, caller options and timer cleanup',async()=>{
  const f=fixture();const result=await f.draft({headers:{Prefer:'return=representation'}});
  assert.equal(result.saved,true);assert.equal(f.calls.length,1);
  assert.equal(subject(f.calls[0].headers.Authorization.slice(7)),'A');
  assert.equal(f.calls[0].headers.Prefer,'return=representation');
  assert.equal(f.calls[0].signal.aborted,false);assert.equal(f.timers.size,0);
});

test('a stalled draft fetch aborts and rejects on deadline even if fetch ignores the signal',async()=>{
  const pending=deferred();let reads=0,attempt=0;
  const f=fixture(call=>isDraft(call)&&++attempt===1?pending.promise:undefined);
  const rejected=assert.rejects(f.draft(),timeout('NETWORK_ERROR'));await flush();
  f.advance(15000);await rejected;assert.equal(f.calls[0].signal.aborted,true);
  assert.equal(f.timers.size,0);assert.equal((await f.draft()).saved,true);
  pending.resolve({ok:true,text:async()=>{reads++;return '{}'}});await flush();
  assert.equal(reads,0,'Late fetch responses are not consumed');
});

for(const responseType of ['json','blob'])test(`the draft deadline includes a stalled ${responseType} response body`,async()=>{
  const pending=deferred();let reading=false;
  const f=fixture(call=>isDraft(call)?{ok:true,status:200,
    [responseType==='blob'?'blob':'text']:()=>{reading=true;return pending.promise}}:undefined);
  const rejected=assert.rejects(f.draft({responseType}),timeout('NETWORK_ERROR'));await flush();assert.equal(reading,true);
  f.advance(15000);await rejected;assert.equal(f.calls[0].signal.aborted,true);assert.equal(f.timers.size,0);
  pending.resolve(responseType==='blob'?new Blob(['synthetic bytes']):'{}');await flush();
});

test('session refresh, draft fetch and body consumption share one total draft deadline',async()=>{
  const refresh=deferred(),fetch=deferred(),body=deferred();
  const f=fixture(call=>isRefresh(call)?refresh.promise:isDraft(call)?fetch.promise:undefined);
  f.setSession(f.makeSession('A',{expired:true}));
  const rejected=assert.rejects(f.draft(),timeout('NETWORK_ERROR'));await flush();
  f.advance(6000);refresh.resolve(response(f.makeSession('A',{revision:2})));await flush();
  const draft=f.calls.find(isDraft);assert.ok(draft);assert.equal(f.timers.size,1);
  f.advance(6000);fetch.resolve({ok:true,status:200,text:()=>body.promise});await flush();
  f.advance(2999);assert.equal(draft.signal.aborted,false);
  f.advance(1);await rejected;assert.equal(draft.signal.aborted,true);
  body.resolve('{}');await flush();assert.equal(f.timers.size,0);
});

test('draft timeout leaves shared refresh pending and valid eventual refresh sends no late draft request',async()=>{
  const pending=deferred();const f=fixture(call=>isRefresh(call)?pending.promise:undefined);
  const original=f.makeSession('A',{expired:true});f.setSession(original);
  const rejected=assert.rejects(f.draft(),error=>timeout('NETWORK_ERROR')(error)&&/reload this page/.test(error.message));await flush();
  f.advance(15000);await rejected;assert.equal(f.calls.some(isDraft),false);assert.equal(f.calls[0].signal,undefined);
  assert.equal(f.api.session().access_token,original.access_token);assert.equal(f.timers.size,0);
  let completed=false;const user=f.api.currentUser().then(value=>{completed=true;return value});await flush();
  assert.equal(completed,false);assert.equal(f.calls.filter(isRefresh).length,1,'The original refresh stays shared');
  pending.resolve(response(f.makeSession('A',{revision:2})));assert.equal((await user).id,'A');await flush();
  assert.equal(f.calls.some(isDraft),false);assert.equal(f.api.session().refresh_token,'synthetic-refresh-A-2');
});

test('repeated draft timeouts do not clear or restart the pending global refresh',async()=>{
  const pending=deferred();const f=fixture(call=>isRefresh(call)?pending.promise:undefined);
  const original=f.makeSession('A',{expired:true});f.setSession(original);
  for(let attempt=0;attempt<2;attempt++){
    const rejected=assert.rejects(f.draft(),timeout('NETWORK_ERROR'));await flush();f.advance(15000);await rejected;
    assert.equal(f.calls.filter(isRefresh).length,1);assert.equal(f.api.session().access_token,original.access_token);
    assert.equal(f.calls.some(isDraft),false);assert.equal(f.timers.size,0);
  }
  pending.resolve(response(f.makeSession('A',{revision:2})));await flush();
  assert.equal(f.calls.some(isDraft),false);assert.equal((await f.draft()).saved,true);
  assert.equal(f.calls.filter(isRefresh).length,1);assert.equal(f.calls.filter(isDraft).length,1);
});

for(const status of [200,401])test(`a stalled refresh body cannot hold a draft past its deadline; eventual ${status} retains normal auth behavior`,async()=>{
  const body=deferred();let reading=false,completed=false;
  const f=fixture(call=>isRefresh(call)?{ok:status===200,status,text:()=>{reading=true;return body.promise}}:undefined);
  const original=f.makeSession('A',{expired:true});f.setSession(original);
  const user=f.api.currentUser().then(value=>{completed=true;return value});
  const rejected=assert.rejects(f.draft(),timeout('NETWORK_ERROR'));await flush();assert.equal(reading,true);
  f.advance(15000);await rejected;assert.equal(completed,false);assert.equal(f.calls[0].signal,undefined);
  assert.equal(f.api.session().access_token,original.access_token);assert.equal(f.calls.filter(isRefresh).length,1);
  body.resolve(JSON.stringify(status===200?f.makeSession('A',{revision:2}):{message:'Synthetic refresh rejection'}));
  const result=await user;await flush();
  if(status===200){assert.equal(result.id,'A');assert.equal(f.api.session().refresh_token,'synthetic-refresh-A-2');}
  else{assert.equal(result,null);assert.equal(f.api.session(),null);}
  assert.equal(f.calls.some(isDraft),false);assert.equal(f.timers.size,0);
});

test('a late shared refresh after a draft timeout still preserves a newer account',async()=>{
  const pending=deferred();const f=fixture(call=>isRefresh(call)?pending.promise:undefined);
  f.setSession(f.makeSession('A',{expired:true}));const rejected=assert.rejects(f.draft(),timeout('NETWORK_ERROR'));await flush();
  f.advance(15000);await rejected;f.setSession(f.makeSession('B'));
  pending.resolve(response(f.makeSession('A',{revision:2})));await flush();
  assert.equal(subject(f.api.session().access_token),'B');assert.equal(f.calls.some(isDraft),false);
  assert.equal((await f.api.currentUser()).id,'B');
});

test('cancelling a draft while waiting for refresh leaves a shared auth caller intact and sends no draft',async()=>{
  const pending=deferred(),controller=new AbortController();
  const f=fixture(call=>isRefresh(call)?pending.promise:undefined);f.setSession(f.makeSession('A',{expired:true}));
  const user=f.api.currentUser(),reason=new Error('Synthetic navigation cancellation');
  const rejected=assert.rejects(f.draft({signal:controller.signal}),error=>error===reason);await flush();
  controller.abort(reason);await rejected;assert.equal(f.calls[0].signal,undefined);
  pending.resolve(response(f.makeSession('A',{revision:2})));assert.equal((await user).id,'A');await flush();
  assert.equal(f.calls.some(isDraft),false);assert.equal(f.timers.size,0);
});

test('an already-aborted caller signal starts neither refresh nor draft fetch',async()=>{
  const controller=new AbortController();controller.abort();const f=fixture();f.setSession(f.makeSession('A',{expired:true}));
  await assert.rejects(f.draft({signal:controller.signal}),error=>error.name==='AbortError');
  assert.equal(f.calls.length,0);assert.equal(f.timers.size,0);
});

test('caller cancellation during draft body reading reaches the fetch signal',async()=>{
  const pending=deferred(),controller=new AbortController();
  const f=fixture(call=>isDraft(call)?{ok:true,status:200,text:()=>pending.promise}:undefined);
  const rejected=assert.rejects(f.draft({signal:controller.signal}),error=>error.name==='AbortError');await flush();
  controller.abort();await rejected;assert.equal(f.calls[0].signal.aborted,true);assert.equal(f.timers.size,0);
  pending.resolve('{}');await flush();
});

for(const stage of ['refresh','fetch','body'])test(`account switching during draft ${stage} still rejects the old owner`,async()=>{
  const pending=deferred();
  const f=fixture(call=>stage==='refresh'&&isRefresh(call)||stage==='fetch'&&isDraft(call)?pending.promise:
    stage==='body'&&isDraft(call)?{ok:true,status:200,text:()=>pending.promise}:undefined);
  if(stage==='refresh')f.setSession(f.makeSession('A',{expired:true}));
  const rejected=assert.rejects(f.draft(),/account changed/i);await flush();f.setSession(f.makeSession('B'));
  pending.resolve(stage==='body'?'{}':response(stage==='refresh'?f.makeSession('A',{revision:2}):{}));await rejected;
  if(stage==='refresh')assert.equal(f.calls.some(isDraft),false);
  assert.equal(subject(f.api.session().access_token),'B');assert.equal(f.timers.size,0);
});

test('elapsed wall time blocks a late fetch continuation before delayed timer delivery',async()=>{
  const pending=deferred();let reads=0;const f=fixture(call=>isDraft(call)?pending.promise:undefined);
  const rejected=assert.rejects(f.draft(),timeout('NETWORK_ERROR'));await flush();
  f.advance(15000,{run:false});pending.resolve({ok:true,text:async()=>{reads++;return '{}'}});await rejected;
  assert.equal(reads,0);assert.equal(f.calls[0].signal.aborted,true);assert.equal(f.timers.size,0);
});

test('invalid draft paths are rejected before any timed work or network call',async()=>{
  const f=fixture();await assert.rejects(f.api.draftRequest('A','/auth/v1/user'),/Invalid draft service path/);
  assert.equal(f.calls.length,0);assert.equal(f.timers.size,0);
});
