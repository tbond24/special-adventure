const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {test}=require('node:test');
const {File}=require('node:buffer');

const source=fs.readFileSync(path.join(__dirname,'../app/src/listing-draft-media.js'),'utf8');
const key='vacancy-listing-draft-v2:owner-one:new-property';
function fixture(){
 const input={},unit={dataset:{requestId:'unit-one'},querySelector:()=>input};
 const form={isConnected:true,dataset:{draftOwnerId:'owner-one'},key,querySelectorAll:()=>[unit]};
 const photo=new File(['saved bytes'],'saved.png',{type:'image/png',lastModified:123});
 const state={reads:[],rendered:0,photo,form,input,rows:[{id:'unit-one',files:[photo]}],selected:[]};
 const context=vm.createContext({File,WeakMap,Promise,Set,Error,currentUser:{id:'owner-one'},listingDraftKey:f=>f.key,
  selectedPhotoFiles:()=>state.selected,photoSelections:new WeakMap(),
  appendPhotoFiles:(_,files)=>{state.appended=files},renderPhotoSelection:()=>state.rendered++});
 context.window=context;vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/src/listing-draft-storage.js'),'utf8'),context);
 vm.runInContext(source,context);
 context.draftMediaStore=async(mode,readKey)=>{state.reads.push([mode,readKey]);return state.rows};
 state.restore=draft=>context.restoreDraftMedia(form,draft);
 state.stored=()=>context.photoSelections.get(input);return state;
}

for(const [name,pointer]of [['missing',undefined],['legacy explicit',key],['new pointer',key+':media:123e4567-e89b-42d3-a456-426614174000']]){
 test(name+' media restores exact File bytes without writing or syncing',async()=>{
  const f=fixture();await f.restore({savedMedia:true,...(pointer===undefined?{}:{_draftMediaKey:pointer})});
  assert.deepEqual(f.reads,[['get',pointer||key]]);assert.equal(f.stored()[0],f.photo);
  assert.equal(await f.stored()[0].text(),'saved bytes');assert.equal(f.rendered,1);assert.equal(f.form.dataset.restoringMedia,undefined);
 });
}
for(const [name,pointer]of [
 ['foreign owner','vacancy-listing-draft-v2:owner-two:new-property:media:uuid'],
 ['foreign draft','vacancy-listing-draft-v2:owner-one:edit-other:media:uuid'],
 ['same key prefix with different scope',key+'-other:media:uuid'],
 ['near media delimiter',key+':media-other:uuid'],
 ['number',5],['object',{key}],['array',[key]],
])test(name+' pointer is rejected before any IndexedDB read',async()=>{
 const f=fixture();await assert.rejects(f.restore({savedMedia:true,_draftMediaKey:pointer}),/does not match this draft/);
 assert.deepEqual(f.reads,[]);assert.equal(f.stored(),undefined);assert.equal(f.rendered,0);
});
test('a draft without saved media performs no read',async()=>{const f=fixture();await f.restore({_draftMediaKey:key+':media:uuid'});assert.deepEqual(f.reads,[]);});
test('missing pointer row fails without using stale legacy media',async()=>{const f=fixture();f.rows=undefined;await assert.rejects(f.restore({savedMedia:true,_draftMediaKey:key+':media:uuid'}),/storage is missing/);assert.deepEqual(f.reads,[['get',key+':media:uuid']]);assert.equal(f.stored(),undefined);});
for(const reason of ['detached','changed draft'])test(reason+' during storage read cannot apply photos',async()=>{
 const f=fixture();const promise=f.restore({savedMedia:true,_draftMediaKey:key+':media:uuid'});
 if(reason==='detached')f.form.isConnected=false;else f.form.key=key+'-other';await promise;assert.equal(f.stored(),undefined);assert.equal(f.rendered,0);
});
test('existing photo-mapping validation remains active',async()=>{const f=fixture();f.rows=[{id:'other-unit',files:[f.photo]}];await assert.rejects(f.restore({savedMedia:true,_draftMediaKey:key+':media:uuid'}),/mapping is incomplete/);assert.equal(f.stored(),undefined);});
