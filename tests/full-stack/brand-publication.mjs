import {randomUUID} from 'node:crypto';
import {expect} from '@playwright/test';
import {assertActivityEnvironment} from './activity-log-reports.mjs';

export async function verifyBrandPublication(h){
 const {ROOT,key,sql,request,check,pass,evidence,owner,operator,viewer,suspended,page,operatorPage,server,sensitive,context,artifacts}=h;
 assertActivityEnvironment(ROOT);
 const info=evidence.brandPublication={completed:false,genuineAuth:true,atomicTargets:[]};
 for(const [actor,p] of [[owner,page],[operator,operatorPage]]){
  actor.session=await p.evaluate(async()=>{await VACANCY_BACKEND.currentUser();return VACANCY_BACKEND.session();});
  sensitive.add(actor.session.access_token);sensitive.add(actor.session.refresh_token);
 }
 const rpc=(name,actor,body)=>request('rest/v1/rpc/'+name,{token:actor?.session.access_token,body});
 const state=async(actor,k)=>{const out=await rpc('admin_appearance_state',actor,{p_element_key:k});check(out.ok,'Brand state available');return out.data;};
 const save=(actor,k,c,v,r)=>rpc('admin_appearance_save_draft',actor,{p_element_key:k,p_config:c,p_expected_draft_version:v,p_expected_published_revision:r});
 const publish=(actor,k,r,v,id=randomUUID())=>rpc('admin_appearance_publish',actor,{p_element_key:k,p_expected_published_revision:r,p_expected_draft_version:v,p_reason:'Disposable reviewed brand publication',p_request_id:id});
 const snapshot=()=>sql(`select jsonb_build_object('current',(select jsonb_agg(to_jsonb(c) order by element_key) from public.admin_appearance_current c),
 'drafts',(select jsonb_agg(to_jsonb(d) order by actor_id,element_key) from public.admin_appearance_drafts d),
 'appearance_history',(select count(*) from public.admin_appearance_revisions),'audit',(select count(*) from public.admin_change_audit),
 'icons',(select jsonb_agg(to_jsonb(i) order by slot) from public.site_icon_overrides i),
 'catalog',(select jsonb_agg(to_jsonb(i) order by slot) from public.site_icon_slots i),'legacy_history',(select count(*) from public.site_icon_revisions),
 'favicon',(select to_jsonb(f) from public.site_favicon f where id));`);
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=64;c.getContext('2d').fillRect(0,0,64,64);return c.toDataURL('image/png');});
 const proposed='custom-'+randomUUID().replaceAll('-','');
 const cases=[['site-icon/find',{source_slot:'wifi'}],['icon-catalog/'+proposed,{label:'Synthetic publication feature',kind:'amenity',path_d:'M2 2 L20 20'}],['site-favicon',{png}]];
 const initialIcon=(await state(owner,'site-icon/find')).published.config,initialFavicon=(await state(owner,'site-favicon')).published.config;
 for(const [k,c] of cases){
  check((await state(owner,k)).published.revision===0,'Adopted or new brand revision zero');
  check((await save(operator,k,c,0,0)).ok,'Operator private typed draft');check((await state(owner,k)).draft===null,'Brand drafts actor-private');
  check(!(await publish(operator,k,0,1)).ok,'Operator brand publication denied');
  check((await save(owner,k,c,0,0)).ok,'Owner private typed draft');
  check((await save(owner,k,c,0,0)).status===409,'Stale brand draft has real HTTP conflict');
  const before=await snapshot();
  await sql(`create function private.qa_brand_audit_reject() returns trigger language plpgsql as $$ begin if new.action='appearance_published' and new.target_key='${k}' then raise exception 'Disposable brand audit rejection' using errcode='23514'; end if; return new; end $$;
   create trigger qa_brand_audit_reject before insert on public.admin_change_audit for each row execute function private.qa_brand_audit_reject();`);
  try{const out=await publish(owner,k,0,1);check(!out.ok&&out.data.code==='23514','Audit rejection blocks typed publication');check(await snapshot()===before,'Audit failure atomically rolls public projection, legacy history, catalogue, drafts and appearance state back');}
  finally{await sql('drop trigger qa_brand_audit_reject on public.admin_change_audit; drop function private.qa_brand_audit_reject();');}
  const id=randomUUID(),out=await publish(owner,k,0,1,id);check(out.ok&&out.data.revision===1,'Brand publication acknowledged');
  const after=await snapshot(),repeat=await publish(owner,k,0,1,id);check(repeat.ok&&repeat.data.alreadyApplied&&await snapshot()===after,'Brand retry has no duplicate history/audit');
  const publicState=await rpc('site_appearance_published',null,{});check(publicState.ok&&publicState.data.some(row=>row.key===k&&row.revision===1)&&publicState.data.every(row=>Object.keys(row).sort().join(',')==='config,key,revision'),'Only published safe brand config exposed anonymously');
  info.atomicTargets.push(k.split('/')[0]);
 }
 const customState=await state(owner,'site-icon/'+proposed);check(customState.published.revision===0&&customState.published.config.path_d==='M2 2 L20 20','New catalogue icon gets its exact editable baseline without fabricated publication');
 const proposals=await rpc('admin_icon_proposals',operator,{});check(proposals.ok&&proposals.data.includes('icon-catalog/'+proposed),'Own private catalogue proposal recoverable');
 check((await rpc('admin_icon_proposals',owner,{})).data.length===0,'Other actor cannot discover private catalogue proposal keys');
 const duplicate='icon-catalog/custom-'+randomUUID().replaceAll('-','');check((await save(owner,duplicate,cases[1][1],0,0)).ok,'Duplicate label prepared privately');
 const duplicateBefore=await snapshot(),duplicateOut=await publish(owner,duplicate,0,1);check(!duplicateOut.ok&&duplicateOut.data.code==='23505'&&await snapshot()===duplicateBefore,'Duplicate catalogue label fails atomically');
 const invalid=[['site-icon/find',{path_d:'<script/>'}],['site-icon/find',{source_slot:'unknown'}],['site-icon/unknown',{path_d:'M1 1L2 2'}],['site-icon/find',{source_slot:'wifi',path_d:'M1 1L2 2'}],['site-icon/find',{html:'bad'}],['icon-catalog/custom-'+randomUUID().replaceAll('-',''),{path_d:'M1 1L2 2'}],['site-favicon',{png:'data:image/png;base64,AAAA'}],['site-favicon',{png:png.replace('image/png','image/jpeg')}],['site-favicon',{png:png+'A'.repeat(40001)}],['site-favicon',{png,html:'bad'}]];
 for(const [k,c] of invalid){const out=await save(owner,k,c,0,0);check(!out.ok&&out.data.code==='22023','Invalid SVG/catalogue/PNG shape denied server-side');}
 const alias=await save(owner,'site-icon/find/another-target',{source_slot:'wifi'},0,0);check(!alias.ok&&alias.data.code==='22023','Suffix aliases cannot bypass the real icon revision lock');
 for(const [name,body] of [['admin_set_site_icon',{p_slot:'find',p_source_slot:'wifi'}],['admin_add_listing_icon',{p_label:'Bypass',p_kind:'amenity',p_path_d:'M1 1L2 2'}],['admin_set_favicon',{p_png:png,p_revision:1,p_restore:false}]])for(const actor of [owner,operator]){const out=await rpc(name,actor,body);check(out.status===409&&out.data.code==='PT409','Legacy brand setter cannot bypass publication');}
 for(const [table,filter,body] of [['site_icon_overrides','slot=eq.find',{path_d:'M4 4L5 5'}],['site_icon_slots','slot=eq.find',{label:'Bypass'}],['site_icon_revisions','slot=eq.find',{path_d:'M4 4L5 5'}],['site_favicon','id=eq.true',{png:null}]]){
  const before=await snapshot(),out=await request('rest/v1/'+table+'?'+filter,{method:'PATCH',token:owner.session.access_token,body});check(!out.ok&&[401,403].includes(out.status)&&await snapshot()===before,'Direct brand table mutation denied');
 }
 const low=await request('auth/v1/token?grant_type=password',{body:{email:owner.email,password:owner.password}});check(low.ok,'Fresh brand AAL1 denial');sensitive.add(low.data.access_token);sensitive.add(low.data.refresh_token);
 for(const actor of [viewer,suspended]){const out=await request('auth/v1/token?grant_type=refresh_token',{body:{refresh_token:actor.session.refresh_token}});check(out.ok,'Fresh brand denial actor');actor.session=out.data;sensitive.add(out.data.access_token);sensitive.add(out.data.refresh_token);}
 for(const actor of [viewer,suspended,{session:low.data},null])for(const [k,c] of cases){const out=await save(actor,k,c,0,1);check(!out.ok&&out.data.code==='42501','Nonadmin, suspended, AAL1 and anonymous typed mutation denied');}
 pass('Icon, catalogue and favicon genuine Auth publication is private, conflict-safe, idempotent and atomic with legacy projections/history/audit; old bypasses denied');

 await page.goto(server.url+'/#admin');await page.reload();await expect(page.locator('#adminHost')).toBeVisible();await page.locator('#adminSectionMenu [data-section=icons]').click();
 await page.locator('[data-icon-target=find]').click();const icon=page.locator('#iconEditor'),favicon=page.locator('[data-favicon-editor]');await expect(icon.locator('[data-icon-upload]')).toBeEnabled();
 const originalSprite=await page.locator('#icon-find').innerHTML();
 await icon.locator('[data-icon-upload]').setInputFiles({name:'synthetic.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 3 L21 21"/></svg>')});
 await icon.locator('[data-brand-save]').click();await expect(icon.locator('[data-brand-status]')).toContainText('Private draft saved');check(await page.locator('#icon-find').innerHTML()===originalSprite,'Private icon draft leaves actual shared sprite untouched');
 async function uiPublish(host,reason){await host.locator('[data-brand-review]').click();await host.locator('[data-brand-reason]').fill(reason);await host.locator('[data-brand-publish]').click();await expect(host.locator('[data-brand-status]')).toContainText('verified in public settings');}
 const anonymousReads=new Set();const observe=req=>{if(req.headers().authorization==='Bearer '+key&&/site_icon_overrides|site_icon_slots|site_favicon|site_appearance_published/.test(req.url()))anonymousReads.add(new URL(req.url()).pathname);};page.on('request',observe);
 try{await uiPublish(icon,'Disposable actual icon publication');}finally{page.off('request',observe);}
 check(anonymousReads.has('/rest/v1/site_icon_overrides')&&anonymousReads.has('/rest/v1/rpc/site_appearance_published'),'Actual icon UI confirms anonymously');
 await expect(page.locator('#icon-find path')).toHaveAttribute('d','M3 3 L21 21');
 await icon.locator('[data-brand-history]').click();const legacy=await request('rest/v1/site_icon_revisions?select=id,source_slot&slot=eq.find&order=id.asc',{method:'GET',token:owner.session.access_token});const old=legacy.data.find(row=>row.source_slot==='wifi');check(old,'Existing legacy icon history retained');
 await icon.locator('[data-brand-restore="legacy-'+old.id+'"]').click();await expect(icon.locator('[data-brand-status]')).toContainText('Earlier version copied');await icon.locator('[data-brand-reason]').fill('Disposable actual legacy icon restore');await icon.locator('[data-brand-publish]').click();await expect(icon.locator('[data-brand-status]')).toContainText('verified in public settings');
 // Actual decoded image, then private save/review. Neither changes the tab early.
 const second=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=128;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#ff5a3d';ctx.fillRect(0,0,128,64);return c.toDataURL('image/png');});
 const previousLink=await page.locator('link[data-site-favicon]').getAttribute('href');
 await favicon.getByLabel('Choose favicon image').setInputFiles({name:'synthetic-wide.png',mimeType:'image/png',buffer:Buffer.from(second.split(',')[1],'base64')});await expect(favicon.locator('[data-brand-preview] img').first()).toHaveJSProperty('naturalWidth',64);
 await favicon.locator('[data-brand-save]').click();await expect(favicon.locator('[data-brand-status]')).toContainText('Private draft saved');check(await page.locator('link[data-site-favicon]').getAttribute('href')===previousLink,'Private favicon leaves actual tab icon unchanged');
 page.on('request',observe);try{await uiPublish(favicon,'Disposable actual favicon publication');}finally{page.off('request',observe);}
 check(anonymousReads.has('/rest/v1/site_favicon'),'Actual favicon UI confirms anonymously');
 const freshContext=await context(),fresh=await freshContext.newPage();
 try{await fresh.goto(server.url+'/#detail/55555555-5555-4555-8555-555555555555');await expect(fresh.locator('link[data-site-favicon]')).toHaveCount(1);await fresh.evaluate(()=>VACANCY_ICON_LIBRARY.ready);check(await fresh.locator('#icon-find').innerHTML()===await fresh.locator('#icon-wifi').innerHTML(),'Fresh anonymous sprite receives the restored built-in icon');check(await fresh.locator('link[data-site-favicon]').getAttribute('href')!==previousLink,'Fresh anonymous browser receives published favicon');}
 finally{await freshContext.close();}
 await favicon.locator('[data-brand-history]').click();await favicon.locator('[data-brand-restore^=legacy]').click();await expect(favicon.locator('[data-brand-status]')).toContainText('Earlier version copied');await favicon.locator('[data-brand-reason]').fill('Disposable actual previous favicon restore');await favicon.locator('[data-brand-publish]').click();await expect(favicon.locator('[data-brand-status]')).toContainText('verified in public settings');
 await page.locator('#siteIconLibrary > details').evaluate(n=>n.open=true);await page.locator('[data-new-icon-proposal]').click();const catalog=page.locator('[data-icon-catalog-draft]');await expect(catalog.locator('[data-catalog-label]')).toBeEnabled();
 await catalog.locator('[data-catalog-label]').fill('Synthetic UI feature');await catalog.locator('[data-catalog-file]').setInputFiles({name:'synthetic-catalog.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4 L20 20"/></svg>')});
 await catalog.locator('[data-brand-save]').click();await expect(catalog.locator('[data-brand-status]')).toContainText('Private draft saved');
 const absent=await request('rest/v1/site_icon_slots?select=slot&label=eq.Synthetic%20UI%20feature',{method:'GET'});check(absent.ok&&absent.data.length===0,'Actual catalogue UI private save creates no public choice');
 await page.reload();await page.locator('#adminSectionMenu [data-section=icons]').click();await page.locator('#siteIconLibrary > details').evaluate(n=>n.open=true);await expect(catalog.locator('[data-catalog-label]')).toHaveValue('Synthetic UI feature');
 await uiPublish(catalog,'Disposable actual catalogue publication');
 const added=await request('rest/v1/site_icon_slots?select=slot&label=eq.Synthetic%20UI%20feature',{method:'GET'});check(added.ok&&added.data.length===1,'Actual catalogue UI publishes one public choice');
 await operatorPage.reload();await operatorPage.locator('#adminSectionMenu [data-section=icons]').click();await expect(operatorPage.locator('#iconEditor [data-brand-review]')).toBeDisabled();await expect(operatorPage.locator('[data-favicon-editor] [data-brand-review]')).toBeDisabled();await expect(operatorPage.locator('[data-icon-catalog-draft] [data-brand-review]')).toBeDisabled();
 // Restore original brand values through new publications; never erase history.
 for(const [k,c] of [['site-icon/find',initialIcon],['site-favicon',initialFavicon]]){const s=await state(owner,k),out=await save(owner,k,c,s.draft?.version||0,s.published.revision);check(out.ok&&(await publish(owner,k,s.published.revision,out.data.version)).ok,'Original brand restored as new publication');}
 await page.reload();await page.locator('#adminSectionMenu [data-section=icons]').click();await page.setViewportSize({width:1536,height:1024});await page.locator('#iconEditor').scrollIntoViewIfNeeded();await page.screenshot({path:artifacts+'/brand-editor-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.reload();await expect(page.locator('[data-admin-section=icons]')).toBeVisible();await page.locator('#iconEditor').scrollIntoViewIfNeeded();await expect(page.locator('#iconEditor [data-brand-preview] svg')).toHaveCSS('fill','none');check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Actual mobile admin presentation controls avoid horizontal overflow');await page.screenshot({path:artifacts+'/brand-editor-mobile.png'});
 info.completed=true;info.actualUi=true;info.anonymousConfirmation=true;info.legacyRestore=true;info.initialBrandValuesRestored=true;info.catalogueFixture='Two synthetic public choices remain only until disposable stack destruction';
 pass('Actual icon/favicon UI uses normalized assets, private saves, anonymous publication checks and legacy restore as new revisions; fresh anonymous browser receives publication');
}
