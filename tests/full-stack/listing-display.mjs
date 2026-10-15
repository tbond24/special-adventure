// Genuine Auth/PostgREST/browser checks in the existing disposable stack only.
import {randomUUID} from 'node:crypto';
import {expect} from '@playwright/test';
const K='site/listing-display',LISTING='55555555-5555-4555-8555-555555555555';
export async function verifyLegacyDisplayGate({baselineAdmin,sql,check,pass}){
  const before=await sql("select jsonb_agg(to_jsonb(d) order by slot) from public.listing_display_options d;");
  await baselineAdmin.locator('#adminSectionMenu [data-section=icons]').click();
  const box=baselineAdmin.locator('#listingDisplayOptions input[type=checkbox]').first();
  await expect(box).toBeVisible();
  const checked=await box.isChecked();await box.click();
  await expect(baselineAdmin.locator('#listingDisplayOptions [role=status]')).toContainText('Reload the admin page');
  await expect(box).toBeChecked({checked});
  check(await sql("select jsonb_agg(to_jsonb(d) order by slot) from public.listing_display_options d;")===before,'Cached immediate-save must not mutate public settings');
  pass('Actual pinned old admin display switch fails closed, explains reload and restores its checkbox without a public write');
}
export async function verifyListingDisplay({ROOT,key,sql,rpc,request,owner,operator,viewer,suspended,page,operatorPage,context,server,check,pass,evidence,artifacts,sensitive}){
  check(ROOT==='http://127.0.0.1:54321'&&process.env.VACANCY_DISPOSABLE_STACK==='1','Display checks require disposable loopback only');
  const report={environment:'Real disposable GoTrue AAL1/AAL2, PostgREST and actual browser',key:K,completed:false};
  evidence.listingDisplay=report;
  const refresh=async(actor,p)=>{actor.session=await p.evaluate(async()=>{await VACANCY_BACKEND.currentUser();return VACANCY_BACKEND.session();});};
  await refresh(owner,page);await refresh(operator,operatorPage);
  for(const actor of [viewer,suspended]){
    const out=await request('auth/v1/token?grant_type=refresh_token',{body:{refresh_token:actor.session.refresh_token}});
    check(out.ok,'Refresh real display denial actor');actor.session=out.data;
    sensitive.add(out.data.access_token);sensitive.add(out.data.refresh_token);
  }
  const login=await request('auth/v1/token?grant_type=password',{body:{email:owner.email,password:owner.password}});
  check(login.ok,'Fresh real AAL1 display session');sensitive.add(login.data.access_token);sensitive.add(login.data.refresh_token);
  const aal1={session:login.data};
  const call=(name,actor,args={})=>rpc('admin_appearance_'+name,actor,{p_element_key:K,...args});
  const get=async actor=>{const out=await call('state',actor);check(out.ok,'Display state HTTP '+out.status);return out.data;};
  const save=(actor,config,draft,revision)=>call('save_draft',actor,{p_config:config,p_expected_draft_version:draft,p_expected_published_revision:revision});
  const pub=(actor,revision,version,id=randomUUID(),reason='Isolated shared display review')=>call('publish',actor,{p_expected_published_revision:revision,p_expected_draft_version:version,p_reason:reason,p_request_id:id});
  const snap=()=>sql("select jsonb_build_object('public',(select jsonb_agg(to_jsonb(d) order by slot) from public.listing_display_options d),'current',(select to_jsonb(c) from public.admin_appearance_current c where element_key='"+K+"'),'drafts',(select jsonb_agg(to_jsonb(d) order by actor_id) from public.admin_appearance_drafts d where element_key='"+K+"'),'history',(select jsonb_agg(to_jsonb(r) order by revision) from public.admin_appearance_revisions r where element_key='"+K+"'),'audit',(select jsonb_agg(to_jsonb(a) order by id) from public.admin_change_audit a where target_key='"+K+"'));");
  const initial=await get(owner),baseline=initial.published.config;
  check(initial.published.revision===0&&initial.draft===null&&Object.keys(baseline.all).length===10,'Initial ten-switch snapshot at revision zero');
  const publicRows=await request('rest/v1/listing_display_options?select=slot,label,enabled&order=slot',{method:'GET'});
  check(publicRows.ok&&publicRows.data.length===10&&publicRows.data.every(r=>baseline.all[r.slot]===r.enabled),'Migration preserves actual public switch values');
  check(baseline.all['listing-water']===false&&baseline.all['listing-electricity']===false,'Preserve non-default Water and Electricity settings before Stage 3');
  pass('Existing ten public switch values, including two non-default hidden settings, captured at revision zero without a new publication or actor');
  const deny=async(out,label)=>{check(!out.ok&&[401,403].includes(out.status)&&out.data?.code==='42501',label+' HTTP '+out.status);};
  const beforeDenied=await snap();
  for(const [actor,label] of [[null,'Anonymous'],[aal1,'real AAL1 Owner'],[viewer,'real AAL2 nonadmin'],[suspended,'real AAL2 suspended']]){
    await deny(await call('state',actor),label+' state');
    await deny(await call('history',actor),label+' history');
    await deny(await save(actor,baseline,0,0),label+' draft');
    await deny(await pub(actor,0,1),label+' publish');
    await deny(await call('restore_draft',actor,{p_from_revision:0,p_expected_draft_version:0,p_expected_published_revision:0}),label+' restore');
    await deny(await rpc('admin_set_listing_display_option',actor,{p_slot:'card-services',p_enabled:false}),label+' legacy save');
  }
  for(const actor of [null,aal1,viewer,suspended,operator,owner]){
    for(const [method,body] of [['POST',{slot:'qa-extra',label:'Forbidden',enabled:false}],['PATCH',{enabled:false}],['DELETE',undefined]]){
      const out=await request('rest/v1/listing_display_options?slot=eq.card-services',{token:actor?.session?.access_token,method,body});
      check(!out.ok&&[401,403].includes(out.status),'Direct display '+method+' must be denied');
    }
  }
  check(await snap()===beforeDenied,'All rejected RPCs/direct writes leave all display state and audit unchanged');
  report.deniedRpcProbes=24;report.deniedDirectWrites=18;
  pass('24 real Auth RPC denials and 18 direct public-table write denials leave shared display state unchanged');
  for(const actor of [owner,operator]){
    const legacy=await rpc('admin_set_listing_display_option',actor,{p_slot:'card-services',p_enabled:false});
    check(legacy.status===409&&legacy.data?.code==='PT409','AAL2 editor legacy path closed');
  }
  const malformed=[{}, {all:[]},{all:{...baseline.all,'unknown-switch':false}},
    {all:{...baseline.all,'card-services':'false'}},{desktop:baseline.all},{all:{'card-services':false}},
    {all:baseline.all,actor_id:owner.id},null];
  for(const config of malformed){
    const out=await save(owner,config,0,0);
    check(!out.ok&&out.data?.code==='22023','Malformed display config rejected');
  }
  check(await snap()===beforeDenied,'Validation and legacy bypass rejections are atomic');
  pass('Full fixed boolean snapshot validation rejects eight malformed configs; both real AAL2 roles cannot use immediate-save bypass');
  const opConfig=structuredClone(baseline);opConfig.all['listing-parking']=!opConfig.all['listing-parking'];
  check((await save(operator,opConfig,0,0)).ok,'Operator draft accepted');
  check((await get(owner)).draft===null,'Operator draft stays private');
  await deny(await pub(operator,0,1),'Operator publication');
  await deny(await call('restore_draft',operator,{p_from_revision:0,p_expected_draft_version:1,p_expected_published_revision:0}),'Operator restoration');
  check((await call('history',operator)).ok,'Operator can read published history');
  pass('Real AAL2 Operator can draft privately and read history, but cannot publish or restore');
  // Add one genuine optional feature to the disposable fixture so visible
  // preview/public checks prove the exact renderer binding rather than empty UI.
  await sql("update public.properties set internet_available=true where id='77777777-7777-4777-8777-777777777777';");
  await page.reload();await expect(page.locator('#adminHost')).toBeVisible({timeout:30000});
  await page.locator('#adminSectionMenu [data-section=icons]').click();
  const panel=page.locator('#listingDisplayOptions'),field=id=>panel.locator('[data-display-slot="'+id+'"]');
  await expect(panel.locator('[data-display-state]')).toContainText('Published version 0 loaded');
  const initialFrame=panel.frameLocator('iframe');
  await expect(initialFrame.locator('.quiet-detail')).toBeVisible();
  await expect(initialFrame.getByText('Wi-Fi or internet',{exact:true}).first()).toBeVisible();
  await field('card-services').uncheck();await field('listing-wifi').uncheck();
  await expect(panel.locator('[data-display-review]')).toBeDisabled();
  const frame=panel.frameLocator('iframe');
  await expect(frame.getByText('Wi-Fi or internet',{exact:true})).toHaveCount(0);
  check((await get(owner)).draft===null,'Unsaved controls do not write a draft');
  const allPublished=async()=>JSON.stringify((await request('rest/v1/listing_display_options?select=slot,enabled&order=slot',{method:'GET'})).data);
  const beforeDraft=await allPublished();
  await page.route('**/rest/v1/rpc/admin_appearance_save_draft',route=>route.abort());
  await panel.locator('[data-display-save]').click();
  await expect(panel.locator('[data-display-state]')).toContainText(/fetch|network/i);
  await expect(field('card-services')).not.toBeChecked();
  await page.unroute('**/rest/v1/rpc/admin_appearance_save_draft');
  await panel.locator('[data-display-save]').click();
  await expect(panel.locator('[data-display-state]')).toHaveText('Private draft saved. Public settings are unchanged.');
  check(await allPublished()===beforeDraft,'Saving private display changes does not alter anonymous data');
  const own=await get(owner);check(own.draft.version===1&&own.draft.config.all['card-services']===false,'Visible draft persisted');
  const stale=await save(owner,baseline,0,0);check(stale.status===409&&stale.data?.code==='PT409','Stale draft receives real HTTP409');
  pass('Visible Owner edit, failed-network save and retry retain changes; real private save and stale-tab conflict never affect public settings');
  const beforeAudit=await snap();
  await sql("create function private.qa_reject_display_audit() returns trigger language plpgsql set search_path='' as $$ begin if new.target_key='site/listing-display' and new.action='appearance_published' then raise exception 'Disposable display audit rejection' using errcode='23514'; end if; return new; end $$; create trigger qa_reject_display_audit before insert on public.admin_change_audit for each row execute function private.qa_reject_display_audit();");
  try{
    const out=await pub(owner,0,own.draft.version);
    check(!out.ok&&out.data?.code==='23514','Audit failure rejects display publication');
    check(await snap()===beforeAudit,'Audit failure rolls back public rows, timestamps, current, history, audit and draft');
  }finally{await sql('drop trigger qa_reject_display_audit on public.admin_change_audit; drop function private.qa_reject_display_audit();');}
  pass('Forced audit rejection rolls back the existing public display rows and every draft/publication effect atomically');
  await panel.locator('[data-display-review]').click();
  await expect(panel.locator('[data-display-diff]')).toContainText('Shown → Hidden');
  await expect(panel.locator('[data-display-publish]')).toBeDisabled();
  await panel.locator('[data-display-reason]').fill('Isolated reviewed display change');
  await expect(panel.locator('[data-display-publish]')).toBeDisabled();
  await panel.locator('[data-display-confirm]').check();
  // Element screenshots temporarily resize Chromium to 1px and back. The
  // editor correctly closes review when leaving desktop; capture the viewport
  // so evidence collection does not cross that safety boundary.
  await page.screenshot({path:artifacts+'/listing-display-review-desktop.png'});
  await expect(panel.locator('[data-display-review-panel]')).toBeVisible();
  await expect(panel.locator('[data-display-publish]')).toBeEnabled();
  let committedBody;
  await page.route('**/rest/v1/rpc/admin_appearance_publish',async route=>{
    committedBody=route.request().postDataJSON();
    const response=await route.fetch();check(response.ok(),'Lost-ack injection occurs after a real committed publication');
    await response.dispose();await route.abort();
  });
  await panel.locator('[data-display-publish]').click();
  await expect(panel.locator('[data-display-state]')).toContainText(/fetch|network/i);
  check((await get(owner)).published.revision===1,'Server committed despite deliberately lost acknowledgement');
  await page.unroute('**/rest/v1/rpc/admin_appearance_publish');
  await panel.locator('[data-display-publish]').click();
  await expect(panel.locator('[data-display-state]')).toHaveText('Shared listing settings published.');
  check(await sql("select count(*) from public.admin_appearance_revisions where element_key='"+K+"';")==='1','UI retry adds exactly one publication');
  check(await sql("select count(*) from public.admin_change_audit where target_key='"+K+"' and request_id='"+committedBody.p_request_id+"' and action='appearance_published';")==='1','UI retry adds exactly one publication audit');
  const reused=await pub(owner,0,1,committedBody.p_request_id,'Different reuse reason');
  check(reused.status===409&&reused.data?.code==='23505','Request ID reuse with another payload rejected');
  pass('Visible review requires reason and confirmation; a real committed publish with lost response retries idempotently with one revision and one audit');
  const staleOp=await save(operator,opConfig,1,0);check(staleOp.status===409,'Other actor stale published revision conflicts');
  await operatorPage.reload();await expect(operatorPage.locator('#adminHost')).toBeVisible({timeout:30000});
  await operatorPage.locator('#adminSectionMenu [data-section=icons]').click();
  const opPanel=operatorPage.locator('#listingDisplayOptions');
  await expect(opPanel.locator('[data-display-state]')).toContainText('Published settings changed');
  await expect(opPanel.locator('[data-display-review]')).toBeDisabled();
  await opPanel.locator('[data-display-save]').click();
  await expect(opPanel.locator('[data-display-state]')).toContainText('Private draft saved');
  const opState=await get(operator);
  check(opState.draft.baseRevision===1&&opState.draft.version===2&&opState.draft.config.all['listing-parking']===opConfig.all['listing-parking'],'Operator stale draft is retained and explicitly rebased without publication');
  pass('Published conflict retains the other actor draft; explicit reload/review/save rebases privately, and Operator still cannot publish');
  // These previews use real public DTOs and markup, no navigation, handlers,
  // script execution or product/telemetry writes.
  const product=()=>sql("select jsonb_build_object('messages',(select count(*) from public.messages),'saved',(select count(*) from public.saved_vacancies),'events',(select count(*) from public.analytics_events));");
  const beforePreview=await product();
  await panel.locator('[data-display-view]').selectOption('card');
  await expect(frame.locator('.listing-card')).toBeVisible();
  await expect(frame.locator('.service-card-pill').first()).toBeHidden();
  await panel.locator('[data-display-viewport]').selectOption('1024');
  await expect(panel.locator('iframe')).toHaveAttribute('sandbox','');
  check(await panel.locator('iframe').getAttribute('src')===null,'Preview never navigates to a live app page');
  await frame.locator('[data-save]').click({force:true});
  await panel.locator('[data-display-view]').selectOption('detail');
  await expect(frame.locator('.quiet-detail')).toBeVisible();
  await expect(frame.getByText('Wi-Fi or internet',{exact:true})).toHaveCount(0);
  await frame.locator('.quiet-save').click({force:true});
  check(await product()===beforePreview,'Script-disabled previews have zero saved, enquiry or analytics writes');
  pass('Actual card/detail mobile/desktop previews apply draft switches without product actions or telemetry writes');
  const publicCtx=await context(),publicPage=await publicCtx.newPage();
  try{
    await publicPage.goto(server.url+'/#detail/'+LISTING);
    await expect(publicPage.locator('.quiet-intro h1')).toHaveText('Synthetic integration room');
    await expect(publicPage.locator('.quiet-features').getByText('Wi-Fi or internet',{exact:true})).toHaveCount(0);
    await expect(publicPage.locator('.quiet-message')).toBeVisible();
    await expect(publicPage.locator('.quiet-save')).toBeVisible();
    for(const width of [1536,390]){
      await publicPage.setViewportSize({width,height:width===390?844:1024});
      await publicPage.goto(server.url+'/#home');
      await expect(publicPage.locator('#cards .listing-card').first()).toBeVisible();
      await expect(publicPage.locator('#cards .service-card-pill').first()).toBeHidden();
      check(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Public display propagation has no horizontal overflow');
    }
    const rows=await request('rest/v1/listing_display_options?select=slot,label,enabled&order=slot',{method:'GET'});
    check(rows.ok&&rows.data.filter(r=>r.enabled===false).length===Object.values(baseline.all).filter(v=>v===false).length+2,'Anonymous legacy table contract preserves baseline and exact two changed switches');
    pass('Anonymous existing public table and actual desktop/mobile card/detail flows receive published settings; Save, Message and layout remain intact');
    await panel.getByText('Published history',{exact:true}).click();
    await panel.locator('[data-display-restore="0"]').click();
    await expect(panel.locator('[data-display-state]')).toContainText('Historical settings copied');
    check(await allPublished()!==beforeDraft,'Restore is still private before review');
    await expect(frame.getByText('Wi-Fi or internet',{exact:true}).first()).toBeVisible();
    await panel.locator('[data-display-review]').click();
    await panel.locator('[data-display-reason]').fill('Restore the initial shared display settings');
    await panel.locator('[data-display-confirm]').check();
    await panel.locator('[data-display-publish]').click();
    await expect(panel.locator('[data-display-state]')).toHaveText('Shared listing settings published.');
    check(await allPublished()===beforeDraft,'Reviewed baseline restoration returns exact initial public values');
    const final=await get(owner);
    check(final.published.revision===2&&JSON.stringify(final.published.config)===JSON.stringify(baseline),'Restore creates new version without rewriting initial history');
    await publicPage.reload();await expect(publicPage.locator('#cards .service-card-pill').first()).toBeVisible();
    await publicPage.goto(server.url+'/#detail/'+LISTING);
    await expect(publicPage.getByText('Wi-Fi or internet',{exact:true}).first()).toBeVisible();
    pass('Visible initial-settings restore is private until reviewed publication, creates revision two and restores actual public rendering');
  }finally{await publicCtx.close();}
  const noWrite=await snap();
  await page.setViewportSize({width:390,height:844});
  await expect(panel.locator('.display-mobile-note')).toBeVisible();
  await expect(panel.locator('[data-display-fields]')).toBeHidden();
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile admin fallback has no horizontal overflow');
  await panel.screenshot({path:artifacts+'/listing-display-admin-mobile.png'});
  check(await snap()===noWrite,'Mobile fallback performs no display writes');
  await page.setViewportSize({width:1536,height:1024});
  const safety=JSON.parse(await sql("select jsonb_build_object('rls',(select bool_and(relrowsecurity) from pg_class where oid in ('public.admin_appearance_current'::regclass,'public.admin_appearance_drafts'::regclass,'public.admin_appearance_revisions'::regclass,'public.listing_display_options'::regclass)),'private_public_execute',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('validate_listing_display_config','apply_listing_display_snapshot') and has_function_privilege('anon',p.oid,'EXECUTE')),'empty_search_path',(select bool_and('search_path=\"\"'=any(proconfig)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('validate_listing_display_config','apply_listing_display_snapshot')));"));
  check(safety.rls&&safety.private_public_execute===0&&safety.empty_search_path,'Scoped RLS/privileged function catalog checks');
  report.securityCatalog=safety;report.finalRevision=2;report.completed=true;
  pass('Desktop editor has a read-only mobile fallback; RLS, private helper grants and empty search paths remain enforced');
}

export async function verifyDisplayAdvisors({cli,artifacts,evidence,pass}){
 const raw=await cli(['db','advisors','--local','--type','security','--level','warn','--fail-on','none','--output-format','json']);
 const result=JSON.parse(raw);
 const {writeFile}=await import('node:fs/promises');
 await writeFile(artifacts+'/security-advisors.json',JSON.stringify(result,null,2));
 evidence.securityAdvisors={executed:true,scope:'Disposable complete source schema; baseline findings require classification',artifact:'security-advisors.json'};
 pass('Official local security advisors executed; metadata-only findings retained for review');
}

export async function prepareDisplayReplay(){
  const {readFile,writeFile}=await import('node:fs/promises');
  const {createHash}=await import('node:crypto');
  const {stackDir,artifacts}=await import('./prepare.mjs');
  if(process.env.CI!=='true'||process.env.VACANCY_DISPOSABLE_STACK!=='1'||process.platform!=='linux')throw Error('Disposable display setup only');
  const file='20261015135652_admin_listing_display_reviewed_publication.sql';
  const source=await readFile(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8');
  const target=stackDir+'/supabase/migrations/'+file;
  if(await readFile(target,'utf8')!==source)throw Error('Unexpected disposable display migration copy');
  // Two synthetic public presentation values test non-default capture and
  // rollback. No customer data or hosted connection is copied or accessed.
  const fixture="-- Disposable-only synthetic pre-migration display fixture.\nupdate public.listing_display_options set enabled=false where slot in ('listing-water','listing-electricity');\n";
  const replay=fixture+source;
  await writeFile(target,replay);
  const manifestPath=artifacts+'/migration-manifest.json',manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  const row=manifest.find(x=>x.file===file);
  if(!row||row.sourceSha256!==createHash('sha256').update(source).digest('hex'))throw Error('Display replay manifest mismatch');
  row.replaySha256=createHash('sha256').update(replay).digest('hex');
  row.syntheticPrerequisite='Disposable fixture sets Water and Electricity false before the unchanged source DDL; tests exact non-default preservation';
  await writeFile(manifestPath,JSON.stringify(manifest,null,2));
}
