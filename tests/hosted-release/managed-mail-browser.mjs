// Local headless-shell acceptance of actual managed SMTP and its delivered callback.
import fs from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
import {ROOT,api,check} from '../hosted-admin/support.mjs';
import {cli,labUrl} from './managed-mail-config.mjs';
const dir='work/release-remaining/',mode=process.argv[2],w=JSON.parse(fs.readFileSync(dir+'mail-window.json'));
check(['--request','--complete','--cleanup'].includes(mode)&&Date.now()<Date.parse(w.expires),'Explicit active managed test mode');
const lab=JSON.parse(fs.readFileSync(dir+'lab.json'));check(lab.url===labUrl&&new URL(lab.shareableUrl).origin===labUrl,'Fixed protected lab');
const secrets=[w.nonce,w.recipient,lab.shareableUrl],evidence=[];let browser,actor;
const pass=label=>{evidence.push({status:'PASS',label});console.log('PASS '+label);};
const broker=async(action,body={})=>{
 const r=await fetch(ROOT+'/functions/v1/qa-managed-mail-window',{method:'POST',headers:{'Content-Type':'application/json','x-qa-window':w.nonce},body:JSON.stringify({action,...body}),signal:AbortSignal.timeout(30000)});
 check(r.ok,'Fixed synthetic account '+action+' HTTP '+r.status);return r.json();
};
async function context(){
 const ctx=await browser.newContext({serviceWorkers:'block'});
 check((await ctx.request.get(lab.shareableUrl,{maxRedirects:0})).status()===307,'Protected lab cookie');
 await ctx.route('**/*',r=>[labUrl,ROOT].includes(new URL(r.request().url()).origin)?r.continue():r.abort());
 return ctx;
}
async function login(password){
 const c=await context(),p=await c.newPage();await p.goto(labUrl+'/#auth');
 await expect(p.locator('#authUnified')).toBeVisible();
 await p.locator('#authUnified [name=email]').fill(actor.email);await p.locator('#authUnified [name=password]').fill(password);
 await p.locator('#authUnified .primary').click();await expect(p).toHaveURL(/#home$/,{timeout:30000});
 check(await p.evaluate(()=>currentUser?.id)===actor.id,'Genuine synthetic UI identity');
 return {c,p,s:await p.evaluate(()=>VACANCY_BACKEND.session())};
}
try{
 if(mode==='--request'){
  check(!fs.existsSync(dir+'managed-request.json')&&!fs.existsSync(dir+'mail-actor.json'),'One recovery request only; preserve prior attempts');
  const password=randomBytes(40).toString('base64url');actor={...await broker('create',{password}),password};
  check(actor.email===w.recipient,'Only fixed approved-inbox alias');
  fs.writeFileSync(dir+'mail-actor.json',JSON.stringify(actor),{flag:'wx',mode:0o600});
  secrets.push(actor.password,actor.key);const request=api(actor.key);actor.previous=[];
  for(let i=0;i<2;i++){
   const r=await request('auth/v1/token?grant_type=password',{body:{email:actor.email,password}});check(r.ok,'Previous genuine normal session');actor.previous.push(r.data);
  }
  fs.writeFileSync(dir+'mail-actor.json',JSON.stringify(actor),{mode:0o600});
  browser=await chromium.launch();const c=await context(),p=await c.newPage();
  await p.goto(labUrl+'/#forgot-password');await expect(p.locator('#recoveryRequest')).toBeVisible();
  await p.locator('#recoveryRequest [name=email]').fill(actor.email);
  const response=p.waitForResponse(r=>r.url().startsWith(ROOT+'/auth/v1/recover?')&&r.request().method()==='POST');
  const requestedAt=new Date().toISOString();await p.locator('#recoveryRequest button.primary').click();const r=await response;
  const status=r.status();
  fs.writeFileSync(dir+'managed-request.json',JSON.stringify({requestedAt,status,managedAuth:true,externalMailAttempts:1,deployedLab:labUrl,evidence}),{flag:'wx'});
  check(status===200,'Managed recovery request HTTP '+status);
  await expect(p.locator('#recoveryRequest [role=status]')).toContainText('If an account exists',{timeout:30000});
  pass('Actual deployed forgot-password form accepted by managed Supabase Auth with private generic acknowledgement');
  fs.writeFileSync(dir+'managed-request.json',JSON.stringify({requestedAt,status,managedAuth:true,externalMailAttempts:1,evidence},null,2));
 }else{
  actor=JSON.parse(fs.readFileSync(dir+'mail-actor.json'));
  secrets.push(actor.password,actor.key,...actor.previous.flatMap(x=>[x.access_token,x.refresh_token]));
  if(mode==='--cleanup'){
   check(/^[a-f0-9-]{36}$/.test(actor.id)&&/^vacancy-managed-mail-\d+$/.test(w.run),'Bounded cleanup identity');
   const sql=`begin;do $$ begin if not exists(select 1 from auth.users where id='${actor.id}'::uuid and raw_app_meta_data->>'vacancy_managed_mail_scope'='${w.run}') then raise exception 'Fixture provenance mismatch';end if;end $$;delete from auth.sessions where user_id='${actor.id}'::uuid;commit;`;
   fs.writeFileSync(dir+'cleanup.sql',sql);
   const r=cli(['db','query','--linked','--project-ref','raauicmfyjpcuhfzknak','--workdir','work/release-remaining','--file','cleanup.sql','--output','json'],{log:'cleanup-result.json'});
   check(r.code===0,'Revoke only tagged synthetic sessions');
   check((await broker('delete',{id:actor.id})).deleted,'Remove only tagged test account');
   pass('Synthetic managed-email account removed after explicit session revocation');
   fs.writeFileSync(dir+'managed-cleanup.json',JSON.stringify({completed:true,evidence},null,2));
  }else{
   const link=JSON.parse(fs.readFileSync(dir+'delivered-link.json')).url,u=new URL(link);
   secrets.push(link,...[...u.searchParams.values()]);
   check(u.origin===ROOT&&u.pathname==='/auth/v1/verify'&&u.searchParams.get('type')==='recovery'&&u.searchParams.get('redirect_to')===labUrl+'/','Only actual fixed managed email link with exact allowed callback');
   check([...u.searchParams.keys()].every(k=>['token','type','redirect_to'].includes(k))&&/^[A-Za-z0-9_-]{20,256}$/.test(u.searchParams.get('token')||''),'Strict managed verification URL');
   browser=await chromium.launch();const c=await context(),p=await c.newPage();
   // Real emailed Auth URL -> actual allowed hosted redirect -> existing reset form.
   await p.goto(link);await expect(p.locator('#resetPassword')).toBeVisible({timeout:30000});
   check(await p.evaluate(()=>location.origin)===labUrl,'Allowed deployed callback origin');
   check(await p.evaluate(()=>location.hash==='#reset-password'&&!VACANCY_BACKEND.session()),'Callback scrubbed and normal session empty');
   check(await p.evaluate(()=>[...Object.values(localStorage),...Object.values(sessionStorage)].every(x=>!x.includes('access_token'))),'No recovery token persisted as normal session');
   pass('Delivered managed SMTP verification link redirects to the protected lab and opens the scrubbed existing reset form');
   const next='Qr3!'+randomBytes(28).toString('base64url');secrets.push(next);
   await p.locator('#resetPassword [name=password]').fill(next);await p.locator('#resetPassword [name=confirmation]').fill(next);
   const response=p.waitForResponse(r=>r.url()===ROOT+'/functions/v1/secure-password-reset'&&r.request().method()==='POST');
   await p.locator('#resetPassword button.primary').click();const changed=await response;
   check(changed.status()===200&&(await changed.json()).sessionsRevoked===true,'Frozen reset/HIBP/global revocation');
   await expect(p.locator('#resetHost')).toContainText('Password updated. Sign in with your new password.');
   pass('Real emailed-link reset completes unchanged deployed Edge, live password check and global revocation');
   const request=api(actor.key);
   check(!(await request('auth/v1/token?grant_type=password',{body:{email:actor.email,password:actor.password}})).ok,'Old password rejected');
   for(const old of actor.previous)check(!(await request('auth/v1/token?grant_type=refresh_token',{body:{refresh_token:old.refresh_token}})).ok,'Previous normal refresh rejected');
   const replay=await fetch(link,{redirect:'manual'}),location=replay.headers.get('location');
   check(!location||(!location.includes('access_token=')&&location.includes('error')),'Consumed emailed link cannot issue another session');
   const fresh=await login(next);secrets.push(fresh.s.access_token,fresh.s.refresh_token);
   check((await request('auth/v1/logout?scope=global',{token:fresh.s.access_token,body:{}})).ok,'Final normal-session logout');
   pass('Old password, both previous refresh sessions and consumed emailed link are denied; new-password visible login succeeds');
   fs.writeFileSync(dir+'managed-email-evidence.json',JSON.stringify({completed:true,managedSmtp:true,actualDeliveredLink:true,linkSha256:createHash('sha256').update(link).digest('hex'),callbackOrigin:labUrl,frozenHandlerBlob:'923b1582ad411348ebe2e26373047383a0e3da2f',externalMailAttempts:1,evidence},null,2));
  }
 }
}catch(error){
 let label=String(error.message);for(const s of secrets.filter(Boolean))label=label.split(s).join('[REDACTED]');
 label=label.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[JWT]').slice(0,700);
 fs.writeFileSync(dir+'managed-failure-'+mode.slice(2)+'.json',JSON.stringify({status:'FAIL',label,evidence},null,2));
 console.error('MANAGED EMAIL CHECK FAILED: '+label);process.exitCode=1;
}finally{await browser?.close();}
