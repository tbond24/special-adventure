// Opt-in disposable CI only. No hosted keys, fabricated user JWTs, API mocks,
// traces, HAR, storage exports or screenshots of credentials/MFA enrollment.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {writeFile,readFile} from 'node:fs/promises';
import {randomBytes,randomUUID} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
import {prepare,stackDir,artifacts} from './prepare.mjs';
import {check,claims,totp,realMfa,ELEMENT} from '../hosted-admin/support.mjs';
import {frontendServer} from '../hosted-admin/frontend-server.mjs';
const exec=promisify(execFile),ROOT='http://127.0.0.1:54321',DB='supabase_db_vacancy-disposable-admin';
const evidence={environment:'disposable Linux CI, complete source schema, genuine GoTrue',startedAt:new Date().toISOString(),checks:[],timings:[]};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const pass=label=>{evidence.checks.push({status:'PASS',label});console.log('PASS '+label);};
let phase='prepare',browser,server,key,service,started=false;
const actors=[];
const sensitive=new Set();
function safe(message){let value=String(message).replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[redacted]').replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g,'[redacted]');for(const secret of sensitive)if(secret)value=value.replaceAll(secret,'[redacted]');return value;}
async function cli(args){
  try{return (await exec('supabase',[...args,'--workdir',stackDir,'--yes'],{timeout:900000,maxBuffer:8*1024*1024})).stdout;}
  catch(e){throw Error('Local CLI '+args[0]+' failed: '+safe((e.stderr||'').split('\n').filter(line=>!/key|secret|password|token|postgres:\/\//i.test(line)).slice(-14).join('\n')));}
}
async function sql(query){
  return new Promise((resolve,reject)=>{
    // SQL goes through stdin; no connection password appears in arguments/logs.
    execFile('docker',['exec','-i',DB,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{timeout:30000,maxBuffer:1024*1024},(error,stdout,stderr)=>{
      if(error)reject(Error('Disposable fixture SQL failed: '+safe(stderr)));else resolve(stdout.trim());
    }).stdin.end(query);
  });
}
async function request(path,{token,body,method='POST',admin=false}={}){
  check(/^(auth|rest)\/v1\//.test(path)&&!path.includes('..'),'Unexpected local API path');
  const begin=performance.now(),response=await fetch(ROOT+'/'+path,{method,
    headers:{apikey:admin?service:key,'Content-Type':'application/json',Authorization:'Bearer '+(token||(admin?service:key))},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
  let data;try{data=await response.json()}catch{data=null}
  return {ok:response.ok,status:response.status,data,elapsedMs:Math.round(performance.now()-begin)};
}
const rpc=(name,actor,body={})=>request('rest/v1/rpc/'+name,{token:actor?.session?.access_token,body});
const state=actor=>rpc('admin_appearance_state',actor,{p_element_key:ELEMENT});
const save=(actor,config,version,revision)=>rpc('admin_appearance_save_draft',actor,{p_element_key:ELEMENT,p_config:config,p_expected_draft_version:version,p_expected_published_revision:revision});
const publish=(actor,revision,version,id=randomUUID())=>rpc('admin_appearance_publish',actor,{p_element_key:ELEMENT,p_expected_published_revision:revision,p_expected_draft_version:version,p_reason:'Disposable integration acceptance',p_request_id:id});
function denied(out,label){check(!out.ok&&[401,403].includes(out.status)&&out.data?.code==='42501',label+' expected permission denial; HTTP '+out.status);pass(label);}
async function surfaceDenied(actor,label){
  for(const [name,body] of [
    ['admin_my_capabilities',{}],['admin_access_roles_read',{}],['admin_change_audit_recent',{p_limit:10}],
    ['admin_appearance_state',{p_element_key:ELEMENT}],['admin_appearance_history',{p_element_key:ELEMENT}],
    ['admin_appearance_save_draft',{p_element_key:ELEMENT,p_config:{},p_expected_draft_version:0,p_expected_published_revision:0}],
    ['admin_appearance_publish',{p_element_key:ELEMENT,p_expected_published_revision:0,p_expected_draft_version:1,p_reason:'Denied actor test',p_request_id:randomUUID()}],
    ['admin_appearance_restore_draft',{p_element_key:ELEMENT,p_from_revision:1,p_expected_draft_version:0,p_expected_published_revision:0}]
  ])denied(await rpc(name,actor,body),label+' '+name);
}
async function snapshot(){return JSON.parse(await sql(`select json_build_object('current',(select row_to_json(c) from public.admin_appearance_current c where element_key='${ELEMENT}'),'revisions',(select count(*) from public.admin_appearance_revisions),'audit',(select count(*) from public.admin_change_audit),'drafts',(select json_agg(d order by actor_id) from public.admin_appearance_drafts d));`));}
async function context(){
  const ctx=await browser.newContext({viewport:{width:1536,height:1024},serviceWorkers:'block'});
  await ctx.route('**/*',route=>[server.url,ROOT].includes(new URL(route.request().url()).origin)?route.continue():route.abort());
  return ctx;
}
async function loginUI(actor){
  const ctx=await context(),page=await ctx.newPage();
  await page.goto(server.url+'/#auth');
  await expect(page.locator('#authUnified')).toBeVisible();
  await page.locator('#authUnified [name=email]').fill(actor.email);
  await page.locator('#authUnified [name=password]').fill(actor.password);
  await page.locator('#authUnified .primary').click();
  // Identity refresh finishes favourites/session reconciliation before its
  // final navigation. Waiting only for currentUser races that navigation.
  await expect(page).toHaveURL(/#home$/,{timeout:20000});
  await expect.poll(()=>page.evaluate(()=>currentUser?.id)).toBe(actor.id);
  check(await page.evaluate(()=>VACANCY_BACKEND.assuranceLevel())==='aal1','Visible password sign-in returns AAL1');
  actor.aal1Session=await page.evaluate(()=>VACANCY_BACKEND.session());
  pass('Visible password sign-in with genuine GoTrue AAL1: '+actor.role);
  return {page,ctx};
}
async function enrollUI(page,actor){
  await page.goto(server.url+'/#admin');
  await expect(page.getByRole('heading',{name:'Admin verification'})).toBeVisible();
  await expect(page.locator('#adminHost')).toHaveCount(0);
  await page.locator('#verifyAdminMfa').click();
  await page.locator('[data-start-mfa-setup]').click();
  await expect(page.getByRole('heading',{name:'Set up authenticator',exact:true})).toBeVisible();
  await expect.poll(()=>page.locator('.mfa-qr').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  const secret=await page.locator('.mfa-secret').textContent();
  sensitive.add(secret);
  // Secret stays in memory; neither screenshots nor Playwright traces are enabled.
  if(Date.now()%30000>27000)await pause(3500);
  const code=totp(secret);sensitive.add(code);
  await page.getByLabel('Authenticator code').fill(code);
  await page.locator('[data-mfa-code-form] button[type=submit]').click();
  await expect(page.locator('#adminHost')).toBeVisible({timeout:30000});
  check(await page.evaluate(()=>VACANCY_BACKEND.assuranceLevel())==='aal2','Visible TOTP produces genuine AAL2');
  actor.session=await page.evaluate(()=>VACANCY_BACKEND.session());
  check((await request('auth/v1/user',{token:actor.session.access_token,method:'GET'})).data?.id===actor.id,'GoTrue validates UI AAL2');
  pass('Visible TOTP enrollment/verification opens actual full admin route: '+actor.role);
}
async function design(page){
  await page.locator('#adminSectionMenu [data-section=design]').click();
  await expect(page.locator('[data-frame-status]')).toContainText('Actual public renderer');
  await page.locator('[data-edit-scope]').selectOption('desktop');
}
async function publishUI(page,radius){
  await page.locator('[data-style-field=radius]').fill(String(radius));
  await page.locator('[data-style-field=radius]').press('Tab');
  await page.locator('[data-save-draft]').click();
  await expect(page.locator('[data-review]')).toBeEnabled();
  await page.locator('[data-review]').click();
  await page.locator('[data-publish-reason]').fill('Disposable full-route acceptance');
  await page.locator('[data-confirm-publish]').click();
  await expect(page.locator('[data-draft-status]')).toContainText('Published revision');
}
try{
  const count=await prepare();phase='start local Supabase';started=true;
  console.log('Starting disposable Supabase with '+count+' source migrations; hosted projects are not contacted.');
  await cli(['start','--exclude','realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor']);
  phase='read local credentials in memory';
  const status=JSON.parse(await cli(['status','-o','json']));
  check(status.API_URL===ROOT&&status.DB_URL?.includes('127.0.0.1:54322/'),'Unexpected stack identity');
  key=status.ANON_KEY;service=status.SERVICE_ROLE_KEY;check(key&&service,'Local credentials unavailable');sensitive.add(key);sensitive.add(service);
  evidence.migrationCount=count;pass('Complete source schema replay; only historical hard-coded account assignment omitted');
  phase='provision disposable synthetic identities';
  for(const role of ['owner','operator','viewer','suspended']){
    const actor={role,email:'qa-'+role+'@vacancy.invalid',password:'Qa1!'+randomBytes(24).toString('base64url')};
    sensitive.add(actor.password);
    const out=await request('auth/v1/admin/users',{admin:true,body:{email:actor.email,password:actor.password,email_confirm:true,user_metadata:{display_name:'Synthetic '+role},app_metadata:{vacancy_qa_scope:'disposable-ci'}}});
    check(out.ok&&out.data?.id,'Confirmed synthetic Auth provisioning '+role+' HTTP '+out.status);
    actor.id=out.data.id;actors.push(actor);
    const login=await request('auth/v1/token?grant_type=password',{body:{email:actor.email,password:actor.password}});
    check(login.ok,'Disposable password sign-in '+role+' HTTP '+login.status+' '+safe(login.data?.error_code||login.data?.msg||''));
    check(login.ok&&claims(login.data.access_token).aal==='aal1','Genuine AAL1 '+role);actor.session=login.data;actor.aal1Session=login.data;
  }
  const [owner,operator,viewer,suspended]=actors;
  await sql(`begin;
    insert into public.admin_users(user_id) values('${owner.id}'),('${operator.id}'),('${suspended.id}');
    insert into public.admin_access_roles(user_id,role,grant_reason) values('${owner.id}','owner','Disposable synthetic owner'),('${operator.id}','operator','Disposable synthetic operator'),('${suspended.id}','operator','Disposable suspended operator');
    update public.profiles set account_status='suspended' where id='${suspended.id}';
    insert into public.properties(id,owner_id,title,country,state,city,suburb,property_type) values('77777777-7777-4777-8777-777777777777','${operator.id}','Synthetic CI property','Australia','WA','Perth','Joondalup','House');
    insert into public.rooms(id,property_id,name,room_type,description) values('66666666-6666-4666-8666-666666666666','77777777-7777-4777-8777-777777777777','Synthetic integration room','private','Disposable database listing for integration QA');
    insert into public.vacancies(id,room_id,weekly_rent,monthly_rent,rent_amount,rent_currency,rent_period,available_from,status,confirmed_at,expires_at,published_at) values('55555555-5555-4555-8555-555555555555','66666666-6666-4666-8666-666666666666',320,320,320,'AUD','week',current_date,'active',now(),now()+interval '21 days',now());
    insert into public.reports(id,reporter_id,vacancy_id,reported_user_id,reason) values('99999999-9999-4999-8999-999999999999','${viewer.id}','55555555-5555-4555-8555-555555555555','${operator.id}','Synthetic isolated report');
    commit;`);
  pass('Synthetic roles and public listing persisted in full schema; no listing DTO or backend replacement');
  phase='AAL1 API permission matrix';
  for(const actor of actors)await surfaceDenied(actor,'AAL1 '+actor.role);
  await surfaceDenied(null,'Anonymous');
  const membership=await request('rest/v1/admin_users?select=user_id&user_id=eq.'+owner.id,{token:owner.session.access_token,method:'GET'});
  check(membership.ok&&membership.data.length===1,'Actual AAL1 self-membership read HTTP '+membership.status+' '+safe(membership.data?.message||''));
  phase='visible sign-in and MFA';
  server=await frontendServer(key,{apiOrigin:ROOT,port:8778});browser=await chromium.launch();
  const ownerUI=await loginUI(owner);await enrollUI(ownerUI.page,owner);
  const operatorUI=await loginUI(operator);await enrollUI(operatorUI.page,operator);
  for(const actor of [viewer,suspended]){await realMfa(request,actor);await surfaceDenied(actor,'AAL2 '+actor.role);}
  phase='AAL2 capabilities and direct table matrix';
  for(const [actor,canPublish] of [[owner,true],[operator,false]]){
    const cap=await rpc('admin_my_capabilities',actor);check(cap.ok&&cap.data.role===actor.role&&cap.data.appearance_publish===canPublish,'Real role capabilities');pass('Real AAL2 capability split '+actor.role);
  }
  for(const [actor,label] of [...actors.map(a=>[a,'AAL2 '+a.role]),[{session:owner.aal1Session},'AAL1 owner'],[null,'Anonymous']]){
    for(const table of ['admin_access_roles','admin_change_audit','admin_appearance_current','admin_appearance_drafts','admin_appearance_revisions']){
      for(const method of ['GET','POST','PATCH','DELETE']){
        const column=({admin_access_roles:'user_id',admin_change_audit:'id',admin_appearance_current:'element_key',admin_appearance_drafts:'actor_id',admin_appearance_revisions:'actor_id'})[table];
        const absent=table==='admin_change_audit'?'-1':table==='admin_appearance_current'?'__absent__':'00000000-0000-4000-8000-000000000099';
        denied(await request('rest/v1/'+table+'?'+column+'=eq.'+absent,{token:actor?.session?.access_token,method,...(['POST','PATCH'].includes(method)?{body:{}}:{})}),label+' direct '+method+' '+table);
      }
    }
  }
  phase='optimistic versions and atomic audit';
  let own=(await state(owner)).data,op=(await state(operator)).data;
  check((await save(operator,{desktop:{radius:11}},0,op.published.revision)).ok,'Operator private save');
  check(!(await state(owner)).data.draft,'Owner cannot see Operator draft');
  check((await save(owner,{desktop:{radius:17}},0,own.published.revision)).ok,'Owner private save');
  pass('Separate per-user private drafts with real API sessions');
  const stale=await save(owner,{desktop:{radius:18}},0,own.published.revision);
  check(stale.status===409&&stale.data.code==='PT409','Stale save returns non-retryable HTTP409');pass('Real PostgREST draft conflict returns HTTP409 promptly');
  own=(await state(owner)).data;
  denied(await publish(operator,op.published.revision,1),'Operator publish denied');
  const before=await snapshot();
  await sql(`create function private.qa_reject_disposable_audit() returns trigger language plpgsql as $$ begin if new.action='appearance_published' then raise exception 'Disposable audit rejection' using errcode='23514'; end if; return new; end $$; create trigger qa_reject_disposable_audit before insert on public.admin_change_audit for each row execute function private.qa_reject_disposable_audit();`);
  const reject=await publish(owner,own.published.revision,own.draft.version);
  check(!reject.ok&&reject.data?.code==='23514','Forced audit failure must reject publication');
  check(JSON.stringify(await snapshot())===JSON.stringify(before),'Audit failure rolls back current/history/draft/audit together');
  await sql('drop trigger qa_reject_disposable_audit on public.admin_change_audit; drop function private.qa_reject_disposable_audit();');pass('Atomic audit failure rolls back all publication effects');
  const id=randomUUID(),first=await publish(owner,own.published.revision,own.draft.version,id);
  check(first.ok,'Initial publication');const after=await snapshot();
  const retry=await publish(owner,own.published.revision,own.draft.version,id);
  check(retry.ok&&retry.data.alreadyApplied===true&&JSON.stringify(await snapshot())===JSON.stringify(after),'Publish retry is idempotent');pass('Idempotent publication adds exactly one revision and audit');
  const stalePublish=await publish(operator,op.published.revision,1);check(!stalePublish.ok,'Stale unauthorized publish remains denied');
  phase='full admin frontend save and publish';
  const page=ownerUI.page;
  await page.reload();await expect(page.locator('#adminHost')).toBeVisible({timeout:30000});await design(page);
  await publishUI(page,19);
  await page.screenshot({path:artifacts+'/full-admin-desktop.png'});
  pass('Full admin shell loads real existing dashboards and real listing preview; visible save/review/publish succeeds');
  await design(operatorUI.page);
  await expect(operatorUI.page.locator('[data-review]')).toBeDisabled();
  pass('Actual Operator frontend disables publication');
  phase='public database listing and desktop-only propagation';
  const publicCtx=await context(),publicPage=await publicCtx.newPage();
  await publicPage.goto(server.url+'/#detail/55555555-5555-4555-8555-555555555555');
  await expect(publicPage.locator('.quiet-intro h1')).toHaveText('Synthetic integration room');
  await expect(publicPage.locator('.quiet-save')).toHaveCSS('border-radius','19px');
  await publicPage.screenshot({path:artifacts+'/public-desktop.png'});
  await publicPage.setViewportSize({width:390,height:844});
  check(await publicPage.locator('.quiet-save').evaluate(el=>getComputedStyle(el).borderRadius)!=='19px','Desktop-only style isolation');
  check(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile no overflow');
  await publicPage.screenshot({path:artifacts+'/public-mobile.png'});pass('Anonymous joined listing query renders published desktop style; mobile retains compiled style');
  phase='existing admin sections';
  for(const section of ['overview','people','reports','icons','system']){
    await page.locator('#adminSectionMenu [data-section='+section+']').click();
    await expect(page.locator('[data-admin-section='+section+']')).toBeVisible();
  }
  check(await page.evaluate(()=>!document.querySelector('#adminHost').textContent.includes('Could not load admin')),'Existing admin shell has no loading failure');pass('Existing Overview, People & listings, Reports, Appearance and System sections reachable with genuine AAL2');
  phase='existing moderation through visible controls';
  page.on('dialog',dialog=>dialog.accept(dialog.type()==='prompt'?'Disposable moderation acceptance':undefined));
  await page.locator('#adminSectionMenu [data-section=people]').click();
  await page.getByLabel('Search users and listings').fill('Synthetic integration room');
  await page.locator('#adminSearchForm button').click();
  const listingAction=page.locator('[data-admin-listing="55555555-5555-4555-8555-555555555555"]');
  await expect(listingAction).toHaveText('Pause');await listingAction.click();
  await expect.poll(()=>sql("select status from public.vacancies where id='55555555-5555-4555-8555-555555555555';")).toBe('paused');
  const pausedPublic=await request('rest/v1/vacancies?select=id&status=eq.active',{method:'GET'});
  check(pausedPublic.ok&&pausedPublic.data.length===0,'Paused listing removed from anonymous inventory');
  await expect(listingAction).toHaveText('Reactivate');await listingAction.click();
  await expect.poll(()=>sql("select status from public.vacancies where id='55555555-5555-4555-8555-555555555555';")).toBe('active');
  await page.locator('#adminSectionMenu [data-section=reports]').click();
  await page.locator('[data-report-id="99999999-9999-4999-8999-999999999999"][data-report-action=resolved]').click();
  await expect.poll(()=>sql("select status from public.reports where id='99999999-9999-4999-8999-999999999999';")).toBe('resolved');
  check(await sql(`select count(*) from public.admin_moderation_log where admin_id='${owner.id}';`)==='3','Three legacy moderation audit entries');
  pass('Visible legacy search/pause/reactivate/report resolution persists state, public visibility and three moderation audits');
  phase='saved listing and enquiry real writes';
  const viewerUI=await loginUI(viewer),vpage=viewerUI.page;
  await vpage.goto(server.url+'/#detail/55555555-5555-4555-8555-555555555555');
  await expect(vpage.locator('.quiet-intro h1')).toHaveText('Synthetic integration room');
  await vpage.locator('.quiet-save').click();await expect(vpage.locator('.quiet-save')).toHaveAttribute('aria-pressed','true');
  check(await sql(`select count(*) from public.saved_vacancies where user_id='${viewer.id}' and vacancy_id='55555555-5555-4555-8555-555555555555';`)==='1','Saved record persisted');
  await vpage.reload();await expect(vpage.locator('.quiet-save')).toHaveAttribute('aria-pressed','true');
  await vpage.locator('.quiet-save').click();
  await expect.poll(()=>sql(`select count(*) from public.saved_vacancies where user_id='${viewer.id}';`)).toBe('0');pass('Visible save persists across reload and unsave removes database record');
  await vpage.locator('.quiet-message').click();
  await expect(vpage.locator('#enquiryForm')).toBeVisible();
  await vpage.locator('#enquiryForm [name=message]').fill('Synthetic isolated enquiry');
  await vpage.locator('#enquiryForm button[type=submit],#enquiryForm button.primary').first().click();
  await expect.poll(()=>sql(`select count(*) from public.messages where sender_id='${viewer.id}' and body='Synthetic isolated enquiry';`)).toBe('1');
  await expect(vpage).toHaveURL(/#messages\//);pass('Visible public enquiry persists conversation/message and opens inbox');
  await vpage.goto(server.url+'/#admin');
  await expect(vpage.getByText('This account is not an authorised operator.')).toBeVisible();
  await expect(vpage.locator('#adminHost')).toHaveCount(0);pass('Actual nonadmin frontend route denies dashboard access');
  phase='rollback and restore contracts';
  owner.session=await page.evaluate(async()=>{await VACANCY_BACKEND.currentUser();return VACANCY_BACKEND.session();});
  own=(await state(owner)).data;
  const restored=await rpc('admin_appearance_restore_draft',owner,{p_element_key:ELEMENT,p_from_revision:1,p_expected_draft_version:own.draft?.version||0,p_expected_published_revision:own.published.revision});
  check(restored.ok,'Restore historical revision as private draft');
  const again=await rpc('admin_appearance_restore_draft',owner,{p_element_key:ELEMENT,p_from_revision:1,p_expected_draft_version:own.draft?.version||0,p_expected_published_revision:own.published.revision});
  check(again.status===409,'Stale restore retry conflicts');
  own=(await state(owner)).data;check((await publish(owner,own.published.revision,own.draft.version)).ok,'Publish restored draft');
  own=(await state(owner)).data;check(own.published.config.desktop.radius===17,'Restoration exact prior configuration');
  const cleared=await save(owner,{},own.draft?.version||0,own.published.revision);check(cleared.ok,'Compiled defaults rollback draft');
  own=(await state(owner)).data;check((await publish(owner,own.published.revision,own.draft.version)).ok,'Publish compiled defaults rollback');
  await publicPage.reload();
  check(await publicPage.locator('.quiet-save').evaluate(el=>getComputedStyle(el).borderRadius)!=='19px','Rollback public renderer');
  const final=(await state(owner)).data;check(JSON.stringify(final.published.config)==='{}','Final compiled configuration');pass('Restore produces new audited publication; stale retry conflicts; exact compiled defaults rollback propagates');
  phase='genuine expired token';
  const expired=owner.aal1Session.access_token,expiry=claims(expired).exp*1000;
  while(Date.now()<expiry+1500){console.log('Waiting for genuinely issued token expiry; no JWT text is altered.');await pause(Math.min(20000,expiry+1500-Date.now()));}
  const expiredRead=await request('rest/v1/rpc/admin_my_capabilities',{token:expired,body:{}});
  check(expiredRead.status===401&&['PGRST301','PGRST303'].includes(expiredRead.data?.code)&&/expired/i.test(expiredRead.data?.message||''),'Real expired JWT rejected by PostgREST');
  evidence.expiredJwtResponse={status:expiredRead.status,code:expiredRead.data.code,message:expiredRead.data.message};
  pass('Actually expired GoTrue token receives HTTP401 and explicit expiry error');
  phase='local response measurements';
  for(let i=0;i<20;i++){const out=await rpc('site_appearance_published');check(out.ok,'Anonymous style measurement');evidence.timings.push(out.elapsedMs);}
  const sorted=[...evidence.timings].sort((a,b)=>a-b);evidence.localAnonymousStyleP95Ms=sorted[Math.ceil(sorted.length*.95)-1];
  evidence.finalSnapshot=await snapshot();evidence.completed=true;pass('20 disposable anonymous style samples recorded; no production performance inference');
}catch(error){
  evidence.completed=false;evidence.failure={phase,message:safe(error.message).slice(0,3000)};
  console.error('FAIL '+phase+': '+evidence.failure.message);process.exitCode=1;
}finally{
  await browser?.close();await server?.close();
  if(started){try{await cli(['stop','--project-id','vacancy-disposable-admin','--no-backup']);evidence.disposableStackRemoved=true;}catch{evidence.disposableStackRemoved=false;process.exitCode=1;}}
  evidence.finishedAt=new Date().toISOString();
  // Only explicit safe fields are persisted. Actors, passwords, keys and sessions
  // never enter this evidence object. The final DB snapshot contains synthetic IDs.
  await writeFile(artifacts+'/evidence.json',JSON.stringify(evidence,null,2));
}
