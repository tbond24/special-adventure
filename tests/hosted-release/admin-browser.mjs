// Separate genuine managed login/MFA and deployed admin UI acceptance.
import {readFile,writeFile,access,mkdtemp,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
import {ROOT,check,api,totp} from '../hosted-admin/support.mjs';
const dir=new URL('../../work/hosted-release/',import.meta.url);
const window=JSON.parse(await readFile(new URL('window.json',dir),'utf8'));
const lab=JSON.parse(await readFile(new URL('lab.json',dir),'utf8'));
check(process.argv.includes('--execute-isolated')&&Date.now()<Date.parse(window.expires),'Explicit active test window required');
check(/^https:\/\/vacancy-admin-recovery-lab-20261015-[a-z0-9]+-tbond24s-projects\.vercel\.app$/.test(lab.url)&&/^dpl_[A-Za-z0-9]+$/.test(lab.deployment)&&/^[a-f0-9]{40}$/.test(lab.source),'Only pinned lab');
const actor={role:'owner',password:randomBytes(40).toString('base64url')},evidence=[];
const sensitive=[];
const pass=label=>{evidence.push({status:'PASS',label});console.log('PASS '+label);};
const pause=ms=>new Promise(r=>setTimeout(r,ms));let browser,ctx,request,session;
async function barrier(name){
 await writeFile(new URL(name+'.needed.json',dir),JSON.stringify({run:window.run,actors:[{id:actor.id,role:actor.role}]}));
 console.log('WAITING '+name);const end=Date.now()+600000;
 while(Date.now()<end){try{await access(new URL(name+'.ready',dir));return;}catch{}await pause(1000);}throw Error('Fixture timeout '+name);
}
async function broker(action){
 const r=await fetch(ROOT+'/functions/v1/qa-hosted-release-window',{method:'POST',headers:{'Content-Type':'application/json','x-qa-window':window.nonce},body:JSON.stringify({action,role:actor.role,id:actor.id,...(action==='create'?{password:actor.password}:{})})});
 check(r.ok,'Protected admin fixture '+action);return r.json();
}
try{
 const created=await broker('create');Object.assign(actor,{id:created.id,email:created.email});request=api(created.key);
 await barrier('admin-seed');
 const root=await mkdtemp(fileURLToPath(new URL('admin-zoom-',dir))),extension=path.join(root,'extension');await mkdir(extension);
 await writeFile(path.join(extension,'manifest.json'),JSON.stringify({manifest_version:3,name:'Vacancy isolated hosted zoom check',version:'1.0',permissions:['tabs'],host_permissions:[lab.url+'/*'],background:{service_worker:'worker.js'}}));
 await writeFile(path.join(extension,'worker.js'),'chrome.runtime.onInstalled.addListener(()=>{});');
 ctx=await chromium.launchPersistentContext(path.join(root,'profile'),{executablePath:chromium.executablePath(),headless:true,viewport:null,ignoreDefaultArgs:['--disable-extensions'],args:['--window-size=1536,1100','--disable-extensions-except='+extension,'--load-extension='+extension]});
 const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker',{timeout:20000});
 check(new URL(lab.shareableUrl).origin===lab.url,'Only isolated access URL');
 const access=await ctx.request.get(lab.shareableUrl,{maxRedirects:0});check(access.status()===307,'Temporary lab access cookie');
 await ctx.route('**/*',route=>{
  const origin=new URL(route.request().url()).origin;
  if(origin===lab.url)return route.continue();
  return origin===ROOT?route.continue():route.abort();
 });
 const page=await ctx.newPage();await page.goto(lab.url+'/#auth');await expect(page.locator('#authUnified')).toBeVisible();
 await page.locator('#authUnified [name=email]').fill(actor.email);await page.locator('#authUnified [name=password]').fill(actor.password);
 await page.locator('#authUnified .primary').click();await expect(page).toHaveURL(/#home$/,{timeout:30000});
 await page.goto(lab.url+'/#admin');await expect(page.getByRole('heading',{name:'Admin verification'})).toBeVisible();
 await expect(page.locator('#adminHost')).toHaveCount(0);await page.locator('#verifyAdminMfa').click();await page.locator('[data-start-mfa-setup]').click();
 await expect(page.getByRole('heading',{name:'Set up authenticator',exact:true})).toBeVisible();
 const secret=await page.locator('.mfa-secret').textContent();sensitive.push(secret);if(Date.now()%30000>27000)await pause(3500);
 const code=totp(secret);sensitive.push(code);
 await page.getByLabel('Authenticator code').fill(code);await page.locator('[data-mfa-code-form] button[type=submit]').click();
 await expect(page.locator('#adminHost')).toBeVisible({timeout:30000});session=await page.evaluate(()=>VACANCY_BACKEND.session());
 check(await page.evaluate(()=>VACANCY_BACKEND.assuranceLevel())==='aal2','Genuine deployed AAL2');
 pass('Deployed visible password login and real TOTP enrollment unlock full managed admin route');
 await page.locator('#adminSectionMenu [data-section=design]').click();
 await expect(page.locator('[data-draft-status]')).not.toContainText('Checking editor permissions',{timeout:30000});
 const keys=await page.evaluate(()=>VACANCY_ADMIN_DESIGN_REGISTRY.pages.flatMap(p=>p.elements.map(e=>e.key)));
 check(keys.includes('create-listing/language-selector')&&keys.includes('edit-listing/language-selector')&&keys.includes('find/search-button')&&keys.includes('listing-detail/about-heading'),'Recorded editor targets');
 for(const key of keys){
  await page.locator(`[data-design-target="${key}"]`).click();
  await expect(page.locator('.design-element-id code')).toHaveText(key);
  const r=await request('rest/v1/rpc/admin_appearance_state',{token:session.access_token,body:{p_element_key:key}});check(r.ok,'Managed registered target '+key);
 }
 check(await page.locator('[data-design-frame]').getAttribute('sandbox')==='','Preview sandbox allows no scripts or same origin');
 const capabilities=await request('rest/v1/rpc/admin_my_capabilities',{token:session.access_token,body:{}});check(capabilities.ok&&capabilities.data.appearance_publish,'Actual Owner UI capability');
 pass('All registered Find/detail/Create/Edit targets load from managed RPCs; preview sandbox stays closed');
 await page.locator('#adminSectionMenu [data-section=icons]').click();await expect(page.locator('[data-display-enabled]')).toHaveCount(10);
 check(await page.locator('[data-display-enabled]:checked').count()===10,'Exact adopted test display values');
 pass('All ten adopted display controls render with preserved test values');
 const published=await request('rest/v1/rpc/site_appearance_published',{body:{}});check(published.ok&&Array.isArray(published.data),'Published managed presentation');
 const metrics=()=>page.evaluate(()=>({innerWidth,outerWidth,devicePixelRatio,scrollWidth:document.documentElement.scrollWidth})),before=await metrics();
 const zoom=await worker.evaluate(async url=>{const tabs=await chrome.tabs.query({url:url+'/*'});if(tabs.length!==1)throw Error('Expected one isolated deployed tab');await chrome.tabs.setZoomSettings(tabs[0].id,{mode:'automatic',scope:'per-tab'});await chrome.tabs.setZoom(tabs[0].id,2);return chrome.tabs.getZoom(tabs[0].id);},lab.url);
 check(zoom===2&&page.viewportSize()===null,'Actual native tab zoom');await expect.poll(async()=>Number((await metrics()).devicePixelRatio/before.devicePixelRatio)).toBe(2);
 const after=await metrics();check(after.outerWidth===before.outerWidth&&Math.abs(after.innerWidth*2-before.innerWidth)<=2&&after.scrollWidth<=after.innerWidth+1,'Native 200 percent admin reflow');
 await writeFile(new URL('admin-native-zoom.json',dir),JSON.stringify({zoomApi:'chrome.tabs.setZoom/getZoom',factor:zoom,before,after,actualHostedBackend:true},null,2));
 pass('Deployed admin passes verified native 200 percent tab zoom and viewport reflow');
}catch(error){
 // Browser errors may include filled credentials. Keep only a bounded redacted label.
 let label=String(error.message);for(const s of [actor.password,actor.email,lab.secret,lab.shareableUrl,session?.access_token,session?.refresh_token,...sensitive].filter(Boolean))label=label.split(s).join('[REDACTED]');
 label=label.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[JWT]').slice(0,600);evidence.push({status:'FAIL',label});console.error('ADMIN UI FAILED: '+label);process.exitCode=1;
}finally{
 if(session&&request)await request('auth/v1/logout?scope=global',{token:session.access_token,body:{}}).catch(()=>{});
 await ctx?.close();await browser?.close();
 if(actor.id){await barrier('admin-cleanup');await broker('delete');pass('Additional synthetic admin removed');}
 await writeFile(new URL('admin-browser-evidence.json',dir),JSON.stringify({deployment:lab.deployment,source:lab.source,evidence},null,2));
}
