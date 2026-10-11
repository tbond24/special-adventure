const {test,expect}=require('@playwright/test');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {createCloud,install,owner,otherOwner,sessionFor}=require('../qa/account-drafts/synthetic-cloud.cjs');

// Each worker serves the real app on an ephemeral local port. All remote
// Auth/REST/Storage requests are intercepted by the existing synthetic fixture.
test.use({serviceWorkers:'block'});
let server,origin;
test.beforeAll(async()=>{
  const root=path.resolve(__dirname,'../app');
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
  server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(error?'Not found':data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
});
test.afterAll(async()=>{await new Promise(resolve=>server.close(resolve));});

const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const editA=id(6001),editB=id(6002),newUnit=id(6003),newDraft=id(6004),editUnit=id(6005),editDraft=id(6006);
const newKey='vacancy-listing-draft-v2:'+owner.id+':new-property';
function listing(vacancy,title){return{id:vacancy,roomId:id(vacancy===editA?6011:6012),propertyId:id(6013),privateName:title+' private name',roomName:title,unitType:'Studio',description:title+' description',rentAmount:22000,rentCurrency:'KES',rentPeriod:'month',deposit:22000,availableFrom:'2026-10-15',minimumStayWeeks:'',maxOccupants:1,unitDetails:{},locality:'Westlands',city:'Nairobi',region:'Nairobi',country:'Kenya',marketCode:'KE',address:title+' private address',propertyType:'Apartment',publicLatitude:-1.26,publicLongitude:36.8,parkingSpaces:0,waterAvailable:true,electricityAvailable:true,securityAvailable:true,internetAvailable:false,media:[]};}
async function boot(page){
  const cloud=createCloud();cloud.editListings.set(editA,listing(editA,'Published A'));cloud.editListings.set(editB,listing(editB,'Published B'));
  const state=await install(page.context(),cloud,{signedIn:owner});
  await page.goto(origin+'/#home');await page.waitForFunction(()=>typeof booting!=='undefined'&&!booting);
  await page.evaluate(()=>{
    window.__editCompletions={};const original=renderEdit;
    renderEdit=async function(id){try{return await original(id);}finally{window.__editCompletions[id]=(window.__editCompletions[id]||0)+1;}};
  });
  return state;
}
async function seedNew(page){await page.evaluate(({key,ownerId,unit,draft})=>localStorage.setItem(key,JSON.stringify({version:1,scope:'new-property',editVacancy:null,shared:{address:'Unrelated new-property private address'},units:[{_requestId:unit,roomName:'Unrelated NEW draft',rentAmount:'12345',_titleMode:'manual'}],_accountDraft:{id:draft,ownerId,sourceId:unit,revision:7,synced:false}})),{key:newKey,ownerId:owner.id,unit:newUnit,draft:newDraft});}
async function holdFirstListing(page,target){
  await page.evaluate(target=>{
    const original=VACANCY_BACKEND.listingForEdit;let held=false;
    VACANCY_BACKEND.listingForEdit=async id=>{
      if(id===target&&!held){held=true;await new Promise((resolve,reject)=>{window.__releaseHeldEdit=resolve;window.__rejectHeldEdit=()=>reject(new Error('Delayed synthetic listing failure'));window.__heldEditEntered=true;});}
      return original(id);
    };
  },target);
  await page.evaluate(id=>nav('edit',id),target);await page.waitForFunction(()=>window.__heldEditEntered);
}
async function completion(page,target,count=1){await page.waitForFunction(({target,count})=>(window.__editCompletions[target]||0)>=count,{target,count});}
async function chooseNew(page){
  await page.locator('[data-listing-type=Residential]').click();await page.locator('[data-preset=Studio]').click();await page.getByRole('button',{name:'New property',exact:true}).click();
  await expect(page.locator('#listingForm')).toHaveAttribute('data-journey-step','0');
}
async function formSnapshot(page){return page.locator('#listingForm').evaluate(form=>({hash:location.hash,scope:form.dataset.draftScope,edit:form.dataset.editVacancy||null,key:listingDraftKey(form),metadata:form.dataset.accountDraft||null,unit:form.querySelector('.unit-editor')?.dataset.requestId,title:form.querySelector('[data-base-name=roomName]')?.value,address:form.elements.address?.value,inert:form.inert}));}
function noPublication(state){expect(state.cloud.publicWrites).toEqual([]);expect(state.calls.filter(call=>!['ownerMediaLibrary','mediaLibraryFiles'].includes(call.method))).toEqual([]);}

test('opening an edit restores only its own identity and leaves the unrelated new draft unchanged',async({page})=>{
  const state=await boot(page);await seedNew(page);const savedNew=await page.evaluate(key=>localStorage.getItem(key),newKey);
  await page.evaluate(({target,ownerId,unit,draft})=>localStorage.setItem('vacancy-listing-draft-v2:'+ownerId+':edit-'+target,JSON.stringify({version:1,scope:'edit-'+target,editVacancy:target,shared:{address:'Correct saved edit address'},units:[{_requestId:unit,roomName:'Correct EDIT draft',rentAmount:'23456',_titleMode:'manual'}],_accountDraft:{id:draft,ownerId,sourceId:unit,revision:3,synced:false}})),{target:editA,ownerId:owner.id,unit:editUnit,draft:editDraft});
  await page.evaluate(id=>nav('edit',id),editA);await completion(page,editA);
  const restored=await formSnapshot(page);expect(restored.scope).toBe('edit-'+editA);expect(restored.unit).toBe(editUnit);expect(JSON.parse(restored.metadata).id).toBe(editDraft);expect(restored.title).toBe('Correct EDIT draft');expect(restored.address).toBe('Correct saved edit address');expect(restored.inert).toBe(false);
  expect(await page.evaluate(key=>localStorage.getItem(key),newKey)).toBe(savedNew);noPublication(state);
});

for(const outcome of ['success','failure'])test(`delayed edit ${outcome} cannot replace or contaminate a newer new-listing route`,async({page})=>{
  const state=await boot(page);await seedNew(page);await holdFirstListing(page,editA);
  await page.evaluate(()=>nav('list','new'));await chooseNew(page);const before=await formSnapshot(page);
  expect(before.scope).toBe('new-property');expect(JSON.parse(before.metadata).id).toBe(newDraft);
  await page.evaluate(outcome=>outcome==='success'?window.__releaseHeldEdit():window.__rejectHeldEdit(),outcome);await completion(page,editA);
  expect(await formSnapshot(page)).toEqual(before);await expect(page.locator('#retryListingEdit')).toHaveCount(0);noPublication(state);
});

test('a delayed edit A cannot replace the completed editor for B',async({page})=>{
  const state=await boot(page);await holdFirstListing(page,editA);await page.evaluate(id=>nav('edit',id),editB);await completion(page,editB);
  const before=await formSnapshot(page);expect(before.edit).toBe(editB);expect(before.title).toBe('Published B');
  await page.evaluate(()=>window.__releaseHeldEdit());await completion(page,editA);expect(await formSnapshot(page)).toEqual(before);noPublication(state);
});

test('an older request for the same edit cannot replace a newer history navigation to it',async({page})=>{
  const state=await boot(page);await holdFirstListing(page,editA);await page.evaluate(()=>nav('home'));await page.waitForFunction(()=>location.hash==='#home');
  await page.evaluate(id=>nav('edit',id),editA);await completion(page,editA);const before=await formSnapshot(page);
  await page.evaluate(()=>window.__releaseHeldEdit());await completion(page,editA,2);expect(await formSnapshot(page)).toEqual(before);noPublication(state);
});

test('an explicit identity refresh to another account invalidates a held edit response',async({page})=>{
  const state=await boot(page);await holdFirstListing(page,editA);
  await page.evaluate(async session=>{localStorage.setItem('vacancy-session-v01',JSON.stringify(session));await refreshIdentity();},sessionFor(otherOwner));
  await page.evaluate(()=>window.__releaseHeldEdit());await completion(page,editA);
  await expect(page.locator('#listingForm')).toHaveCount(0);await expect(page.locator('#app')).not.toContainText('Published A private address');noPublication(state);
});

test('a real cross-tab session switch before an owner form exists invalidates a held edit response',async({page,context})=>{
  const state=await boot(page);await holdFirstListing(page,editA);await expect(page.locator('form[data-draft-owner-id]')).toHaveCount(0);
  const other=await context.newPage();await other.goto(origin+'/#home');
  await other.waitForFunction(()=>typeof booting!=='undefined'&&!booting);
  // Model sign-in in the writing tab too: storage events only notify other tabs.
  await other.evaluate(async session=>{localStorage.setItem('vacancy-session-v01',JSON.stringify(session));await refreshIdentity();},sessionFor(otherOwner));
  await page.waitForFunction(id=>VACANCY_BACKEND.session()?.user?.id===id,otherOwner.id);
  await page.evaluate(()=>window.__releaseHeldEdit());await completion(page,editA);
  await expect(page.locator('#listingForm')).toHaveCount(0);await expect(page.locator('#app')).not.toContainText('Published A private address');noPublication(state);await other.close();
});
