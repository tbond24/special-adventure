const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app/src/listing-draft-media.js'),'utf8');
function fixture(){
 const timers=new Map(),records=new Map(),storage=new Map();let sequence=0,opening,lastTx,failMetadata=false;
 const state={records,storage,openMode:'normal',transactionMode:'normal',opens:0,puts:0,aborts:0,closes:0};
 const db={objectStoreNames:{contains:()=>true},close(){state.closes++},transaction(){if(state.transactionMode==='throw')throw Error('transaction unavailable');const tx=lastTx={abort(){state.aborts++},objectStore(){return {get(key){const req={};queueMicrotask(()=>{req.result=records.get(key);req.onsuccess?.();if(state.transactionMode!=='hang')tx.oncomplete?.()});return req},put(value,key){if(state.transactionMode==='quota')throw Error('photo quota');state.puts++;const req={};queueMicrotask(()=>{if(state.transactionMode==='hang')return;records.set(key,value);state.onPut?.(key,value);req.onsuccess?.();tx.oncomplete?.()});return req},delete(key){const req={};queueMicrotask(()=>{records.delete(key);req.onsuccess?.();tx.oncomplete?.()});return req}}}};return tx}};
 const context={setTimeout(fn){const id=++sequence;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)},indexedDB:{open(){state.opens++;if(state.openMode==='throw')throw Error('open unavailable');opening={result:db};if(state.openMode==='normal')queueMicrotask(()=>opening.onsuccess());if(state.openMode==='blocked')queueMicrotask(()=>opening.onblocked());return opening}},localStorage:{getItem:key=>storage.get(key)||null,setItem(key,value){if(failMetadata)throw Error('metadata quota');storage.set(key,value)}},crypto:{randomUUID:()=>String(++sequence)},VACANCY_LISTING_STORAGE:{assertCurrent(){}},currentUser:{id:'owner'},listingDraftKey:form=>form.dataset.key,console};
 vm.createContext(context);vm.runInContext(source,context);
 return {...state,state,context,form:{isConnected:true,dataset:{key:'draft:owner:one',draftOwnerId:'owner'}},timeout(){const all=[...timers.values()];for(const fn of all)fn()},lateOpen(){opening.onsuccess()},failMetadata(){failMetadata=true},restoreMetadata(){failMetadata=false},store:(...args)=>context.draftMediaStore(...args),checkpoint:(...args)=>context.writeListingCheckpoint(...args)};
}
const fields=address=>({version:1,scope:'new-property',shared:{address},units:[{_requestId:'unit'}]}),photos=()=>[{id:'unit',files:[{name:'one.jpg'}]}];
for(const mode of ['throw','blocked','hang'])test(`IDB ${mode} open settles and any late success cannot start a transaction`,async()=>{
 const f=fixture();f.state.openMode=mode;const pending=f.store('put','key',photos());const check=assert.rejects(pending,/open unavailable|blocking|timed out/);await Promise.resolve();if(mode==='hang')f.timeout();await check;if(mode!=='throw'){f.lateOpen();assert.equal(f.state.puts,0);assert.equal(f.state.closes,1)}
});
for(const mode of ['throw','quota','hang'])test(`IDB ${mode} transaction settles without claiming a saved draft`,async()=>{
 const f=fixture();f.state.transactionMode=mode;const pending=f.store('put','key',photos());const check=assert.rejects(pending,/unavailable|quota|timed out/);await Promise.resolve();if(mode==='hang')f.timeout();await check;assert.equal(f.records.size,0);
});
test('unchanged media checkpoints reuse durable bytes across field-only changes',async()=>{
 const f=fixture(),media=photos(),first=fields('first');await f.checkpoint(f.form,first,media);const mediaKey=first._draftMediaKey;await f.checkpoint(f.form,fields('second'),media);
 assert.equal(f.state.puts,1);assert.equal(JSON.parse(f.storage.get(f.form.dataset.key))._draftMediaKey,mediaKey);assert.equal(JSON.parse(f.storage.get(f.form.dataset.key)).shared.address,'second');
});
test('metadata quota after new media commit retains the prior reachable fields and bytes',async()=>{
 const f=fixture(),oldMedia=photos(),first=fields('old');await f.checkpoint(f.form,first,oldMedia);const old=f.storage.get(f.form.dataset.key);f.failMetadata();
 await assert.rejects(f.checkpoint(f.form,fields('new'),[{id:'new-unit',files:[{name:'new.jpg'}]}]),/metadata quota/);
 assert.equal(f.storage.get(f.form.dataset.key),old);assert.equal(f.records.get(first._draftMediaKey),oldMedia);assert.equal(f.records.size,1);f.restoreMetadata();await f.checkpoint(f.form,fields('retry'),photos());assert.equal(JSON.parse(f.storage.get(f.form.dataset.key)).shared.address,'retry');
});
test('editor/account changes after media commit never replace reachable local metadata',async()=>{
 const f=fixture(),first=fields('old');await f.checkpoint(f.form,first,photos());const old=f.storage.get(f.form.dataset.key);f.form.dataset.accountChanged='true';
 await assert.rejects(f.checkpoint(f.form,fields('new'),photos()),/account changed/);assert.equal(f.storage.get(f.form.dataset.key),old);
});
test('uncertain readback after successful pointer publication never deletes observed media',async()=>{
 const f=fixture(),first=fields('first');await f.checkpoint(f.form,first,photos());const old=f.storage.get(f.form.dataset.key);
 f.context.localStorage.getItem=()=>old;
 await assert.rejects(f.checkpoint(f.form,fields('published but uncertain'),photos()),/could not be verified/);
 const published=JSON.parse(f.storage.get(f.form.dataset.key));assert.equal(published.shared.address,'published but uncertain');assert.ok(f.records.has(published._draftMediaKey));assert.ok(f.records.has(first._draftMediaKey));assert.equal(f.records.size,2);
});

for(const kind of ['fields','photos','deleted'])test(`a stale editor cannot replace another tab's ${kind} checkpoint`,async()=>{
 const f=fixture(),media=photos(),first=fields('old');await f.checkpoint(f.form,first,media);
 const next={...JSON.parse(f.storage.get(f.form.dataset.key))};if(kind==='fields')next.shared={address:'other tab'};if(kind==='photos')next._draftMediaKey=f.form.dataset.key+':media:other-tab';if(kind==='deleted')f.storage.delete(f.form.dataset.key);else f.storage.set(f.form.dataset.key,JSON.stringify(next));
 const raw=f.storage.get(f.form.dataset.key),puts=f.state.puts;await assert.rejects(f.checkpoint(f.form,fields('old'),media),/newer device draft/);assert.equal(f.storage.get(f.form.dataset.key),raw);assert.equal(f.state.puts,puts);
});
test('another tab changing the checkpoint during photo IDB write preserves its metadata and bytes',async()=>{
 const f=fixture(),first=fields('old');await f.checkpoint(f.form,first,photos());const other={...first,shared:{address:'other tab'},_draftMediaKey:f.form.dataset.key+':media:other'};f.records.set(other._draftMediaKey,photos());const raw=JSON.stringify(other);
 f.state.onPut=()=>f.storage.set(f.form.dataset.key,raw);await assert.rejects(f.checkpoint(f.form,fields('local changed'),photos()),/newer device draft/);assert.equal(f.storage.get(f.form.dataset.key),raw);assert.ok(f.records.has(other._draftMediaKey));assert.equal(f.records.size,2);
});
test('account acknowledgements and timestamps do not block later same-editor checkpoints',async()=>{
 const f=fixture(),media=photos(),first=fields('first');await f.checkpoint(f.form,first,media);const ack={...first,savedAt:123,_accountDraft:{revision:1,synced:true}};f.storage.set(f.form.dataset.key,JSON.stringify(ack));await f.checkpoint(f.form,fields('second'),media);assert.equal(JSON.parse(f.storage.get(f.form.dataset.key)).shared.address,'second');
});

test('first checkpoint rejects another tab creating metadata during its photo write',async()=>{
 const f=fixture(),other={...fields('other tab'),_draftMediaKey:f.form.dataset.key+':media:other'};const raw=JSON.stringify(other);f.records.set(other._draftMediaKey,photos());f.state.onPut=()=>f.storage.set(f.form.dataset.key,raw);
 await assert.rejects(f.checkpoint(f.form,fields('first local'),photos()),/newer device draft/);assert.equal(f.storage.get(f.form.dataset.key),raw);assert.equal(f.records.size,1);
});
test('restored v2 cache without a pointer can checkpoint against its effective base-row pointer',async()=>{
 const f=fixture(),data={...fields('cached'),savedMedia:true},input={},unit={dataset:{requestId:'unit'},querySelector:()=>input};const media=[{id:'unit',files:[new (require('node:buffer').File)(['bytes'],'one.png',{type:'image/png'})]}];
 Object.assign(f.context,{File:require('node:buffer').File,selectedPhotoFiles:()=>[],photoSelections:new Map(),renderPhotoSelection(){}});f.form.querySelectorAll=()=>[unit];f.storage.set(f.form.dataset.key,JSON.stringify(data));f.records.set(f.form.dataset.key,media);await f.context.restoreDraftMedia(f.form,data);await f.checkpoint(f.form,fields('edited cache'),media);assert.equal(JSON.parse(f.storage.get(f.form.dataset.key)).shared.address,'edited cache');assert.equal(f.state.puts,0);
});

for(const mode of ['open','transaction'])test(`hung media ${mode} checkpoint settles after one timeout without starting cleanup storage`,async()=>{
 const f=fixture(),first=fields('previous');await f.checkpoint(f.form,first,photos());const raw=f.storage.get(f.form.dataset.key),opens=f.state.opens;let outcome;
 if(mode==='open')f.state.openMode='hang';else f.state.transactionMode='hang';
 const pending=f.checkpoint(f.form,fields('not durable'),photos()).then(()=>{outcome={ok:true}},error=>{outcome={error}});
 for(let i=0;i<4;i++)await Promise.resolve();f.timeout();for(let i=0;i<8;i++)await Promise.resolve();
 assert.equal(f.state.opens,opens+1,'a failed put must not start a second potentially hung IDB operation');assert.match(outcome?.error?.message||'',/timed out/);assert.equal(f.storage.get(f.form.dataset.key),raw);assert.ok(f.records.has(first._draftMediaKey));await pending;
});
