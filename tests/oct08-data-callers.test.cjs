const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app/src/backend.js'),'utf8');
function backend(handler){
 const values=new Map(),calls=[];const token='x.'+Buffer.from(JSON.stringify({exp:4000000000})).toString('base64url')+'.x';
 values.set('vacancy-session-v01',JSON.stringify({access_token:token,user:{id:'owner'}}));
 const context={window:{URL},URL,URLSearchParams,AbortSignal,Response,Blob,File,crypto:globalThis.crypto,atob,localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)},location:{origin:'https://example.test',pathname:'/',hash:''},history:{replaceState(){}},marketForCountry:()=>({code:'KE'}),fetch:async(url,options={})=>{calls.push({url,options,body:typeof options.body==='string'?JSON.parse(options.body):options.body});return handler?handler(url,options):Response.json({id:'owner'});}};
 vm.runInNewContext(source,context);return {api:context.window.VACANCY_BACKEND,calls,values};
}
test('global logout surfaces backend failure while clearing local credentials',async()=>{
 const {api,values}=backend(()=>Response.json({message:'Unable to revoke sessions'},{status:503}));await assert.rejects(api.signOut(),/Unable to revoke sessions/);assert.equal(values.has('vacancy-session-v01'),false);
});
test('global logout succeeds on empty successful response',async()=>{const {api,values}=backend(()=>new Response(null,{status:204}));await api.signOut();assert.equal(values.has('vacancy-session-v01'),false);});
test('atomic caller retains exact amounts, private-name clearing, tri-state overrides and zero coordinates',async()=>{
 const {api,calls}=backend(()=>Response.json('vacancy'));await api.updateListingAtomic('vacancy',{rentAmount:'1,234,567,890.55',deposit:'200,000,000.25',country:'Kenya',publicLatitude:0,publicLongitude:0,smokingOverride:'',petsOverride:'true'}, {rules:[{label:'Smoking',allowed:false}]},'');
 const call=calls[0];assert.match(call.url,/rpc\/update_listing_atomic$/);assert.equal(call.body.p_input.p_rent_amount,'1234567890.55');assert.equal(call.body.p_input.p_deposit,'200000000.25');assert.equal(call.body.p_private_name,'');assert.equal(call.body.p_input.p_smoking_override,null);assert.equal(call.body.p_input.p_pets_override,true);assert.equal(call.body.p_latitude,0);assert.equal(call.body.p_longitude,0);assert.equal(call.body.p_details.rules[0].allowed,false);
});
test('legacy updateListing API retains unchanged payload and exact amount validation',async()=>{
 const {api,calls}=backend(()=>Response.json('vacancy'));await api.updateListing('vacancy',{rentAmount:'.5',deposit:'0.',country:'Kenya'});assert.match(calls[0].url,/rpc\/update_vacancy_listing_v2$/);assert.equal(calls[0].body.p_rent_amount,'0.5');assert.equal(calls[0].body.p_deposit,'0');await assert.rejects(api.updateListing('vacancy',{rentAmount:'invalid',country:'Kenya'}),/positive rent amount/);assert.equal(calls.length,1);
});
function detailsBackend(){return backend((url,options)=>{
 if(url.includes('/auth/v1/user'))return Response.json({id:'owner'});
 if(url.includes('/vacancies?'))return Response.json([{id:'vacancy',rooms:{id:'room',properties:{id:'property',owner_id:'owner'}},monthly_rent:10}]);
 if(url.includes('/rooms?'))return Response.json([{id:'room'}]);
 return Response.json([]);
});}
test('explicit empty private name deletes label; omitted name preserves it',async()=>{
 const b=detailsBackend();await b.api.saveUnitListingDetails('vacancy',{},'');assert.equal(b.calls.filter(c=>c.url.includes('room_private_names?')&&c.options.method==='DELETE').length,1);
 const omitted=detailsBackend();await omitted.api.saveUnitListingDetails('vacancy',{});assert.equal(omitted.calls.filter(c=>c.url.includes('room_private_names?')&&c.options.method==='DELETE').length,0);
});
test('named label remains trimmed upsert',async()=>{const b=detailsBackend();await b.api.saveUnitListingDetails('vacancy',{},'  A1  ');const call=b.calls.find(c=>c.url.includes('room_private_names?on_conflict'));assert.equal(call.body.name,'A1');});
test('existing-listing duplicate applies complete unit options and private label',()=>{
 const text=fs.readFileSync(require('node:path').join(__dirname,'../app/src/stage101-listing-journey.js'),'utf8');const fn=text.slice(text.indexOf('  function applyDuplicateToForm(form){'),text.indexOf('  window.beginVacancyDuplicate='));
 const name={value:''},legend={},fields=new Map();let copied;const unit={querySelector:selector=>selector==='.unit-name-input'?name:selector==='legend'?legend:fields.get(selector)||null,dispatchEvent:event=>copied=event.detail};
 const c={pendingDuplicate:{roomName:'Public title',privateName:'Private A1',unitDetails:{parkingSpaces:2,amenities:[{label:'Balcony'}]}},CustomEvent:class{constructor(type,options){this.type=type;Object.assign(this,options)}},toast:()=>{}};vm.createContext(c);vm.runInContext(fn,c);c.applyDuplicateToForm({querySelector:selector=>selector==='.unit-editor'?unit:null});assert.equal(name.value,'Private A1');assert.equal(legend.textContent,'Private A1');assert.equal(copied.parkingSpaces,2);assert.equal(copied.amenities[0].label,'Balcony');
});

function uploadBackend({partial=false,lostResponse=false,failedConfirmRead=false}={}){
 const media=Array.from({length:6},(_,n)=>({id:'old-'+n,storage_path:'old-'+n+'.jpg',sort_order:n,status:'active'})),objects=new Set();let failed=false,posts=0,confirmReadFailed=false;
 const b=backend((url,options)=>{
  if(url.includes('/auth/v1/user'))return Response.json({id:'owner'});
  if(url.includes('/vacancies?'))return Response.json([{room_id:'room',rooms:{properties:{owner_id:'owner'}}}]);
  if(url.includes('/media?')){if(failedConfirmRead&&failed&&!confirmReadFailed){confirmReadFailed=true;throw new TypeError('Read temporarily failed')}return Response.json(media);}
  if(url.includes('/storage/v1/object/public/'))return new Response(null,{status:200});
  if(url.includes('/storage/v1/object/room-media/')){if(partial&&options.body.name==='B.jpg'&&!failed){failed=true;return new Response('Try later',{status:503})}if(objects.has(url))return new Response('Exists',{status:409});objects.add(url);return Response.json({});}
  if(url.endsWith('/media')){const row=JSON.parse(options.body);if(media.some(m=>m.storage_path===row.storage_path))return Response.json({message:'unique violation'},{status:409});media.push({...row,id:'new-'+(++posts)});if(lostResponse&&!failed){failed=true;throw new TypeError('Lost response after commit')}return Response.json([media.at(-1)]);}
  throw new Error('Unexpected '+url);
 });return {...b,media,objects,posts:()=>posts};
}
const photo=(name,content=name)=>new File([content],name,{type:'image/jpeg',lastModified:123});
test('six existing plus A/B partial failure, reordered retry and same-file reselection never duplicate links',async()=>{
 const b=uploadBackend({partial:true}),A=photo('A.jpg'),B=photo('B.jpg');let error;try{await b.api.uploadListingImages('vacancy',[A,B],'edit-fixed')}catch(e){error=e}
 assert.ok(error);assert.equal(error.completedMedia.length,1);assert.equal(error.currentMedia.length,7);assert.equal(b.media.length,7);
 await b.api.uploadListingImages('vacancy',[B,A],'edit-fixed');assert.equal(b.media.length,8);assert.equal(b.posts(),2);
 await b.api.uploadListingImages('vacancy',[photo('A.jpg'),photo('B.jpg')],'edit-fixed');assert.equal(b.media.length,8);assert.equal(b.posts(),2);
 await assert.rejects(b.api.uploadListingImages('vacancy',[photo('A.jpg','changed bytes')],'edit-fixed'),/Maximum 8/);assert.equal(b.media.length,8);
});
test('lost metadata response is confirmed by exact server link and never inserted twice',async()=>{
 const b=uploadBackend({lostResponse:true});await b.api.uploadListingImages('vacancy',[photo('A.jpg')],'edit-fixed');await b.api.uploadListingImages('vacancy',[photo('A.jpg')],'edit-fixed');assert.equal(b.posts(),1);assert.equal(b.media.length,7);
});

test('later authoritative read reconciles a committed upload after both response and immediate read fail',async()=>{
 const b=uploadBackend({lostResponse:true,failedConfirmRead:true});let error;try{await b.api.uploadListingImages('vacancy',[photo('A.jpg'),photo('B.jpg')],'edit-fixed')}catch(e){error=e}assert.ok(error);assert.equal(error.currentMedia.length,7);assert.equal(error.completedMedia.length,1);assert.equal(error.completedMedia[0].index,0);await b.api.uploadListingImages('vacancy',[photo('B.jpg')],'edit-fixed');assert.equal(b.media.length,8);assert.equal(b.posts(),2);
});
