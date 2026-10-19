import {randomUUID} from 'node:crypto';
import {expect} from '@playwright/test';
import {assertActivityEnvironment} from './activity-log-reports.mjs';
export async function verifyLanguageControls(h){
 const {ROOT,sql,request,check,pass,evidence,owner,operator,viewer,suspended,page,sensitive,server,loginUI,actors,artifacts}=h;
 assertActivityEnvironment(ROOT);
 const info=evidence.languageControls={completed:false,genuineAuth:true,targets:[]};
 await page.setViewportSize({width:1536,height:1024});await page.goto(server.url+'/#admin');await page.reload();await expect(page.locator('#adminHost')).toBeVisible();
 owner.session=await page.evaluate(async()=>{await VACANCY_BACKEND.currentUser();return VACANCY_BACKEND.session()});sensitive.add(owner.session.access_token);sensitive.add(owner.session.refresh_token);
 // Refresh the synthetic Operator after the full preceding suite.
 for(const actor of [operator,viewer,suspended]){const out=await request('auth/v1/token?grant_type=refresh_token',{body:{refresh_token:actor.session.refresh_token}});check(out.ok,'Language denial actor refresh');actor.session=out.data;sensitive.add(out.data.access_token);sensitive.add(out.data.refresh_token);}
 const rpc=(name,actor,body)=>request('rest/v1/rpc/'+name,{token:actor?.session.access_token,body});
 const state=(actor,k)=>rpc('admin_appearance_state',actor,{p_element_key:k});
 const save=(actor,k,c,v,r)=>rpc('admin_appearance_save_draft',actor,{p_element_key:k,p_config:c,p_expected_draft_version:v,p_expected_published_revision:r});
 const publish=(actor,k,r,v,id=randomUUID())=>rpc('admin_appearance_publish',actor,{p_element_key:k,p_expected_published_revision:r,p_expected_draft_version:v,p_reason:'Disposable separate language selector acceptance',p_request_id:id});
 const snapshot=()=>sql("select jsonb_build_object('current',(select jsonb_agg(to_jsonb(c) order by element_key) from public.admin_appearance_current c),'drafts',(select jsonb_agg(to_jsonb(d) order by actor_id,element_key) from public.admin_appearance_drafts d),'history',(select jsonb_agg(to_jsonb(r) order by element_key,revision) from public.admin_appearance_revisions r),'audit',(select count(*) from public.admin_change_audit));");
 const create='create-listing/language-selector',edit='edit-listing/language-selector';
 const low=await request('auth/v1/token?grant_type=password',{body:{email:owner.email,password:owner.password}});check(low.ok,'Fresh language AAL1');sensitive.add(low.data.access_token);sensitive.add(low.data.refresh_token);
 for(const k of [create,edit]){
  check((await state(owner,k)).data.published.revision===0,'Independent compiled default');
  const c={all:{width:'200px',radius:k===create?11:5},mobile:{radius:k===create?16:8}};
  for(const actor of [viewer,suspended,{session:low.data},null]){check(!(await save(actor,k,c,0,0)).ok,'Language private mutation denied');check(!(await state(actor,k)).ok,'Language private state denied');}
  check((await save(operator,k,c,0,0)).ok,'Operator language private draft');check((await state(owner,k)).data.draft===null,'Actor-private language draft');check(!(await publish(operator,k,0,1)).ok,'Operator language publication denied');
  for(const bad of [{all:{width:'44px'}},{all:{width:'200px;display:none'}},{all:{hidden:true}},{all:{height:200}},{phone:{radius:3}},{all:{text:'replacement'}},{all:{radius:1.5}}]){const out=await save(owner,k,bad,0,0);check(!out.ok&&out.data.code==='22023','Bounded language config rejects unsupported field/value/scope');}
  const beforePublic=(await rpc('site_appearance_published',null,{})).data;
  check((await save(owner,k,c,0,0)).ok,'Owner language draft');check((await save(owner,k,c,0,0)).status===409,'Language draft version conflict');
  check(JSON.stringify((await rpc('site_appearance_published',null,{})).data)===JSON.stringify(beforePublic),'Private language save does not alter public settings');
  const before=await snapshot();
  await sql(`create function private.qa_language_audit_reject() returns trigger language plpgsql as $$ begin if new.action='appearance_published' and new.target_key='${k}' then raise exception 'Disposable language audit rejection' using errcode='23514'; end if;return new;end $$;create trigger qa_language_audit_reject before insert on public.admin_change_audit for each row execute function private.qa_language_audit_reject();`);
  try{const out=await publish(owner,k,0,1);check(!out.ok&&out.data.code==='23514'&&await snapshot()===before,'Language audit failure rolls back publication, history, draft and audit');}
  finally{await sql('drop trigger qa_language_audit_reject on public.admin_change_audit;drop function private.qa_language_audit_reject();');}
  const other=k===create?edit:create,otherBefore=await state(owner,other),pilotBefore=await state(owner,'listing-detail/save-button');
  const id=randomUUID(),out=await publish(owner,k,0,1,id);check(out.ok&&out.data.revision===1,'Language publication');const after=await snapshot();check((await publish(owner,k,0,1,id)).data.alreadyApplied&&await snapshot()===after,'Language idempotent retry');
  check(JSON.stringify((await state(owner,other)).data)===JSON.stringify(otherBefore.data)&&JSON.stringify((await state(owner,'listing-detail/save-button')).data)===JSON.stringify(pilotBefore.data),'Publication preserves other page and Save');
  check((await save(owner,k,c,0,0)).status===409,'Language published revision conflict');
  const rows=(await rpc('site_appearance_published',null,{})).data;check(rows.some(r=>r.key===k&&r.revision===1)&&rows.every(r=>Object.keys(r).sort().join(',')==='config,key,revision'),'Anonymous language projection excludes private fields');
  info.targets.push(k);
 }
 for(const k of ['listing-detail/language-selector','create-listing/language-selector/suffix','edit-listing/language-selector/suffix']){const out=await save(owner,k,{},0,0);check(!out.ok&&out.data.code==='22023','Unregistered language alias denied');}
 pass('Separate language targets enforce real Auth, bounded styles, private drafts, conflicts, audit atomicity, idempotency and anonymous projection');
 // Real existing customer hosts, no backend mocks or replacement form markup.
 const customer=actors.find(a=>a.role==='customer publisher'),listing=await sql(`select v.id from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where p.owner_id='${customer.id}' limit 1;`);
 const ui=await loginUI(customer),p=ui.page;
 try{
  await p.goto(server.url+'/#list/new');await expect(p.locator('#listingHost[data-language-page=create] select[aria-label="Listing language"]')).toBeVisible();
  await p.evaluate(()=>{localStorage.setItem('vacancy-listing-language','sw');localStorage.removeItem('vacancy-listing-language-create');localStorage.removeItem('vacancy-listing-language-edit')});await p.reload();
  const picker=p.locator('.listing-language select');await expect(picker).toHaveValue('sw');await picker.selectOption('fr');
  for(const [width,radius]of [[1536,'11px'],[390,'16px']]){await p.setViewportSize({width,height:900});await expect(picker).toHaveCSS('border-radius',radius);}
  await p.goto(server.url+'/#edit/'+listing);await expect(p.locator('#listingForm')).toHaveAttribute('data-edit-vacancy',listing);await expect(picker).toHaveValue('sw');await expect(picker).toHaveCSS('border-radius','8px');
  await picker.selectOption('zh');await expect(p.locator('#listingForm .edit-existing-photo')).toHaveCount(3);await expect(p.locator('[data-base-name=rentAmount]')).toHaveValue('375');
  await p.goto(server.url+'/#list/new');await expect(picker).toHaveValue('fr');
  check(await p.evaluate(()=>localStorage.getItem('vacancy-listing-language'))==='sw','Legacy preference retained unchanged');
  await p.goto(server.url+'/#edit/'+listing);await expect(picker).toHaveValue('zh');await picker.selectOption('en');
  await p.screenshot({path:artifacts+'/language-edit-mobile.png'});
 }finally{await ui.ctx.close();}
 pass('Actual Create/Edit hosts resolve independent published styles and local languages, preserving edited rent and three photos');
 // Exercise the actual existing Design & Style UI, including new page switches.
 await page.locator('#adminSectionMenu [data-section=design]').click();
 await page.locator('[data-design-target="'+create+'"]').click();await expect(page.locator('[data-frame-status]')).toContainText('Actual language selector component');
 await page.locator('[data-style-field=radius]').fill('19');await page.locator('[data-design-target="'+edit+'"]').click();await expect(page.locator('.design-leave-dialog')).toBeVisible();await page.locator('[data-leave-stay]').click();
 await page.locator('[data-save-draft]').click();await expect(page.locator('[data-draft-status]')).toContainText('Private draft saved');
 await page.locator('[data-review]').click();await page.locator('[data-publish-reason]').fill('Disposable actual Create language style');await page.locator('[data-confirm-publish]').click();await expect(page.locator('[data-draft-status]')).toContainText('Published revision 2');
 await page.locator('[data-history]').click();await page.locator('[data-restore="1"]').click();await expect(page.locator('[data-style-field=radius]')).toHaveValue('11');await page.locator('[data-publish-reason]').fill('Disposable language restore as new publication');await page.locator('[data-confirm-publish]').click();await expect(page.locator('[data-draft-status]')).toContainText('Published revision 3');
 await page.screenshot({path:artifacts+'/language-create-editor.png'});
 // Recovery uses additive publications, never deletes immutable history.
 for(const k of [create,edit]){const s=(await state(owner,k)).data;check((await save(owner,k,{},0,s.published.revision)).ok&&(await publish(owner,k,s.published.revision,1)).ok,'Language compiled-default recovery');}
 info.completed=true;info.actualUi=true;info.actualCustomerHosts=true;info.viewports=[1536,390];
 pass('Real language editor publishes and restores as a new revision; compiled defaults recovered independently for both pages');
}
