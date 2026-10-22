const {test,expect}=require('@playwright/test');
const member={id:'10000000-0000-4000-8000-000000000001'};
async function setup(page,{refresh=false}={}){
 const calls=[];let releaseUpload,releaseRefresh;
 await page.route('**/*',async r=>{const u=new URL(r.request().url()),p=u.pathname;calls.push({method:r.request().method(),path:p});
  if(p==='/adapter-check')return r.fulfill({contentType:'text/html',body:'<main>Isolated adapter test</main>'});
  if(p.endsWith('/src/backend.js'))return r.continue();
  if(p==='/__offline/auth/v1/user')return r.fulfill({json:member});
  if(p==='/__offline/auth/v1/token'){await new Promise(resolve=>releaseRefresh=resolve);return r.fulfill({json:{access_token:'synthetic.'+Buffer.from(JSON.stringify({sub:member.id,exp:4102444800})).toString('base64url')+'.synthetic',refresh_token:'synthetic',expires_at:9999999999,user:member}})}
  if(p.startsWith('/__offline/storage/v1/object/conversation-media/')&&r.request().method()==='POST'){await new Promise(resolve=>releaseUpload=resolve);return r.fulfill({json:{}})}
  if(p.startsWith('/__offline/'))return r.fulfill({json:{}});
  return r.abort();
 });
 await page.goto('/adapter-check#home');await page.evaluate(({member,refresh})=>localStorage.setItem('vacancy-session-v01',JSON.stringify({access_token:'synthetic.'+btoa(JSON.stringify({sub:member.id,exp:refresh?1:4102444800}))+'.synthetic',refresh_token:'synthetic',expires_at:refresh?1:9999999999,user:member})),{member,refresh});await page.addScriptTag({url:'/src/backend.js'});
 return {calls,releaseUpload:()=>releaseUpload?.(),releaseRefresh:()=>releaseRefresh?.(),uploadReady:()=>!!releaseUpload,refreshReady:()=>!!releaseRefresh};
}
test('leaving during a photo upload prevents the later message commit and retains server cleanup boundary',async({page})=>{
 const state=await setup(page);await page.evaluate(()=>{const requested=location.hash;window.__send=VACANCY_BACKEND.sendConversationPhoto('synthetic-thread',new File(['synthetic'],'draft.png',{type:'image/png'}),'caption',{isCurrent:()=>location.hash===requested}).catch(e=>{window.__adapterError={name:e.name,message:e.message};return e.name})});await expect.poll(async()=>({ready:state.uploadReady(),error:await page.evaluate(()=>window.__adapterError||null),calls:state.calls.map(c=>c.path)})).toMatchObject({ready:true});await page.evaluate(()=>history.replaceState(null,'','#terms'));state.releaseUpload();expect(await page.evaluate(()=>__send)).toBe('AbortError');expect(state.calls.filter(c=>c.path.endsWith('/rpc/send_photo_message'))).toHaveLength(0);expect(state.calls.filter(c=>c.method==='DELETE'&&c.path.endsWith('/conversation-media'))).toHaveLength(1);
});
for(const action of ['sendMessage','startEnquiry'])test('leaving during credential refresh prevents '+action,async({page})=>{
 const state=await setup(page,{refresh:true});await page.evaluate(action=>{const requested=location.hash;const input=action==='sendMessage'?'draft':{message:'draft'};window.__send=VACANCY_BACKEND[action]('synthetic-target',input,{isCurrent:()=>location.hash===requested}).catch(e=>e.name)},action);await expect.poll(state.refreshReady).toBe(true);await page.evaluate(()=>history.replaceState(null,'','#privacy'));state.releaseRefresh();expect(await page.evaluate(()=>__send)).toBe('AbortError');expect(state.calls.filter(c=>c.path.includes('/rpc/'))).toHaveLength(0);
});
test('switching Auth accounts during upload cannot commit as the new account',async({page})=>{
 const state=await setup(page);await page.evaluate(ownerId=>{window.__send=VACANCY_BACKEND.sendConversationPhoto('synthetic-thread',new File(['synthetic'],'draft.png',{type:'image/png'}),'caption',{ownerId}).catch(e=>e.name)},member.id);await expect.poll(state.uploadReady).toBe(true);await page.evaluate(()=>localStorage.setItem('vacancy-session-v01',JSON.stringify({access_token:'synthetic.'+btoa(JSON.stringify({sub:'20000000-0000-4000-8000-000000000002',exp:4102444800}))+'.synthetic',refresh_token:'synthetic'})));state.releaseUpload();expect(await page.evaluate(()=>__send)).toBe('AbortError');expect(state.calls.filter(c=>c.path.endsWith('/rpc/send_photo_message'))).toHaveLength(0);
});
