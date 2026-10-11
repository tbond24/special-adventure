const {test,expect}=require('@playwright/test');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {createCloud,install,owner,otherOwner}=require('../qa/account-drafts/synthetic-cloud.cjs');

// Serve this worktree only, on an ephemeral loopback port. The existing fixture
// intercepts every non-local request before navigation, including Auth/Storage.
test.use({serviceWorkers:'block'});
let server,origin;
test.beforeAll(async()=>{
 const root=path.resolve(__dirname,'../app');
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
 server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(error?'Not found':data)});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
});
test.afterAll(async()=>{await new Promise(resolve=>server.close(resolve))});

const unit='30000000-0000-4000-8000-000000000003';
const key='vacancy-listing-draft-v2:'+owner.id+':new-property';
const png=[...Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64')];
async function boot(page,context){
 const cloud=createCloud(),state=await install(context,cloud,{signedIn:owner});
 await page.goto(origin+'/#home');await page.waitForFunction(()=>typeof booting!=='undefined'&&!booting);return state;
}
async function seed(page,format){
 return page.evaluate(async({key,unit,ownerId,otherOwnerId,png,format})=>{
  const files=[1,2].map(n=>new File([new Uint8Array([...png,n])],'rollback-'+n+'.png',{type:'image/png',lastModified:123+n}));
  let pointer;
  if(format==='new')pointer=key+':media:'+crypto.randomUUID();
  if(format==='explicit-legacy')pointer=key;
  if(format==='foreign-owner')pointer='vacancy-listing-draft-v2:'+otherOwnerId+':new-property:media:'+crypto.randomUUID();
  if(format==='foreign-draft')pointer='vacancy-listing-draft-v2:'+ownerId+':edit-other:media:'+crypto.randomUUID();
  const data={version:1,scope:'new-property',savedMedia:true,editVacancy:null,
   shared:{propertyTitle:'Unsynced rollback fixture',country:'Kenya',city:'Nairobi',locality:'Westlands',address:'Device-only fixture address',publicLatitude:'-1.26',publicLongitude:'36.8'},
   units:[{_requestId:unit,_titleMode:'manual',roomName:'Unsynced rollback studio',unitType:'Studio',rentAmount:'25000',rentCurrency:'KES',rentPeriod:'month',description:'Exact device-only fields',_privateName:'Private rollback name'}],
   _accountDraft:{ownerId,sourceId:unit,revision:0,synced:false},...(pointer?{_draftMediaKey:pointer}:{})};
  await draftMediaStore('put',pointer||key,[{id:unit,files}]);
  // A stale legacy row must never take precedence over an explicit new pointer.
  if(pointer&&pointer!==key)await draftMediaStore('put',key,[{id:unit,files:[new File(['stale'],'stale-legacy.png',{type:'image/png',lastModified:1})]}]);
  const encoded=JSON.stringify(data);localStorage.setItem(key,encoded);
  window.__rollbackReads=[];const original=draftMediaStore;draftMediaStore=(mode,storageKey,value)=>{if(mode==='get')window.__rollbackReads.push(storageKey);return original(mode,storageKey,value)};
  return {encoded,pointer: pointer||key,files:await Promise.all(files.map(async file=>({name:file.name,type:file.type,lastModified:file.lastModified,bytes:[...new Uint8Array(await file.arrayBuffer())]})))};
 },{key,unit,ownerId:owner.id,otherOwnerId:otherOwner.id,png,format});
}
async function resume(page){
 await page.evaluate(()=>nav('list'));await page.locator('.local-draft-row [data-resume-draft]').click();
 await expect(page).toHaveURL(/#list\/new$/);const form=page.locator('#listingForm');
 await expect(form).toBeVisible();await expect(form).not.toHaveClass(/listing-accordion/);return form;
}
async function restored(form){
 await form.evaluate(f=>f._draftMediaRestore);
 return form.evaluate(async f=>({key:listingDraftKey(f),description:f.querySelector('[data-base-name=description]').value,
  title:f.querySelector('[data-base-name=roomName]').value,address:f.elements.address.value,
  owner:f.dataset.draftOwnerId,unit:f.querySelector('.unit-editor').dataset.requestId,
  files:await Promise.all(selectedPhotoFiles(f.querySelector('input[type=file]')).map(async file=>({name:file.name,type:file.type,lastModified:file.lastModified,bytes:[...new Uint8Array(await file.arrayBuffer())]})))}));
}
function noCloudWrites(state){
 expect(state.cloud.requests.filter(req=>!['GET','HEAD','OPTIONS'].includes(req.method))).toEqual([]);
 expect(state.cloud.publicWrites).toEqual([]);expect(state.cloud.heads.size).toBe(0);expect(state.cloud.objects.size).toBe(0);
 expect(state.authRequests).toEqual([]);expect(state.calls.filter(call=>!['ownerMediaLibrary','mediaLibraryFiles'].includes(call.method))).toEqual([]);
}
for(const format of ['new','legacy','explicit-legacy'])test(format+' unsynced media resumes through original UI, including reload, without cloud sync',async({page,context})=>{
 const state=await boot(page,context),saved=await seed(page,format),form=await resume(page);
 const expected={key,description:'Exact device-only fields',title:'Unsynced rollback studio',address:'Device-only fixture address',owner:owner.id,unit,files:saved.files};
 expect(await restored(form)).toEqual(expected);await expect(form.locator('.photo-selection-item')).toHaveCount(2);
 await expect(form.locator('.listing-accordion-section')).toHaveCount(0);expect(await page.evaluate(()=>window.__rollbackReads)).toEqual(expect.arrayContaining([saved.pointer]));expect(await page.evaluate(pointer=>window.__rollbackReads.every(read=>read===pointer),saved.pointer)).toBe(true);
 await page.waitForTimeout(1000);expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(saved.encoded);noCloudWrites(state);
 await page.reload();await page.waitForFunction(()=>typeof booting!=='undefined'&&!booting);const reopened=await resume(page);await expect(reopened.locator('.photo-selection-item')).toHaveCount(2);expect(await restored(reopened)).toEqual(expected);
 await page.waitForTimeout(1000);expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(saved.encoded);noCloudWrites(state);
});

const guestId='40000000-0000-4000-8000-000000000004';
async function seedGuest(page,kind='valid'){
 return page.evaluate(async({id,unit,png,kind,ownerId})=>{
  const files=[new File([new Uint8Array([...png,3])],'guest-device-only.png',{type:'image/png',lastModified:456})];
  const data={version:1,scope:'new-property',savedMedia:true,editVacancy:null,
   shared:{propertyTitle:'Guest rollback fixture',country:'Kenya',city:'Nairobi',locality:'Westlands',address:'Guest device-only address'},
   units:[{_requestId:unit,_titleMode:'manual',roomName:'Guest device-only studio',unitType:'Studio',rentAmount:'24000',rentCurrency:'KES',rentPeriod:'month',description:'Guest device-only fields'}]};
  const bundle={version:1,id:kind==='foreign-id'?crypto.randomUUID():id,revision:7,savedAt:Date.now(),data,media:[{id:unit,files}],...(kind==='claimed-owner'?{ownerId}:{})};
  await draftMediaStore('put','vacancy-guest-listing-bundle-v1:'+id,bundle);sessionStorage.setItem('vacancy-guest-listing-active-v1',id);
  return {files:await Promise.all(files.map(async file=>({name:file.name,type:file.type,lastModified:file.lastModified,bytes:[...new Uint8Array(await file.arrayBuffer())]}))),data};
 },{id:guestId,unit,png,kind,ownerId:owner.id});
}
async function enterGuest(page,{choose=false}={}){
 await page.evaluate(()=>nav('list','new'));
 // A valid active guest bundle automatically opens its original listing UI.
 if(choose){await page.locator('[data-listing-type=Residential]').click();await page.locator('[data-preset=Studio]').click();await page.getByRole('button',{name:'New property',exact:true}).click();}
 const form=page.locator('#listingForm');await expect(form).toBeVisible();await expect(form).toHaveAttribute('data-guest-draft-id',guestId);await expect(form).not.toHaveClass(/listing-accordion/);return form;
}
test('unchanged guest bundle format resumes and legacy checkpoint reloads exact bytes without account sync',async({page,context})=>{
 const state=await install(context);await page.goto(origin+'/#home');await page.waitForFunction(()=>typeof booting!=='undefined'&&!booting);
 const saved=await seedGuest(page),form=await enterGuest(page);await expect(form.locator('.photo-selection-item')).toHaveCount(1);
 const before=await restored(form);expect(before.files).toEqual(saved.files);expect(before.description).toBe('Guest device-only fields');expect(before.address).toBe('Guest device-only address');
 await page.waitForTimeout(1000);noCloudWrites(state);
 const checkpoint=await form.evaluate(f=>VACANCY_GUEST_DRAFT.checkpoint(f,{forAuth:false}));expect(checkpoint.revision).toBe(8);
 const shape=await page.evaluate(async id=>{const bundle=await draftMediaStore('get','vacancy-guest-listing-bundle-v1:'+id);return {keys:Object.keys(bundle).sort(),id:bundle.id,revision:bundle.revision,pointer:bundle.data._draftMediaKey||null}},guestId);
 expect(shape).toEqual({keys:['data','id','media','revision','savedAt','version'],id:guestId,revision:8,pointer:null});
 await page.goto(origin+'/#home');await page.waitForFunction(()=>typeof booting!=='undefined'&&!booting);const reopened=await enterGuest(page);await expect(reopened.locator('.photo-selection-item')).toHaveCount(1);expect(await restored(reopened)).toEqual(before);
 await page.waitForTimeout(1000);noCloudWrites(state);
});
for(const kind of ['foreign-id','claimed-owner'])test('guest '+kind+' bundle cannot restore another draft or owner media',async({page,context})=>{
 const state=await install(context);await page.goto(origin+'/#home');await page.waitForFunction(()=>typeof booting!=='undefined'&&!booting);await seedGuest(page,kind);
 const form=await enterGuest(page,{choose:true});const error=await form.evaluate(f=>Promise.resolve(f._draftMediaRestore).then(()=>null,error=>error.message));
 expect(error).toMatch(kind==='foreign-id'?/saved draft is unavailable/:/linked to a signed-in account/);
 await expect(form.locator('.photo-selection-item')).toHaveCount(0);await expect(form.locator('[data-base-name=description]')).not.toHaveValue('Guest device-only fields');noCloudWrites(state);
});
for(const format of ['foreign-owner','foreign-draft'])test(format+' pointer is rejected without reading or exposing its photos',async({page,context})=>{
 const state=await boot(page,context),saved=await seed(page,format),form=await resume(page);
 const error=await form.evaluate(f=>Promise.resolve(f._draftMediaRestore).then(()=>null,error=>error.message));expect(error).toBe('Saved photos unavailable');
 await expect(form.locator('.photo-selection-item')).toHaveCount(0);
 expect(await page.evaluate(()=>window.__rollbackReads)).not.toContain(saved.pointer);
 await page.waitForTimeout(1000);expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(saved.encoded);noCloudWrites(state);
});
