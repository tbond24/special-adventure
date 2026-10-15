// Disposable CI only. Real local GoTrue, SMTP capture and Edge Runtime.
// The unchanged reset function makes real HIBP range queries using only
// SHA-1 prefixes of SYNTHETIC passwords. No hosted account/key is used.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import {expect} from '@playwright/test';
import {stackDir,artifacts} from './prepare.mjs';
const blob=s=>createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex');
export async function prepareRecovery(){
  if(process.env.CI!=='true'||process.env.VACANCY_DISPOSABLE_STACK!=='1')throw Error('Disposable CI opt-in required');
  const source=await readFile(new URL('../../supabase/functions/secure-password-reset/index.ts',import.meta.url),'utf8');
  if(blob(source)!=='b6c89f37cd5ca6b6681308c0f55f1c1f748925cc')throw Error('Reset handler changed; review exact source before testing');
  const configPath=stackDir+'/supabase/config.toml',config=await readFile(configPath,'utf8');
  const anchor='[edge_runtime]\nenabled = false';
  if(config.split(anchor).length!==2||config.includes('[functions.secure-password-reset]'))throw Error('Unexpected disposable function configuration');
  await mkdir(stackDir+'/supabase/functions/secure-password-reset',{recursive:true});
  await writeFile(stackDir+'/supabase/functions/secure-password-reset/index.ts',source);
  await writeFile(configPath,config.replace(anchor,'[edge_runtime]\nenabled = true\npolicy = "per_worker"')+'\n[functions.secure-password-reset]\nverify_jwt = true\n');
  await writeFile(artifacts+'/reset-source-manifest.json',JSON.stringify({path:'supabase/functions/secure-password-reset/index.ts',gitBlob:blob(source),sourceChanged:false,environment:'disposable local Edge Runtime'},null,2));
}
async function capturedRecoveryLink(email,ROOT,check,sensitive){
  const mail='http://127.0.0.1:54324';
  const get=async path=>{const r=await fetch(mail+path,{signal:AbortSignal.timeout(5000)});return {ok:r.ok,status:r.status,data:r.ok?await r.json():null};};
  let html='';
  // Current CLI uses Mailpit. The historical Inbucket API is checked only
  // if Mailpit's documented collection endpoint is absent, not on empty mail.
  const kind=await get('/api/v1/messages');
  const deadline=Date.now()+20000;
  while(Date.now()<deadline){
    if(kind.status!==404){
      const result=await get('/api/v1/messages');
      const messages=result.data?.messages||result.data?.Messages||[];
      const msg=messages.find(m=>(m.To||m.to||[]).some(t=>(t.Address||t.address)===email));
      if(msg){const detail=await get('/api/v1/message/'+encodeURIComponent(msg.ID||msg.id));html=detail.data?.HTML||detail.data?.html||detail.data?.Text||'';}
    }else{
      const box=encodeURIComponent(email.split('@')[0]);
      const list=await get('/api/v1/mailbox/'+box);
      if(Array.isArray(list.data)&&list.data.length){const msg=list.data.at(-1);const detail=await get('/api/v1/mailbox/'+box+'/'+encodeURIComponent(msg.id));html=detail.data?.body?.html||detail.data?.body?.text||'';}
    }
    if(html)break;
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  check(typeof html==='string'&&html.length>0,'A real recovery email was not found in the isolated SMTP capture');
  const candidates=[...html.replace(/&amp;/g,'&').matchAll(/https?:\/\/[^\s"'<>]+/g)].map(m=>m[0]);
  const link=candidates.find(u=>{try{const x=new URL(u);return x.origin===ROOT&&x.pathname==='/auth/v1/verify'&&x.searchParams.get('type')==='recovery';}catch{return false;}});
  check(Boolean(link),'Captured recovery email must contain a genuine local GoTrue recovery link');
  const url=new URL(link);sensitive.add(link);
  for(const [key,value] of url.searchParams)if(/token/i.test(key)&&value)sensitive.add(value);
  return link;
}
export async function verifyPasswordRecovery({context,loginUI,server,ROOT,key,sql,pass,check,evidence,sensitive,actors,request}){
  check(ROOT==='http://127.0.0.1:54321'&&server.url==='http://127.0.0.1:8778','Recovery accepts only the approved disposable origins');
  let ctx,afterCtx;
  evidence.passwordRecovery={completed:false,externalInboxDelivery:false,handlerGitBlob:'b6c89f37cd5ca6b6681308c0f55f1c1f748925cc'};
  const edge=async(token,body,method='POST')=>{
    const r=await fetch(ROOT+'/functions/v1/secure-password-reset',{method,
      headers:{apikey:key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
      ...(method==='POST'?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});
    let data;try{data=await r.json();}catch{data=null;}return {ok:r.ok,status:r.status,data};
  };
  try{
    const forbidden=await edge(null,{password:'not-a-real-password'});
    check([401,403].includes(forbidden.status),'Local Edge Runtime must reject reset without a user token; HTTP '+forbidden.status);
    pass('Real local reset endpoint rejects anonymous requests before password changes');
    const actor={role:'password recovery customer',email:'qa-password-recovery@vacancy.invalid',password:'Qr1!'+randomBytes(26).toString('base64url')};
    const nextPassword='Qr2!'+randomBytes(28).toString('base64url');
    sensitive.add(actor.password);sensitive.add(nextPassword);
    const created=await request('auth/v1/admin/users',{admin:true,body:{email:actor.email,password:actor.password,email_confirm:true,user_metadata:{display_name:'Synthetic recovery customer'}}});
    check(created.ok&&created.data?.id,'Recovery test identity provisioning');actor.id=created.data.id;actors.push(actor);
    const oldLogin=await loginUI(actor);const oldSession=actor.aal1Session;
    sensitive.add(oldSession.access_token);sensitive.add(oldSession.refresh_token);
    await oldLogin.ctx.close();
    const otherSession=await request('auth/v1/token?grant_type=password',{body:{email:actor.email,password:actor.password}});
    check(otherSession.ok&&otherSession.data?.refresh_token,'Second disposable session for global revocation test');
    sensitive.add(otherSession.data.access_token);sensitive.add(otherSession.data.refresh_token);
    const oldHash=await sql("select encrypted_password from auth.users where id='"+actor.id+"';");sensitive.add(oldHash);
    ctx=await context();const page=await ctx.newPage();
    let recoveryToken='';
    page.on('request',req=>{
      if(req.url()===ROOT+'/auth/v1/user'){
        const value=req.headers().authorization||'';
        if(value.startsWith('Bearer ')){recoveryToken=value.slice(7);sensitive.add(recoveryToken);}
      }
    });
    await page.goto(server.url+'/#forgot-password');
    await expect(page.locator('#recoveryRequest')).toBeVisible();
    await page.locator('#recoveryRequest [name=email]').fill(actor.email);
    const sent=page.waitForResponse(r=>r.url().startsWith(ROOT+'/auth/v1/recover?')&&r.request().method()==='POST');
    await page.locator('#recoveryRequest button').click();
    check((await sent).ok(),'Actual GoTrue accepted recovery request');
    await expect(page.locator('#recoveryRequest [role=status]')).toContainText('If an account exists');
    const link=await capturedRecoveryLink(actor.email,ROOT,check,sensitive);
    check(new URL(link).searchParams.get('redirect_to')===server.url+'/','Recovery redirect stays on isolated frontend');
    evidence.passwordRecovery.localSmtpEmailCaptured=true;
    pass('Visible recovery request produces a real local SMTP email and genuine GoTrue verification link');
    await page.goto(link,{waitUntil:'domcontentloaded'});
    await expect(page.locator('#resetPassword')).toBeVisible({timeout:20000});
    await expect.poll(()=>Boolean(recoveryToken)).toBe(true);
    const state=await page.evaluate(()=>({url:location.hash,session:VACANCY_BACKEND.session(),local:Object.values(localStorage),tab:Object.values(sessionStorage)}));
    check(state.url==='#reset-password'&&!state.session,'Recovery credentials must not become the normal app session');
    check([...state.local,...state.tab].every(v=>!v.includes(recoveryToken)),'Recovery JWT must stay out of browser storage');
    evidence.passwordRecovery.callbackScrubbed=true;
    pass('Genuine recovery callback opens existing reset UI and removes credentials from URL without saving a login session');
    const weak=await edge(recoveryToken,{password:'short'});
    check(weak.status===400,'Existing reset handler rejects server-side weak passwords');
    const breached=await edge(recoveryToken,{password:'Password1234'});
    check(breached.status===400&&/known breach/i.test(breached.data?.message||''),'Actual breached-password range lookup must deny the known synthetic test password; HTTP '+breached.status);
    check(await sql("select encrypted_password from auth.users where id='"+actor.id+"';")===oldHash,'Rejected passwords leave stored credential unchanged');
    evidence.passwordRecovery.liveBreachedPasswordCheck=true;
    pass('Unmodified Edge handler rejects weak and actually breached passwords without changing the account');
    const form=page.locator('#resetPassword');
    await form.locator('[name=password]').fill(nextPassword);
    await form.locator('[name=confirmation]').fill(nextPassword+'x');
    await form.locator('button').click();
    await expect(form.locator('[role=status]')).toContainText('Passwords do not match');
    await form.locator('[name=confirmation]').fill(nextPassword);
    let failOnce=true;
    await ctx.route(ROOT+'/functions/v1/secure-password-reset',route=>{
      if(failOnce){failOnce=false;return route.abort('failed');}return route.continue();
    });
    await form.locator('button').click();
    await expect(form.locator('[role=status]')).toContainText('Connection unavailable');
    await expect(form.locator('[name=password]')).toHaveValue(nextPassword);
    check(await sql("select encrypted_password from auth.users where id='"+actor.id+"';")===oldHash,'Interrupted browser submission cannot mutate password');
    pass('Mismatched confirmation and interrupted reset request retain the form and leave password unchanged');
    const responsePromise=page.waitForResponse(r=>r.url()===ROOT+'/functions/v1/secure-password-reset'&&r.request().method()==='POST');
    await form.locator('button').click();
    const successful=await responsePromise;
    check(successful.status()===200,'Final password change through actual local Edge Runtime; HTTP '+successful.status());
    await expect(page.locator('#resetHost')).toContainText('Password updated. Sign in with your new password.');
    await expect(page.locator('#resetPassword')).toHaveCount(0);
    check(!(await page.evaluate(()=>VACANCY_BACKEND.session())),'Completed recovery must remain signed out');
    check(await sql("select encrypted_password from auth.users where id='"+actor.id+"';")!==oldHash,'GoTrue persisted the new password');
    evidence.passwordRecovery.realEdgePasswordUpdate=true;
    pass('Existing reset form completes a real Edge/GoTrue password update after a live password-safety check');
    for(const session of [oldSession,otherSession.data]){
      const refresh=await request('auth/v1/token?grant_type=refresh_token',{body:{refresh_token:session.refresh_token}});
      check(!refresh.ok&&[400,401,403].includes(refresh.status),'Pre-reset sessions cannot refresh after global sign-out');
    }
    const old=await request('auth/v1/token?grant_type=password',{body:{email:actor.email,password:actor.password}});
    check(!old.ok&&[400,401].includes(old.status),'Old password must no longer sign in');
    actor.password=nextPassword;
    const fresh=await loginUI(actor);afterCtx=fresh.ctx;
    check(await fresh.page.evaluate(()=>currentUser?.id)===actor.id,'New password signs in the same account through the visible form');
    evidence.passwordRecovery.previousRefreshTokensRejected=true;
    evidence.passwordRecovery.oldPasswordRejected=true;
    evidence.passwordRecovery.newPasswordUiLogin=true;
    pass('Old password and pre-reset refresh tokens are rejected; new password works in real UI login');
    const replay=await fetch(link,{redirect:'manual',signal:AbortSignal.timeout(10000)});
    const destination=replay.headers.get('location')||'';
    const replayParams=new URLSearchParams(destination.split('#')[1]||'');
    check(!replayParams.has('access_token')&&(replayParams.has('error')||replayParams.has('error_code')||replay.status>=400),'Consumed email link must not issue another recovery session');
    await page.goto(server.url+'/#reset-password');
    await expect(page.locator('#resetPassword')).toHaveCount(0);
    await expect(page.locator('#resetStatus')).toContainText('invalid or expired');
    pass('Consumed recovery email cannot issue a new session and completed reset form cannot be reused');
    evidence.passwordRecovery.completed=true;
    evidence.passwordRecovery.realEdgeRuntime=true;
    evidence.passwordRecovery.externalInboxDelivery=false;
  }finally{await afterCtx?.close();await ctx?.close();}
}
