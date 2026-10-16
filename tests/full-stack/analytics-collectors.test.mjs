import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
const kinds=[['v1','lister-journey-analytics.js','VACANCY_LISTER_JOURNEY','recordListerJourney'],['v2','connected-journey.js','VACANCY_CONNECTED_JOURNEY','recordConnectedJourney']];
function setup(file,exportName,rpc,{blocked=false}={}){
 const storage=new Map(),timers=new Map(),batches=[];let serial=0,handler=async()=>{},productError=false;
 const store={getItem(k){if(blocked)throw Error('denied');return storage.get(k)||null},setItem(k,v){if(blocked)throw Error('denied');storage.set(k,v)}};
 const backend={async createListing(){if(productError)throw Error('original product failure');return 'actual product result'},async createRoomVacancyForProperty(){return 'room'},async uploadListingImages(){return true},async reconfirmVacancy(){return true},async signUp(){return {access_token:'test-only-noncredential'}},async updateGuestEmail(){},async setGuestUpgradePassword(){}};
 backend[rpc]=async events=>{batches.push(structuredClone(events));return handler(events);};
 const env={crypto:{randomUUID},URL,URLSearchParams,TextEncoder,Date,performance,navigator:{userAgent:'desktop'},location:{hash:'#list/new',pathname:'/',search:'',hostname:'localhost'},localStorage:store,sessionStorage:store,
 setTimeout(fn,ms){timers.set(++serial,{fn,ms});return serial},clearTimeout(id){timers.delete(id)},renderList:async()=>{},parseHash:()=>({name:'list',id:'new'}),addEventListener(){},
 document:{referrer:'',hidden:false,addEventListener(){},removeEventListener(){},querySelector(){return null}},VACANCY_BACKEND:backend};env.window=env;
 vm.runInNewContext(readFileSync(new URL('../../app/src/'+file,import.meta.url),'utf8'),env);
 return {api:env[exportName],batches,timers,backend,handler(fn){handler=fn},productError(){productError=true}};
}
for(const [kind,file,name,rpc]of kinds){
 test(kind+' preserves detached in-flight batch while new events overflow the bounded queue',async()=>{
  const h=setup(file,name,rpc);await h.api.flush();h.batches.length=0;let release;const gate=new Promise(r=>release=r);let hold=true;
  h.handler(async()=>{if(hold){hold=false;await gate;}});
  for(let i=0;i<20;i++)h.api.track('list_property_clicked');
  const first=h.api.flush();for(let i=0;i<140;i++)h.api.track('list_property_clicked');await h.api.flush();assert.equal(h.batches.length,1);
  release();await first;for(let i=0;i<7;i++)await h.api.flush();const all=h.batches.flat();
  assert.equal(all.length,120);assert.equal(new Set(all.map(x=>x.event_id)).size,120);
  assert.ok(h.batches.every(b=>b.length<=20&&Buffer.byteLength(JSON.stringify(b))<30000));
 });
 test(kind+' retries identical event IDs at most three times with backoff then continues newer events',async()=>{
  const h=setup(file,name,rpc);await h.api.flush();h.batches.length=0;let failures=3;h.handler(async()=>{if(failures-->0)throw Error('rate limited');});
  for(let i=0;i<25;i++)h.api.track('list_property_clicked');
  await h.api.flush();assert.ok([...h.timers.values()].some(t=>t.ms===5000));await h.api.flush();await h.api.flush();await h.api.flush();
  assert.equal(h.batches.length,4);for(let i=1;i<3;i++)assert.deepEqual(h.batches[i],h.batches[0]);assert.equal(h.batches[3].length,5);assert.notEqual(h.batches[3][0].event_id,h.batches[0][0].event_id);
 });
 test(kind+' oversized queued item cannot block smaller subsequent events',async()=>{
  const h=setup(file,name,rpc);await h.api.flush();h.batches.length=0;
  h.api.track('list_property_clicked',{campaign:'x'.repeat(31000)});h.api.track('list_property_clicked');await h.api.flush();await h.api.flush();
  assert.equal(h.batches.flat().length,1);assert.ok(h.batches.every(b=>Buffer.byteLength(JSON.stringify(b))<30000));
 });
 test(kind+' blocked storage and analytics failure preserve original product results/errors',async()=>{
  const h=setup(file,name,rpc,{blocked:true});h.handler(async()=>{throw Error('analytics unavailable')});
  assert.equal(await h.backend.createListing({requestId:randomUUID()}),'actual product result');await h.api.flush();h.productError();
  await assert.rejects(h.backend.createListing({requestId:randomUUID()}),/original product failure/);
 });
}
