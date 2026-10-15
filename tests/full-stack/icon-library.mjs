// Genuine Auth/PostgREST/browser acceptance; disposable loopback only.
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {expect} from '@playwright/test';
const K='site/icon-library',FILE='20261015193950_admin_icon_library_reviewed_publication.sql';
const FIX='custom-00000000000000000000000000000001',PATH='M2 2 L22 22',NEWPATH='M3 21 L12 3 L21 21 Z';
const svg=path=>Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="'+path+'"/></svg>');
const guard=ROOT=>{if(process.env.CI!=='true'||process.env.VACANCY_DISPOSABLE_STACK!=='1'||ROOT!=='http://127.0.0.1:54321')throw Error('Disposable icon checks only');};
export async function prepareIconReplay(){
 guard('http://127.0.0.1:54321');if(process.platform!=='linux')throw Error('Disposable Linux only');
 const {stackDir,artifacts}=await import('./prepare.mjs'),source=await readFile(new URL('../../supabase/migrations/'+FILE,import.meta.url),'utf8'),target=stackDir+'/supabase/migrations/'+FILE;
 if(await readFile(target,'utf8')!==source)throw Error('Unexpected icon migration copy');
 const fixture="-- Disposable synthetic existing override, custom choice and legacy history; no hosted data.\ninsert into public.site_icon_slots(slot,label,listing_kind) values('"+FIX+"','Fixture utility','utility');\ninsert into public.site_icon_overrides(slot,source_slot,path_d) values('find','house',null),('"+FIX+"',null,'"+PATH+"');\ninsert into public.site_icon_revisions(slot,path_d,actor_id) values('find','"+PATH+"','11111111-1111-4111-8111-111111111111');\n";
 const replay=fixture+source;await writeFile(target,replay);
 const file=artifacts+'/migration-manifest.json',m=JSON.parse(await readFile(file,'utf8')),row=m.find(x=>x.file===FILE);
 if(!row||row.sourceSha256!==createHash('sha256').update(source).digest('hex'))throw Error('Icon manifest mismatch');
 row.replaySha256=createHash('sha256').update(replay).digest('hex');row.syntheticPrerequisite='Existing synthetic find override, custom utility and legacy artwork row before unchanged source DDL; no hosted data';await writeFile(file,JSON.stringify(m,null,2));
}
export async function verifyLegacyIconGate({baselineAdmin,sql,check,pass}){
 const snap=()=>sql("select jsonb_build_object('slots',(select jsonb_agg(to_jsonb(s) order by slot) from public.site_icon_slots s),'overrides',(select jsonb_agg(to_jsonb(o) order by slot) from public.site_icon_overrides o),'history',(select jsonb_agg(to_jsonb(r) order by id) from public.site_icon_revisions r));"),before=await snap();
 const panel=baselineAdmin.locator('#siteIconLibrary');await expect(panel).toBeVisible();
 await panel.locator('#iconSource').selectOption('wifi');await panel.getByRole('button',{name:'Save icon',exact:true}).click();await expect(panel.locator('#iconMessage')).toContainText('Reload the admin page');
 const form=panel.locator('#addListingIcon');await form.locator('[name=label]').fill('Cached forbidden choice');await form.locator('[name=file]').setInputFiles({name:'safe.svg',mimeType:'image/svg+xml',buffer:svg(PATH)});
 await form.getByRole('button',{name:'Add to library',exact:true}).click();await expect(form.locator('[role=status]')).toContainText('Reload the admin page');
 check(await snap()===before,'Cached icon writes leave public catalog/overrides/history unchanged');
 pass('Actual pinned old admin artwork save and catalog addition fail closed with reload guidance and no public effects');
}
export async function verifyIconLibrary(h){
 const {ROOT,sql,rpc,request,owner,operator,viewer,suspended,page,operatorPage,context,server,check,pass,evidence,artifacts,sensitive}=h;guard(ROOT);
 const report=evidence.iconLibrary={completed:false};
 const refresh=async(a,p)=>{a.session=await p.evaluate(async()=>{await VACANCY_BACKEND.currentUser();return VACANCY_BACKEND.session();});};
 await refresh(owner,page);await refresh(operator,operatorPage);
 for(const a of [viewer,suspended]){const out=await request('auth/v1/token?grant_type=refresh_token',{body:{refresh_token:a.session.refresh_token}});check(out.ok,'Refresh genuine icon denial actor');a.session=out.data;sensitive.add(out.data.access_token);sensitive.add(out.data.refresh_token);}
 const login=await request('auth/v1/token?grant_type=password',{body:{email:owner.email,password:owner.password}});check(login.ok&&JSON.parse(Buffer.from(login.data.access_token.split('.')[1],'base64url')).aal==='aal1','Genuine fresh AAL1 icon Owner');sensitive.add(login.data.access_token);sensitive.add(login.data.refresh_token);
 const aal1={session:login.data},call=(name,a,args={})=>rpc('admin_appearance_'+name,a,{p_element_key:K,...args});
 const get=async a=>{const out=await call('state',a);check(out.ok,'Icon state HTTP '+out.status);return out.data;};
 const save=(a,config,version,revision)=>call('save_draft',a,{p_config:config,p_expected_draft_version:version,p_expected_published_revision:revision});
 const pub=(a,revision,version,id=randomUUID(),reason='Disposable icon library review')=>call('publish',a,{p_expected_published_revision:revision,p_expected_draft_version:version,p_request_id:id,p_reason:reason});
 const restore=(a,from,version,revision)=>call('restore_draft',a,{p_from_revision:from,p_expected_draft_version:version,p_expected_published_revision:revision});
 const snap=()=>sql("select jsonb_build_object('slots',(select jsonb_agg(to_jsonb(s) order by slot) from public.site_icon_slots s),'overrides',(select jsonb_agg(to_jsonb(o) order by slot) from public.site_icon_overrides o),'legacy',(select jsonb_agg(to_jsonb(r) order by id) from public.site_icon_revisions r),'current',(select to_jsonb(c) from public.admin_appearance_current c where element_key='"+K+"'),'drafts',(select jsonb_agg(to_jsonb(d) order by actor_id) from public.admin_appearance_drafts d where element_key='"+K+"'),'history',(select jsonb_agg(to_jsonb(r) order by revision) from public.admin_appearance_revisions r where element_key='"+K+"'),'audit',(select jsonb_agg(to_jsonb(a) order by id) from public.admin_change_audit a where target_key='"+K+"'));");
 const baseline=(await get(owner)).published.config;
 check(baseline.icons.find.source==='house'&&baseline.icons[FIX].path===PATH&&Object.keys(baseline.icons).length===36,'Existing override and custom choice captured');
 const before=await snap(),deny=(out,label)=>check(!out.ok&&[401,403].includes(out.status)&&out.data?.code==='42501',label+' denied HTTP '+out.status);
 for(const [a,label] of [[null,'anonymous'],[aal1,'AAL1 Owner'],[viewer,'AAL2 nonadmin'],[suspended,'AAL2 suspended']]){
  deny(await call('state',a),label+' state');deny(await call('history',a),label+' history');deny(await save(a,baseline,0,0),label+' draft');deny(await pub(a,0,1),label+' publish');deny(await restore(a,0,0,0),label+' restore');
  deny(await rpc('admin_set_site_icon',a,{p_slot:'find',p_source_slot:'wifi',p_path_d:null}),label+' old artwork');deny(await rpc('admin_add_listing_icon',a,{p_label:'Forbidden',p_kind:'amenity',p_path_d:PATH}),label+' old add');
 }
 for(const a of [null,aal1,viewer,suspended,operator,owner])for(const table of ['site_icon_slots','site_icon_overrides','site_icon_revisions'])for(const [method,body] of [['POST',{slot:'find'}],['PATCH',{slot:'find'}],['DELETE',undefined]]){
  const out=await request('rest/v1/'+table+'?slot=eq.find',{method,body,token:a?.session?.access_token});check(!out.ok&&[401,403].includes(out.status),'Direct '+table+' '+method+' denied');
 }
 check(await snap()===before,'Icon denials leave all state unchanged');
 pass('Real anonymous/AAL1/nonadmin/suspended icon RPCs and all 54 direct table writes are denied without effects');
 for(const a of [owner,operator])for(const [name,args] of [['admin_set_site_icon',{p_slot:'find',p_source_slot:'wifi',p_path_d:null}],['admin_add_listing_icon',{p_label:'Forbidden',p_kind:'amenity',p_path_d:PATH}]]){
  const out=await rpc(name,a,args);check(out.status===409&&out.data?.code==='PT409','AAL2 legacy icon path closes');
 }
 const clone=x=>JSON.parse(JSON.stringify(x)),bad=change=>{const c=clone(baseline);change(c);return c;};
 const invalid=[{},null,[],bad(c=>delete c.icons.find),bad(c=>c.icons.find.label='Rename'),bad(c=>c.icons.find.path='<svg/>'),bad(c=>c.icons.find.path=42),bad(c=>c.icons.find.source=FIX),bad(c=>c.icons[FIX].path=null),bad(c=>c.icons.unknown={...c.icons[FIX]}),bad(c=>c.icons.find.actor=owner.id),bad(c=>c.icons.find={...c.icons.find,source:null,path:'M1 1L2 2'.repeat(200)})];
 for(const key of [null,'unregistered/icon']){const out=await rpc('admin_appearance_save_draft',owner,{p_element_key:key,p_config:baseline,p_expected_draft_version:0,p_expected_published_revision:0});check(!out.ok&&out.data?.code==='22023','Unregistered or null key rejected');}
 for(const c of invalid){const out=await save(owner,c,0,0);check(!out.ok&&out.data?.code==='22023','Malformed library rejected');}
 check(await snap()===before,'Invalid snapshots and bypass calls have no effects');
 pass('Exact initial override/custom choice survives capture; old AAL2 bypasses and 12 malformed/unsafe snapshots are rejected');
 const op=clone(baseline);op.icons.find.source='wifi';check((await save(operator,op,0,0)).ok,'Operator private library save');check((await get(owner)).draft===null,'Per-user library drafts');deny(await pub(operator,0,1),'Operator publication');deny(await restore(operator,0,1,0),'Operator restore');
 const beforeDraft=await snap();
 await sql("create function private.qa_icon_draft() returns trigger language plpgsql set search_path='' as $$ begin if new.target_key='"+K+"' and new.action='appearance_draft_saved' then raise exception 'QA icon draft audit rejection' using errcode='23514';end if;return new;end $$;create trigger qa_icon_draft before insert on public.admin_change_audit for each row execute function private.qa_icon_draft();");
 try{const out=await save(owner,op,0,0);check(!out.ok&&out.data?.code==='23514'&&await snap()===beforeDraft,'Draft audit fails atomically');}finally{await sql('drop trigger qa_icon_draft on public.admin_change_audit;drop function private.qa_icon_draft();');}
 pass('Genuine AAL2 Operator drafts stay private; Owner-only publication/restore and forced draft audit rollback are enforced');
 await page.reload();await expect(page.locator('#adminHost')).toBeVisible({timeout:30000});await page.locator('#adminSectionMenu [data-section=icons]').click();
 const panel=page.locator('#siteIconLibrary'),status=panel.locator('[data-icons-status]');await expect(status).toHaveText('Published icon library version 0 loaded.');
 await panel.locator('[data-icons-slot=find]').click();
 await expect(panel.locator('[data-icons-source] option[value=pool]')).toHaveCount(0);
 const sprite=()=>page.evaluate(()=>document.getElementById('icon-find').innerHTML),spriteBefore=await sprite();
 await panel.locator('[data-icons-file]').setInputFiles({name:'unsafe.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><script>alert(1)</script></svg>')});
 await expect(status).toContainText('Unsupported SVG element');
 await panel.locator('[data-icons-file]').setInputFiles({name:'large.svg',mimeType:'image/svg+xml',buffer:Buffer.alloc(20001)});await expect(status).toContainText('smaller than 20 KB');
 await panel.locator('[data-icons-file]').setInputFiles({name:'safe.svg',mimeType:'image/svg+xml',buffer:svg(NEWPATH)});await expect(status).toContainText('Custom icon previewed privately');
 check(await sprite()===spriteBefore,'Private artwork leaves shared sprite unchanged');
 await panel.getByText('Add a listing feature or utility',{exact:true}).click();const form=panel.locator('[data-icons-add]');
 await form.locator('[name=label]').fill('Synthetic pool');await form.locator('[name=file]').setInputFiles({name:'choice.svg',mimeType:'image/svg+xml',buffer:svg(PATH)});await form.locator('button').click();
 await expect(status).toContainText('New listing choice previewed privately');
 check(await sql("select count(*) from public.site_icon_slots where label='Synthetic pool';")==='0','Unsaved choice remains absent publicly');
 await page.route('**/rest/v1/rpc/admin_appearance_save_draft',r=>r.abort());await panel.locator('[data-icons-save]').click();await expect(status).toContainText(/fetch|network/i);await page.unroute('**/rest/v1/rpc/admin_appearance_save_draft');
 await panel.locator('[data-icons-save]').click();await expect(status).toContainText('Private icon library draft saved');
 let own=await get(owner);const saved=own.draft.config,added=Object.keys(saved.icons).find(k=>saved.icons[k].label==='Synthetic pool');check(added&&own.draft.version===1&&saved.icons.find.path===NEWPATH,'Actual SVG conversion and private addition saved');
 report.addedSlot=added;check(await sql("select count(*) from public.site_icon_slots where label='Synthetic pool';")==='0'&&await sprite()===spriteBefore,'Saved draft never changes public choices/sprite');
 check((await save(owner,saved,0,0)).status===409,'Stale icon draft conflict');
 pass('Visible SVG script/size rejection, safe conversion, private additive choice and network save retry leave public sprite/catalog unchanged');
 const beforePublish=await snap();
 await sql("create function private.qa_icon_publish() returns trigger language plpgsql set search_path='' as $$ begin if new.target_key='"+K+"' and new.action='appearance_published' then raise exception 'QA icon publication audit rejection' using errcode='23514';end if;return new;end $$;create trigger qa_icon_publish before insert on public.admin_change_audit for each row execute function private.qa_icon_publish();");
 try{const out=await pub(owner,0,1);check(!out.ok&&out.data?.code==='23514'&&await snap()===beforePublish,'Audit failure rolls back new catalog slot, artwork, timestamps, legacy history, revision/draft/audit');}
 finally{await sql('drop trigger qa_icon_publish on public.admin_change_audit;drop function private.qa_icon_publish();');}
 await sql("update public.site_icon_overrides set source_slot='wifi' where slot='find';");const drift=await snap();
 try{const out=await pub(owner,0,1);check(out.status===409&&out.data?.code==='PT409'&&await snap()===drift,'Out-of-band icon drift conflicts');}
 finally{await sql("update public.site_icon_overrides set source_slot='house' where slot='find';");}
 check(await snap()===beforePublish,'Public drift fixture restored exactly');
 pass('Forced publication audit rejection rolls back addition/artwork/legacy history and all editor effects; unexpected public drift is refused');
 await panel.locator('[data-icons-review]').click();await expect(panel.locator('[data-icons-publish]')).toBeDisabled();await expect(panel.locator('[data-icons-diff] li')).toHaveCount(2);
 await panel.locator('[data-icons-reason]').fill('Review synthetic artwork and pool choice');await expect(panel.locator('[data-icons-publish]')).toBeDisabled();await panel.locator('[data-icons-confirm]').check();await page.screenshot({path:artifacts+'/icons-review-desktop.png'});
 let committed;await page.route('**/rest/v1/rpc/admin_appearance_publish',async route=>{committed=route.request().postDataJSON();const response=await route.fetch();check(response.ok(),'Actual icon publication commits before response loss');await response.dispose();await route.abort();});
 await panel.locator('[data-icons-publish]').click();await expect(status).toContainText(/fetch|network/i);check((await get(owner)).published.revision===1,'Actual icon commit');
 await page.unroute('**/rest/v1/rpc/admin_appearance_publish');await panel.locator('[data-icons-publish]').click();await expect(status).toHaveText('Icon library published.');
 check(await sql("select count(*) from public.site_icon_revisions;")==='3','Only two changed icons append legacy revisions once');
 check(await sql("select count(*) from public.admin_change_audit where target_key='"+K+"' and action='appearance_published' and request_id='"+committed.p_request_id+"';")==='1','Single audit after icon retry');
 check((await pub(owner,0,1,committed.p_request_id,'Changed retry payload')).status===409,'Changed idempotency payload refused');
 check((await save(operator,op,1,0)).status===409,'Stale Operator library publication base conflicts');
 pass('Explicit two-change review needs reason/confirmation; lost committed response retries one publication with exactly two legacy revisions and one audit');
 await operatorPage.reload();await expect(operatorPage.locator('#adminHost')).toBeVisible({timeout:30000});await operatorPage.locator('#adminSectionMenu [data-section=icons]').click();
 const operatorPanel=operatorPage.locator('#siteIconLibrary');await expect(operatorPanel.locator('[data-icons-status]')).toContainText('Published library changed');
 await operatorPanel.locator('[data-icons-save]').click();await expect(operatorPanel.locator('[data-icons-status]')).toContainText('Private icon library draft saved');
 const rebased=(await get(operator)).draft;check(rebased.version===2&&rebased.baseRevision===1&&rebased.config.icons[added]&&rebased.config.icons.find.source==='wifi','Visible Operator rebase preserves private artwork and incorporates new published choice');
 await expect(operatorPanel.locator('[data-icons-review]')).toBeDisabled();
 pass('Stale Operator reload/save rebases privately, retains artwork and includes newly published choices; publication stays Owner-only');

 const publicCtx=await context(),p=await publicCtx.newPage();
 try{
  for(const width of [1536,390]){await p.setViewportSize({width,height:width===390?844:1024});await p.goto(server.url+'/#home');await p.waitForFunction(()=>booting===false);await p.evaluate(()=>VACANCY_ICON_LIBRARY.ready);
   await expect(p.locator('#icon-find path')).toHaveAttribute('d',NEWPATH);check(await p.evaluate(slot=>VACANCY_ICON_LIBRARY.listingOptions.some(e=>e.slot===slot),added),'Actual public choice read');
   check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Public icon change preserves layout');
  }
  await p.screenshot({path:artifacts+'/icons-public-mobile.png'});
  const publicRows=await request('rest/v1/site_icon_overrides?select=slot,source_slot,path_d&slot=eq.find',{method:'GET'});check(publicRows.ok&&publicRows.data[0].path_d===NEWPATH,'Anonymous old reader contract unchanged');
  pass('Real anonymous desktop/mobile sprite and public listing-choice catalog receive the exact reviewed paths');
 }finally{await publicCtx.close();}
 // The original legacy row remains available for private preview and reviewed publication.
 await panel.locator('[data-icons-slot=find]').click();await expect(panel.locator('[data-icons-legacy-use]').first()).toBeVisible();
 const legacyId=await sql("select min(id) from public.site_icon_revisions where slot='find';");
 await panel.locator('[data-icons-legacy-use="'+legacyId+'"]').click();await expect(status).toContainText('Earlier artwork previewed privately');check(await sprite()!==spriteBefore,'Published custom icon remains until legacy review');
 await panel.locator('[data-icons-save]').click();await expect(status).toContainText('Private icon library draft saved');
 const publishUI=async reason=>{await panel.locator('[data-icons-review]').click();await panel.locator('[data-icons-reason]').fill(reason);await panel.locator('[data-icons-confirm]').check();await panel.locator('[data-icons-publish]').click();await expect(status).toHaveText('Icon library published.');};
 await publishUI('Restore actual legacy artwork');check((await get(owner)).published.config.icons.find.path===PATH,'Legacy row restores through new publication');
 pass('Preserved legacy artwork previews privately and restores through a new reviewed draft/publication');
 await panel.getByText('Published library history',{exact:true}).click();await panel.locator('[data-icons-restore="0"]').click();await expect(status).toContainText('Later listing choices are kept');
 own=await get(owner);check(own.draft.config.icons[added]&&own.draft.config.icons.find.source==='house','Initial restore keeps later customer choice and restores initial artwork');
 await publishUI('Restore initial artwork while keeping later choices');
 own=await get(owner);check(own.published.revision===3&&own.published.config.icons.find.source==='house'&&own.published.config.icons[added]&&own.published.config.icons[FIX],'Baseline recovery preserves both old and new custom choice identities');
 const noChange=clone(own.published.config);check((await save(owner,noChange,0,3)).ok,'Unchanged library draft saves');const noOpBefore=await snap(),noOp=await pub(owner,3,1);check(!noOp.ok&&noOp.data?.code==='22023'&&await snap()===noOpBefore,'No-op library publication rejected atomically');
 const unchanged=await snap();
 await page.setViewportSize({width:390,height:844});await page.reload();await expect(panel).toBeVisible();await expect(panel.locator('.icons-mobile-note')).toBeVisible();await expect(panel.locator('.icons-desktop')).toBeHidden();check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile icon fallback no overflow');await page.screenshot({path:artifacts+'/icons-admin-mobile.png'});
 await page.setViewportSize({width:1536,height:1024});await expect(status).toHaveText('Your private icon library draft is loaded.');check(await snap()===unchanged,'Mobile-first widening has no icon writes');await expect(panel.locator('[data-icons-review]')).toBeDisabled();
 check(await sql("select count(*) from public.site_icon_revisions where id="+legacyId+" and path_d='"+PATH+"';")==='1','Original legacy history remains immutable');
 const security=JSON.parse(await sql("select jsonb_build_object('rls',(select bool_and(relrowsecurity) from pg_class where oid in ('public.site_icon_slots'::regclass,'public.site_icon_overrides'::regclass,'public.site_icon_revisions'::regclass)),'anonExecute',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('icon_library_snapshot','validate_icon_library','project_reviewed_icon_library') and has_function_privilege('anon',p.oid,'EXECUTE')),'emptySearchPath',(select bool_and('search_path=\"\"'=any(proconfig)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('icon_library_snapshot','validate_icon_library','project_reviewed_icon_library')));"));
 check(security.rls&&security.anonExecute===0&&security.emptySearchPath,'Icon catalog RLS/helper security');
 Object.assign(report,{completed:true,editorRevision:3,deniedRpcProbes:28,deniedDirectWrites:54,legacyHistoryPreserved:true,additiveRestore:true,security});
 pass('Reviewed initial rollback preserves later listing choices; no-op publication, mobile-first writes and helper exposure are blocked');
}

export async function verifyIconChoiceForms({ROOT,sql,loginUI,server,actors,evidence,check,pass,artifacts}){
 guard(ROOT);const actor=actors.find(a=>a.role==='customer publisher'),slot=evidence.iconLibrary?.addedSlot;check(actor&&slot,'Existing genuine synthetic publisher and reviewed choice required');
 const id=await sql("select v.id from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where p.owner_id='"+actor.id+"' order by v.id limit 1;");
 const snapshot=()=>sql("select jsonb_agg(jsonb_build_object('vacancy',to_jsonb(v),'room',to_jsonb(r)) order by v.id) from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where p.owner_id='"+actor.id+"';"),before=await snapshot();
 for(const mode of ['create','edit']){
  const ui=await loginUI(actor),p=ui.page;try{
   await p.goto(server.url+(mode==='create'?'/#list/new':'/#edit/'+id));await p.waitForFunction(()=>booting===false);
   if(mode==='create'){await p.locator('[data-listing-type=Residential]').click();await p.locator('[data-preset=Studio]').click();await p.getByRole('button',{name:'New property',exact:true}).click();}
   const form=p.locator('#listingForm');await expect(form).toBeVisible();
   if(mode==='create')await form.evaluate(node=>{for(const [name,value] of Object.entries({country:'Australia',region:'WA',city:'Perth',locality:'Joondalup',address:'Synthetic icon verification address'}))if(node.elements[name])node.elements[name].value=value;node.querySelector('#newPropertyMap')._vacancySetLocation(-31.75,115.77,false);});
   if(await form.getAttribute('data-journey-step')==='0')await form.locator('.journey-next').click();await expect(form).toHaveAttribute('data-journey-step','1');
   const unit=form.locator('.unit-editor').first();await unit.locator('.unit-features > summary').click();await unit.locator('[data-add-unit-option=amenity]').click();
   const row=unit.locator('.unit-custom-amenities .unit-custom-row').last();await row.locator('.unit-catalog-choice').selectOption(slot);await expect(row.locator('input')).toHaveValue('Synthetic pool');await expect(row.locator('.unit-custom-icon')).toHaveValue(slot);
   await expect(p.locator('#icon-'+slot+' path')).toHaveAttribute('d',PATH);
   if(mode==='edit')await p.screenshot({path:artifacts+'/icons-customer-edit-choice.png'});
   pass('Actual '+mode+' customer form receives reviewed choice and selects its label/stable icon without publishing listing changes');
  }finally{await ui.ctx.close();}
 }
 check(await snapshot()===before,'Icon choice interactions never publish or change existing customer listing/room');
 evidence.iconLibrary.customerCreateEditChoices=true;
}
