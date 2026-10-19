// Managed recovery acceptance without SMTP, original users or stored credentials.
import {readFile,writeFile,access} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
import {ROOT,api,check} from '../hosted-admin/support.mjs';
const dir=new URL('../../work/hosted-release/',import.meta.url),window=JSON.parse(await readFile(new URL('window.json',dir),'utf8')),lab=JSON.parse(await readFile(new URL('lab.json',dir),'utf8'));
check(process.argv.includes('--execute-isolated')&&Date.now()<Date.parse(window.expires),'Active isolated window required');
check(/^https:\/\/vacancy-admin-recovery-lab-20261015-[a-z0-9]+-tbond24s-projects\.vercel\.app$/.test(lab.url)&&new URL(lab.shareableUrl).origin===lab.url,'Fixed isolated lab');
const actor={role:'renter',password:'Qr1_'+randomBytes(40).toString('base64url')},evidence=[],sensitive=[actor.password,lab.shareableUrl,lab.secret];
let browser,request,key,session,oldSession;
const pass=label=>{evidence.push({status:'PASS',label});console.log('PASS '+label);};
const broker=async action=>{const r=await fetch(ROOT+'/functions/v1/qa-hosted-release-window',{method:'POST',headers:{'Content-Type':'application/json','x-qa-window':window.nonce},body:JSON.stringify({action,role:actor.role,id:actor.id,...(action==='create'?{password:actor.password}:{})}),signal:AbortSignal.timeout(30000)});check(r.ok,'Protected reset actor '+action);return r.json();};
async function context(){const c=await browser.newContext({serviceWorkers:'block'});const a=await c.request.get(lab.shareableUrl,{maxRedirects:0});check(a.status()===307,'Temporary lab cookie');await c.route('**/*',r=>[lab.url,ROOT].includes(new URL(r.request().url()).origin)?r.continue():r.abort());return c;}
async function login(password){const c=await context(),p=await c.newPage();await p.goto(lab.url+'/#auth');await expect(p.locator('#authUnified')).toBeVisible();await p.locator('#authUnified [name=email]').fill(actor.email);await p.locator('#authUnified [name=password]').fill(password);await p.locator('#authUnified .primary').click();await expect(p).toHaveURL(/#home$/,{timeout:30000});await expect.poll(()=>p.evaluate(()=>currentUser?.id)).toBe(actor.id);const s=await p.evaluate(()=>VACANCY_BACKEND.session());sensitive.push(s.access_token,s.refresh_token);return {c,p,s};}
try{
 const created=await broker('create');Object.assign(actor,{id:created.id,email:created.email});key=created.key;sensitive.push(actor.email,key);request=api(key);browser=await chromium.launch();
 const first=await login(actor.password);oldSession=first.s;await first.c.close();
 const second=await request('auth/v1/token?grant_type=password',{body:{email:actor.email,password:actor.password}});check(second.ok,'Second prior normal session');sensitive.push(second.data.access_token,second.data.refresh_token);
 const recovery=await broker('recovery');sensitive.push(recovery.token_hash);
 const verified=await request('auth/v1/verify',{body:{type:'recovery',token_hash:recovery.token_hash}});check(verified.ok&&verified.data.user.id===actor.id,'Genuine managed recovery OTP');session=verified.data;sensitive.push(session.access_token,session.refresh_token);
 const c=await context(),page=await c.newPage();await page.goto(lab.url+'/#'+new URLSearchParams({access_token:session.access_token,refresh_token:session.refresh_token,expires_in:String(session.expires_in),token_type:'bearer',type:'recovery'}));
 await expect(page.locator('#resetPassword')).toBeVisible({timeout:30000});
 check(await page.evaluate(()=>location.hash==='#reset-password'&&!VACANCY_BACKEND.session()),'Recovery callback scrubbed and signed out');
 const token=session.access_token;check(await page.evaluate(t=>[...Object.values(localStorage),...Object.values(sessionStorage)].every(v=>!v.includes(t)),token),'Recovery token absent from browser storage');
 pass('Genuine hosted recovery callback scrubs URL and keeps credentials out of normal session and browser storage');
 const edge=async(token,body)=>{const r=await fetch(ROOT+'/functions/v1/secure-password-reset',{method:'POST',headers:{apikey:key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});return {status:r.status,data:await r.json()};};
 check((await edge(null,{password:'short'})).status===401,'Anonymous reset denied');check((await edge(token,{password:'short'})).status===400,'Weak reset denied');
 pass('Frozen managed reset Edge rejects anonymous and weak-password requests');
 const next='Qr2!'+randomBytes(28).toString('base64url');sensitive.push(next);await page.locator('#resetPassword [name=password]').fill(next);await page.locator('#resetPassword [name=confirmation]').fill(next);
 const response=page.waitForResponse(r=>r.url()===ROOT+'/functions/v1/secure-password-reset'&&r.request().method()==='POST').then(r=>({r}),error=>({error}));
 await page.locator('#resetPassword button.primary').click();const outcome=await response;check(outcome.r,'Managed reset response received');const changed=outcome.r;
 check(changed.status()===200,'Managed frozen Edge reset HTTP '+changed.status());check((await changed.json()).sessionsRevoked===true,'Managed global logout');await expect(page.locator('#resetHost')).toContainText('Password updated. Sign in with your new password.');
 pass('Existing deployed reset form completes real frozen Edge, HIBP password safety check and managed GoTrue update');
 for(const s of [oldSession,second.data])check(!(await request('auth/v1/token?grant_type=refresh_token',{body:{refresh_token:s.refresh_token}})).ok,'Prior normal session refresh rejected');
 check(!(await request('auth/v1/token?grant_type=password',{body:{email:actor.email,password:actor.password}})).ok,'Old password rejected');
 check(!(await request('auth/v1/verify',{body:{type:'recovery',token_hash:recovery.token_hash}})).ok,'Consumed recovery OTP rejected');
 const fresh=await login(next);await request('auth/v1/logout?scope=global',{token:fresh.s.access_token,body:{}});await fresh.c.close();await c.close();
 pass('Old password, both prior refresh tokens and consumed OTP fail; new-password visible login succeeds');
}catch(error){let label=String(error.message);for(const s of sensitive.filter(Boolean))label=label.split(s).join('[REDACTED]');label=label.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[JWT]').slice(0,700);evidence.push({status:'FAIL',label});console.error('RESET FAILED: '+label);process.exitCode=1;
}finally{
 await browser?.close();
 if(actor.id){await writeFile(new URL('reset-cleanup.needed.json',dir),JSON.stringify({run:window.run,actors:[{id:actor.id,role:actor.role}]}));console.log('WAITING reset-cleanup');const end=Date.now()+1200000;let ready=false;while(Date.now()<end){try{await access(new URL('reset-cleanup.ready',dir));ready=true;break;}catch{}await new Promise(r=>setTimeout(r,1000));}check(ready,'Reset cleanup coordinator');await broker('delete');pass('Synthetic reset identity removed');}
 await writeFile(new URL('reset-browser-evidence.json',dir),JSON.stringify({deployment:lab.deployment,source:lab.source,externalSmtp:false,realManagedAuth:true,handlerGitBlob:'923b1582ad411348ebe2e26373047383a0e3da2f',evidence},null,2));
}
