const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const APP=process.env.VACANCY_E2E_URL||'http://127.0.0.1:8776';
async function open(page,mode='current'){
  await page.route('**/*',r=>new URL(r.request().url()).origin===new URL(APP).origin?r.continue():r.fulfill({json:[]}));
  // Preserve actual retained renderers before later Account replacements load.
  for(const [file,name] of [['auth-account-admin.js','__baseAccountForTest'],['stage36-experience.js','__stage36AccountForTest']])await page.route('**/src/'+file+'*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(__dirname,'../app/src',file),'utf8')+'\nwindow.'+name+'=renderAccount;'}));
  await page.goto(APP+'/#auth');await page.waitForFunction(()=>!booting);
  await page.evaluate(async mode=>{
    currentUser={id:'synthetic-member',email:'synthetic@example.test'};saved.add('saved-vacancy');
    window.originalSession=JSON.stringify({access_token:'header.eyJleHAiOjQxMDI0NDQ4MDB9.sig',refresh_token:'synthetic-refresh-token',expires_at:4102444800,user:currentUser});localStorage.setItem('vacancy-session-v01',originalSession);
    VACANCY_BACKEND.profile=async()=>({display_name:'Synthetic member'});VACANCY_BACKEND.adminOverview=async()=>({error:'denied'});VACANCY_BACKEND.myProperties=async()=>[];VACANCY_BACKEND.myVacancies=async()=>[];VACANCY_BACKEND.ownerDashboardMetrics=async()=>({});VACANCY_BACKEND.activeVacancies=async()=>[];
    window.confirmCalls=0;window.confirm=()=>{confirmCalls++;return true};window.deleteCalls=0;
    history.replaceState(null,'','#account');route=parseHash();window.accountRendererForTest=mode==='base'?__baseAccountForTest:mode==='stage36'?__stage36AccountForTest:renderAccount;await accountRendererForTest();
  },mode);
  await expect(page.locator('#deleteEntry')).toBeVisible();
}
for(const mode of ['base','stage36','current'])test(`${mode} Account clearly disables deletion without confirmation or request`,async({page},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page,mode);
  const control=page.locator('#deleteEntry');await expect(control).toBeDisabled();await expect(control).toHaveAttribute('aria-disabled','true');await expect(control).toContainText(/temporarily unavailable/i);await expect(control).toHaveAttribute('title','Account deletion is temporarily unavailable.');
  await page.evaluate(()=>{VACANCY_BACKEND.deleteAccount=async()=>{deleteCalls++;throw Error('Unexpected deletion')};const button=document.querySelector('#deleteEntry');button.click();button.dispatchEvent(new MouseEvent('click',{bubbles:true}))});
  expect(await page.evaluate(()=>({confirm:confirmCalls,deletes:deleteCalls,handler:document.querySelector('#deleteEntry').onclick,user:currentUser.id,saved:saved.has('saved-vacancy'),session:localStorage.getItem('vacancy-session-v01')===originalSession}))).toEqual({confirm:0,deletes:0,handler:null,user:'synthetic-member',saved:true,session:true});
  await expect(page.locator('#signout')).toBeEnabled();await expect(page.locator('#yourListings')).toBeEnabled();
  await page.evaluate(()=>accountRendererForTest());await expect(control).toBeDisabled();await expect(control).toContainText(/temporarily unavailable/i);expect(errors).toEqual([]);if(mode==='current')await page.screenshot({path:info.outputPath('account-deletion-unavailable.png'),fullPage:true});
});

test('guarded endpoint HTTP503 preserves stored session, user and saved state',async({page})=>{
  await open(page);
  const result=await page.evaluate(async()=>{
    const originalFetch=window.fetch;window.fetch=async(url,options)=>{if(String(url).includes('/functions/v1/delete-account')){deleteCalls++;return new Response(JSON.stringify({error:'account_deletion_temporarily_unavailable',message:'Account deletion is temporarily unavailable. No data was removed.'}),{status:503,headers:{'Content-Type':'application/json'}})}return originalFetch(url,options)};
    let failure;try{await VACANCY_BACKEND.deleteAccount()}catch(error){failure={status:error.status,message:error.message}}
    return{failure,calls:deleteCalls,user:currentUser.id,saved:saved.has('saved-vacancy'),session:localStorage.getItem('vacancy-session-v01')===originalSession};
  });
  expect(result).toEqual({failure:{status:503,message:'Account deletion is temporarily unavailable. No data was removed.'},calls:1,user:'synthetic-member',saved:true,session:true});
  await expect(page).toHaveURL(/#account$/);await expect(page.locator('#deleteEntry')).toBeDisabled();await expect(page.locator('#toast')).not.toContainText('Account deleted');
});

test('a cached former deletion handler cannot claim completion or sign out on endpoint503',async({page})=>{
  await open(page);
  await page.evaluate(async()=>{
    const originalFetch=window.fetch;window.fetch=async(url,options)=>{if(String(url).includes('/functions/v1/delete-account')){deleteCalls++;return new Response(JSON.stringify({error:'account_deletion_temporarily_unavailable',message:'Account deletion is temporarily unavailable. No data was removed.'}),{status:503,headers:{'Content-Type':'application/json'}})}return originalFetch(url,options)};
    // Previous shipped controller, simulated only to verify guard compatibility.
    const cachedDelete=async()=>{if(!confirm('Permanently delete your Vacancy account and associated data?'))return;try{await VACANCY_BACKEND.deleteAccount();currentUser=null;saved.clear();toast('Account deleted');nav('home')}catch(error){toast(error.message)}};
    await cachedDelete();
  });
  await expect(page.locator('#toast')).toHaveText('Account deletion is temporarily unavailable. No data was removed.');await expect(page).toHaveURL(/#account$/);
  expect(await page.evaluate(()=>({calls:deleteCalls,user:currentUser.id,saved:saved.has('saved-vacancy'),session:localStorage.getItem('vacancy-session-v01')===originalSession}))).toEqual({calls:1,user:'synthetic-member',saved:true,session:true});
});
