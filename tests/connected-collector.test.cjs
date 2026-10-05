const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
const source=fs.readFileSync('app/src/connected-journey.js','utf8');
function setup({blocked=false,failed=false}={}){
 const batches=[],listeners={},storage=new Map();let active;
 const store={getItem(k){if(blocked)throw Error('blocked');return storage.get(k)||null},setItem(k,v){if(blocked)throw Error('blocked');storage.set(k,v)}};
 const env={crypto,URL,URLSearchParams,TextEncoder,Date,performance,console,navigator:{userAgent:'desktop'},location:{hash:'#list/new',pathname:'/',search:'?utm_source=ad-test&utm_campaign=launch',hostname:'localhost'},localStorage:store,sessionStorage:store,setTimeout:()=>1,clearTimeout(){},renderList:async()=>{},parseHash:()=>({name:'list',id:'new'}),addEventListener(){},document:{referrer:'',addEventListener(k,v){listeners[k]=v},querySelector(){return active}},VACANCY_BACKEND:{async recordConnectedJourney(events){batches.push(structuredClone(events))},async createListing(){if(failed)throw Error('original failure');return 'saved'},async createRoomVacancyForProperty(){return 'saved'},async uploadListingImages(){return true},async reconfirmVacancy(){return true}}};env.window=env;
 vm.runInNewContext(source,env);
 return{env,batches,form(edit=false){const f={dataset:{journeyStep:'0'},closest:()=>({dataset:{mode:edit?'edit':'new'}})};active=f;return f;}};
}
test('actual transitions, stable draft identity, new journey and request linking',async()=>{
 const {env,batches,form}=setup(),a=form();env.VACANCY_CONNECTED_JOURNEY.step(a,0);env.VACANCY_CONNECTED_JOURNEY.step(a,1);env.VACANCY_CONNECTED_JOURNEY.step(a,2);
 const saved=a.dataset.connectedJourney;await env.VACANCY_BACKEND.createListing({requestId:crypto.randomUUID()});
 const resumed=form();resumed.dataset.connectedJourney=saved;env.VACANCY_CONNECTED_JOURNEY.step(resumed,0);
 assert.equal(JSON.parse(resumed.dataset.connectedJourney).id,JSON.parse(saved).id);
 const other=form();env.VACANCY_CONNECTED_JOURNEY.step(other,0);assert.notEqual(JSON.parse(other.dataset.connectedJourney).id,JSON.parse(saved).id);
 await env.VACANCY_CONNECTED_JOURNEY.flush();const events=batches.flat(),steps=events.filter(e=>e.event_name==='step_ready');
 assert.equal(steps[0].from_step,0);assert.equal(steps[0].to_step,1);assert.equal(steps[0].previous_event_id,events.find(e=>e.event_name==='listing_started').event_id);
 const submit=events.find(e=>e.event_name==='publish_clicked');assert.ok(submit.unit_request_id);assert.equal(submit.to_step,3);assert.equal(submit.from_step,2);
 assert.ok(events.every(e=>!('user_id'in e)&&!e.route.includes('#')&&!('address'in e)));
});
test('storage denied never prevents publication; ordinary edit excluded; original errors preserved',async()=>{
 const {env,batches,form}=setup({blocked:true,failed:true}),f=form();env.VACANCY_CONNECTED_JOURNEY.step(f,0);await assert.rejects(env.VACANCY_BACKEND.createListing({requestId:crypto.randomUUID()}),/original failure/);
 const edit=form(true);env.VACANCY_CONNECTED_JOURNEY.step(edit,0);assert.equal(edit.dataset.connectedJourney,undefined);
 await env.VACANCY_CONNECTED_JOURNEY.flush();assert.equal(batches.flat().filter(e=>e.event_name==='journey_error').length,1);
});
test('legacy resumes are marked and queue stays bounded',async()=>{
 const {env,batches,form}=setup(),f=form();f.dataset.restoredLegacyDraft='true';env.VACANCY_CONNECTED_JOURNEY.step(f,2);await env.VACANCY_CONNECTED_JOURNEY.flush();assert.equal(batches.flat().find(e=>e.event_name==='listing_started').journey_mode,'legacy');
 batches.length=0;for(let i=0;i<140;i++)env.VACANCY_CONNECTED_JOURNEY.track('list_property_clicked');for(let i=0;i<8;i++)await env.VACANCY_CONNECTED_JOURNEY.flush();assert.equal(batches.flat().length,100);assert.ok(batches.every(b=>b.length<=20&&Buffer.byteLength(JSON.stringify(b))<32768));
});
