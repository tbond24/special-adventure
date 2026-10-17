const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function fixture(send,overrides={}){const env={window:null,currentUser:null,navigator:{userAgent:'ordinary browser'},location:{hash:'#home'},TextEncoder,AbortController,setTimeout:()=>1,clearTimeout(){},Promise,...overrides};env.window=env;vm.runInNewContext(fs.readFileSync('app/src/analytics-controls.js','utf8'),env);return {env,q:env.VACANCY_ANALYTICS.queue(send)}}
test('in-flight batch acknowledgement cannot remove events appended during the send',async()=>{
 let release;const batches=[],{q}=fixture(async e=>{batches.push(e);if(batches.length===1)await new Promise(r=>release=r)});
 for(let i=0;i<20;i++)q.push({event_id:String(i)});const first=q.flush();for(let i=20;i<120;i++)q.push({event_id:String(i)});release();await first;
 assert.equal(q.stats().queued,80);while(q.stats().queued)await q.flush();assert.equal(batches.flat().length,100);assert.equal(new Set(batches.flat().map(e=>e.event_id)).size,100);assert.equal(q.stats().dropped,20);
});
test('three failures drop only that bounded batch and preserve product independence',async()=>{
 const {q}=fixture(async()=>{throw Error('offline')});for(let i=0;i<35;i++)q.push({event_id:String(i)});for(let i=0;i<3;i++)await q.flush();assert.equal(q.stats().queued,15);assert.equal(q.stats().dropped,20);
});
test('account switch, admin routes and bots discard queued telemetry before sending',async()=>{
 const batches=[],{env,q}=fixture(async e=>batches.push(e));q.push({event_id:'anon'});env.currentUser={id:'member'};await q.flush();assert.equal(batches.length,0);
 env.location.hash='#admin';assert.equal(q.push({event_id:'admin'}),null);env.location.hash='#home';env.navigator.userAgent='crawler';assert.equal(q.push({event_id:'bot'}),null);
});
test('oversized events cannot stall the head of the queue; routes never retain full URLs',async()=>{
 const batches=[],{env,q}=fixture(async e=>batches.push(e));assert.equal(q.push({event_id:'oversized',text:'x'.repeat(40000)}),null);q.push({event_id:'small'});await q.flush();assert.equal(batches.flat().length,1);
 for(const route of ['#messages/private-id?password=bad','https://example.invalid/private','/private/address'])assert.equal(env.VACANCY_ANALYTICS.route(route),'other');assert.equal(env.VACANCY_ANALYTICS.route('#detail/uuid'),'listing');
});

test('a never-settling transport is aborted and the queue can subsequently recover',async()=>{
 const timers=new Map();let id=0,first=true,signal;
 const {q}=fixture(async(events,options)=>{signal=options.signal;if(first){first=false;await new Promise(()=>{});}}, {setTimeout(fn,ms){timers.set(++id,{fn,ms});return id;},clearTimeout(key){timers.delete(key);}});
 q.push({event_id:'retry-after-timeout'});const pending=q.flush();
 const deadline=[...timers.values()].find(t=>t.ms===15000);assert.ok(deadline);deadline.fn();await pending;
 assert.equal(signal.aborted,true);assert.equal(q.stats().pending,false);assert.equal(q.stats().queued,1);
 await q.flush();assert.equal(q.stats().queued,0);assert.equal(q.stats().dropped,0);
});

test('UTF-8 byte bounds split multibyte events and reject oversized text without stalling',async()=>{
 const batches=[],{q}=fixture(async events=>batches.push(events));
 assert.equal(q.push({event_id:'too-large',text:'😀'.repeat(8000)}),null);
 q.push({event_id:'first',text:'😀'.repeat(4000)});q.push({event_id:'second',text:'😀'.repeat(4000)});
 while(q.stats().queued)await q.flush();
 assert.equal(batches.length,2);assert.deepEqual(batches.flat().map(e=>e.event_id),['first','second']);
 assert.ok(batches.every(b=>Buffer.byteLength(JSON.stringify(b))<30000));assert.equal(q.stats().dropped,1);
});
