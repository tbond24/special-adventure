// Real Auth and actual forms/workspace; exact disposable opt-in only.
import {randomUUID} from 'node:crypto';
import {expect} from '@playwright/test';
const C='listing-create/language-selector',E='listing-edit/language-selector',KEYS=[C,E];
export async function verifyLanguageBindings(h){
 const {ROOT,sql,rpc,request,owner,operator,viewer,suspended,page,operatorPage,loginUI,actors,server,check,pass,evidence,artifacts,sensitive}=h;
 check(process.env.CI==='true'&&process.env.VACANCY_DISPOSABLE_STACK==='1'&&ROOT==='http://127.0.0.1:54321','Disposable language verification only');
 const report=evidence.languageBindings={completed:false,preview:'Actual shared picker component; surrounding form omitted'};
 for(const [a,p] of [[owner,page],[operator,operatorPage]])a.session=await p.evaluate(async()=>{await VACANCY_BACKEND.currentUser();return VACANCY_BACKEND.session();});
 for(const a of [viewer,suspended]){const out=await request('auth/v1/token?grant_type=refresh_token',{body:{refresh_token:a.session.refresh_token}});check(out.ok,'Refresh genuine language denial actor');a.session=out.data;sensitive.add(out.data.access_token);sensitive.add(out.data.refresh_token);}
 const fresh=await request('auth/v1/token?grant_type=password',{body:{email:owner.email,password:owner.password}});
 check(fresh.ok&&JSON.parse(Buffer.from(fresh.data.access_token.split('.')[1],'base64url')).aal==='aal1','Genuine fresh AAL1 Owner');sensitive.add(fresh.data.access_token);sensitive.add(fresh.data.refresh_token);
 const aal1={session:fresh.data},call=(name,k,a,args={})=>rpc('admin_appearance_'+name,a,{p_element_key:k,...args});
 const get=async(k,a=owner)=>{const r=await call('state',k,a);check(r.ok,'Read language state '+k);return r.data;};
 const save=(k,a,c,v,r)=>call('save_draft',k,a,{p_config:c,p_expected_draft_version:v,p_expected_published_revision:r});
 const pub=(k,a,r,v,id=randomUUID(),reason='Disposable language style review')=>call('publish',k,a,{p_expected_published_revision:r,p_expected_draft_version:v,p_request_id:id,p_reason:reason});
 const restore=(k,from,v,r)=>call('restore_draft',k,owner,{p_from_revision:from,p_expected_draft_version:v,p_expected_published_revision:r});
 const snap=()=>sql("select jsonb_build_object('current',(select jsonb_agg(to_jsonb(c) order by element_key) from public.admin_appearance_current c where element_key in ('"+C+"','"+E+"')),'drafts',(select jsonb_agg(to_jsonb(d) order by actor_id,element_key) from public.admin_appearance_drafts d where element_key in ('"+C+"','"+E+"')),'history',(select jsonb_agg(to_jsonb(r) order by element_key,revision) from public.admin_appearance_revisions r where element_key in ('"+C+"','"+E+"')),'audit',(select jsonb_agg(to_jsonb(a) order by id) from public.admin_change_audit a where target_key in ('"+C+"','"+E+"')));");
 const deny=(out,label)=>check(!out.ok&&[401,403].includes(out.status)&&out.data?.code==='42501',label+' denied HTTP '+out.status),initial=await snap();
 for(const k of KEYS){
  const state=await get(k),hist=await call('history',k,owner);check(state.published.revision===0&&JSON.stringify(state.published.config)==='{}'&&!state.draft&&hist.ok&&hist.data.some(x=>x.revision===0),'Separate compiled baseline');
  for(const [a,label]of [[null,'anonymous'],[aal1,'AAL1 Owner'],[viewer,'AAL2 nonadmin'],[suspended,'AAL2 suspended']]){
   deny(await call('state',k,a),label+' state');deny(await call('history',k,a),label+' history');deny(await save(k,a,{},0,0),label+' draft');deny(await pub(k,a,0,1),label+' publication');
   deny(await call('restore_draft',k,a,{p_from_revision:0,p_expected_draft_version:0,p_expected_published_revision:0}),label+' restore');
  }
  for(const a of [owner,operator])for(const table of ['admin_appearance_current','admin_appearance_drafts','admin_appearance_revisions']){
   const out=await request('rest/v1/'+table+'?element_key=eq.'+encodeURIComponent(k),{method:'PATCH',body:{config:{}},token:a.session.access_token});check(!out.ok&&[401,403].includes(out.status),'Protected direct '+table+' write');
  }
  const invalid=[null,[],{css:'body{}'},{all:{width:'44px'}},{all:{width:'url(x)'}},{all:{padding_left:25}},{all:{padding_top:-1}},{all:{padding_right:1.5}},{all:{padding_bottom:'x'}},{all:{colour:'red'}},{all:{height:73}},{all:{radius:41}},{all:{visibility:false}},{tablet:{radius:2}},{all:{label:'Changed'}},{all:{selector:'.anything'}}];
  for(const config of invalid){const out=await save(k,owner,config,0,0);check(!out.ok&&out.data?.code==='22023','Unsafe language style rejected');}
 }
 check(await snap()===initial,'Permission and invalid-style probes have no state effects');
 pass('Both real language bindings enforce 40 role RPC denials, 12 privileged direct-write denials and 32 malformed styles while retaining independent compiled baselines');
 check((await save(C,operator,{desktop:{radius:30}},0,0)).ok,'Operator private Create draft');
 check(!(await get(C)).draft&&!(await get(E)).draft,'Actor and form isolation');
 deny(await pub(C,operator,0,1),'Operator publication');deny(await call('restore_draft',C,operator,{p_from_revision:0,p_expected_draft_version:1,p_expected_published_revision:0}),'Operator restore');
 const draftSnap=await snap();
 await sql("create function private.qa_language_draft() returns trigger language plpgsql set search_path='' as $$ begin if new.target_key='"+C+"' and new.action='appearance_draft_saved' then raise exception 'QA language draft audit rejection' using errcode='23514';end if;return new;end $$;create trigger qa_language_draft before insert on public.admin_change_audit for each row execute function private.qa_language_draft();");
 try{const out=await save(C,owner,{desktop:{radius:17}},0,0);check(!out.ok&&out.data?.code==='23514'&&await snap()===draftSnap,'Draft audit failure atomic');}finally{await sql('drop trigger qa_language_draft on public.admin_change_audit;drop function private.qa_language_draft();');}
 pass('Real AAL2 Operator can retain a private Create draft; Owner-only publish/restore, actor/form separation and failed draft audit rollback hold');
 const actor=actors.find(a=>a.role==='customer publisher');check(actor,'Existing genuine synthetic customer required');
 const listing=await sql("select v.id from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where p.owner_id='"+actor.id+"' order by v.id limit 1;");
 const customerSnap=()=>sql("select jsonb_agg(jsonb_build_object('vacancy',to_jsonb(v),'room',to_jsonb(r)) order by v.id) from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where p.owner_id='"+actor.id+"';"),customerBefore=await customerSnap();
 const customer=await loginUI(actor),p=customer.page;
 try{
  const form=async(mode,width=1536)=>{await p.setViewportSize({width,height:width===390?844:1024});await p.goto(server.url+(mode==='create'?'/#list/new':'/#edit/'+listing));await p.waitForFunction(()=>booting===false);
   const host=p.locator('#listingHost');await expect(host).toHaveAttribute('data-mode',mode);if(mode==='edit')await expect(p.locator('#listingForm')).toHaveAttribute('data-edit-vacancy',listing);
   const select=host.locator('> .listing-language select');await expect(select).toBeVisible();await p.evaluate(()=>VACANCY_SITE_APPEARANCE.ensure());return select;};
  const create=await form('create');const compiled={create:await create.evaluate(x=>({radius:getComputedStyle(x).borderRadius,padding:getComputedStyle(x).paddingTop})),edit:null};
  check((await create.locator('option').evaluateAll(xs=>xs.map(x=>x.value).join(',')))==='en,zh,fr,sw','Existing four choices');
  await create.selectOption('fr');check(await p.evaluate(()=>localStorage.getItem('vacancy-listing-language'))==='fr','Existing preference key');
  const edit=await form('edit');await expect(edit).toHaveValue('fr');compiled.edit=await edit.evaluate(x=>({radius:getComputedStyle(x).borderRadius,padding:getComputedStyle(x).paddingTop}));
  check(await customerSnap()===customerBefore,'Changing language preference does not alter active customer data');
  pass('Actual Create/Edit language controls share the preserved customer preference and four choices without changing the active listing/room');
  await page.reload();await expect(page.locator('#adminHost')).toBeVisible({timeout:30000});await page.locator('#adminSectionMenu [data-section=design]').click();
  const workspace=page.locator('[data-admin-section=design]'),status=workspace.locator('[data-draft-status]');
  const selectKey=async k=>{await workspace.locator('[data-select-element="'+k+'"]').click();await expect(workspace.locator('[data-design-element-id]')).toHaveText(k);await expect(workspace.locator('[data-style-field=radius]')).toBeEnabled();};
  const field=async(name,value)=>{const x=workspace.locator('[data-style-field="'+name+'"]');if(await x.evaluate(e=>e.tagName==='SELECT'))await x.selectOption(String(value));else{await x.fill(String(value));await x.press('Tab');}};
  await selectKey(C);await expect(workspace.locator('[data-design-page-title]')).toHaveText('Create listing');await expect(workspace.locator('[data-design-context]')).toContainText('Component preview');
  await workspace.locator('[data-edit-scope]').selectOption('desktop');await field('radius',17);await field('width','200px');await field('padding_top',4);
  const frame=workspace.frameLocator('[data-design-frame]');
  await expect(frame.locator('#listingHost[data-mode=create] .listing-language select')).toHaveCSS('border-radius',compiled.create.radius);
  await workspace.locator('[data-mode=desktop]').click();await expect(frame.locator('select')).toHaveCSS('border-radius','17px');
  check(await workspace.locator('iframe').getAttribute('sandbox')===''&&await frame.locator('script,form,input[type=file]').count()===0,'Actual component preview excludes scripts and customer forms');
  await expect(frame.locator('select')).toHaveCSS('pointer-events','none');
  check(!(await get(C)).draft,'Preview-only edits do not persist');
  await workspace.locator('[data-select-element="'+E+'"]').click();const dialog=workspace.locator('.design-leave-dialog');await expect(dialog).toBeVisible();await dialog.locator('[data-leave-stay]').click();await expect(workspace.locator('[data-design-element-id]')).toHaveText(C);
  await workspace.locator('[data-select-element="'+E+'"]').click();await page.route('**/rest/v1/rpc/admin_appearance_save_draft',r=>r.abort());await dialog.locator('[data-leave-save]').click();await expect(dialog.locator('[data-leave-status]')).toContainText('Could not save private draft');await page.unroute('**/rest/v1/rpc/admin_appearance_save_draft');
  await dialog.locator('[data-leave-save]').click();await expect(workspace.locator('[data-design-element-id]')).toHaveText(E);await expect(workspace.locator('[data-style-field=radius]')).toBeEnabled();
  check((await get(C)).draft.config.desktop.radius===17&&!(await get(E)).draft,'Save-and-switch acknowledges correct private key only');
  pass('Shared workspace selects real Create/Edit bindings; actual component preview is private/inert and Save/Stay/failed-save navigation preserves the correct draft');

  await selectKey(C);await expect(workspace.locator('[data-style-field=radius]')).toHaveValue('17');
  await expect(await form('create')).toHaveCSS('border-radius',compiled.create.radius);
  await expect(await form('edit')).toHaveCSS('border-radius',compiled.edit.radius);
  const beforePublish=await snap();
  await sql("create function private.qa_language_publish() returns trigger language plpgsql set search_path='' as $$ begin if new.target_key='"+C+"' and new.action='appearance_published' then raise exception 'QA language publication audit rejection' using errcode='23514';end if;return new;end $$;create trigger qa_language_publish before insert on public.admin_change_audit for each row execute function private.qa_language_publish();");
  try{const out=await pub(C,owner,0,1);check(!out.ok&&out.data?.code==='23514'&&await snap()===beforePublish,'Publication audit failure atomic');}finally{await sql('drop trigger qa_language_publish on public.admin_change_audit;drop function private.qa_language_publish();');}
  const review=async reason=>{await workspace.locator('[data-review]').click();await workspace.locator('[data-publish-reason]').fill(reason);await expect(workspace.locator('[data-confirm-publish]')).toBeEnabled();};
  await review('Review independent Create language style');
  await page.screenshot({path:artifacts+'/language-create-review-desktop.png'});
  const attempts=[];await page.route('**/rest/v1/rpc/admin_appearance_publish',async route=>{attempts.push(route.request().postDataJSON());await route.fetch();await route.abort();});
  await workspace.locator('[data-confirm-publish]').click();await expect(status).toContainText('Request failed');
  check((await get(C)).published.revision===1,'Real publication committed before lost response');
  await page.unroute('**/rest/v1/rpc/admin_appearance_publish');
  const retry=page.waitForRequest(r=>r.url().endsWith('/rpc/admin_appearance_publish'));
  await workspace.locator('[data-confirm-publish]').click();check((await retry).postDataJSON().p_request_id===attempts[0].p_request_id,'Same idempotency ID on retry');
  await expect(status).toContainText('Published revision 1; verified');
  check((await get(E)).published.revision===0,'Create publication leaves Edit unchanged');
  check((await pub(C,owner,0,1,attempts[0].p_request_id,'Changed retry reason')).status===409,'Changed retry payload denied');
  check((await save(C,operator,{desktop:{radius:31}},1,0)).status===409&&(await get(C,operator)).draft.config.desktop.radius===30,'Stale Operator draft conflict preserves acknowledged private draft');
  const audit=await sql("select count(*) from public.admin_change_audit where target_key='"+C+"' and action='appearance_published';");
  check(audit==='1','One atomic publication audit after lost-response retry');
  pass('Create publication audit rolls back atomically; actual lost-response retry commits one revision/audit and stale Operator draft conflicts preserve private work');
  let actual=await form('create');await expect(actual).toHaveCSS('border-radius','17px');await expect(actual).toHaveCSS('width','200px');await expect(actual).toHaveCSS('padding-top','4px');await expect(actual).toHaveValue('fr');
  await p.screenshot({path:artifacts+'/language-customer-create-desktop.png'});
  await expect(await form('create',390)).toHaveCSS('border-radius',compiled.create.radius);
  await expect(await form('edit')).toHaveCSS('border-radius',compiled.edit.radius);
  await expect(await form('edit',390)).toHaveCSS('border-radius',compiled.edit.radius);
  check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Actual Edit mobile no overflow');
  pass('Published Create-only desktop radius/width/padding reaches the actual customer picker; mobile and Edit remain at their compiled defaults and French preference survives');
  await selectKey(E);await workspace.locator('[data-edit-scope]').selectOption('mobile');await field('radius',11);await field('width','160px');await field('padding_left',10);
  await workspace.locator('[data-select-element="'+C+'"]').click();await expect(dialog).toBeVisible();await dialog.locator('[data-leave-discard]').click();
  await expect(workspace.locator('[data-design-element-id]')).toHaveText(C);check(!(await get(E)).draft,'Discard leaves no Edit draft');
  await selectKey(E);await workspace.locator('[data-edit-scope]').selectOption('mobile');await field('radius',11);await field('width','160px');await field('padding_left',10);
  await workspace.locator('[data-save-draft]').click();await expect(status).toContainText('Private draft saved.');
  await review('Review independent Edit mobile language style');await workspace.locator('[data-confirm-publish]').click();await expect(status).toContainText('Published revision 1; verified');
  check((await get(C)).published.revision===1,'Edit publication leaves Create revision');
  actual=await form('edit',390);await expect(actual).toHaveCSS('border-radius','11px');await expect(actual).toHaveCSS('width','160px');await expect(actual).toHaveCSS('padding-left','10px');await expect(actual).toHaveValue('fr');
  await p.screenshot({path:artifacts+'/language-customer-edit-mobile.png'});
  await expect(await form('edit')).toHaveCSS('border-radius',compiled.edit.radius);
  await expect(await form('create')).toHaveCSS('border-radius','17px');
  await expect(await form('create',390)).toHaveCSS('border-radius',compiled.create.radius);
  pass('Discard and independent Edit mobile publication work in the shared workspace; all four actual form/viewport combinations retain the correct separate style and customer preference');

  let release,arrived;const held=new Promise(r=>release=r),caught=new Promise(r=>arrived=r);
  await page.route('**/rest/v1/rpc/admin_appearance_state',async route=>{
   if(route.request().postDataJSON().p_element_key!==C)return route.continue();
   const response=await route.fetch();arrived();await held;await route.fulfill({response});
  });
  await workspace.locator('[data-select-element="'+C+'"]').click();await caught;await selectKey(E);release();
  await page.unroute('**/rest/v1/rpc/admin_appearance_state');
  await expect(workspace.locator('[data-design-element-id]')).toHaveText(E);await expect(workspace.locator('[data-style-field=radius]')).toHaveValue('11');
  pass('Late real Create-state response cannot replace the selected Edit binding or its acknowledged fields');
  const restoreUI=async(k,from,revision)=>{
   await selectKey(k);if(!await workspace.locator('[data-history-panel]').isVisible())await workspace.locator('[data-history]').click();
   await workspace.locator('[data-restore="'+from+'"]').click();await expect(status).toContainText('Earlier version copied to your private draft.');
   check((await get(k)).published.revision===revision,'Restore stays private until explicit publication');
   await workspace.locator('[data-publish-reason]').fill('Restore independently reviewed language version '+from);
   await workspace.locator('[data-confirm-publish]').click();await expect(status).toContainText('Published revision '+(revision+1)+'; verified');
  };
  await restoreUI(C,0,1);check((await get(E)).published.revision===1,'Create baseline recovery leaves Edit');
  await expect(await form('create')).toHaveCSS('border-radius',compiled.create.radius);
  await expect(await form('edit',390)).toHaveCSS('border-radius','11px');
  await restoreUI(E,0,1);await expect(await form('edit',390)).toHaveCSS('border-radius',compiled.edit.radius);
  await restoreUI(E,1,2);await expect(await form('edit',390)).toHaveCSS('border-radius','11px');
  await restoreUI(E,0,3);
  check((await save(E,owner,{},0,4)).ok,'No-op private draft save');
  const noop=await snap(),noPublish=await pub(E,owner,4,1);check(!noPublish.ok&&noPublish.data?.code==='22023'&&await snap()===noop,'No-op publish preserves every current/draft/history/audit record');
  for(const mode of ['create','edit'])for(const width of [390,1536]){
   const select=await form(mode,width);await expect(select).toHaveCSS('border-radius',compiled[mode].radius);await expect(select).toHaveValue('fr');
   check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Restored form no overflow');
  }
  check(await customerSnap()===customerBefore,'Complete style/preferences/restore journey leaves actual customer listing and room unchanged');
  pass('Create and Edit compiled-baseline restores and Edit positive-history restore remain private until reviewed publication; no-op publish has no effects and final actual forms preserve customer data/preferences');
  const publicOut=await rpc('site_appearance_published',null,{});check(publicOut.ok&&publicOut.data.length===3&&publicOut.data.every(row=>['listing-detail/save-button',C,E].includes(row.key)&&Object.keys(row).sort().join(',')==='config,key,revision'),'Anonymous style read exposes only three published style keys and public fields');
  for(const [k,rev]of [[C,2],[E,4]]){const row=publicOut.data.find(x=>x.key===k);check(row.revision===rev&&JSON.stringify(row.config)==='{}','Independently restored public compiled baseline');}
  check(await sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='validate_listing_language_style' and not p.prosecdef and p.proconfig=array['search_path=\"\"'] and not has_function_privilege('anon',p.oid,'execute') and not has_function_privilege('authenticated',p.oid,'execute');")==='1','Private validator has empty search path and no browser EXECUTE');
  await page.setViewportSize({width:390,height:844});await expect(workspace.locator('.design-board')).toHaveCSS('display','block');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Existing admin mobile layout no overflow');
  await page.screenshot({path:artifacts+'/language-admin-mobile.png'});await page.setViewportSize({width:1536,height:1024});
  report.completed=true;report.finalRevisions={create:2,edit:4};report.rpcDenials=42;report.directWriteDenials=12;report.invalidStyles=32;report.customerDataUnchanged=true;report.previewIsComponentOnly=true;
  pass('Anonymous three-style-only projection, private validator privileges and existing admin mobile layout hold; independent real language acceptance complete');
 }finally{await customer.ctx.close();}
}
