// Canonical-contract acceptance of continuation 3411cc2 + target a9c6303.
// Target whole-library/all-display protocols are deliberately not second APIs.
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {expect} from '@playwright/test';
import {assertActivityEnvironment} from './activity-log-reports.mjs';
import {stackDir,artifacts} from './prepare.mjs';
import {png} from './reconciliation-png.mjs';
const file='20261015121959_admin_favicon_publication.sql';
const url=bytes=>'data:image/png;base64,'+bytes.toString('base64');
const original=url(png([35,91,190])),earlier=url(png([235,101,42]));
const hash=data=>createHash('sha256').update(data).digest('hex');
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
export async function prepareReconciliationReplay(){
 assertActivityEnvironment('http://127.0.0.1:54321');
 const source=await readFile(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8');
 const path=stackDir+'/supabase/migrations/'+file;
 if(await readFile(path,'utf8')!==source)throw Error('Favicon migration copy changed before synthetic prerequisites');
 const replay="-- Isolated synthetic PNG pair/revision from target branch acceptance; no hosted data.\nupdate public.site_favicon set png="+quote(original)+",previous_png="+quote(earlier)+",revision=2 where id;\n"+source;
 const pathManifest=artifacts+'/migration-manifest.json',manifest=JSON.parse(await readFile(pathManifest,'utf8'));
 const row=manifest.find(row=>row.file===file);
 if(!row||row.sourceSha256!==hash(source)||row.replaySha256!==hash(source))throw Error('Favicon source/replay provenance changed');
 row.replaySha256=hash(replay);row.syntheticPrerequisite='Two generated valid PNGs and legacy revision 2, before unchanged source adoption; no hosted rows';
 await writeFile(path,replay);await writeFile(pathManifest,JSON.stringify(manifest,null,2));
}
export async function verifyReconciliationAdoption({ROOT,sql,check,pass,evidence}){
 assertActivityEnvironment(ROOT);
 const adopted=JSON.parse(await sql("select jsonb_build_object('display',(select count(*) from public.admin_appearance_current where element_key like 'listing-display/%' and initial_config=config and projection_state=private.presentation_projection(element_key)), 'favicon',(select initial_config=config and legacy_initial_config is not null and projection_state->>'revision'='2' from public.admin_appearance_current where element_key='site-favicon'));"));
 check(adopted.display===10&&adopted.favicon===true,'Exact shared values and earlier favicon adopted without publication');
 // Exercise the exact earlier migration seed statements, in rolled-back synthetic state.
 const displaySource=await readFile(new URL('../../supabase/migrations/20261015120951_admin_remaining_display_publication.sql',import.meta.url),'utf8');
 const displaySeed=displaySource.match(/insert into public\.admin_appearance_current\(element_key,revision,config\)[\s\S]*?on conflict do nothing;/)?.[0];
 const faviconSource=await readFile(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8');
 const faviconSeed=faviconSource.match(/insert into public\.admin_appearance_current\(element_key,revision,config\)[\s\S]*?from public\.site_favicon where id;/)?.[0];
 check(displaySeed&&faviconSeed,'Exact preserved adoption seed anchors found');
 const display=await sql("begin; update public.listing_display_options set enabled=false; delete from public.admin_appearance_current where element_key like 'listing-display/%';\n"+displaySeed+"\nselect count(*)=10 and bool_and(config->'all'->>'enabled'='false' and initial_config=config and projection_state=private.presentation_projection(element_key)) from public.admin_appearance_current where element_key like 'listing-display/%'; rollback;");
 check(display==='t','Exact adoption preserves ten nondefault false values without publishing');
 const favicon=await sql("begin; update public.site_favicon set png=null,previous_png=null,revision=0 where id; delete from public.admin_appearance_current where element_key='site-favicon';\n"+faviconSeed+"\nselect config='{}'::jsonb and initial_config='{}'::jsonb and legacy_initial_config is null from public.admin_appearance_current where element_key='site-favicon'; rollback;");
 check(favicon==='t','Exact default/null favicon adoption remains supported');
 let immutable=false;
 try{await sql("update public.admin_appearance_current set initial_config='{}' where element_key='site-favicon';");}catch(error){immutable=/immutable/.test(error.message);}
 check(immutable,'Initial presentation origin cannot be rewritten');
 evidence.reconciliationAdoption={completed:true,tenOriginalValues:true,nondefaultFalseSeed:true,defaultNullFaviconSeed:true,positiveLegacyPair:true,immutableInitial:true,productionRowsCopied:false};
 pass('Combined migration preserves exact default/nondefault adoption and immutable initial/earlier history without publishing');
}
export async function verifyBranchReconciliation(h){
 const {ROOT,sql,request,check,pass,evidence,owner,operator,page,sensitive,server,loginUI,actors,cli}=h;
 assertActivityEnvironment(ROOT);
 const info=evidence.branchReconciliation={completed:false,genuineAuth:true,canonicalKeys:true,driftCases:[],originalBranchesPreserved:true};
 await page.setViewportSize({width:1536,height:1024});await page.goto(server.url+'/#admin');await page.reload();await expect(page.locator('#adminHost')).toBeVisible();
 owner.session=await page.evaluate(async()=>{await VACANCY_BACKEND.currentUser();return VACANCY_BACKEND.session();});
 sensitive.add(owner.session.access_token);sensitive.add(owner.session.refresh_token);
 const rpc=(name,actor,body)=>request('rest/v1/rpc/'+name,{token:actor?.session?.access_token,body});
 const state=async key=>{const out=await rpc('admin_appearance_state',owner,{p_element_key:key});check(out.ok,'Reconciliation state available');return out.data;};
 const save=async(key,config)=>{const s=await state(key),out=await rpc('admin_appearance_save_draft',owner,{p_element_key:key,p_config:config,p_expected_draft_version:s.draft?.version||0,p_expected_published_revision:s.published.revision});check(out.ok,'Reconciliation draft saved: '+key);return {s,version:out.data.version};};
 const publish=(key,revision,version,id=randomUUID())=>rpc('admin_appearance_publish',owner,{p_element_key:key,p_expected_published_revision:revision,p_expected_draft_version:version,p_reason:'Combined branch acceptance',p_request_id:id});
 const snap=()=>sql("select jsonb_build_object('current',(select jsonb_agg(to_jsonb(c) order by element_key) from public.admin_appearance_current c),'drafts',(select jsonb_agg(to_jsonb(d) order by actor_id,element_key) from public.admin_appearance_drafts d),'history',(select count(*) from public.admin_appearance_revisions),'audit',(select count(*) from public.admin_change_audit),'icons',(select jsonb_agg(to_jsonb(i) order by slot) from public.site_icon_overrides i),'slots',(select jsonb_agg(to_jsonb(s) order by slot) from public.site_icon_slots s),'display',(select jsonb_agg(to_jsonb(d) order by slot) from public.listing_display_options d),'favicon',(select to_jsonb(f) from public.site_favicon f where id));");
 const initialHistory=await rpc('admin_appearance_history',owner,{p_element_key:'site-favicon'});
 check(initialHistory.ok&&initialHistory.data.some(r=>r.revision===0&&r.config.png===original&&r.actor_id===null&&r.published_at===null)&&initialHistory.data.some(r=>r.revision===-1&&r.config.png===earlier&&r.actor_id===null&&r.published_at===null),'Captured actual initial/earlier favicon remains labelled without invented author/time');
 for(const actor of [owner,null]){
  const out=await request('rest/v1/admin_appearance_current?select=initial_config,legacy_initial_config,projection_state',{method:'GET',token:actor?.session.access_token});
  check(!out.ok&&[401,403].includes(out.status),'Private recovery/projection metadata cannot be read by clients');
 }
 const custom=await sql("select slot from public.site_icon_slots where listing_kind is not null order by slot limit 1;");
 check(custom,'Earlier synthetic catalogue acceptance retained');
 const invalidCategory=await rpc('admin_appearance_save_draft',owner,{p_element_key:'icon-catalog/custom-'+randomUUID().replaceAll('-',''),p_config:{label:'Synthetic invalid category',kind:null,path_d:'M2 2 L9 9'},p_expected_draft_version:0,p_expected_published_revision:0});
 check(!invalidCategory.ok&&invalidCategory.data.code==='22023','Explicit JSON null cannot create a category-free custom compiled-source alias');
 for(const config of [{source_slot:custom},{source_slot:'missing'},null]){
  const s=await state('site-icon/find'),out=await rpc('admin_appearance_save_draft',owner,{p_element_key:'site-icon/find',p_config:config,p_expected_draft_version:s.draft?.version||0,p_expected_published_revision:s.published.revision});
  check(!out.ok&&out.data.code==='22023','Unsupported source/NULL icon config denied');
 }
 const noisy=png([0,0,0],64,true),large=url(noisy);check(large.length>4096&&large.length<=40000,'Target synthetic noisy PNG exercises the large asset contract');
 const cases=[['listing-display/listing-wifi',s=>({all:{enabled:!(s.published.config.all?.enabled??true)}}),'display'],['site-icon/find',()=>({path_d:'M7 7 L18 18'}),'icon'],['site-favicon',()=>({png:large}),'favicon']];
 for(const [key,proposal,kind] of cases){
  const before=await state(key),baseline=before.published.config,{version}=await save(key,proposal(before));
  const saved=await snap();
  await sql("create function private.qa_reconciled_audit_reject() returns trigger language plpgsql as $$ begin if new.action='appearance_published' and new.target_key="+quote(key)+" then raise exception 'Combined synthetic audit rejection' using errcode='23514';end if;return new;end $$; create trigger qa_reconciled_audit_reject before insert on public.admin_change_audit for each row execute function private.qa_reconciled_audit_reject();");
  try{const out=await publish(key,before.published.revision,version);check(!out.ok&&out.data.code==='23514'&&await snap()===saved,'Combined audit rejection rolls back public projection, origin metadata, history, drafts and audit');}
  finally{await sql('drop trigger qa_reconciled_audit_reject on public.admin_change_audit;drop function private.qa_reconciled_audit_reject();');}
  const oldPublic=JSON.parse(await sql(kind==='display'?"select to_jsonb(d) from public.listing_display_options d where slot='listing-wifi';":kind==='icon'?"select coalesce((select to_jsonb(i) from public.site_icon_overrides i where slot='find'),'null'::jsonb);":"select to_jsonb(f) from public.site_favicon f where id;"));
  const restorePublic=()=>kind==='display'?sql("update public.listing_display_options set enabled="+oldPublic.enabled+" where slot='listing-wifi';"):
   kind==='icon'?sql("delete from public.site_icon_overrides where slot='find';"+(oldPublic?"insert into public.site_icon_overrides select * from jsonb_populate_record(null::public.site_icon_overrides,"+quote(JSON.stringify(oldPublic))+"::jsonb);":"")):
   sql("update public.site_favicon set png="+(oldPublic.png===null?'null':quote(oldPublic.png))+",previous_png="+(oldPublic.previous_png===null?'null':quote(oldPublic.previous_png))+",revision="+oldPublic.revision+" where id;");
  const drifts=kind==='favicon'?['revision','image','previous']:[kind];
  for(const drift of drifts){
   try{
    await sql(kind==='display'?"update public.listing_display_options set enabled=not enabled where slot='listing-wifi';":kind==='icon'?"insert into public.site_icon_overrides(slot,path_d) values('find','M8 8 L19 19') on conflict(slot) do update set source_slot=null,path_d=excluded.path_d;":drift==='revision'?"update public.site_favicon set revision=revision+1 where id;":drift==='image'?"update public.site_favicon set png="+quote(large)+" where id;":"update public.site_favicon set previous_png="+quote(large)+" where id;");
    const drifted=await snap(),out=await publish(key,before.published.revision,version);
    check(out.status===409&&out.data.code==='PT409'&&await snap()===drifted,'Out-of-band '+drift+' fails closed without overwriting external state');info.driftCases.push(drift);
   }finally{await restorePublic();}
  }
  const id=randomUUID(),out=await publish(key,before.published.revision,version,id);check(out.ok,'Reconciled projection publishes after exact underlying recovery');
  const committed=await snap(),again=await publish(key,before.published.revision,version,id);check(again.ok&&again.data.alreadyApplied&&await snap()===committed,'Combined publication retry is idempotent');
  if(kind==='icon')check(await sql("select actor_id="+quote(owner.id)+"::uuid from public.site_icon_revisions where slot='find' order by id desc limit 1;")==='t','Legacy icon revision uses actual authenticated publisher');
  if(kind==='favicon'){
   const diff=JSON.parse(await sql("select diff from public.admin_change_audit where action='appearance_published' and target_key='site-favicon' order by id desc limit 1;"));
   check(diff.after.pngBytes===noisy.length&&diff.after.pngSha256===hash(noisy)&&!JSON.stringify(diff).includes('data:image'),'Large PNG audit contains exact bytes/digest and no image body');
  }
  const s=await state(key),restored=await rpc('admin_appearance_restore_draft',owner,{p_element_key:key,p_from_revision:before.published.revision,p_expected_draft_version:s.draft?.version||0,p_expected_published_revision:s.published.revision});
  check(restored.ok,'Real existing baseline/history restored to private draft');
  check((await publish(key,s.published.revision,restored.data.version)).ok,'Recovery is a new reviewed publication');
  check(JSON.stringify((await state(key)).published.config)===JSON.stringify(baseline),'Recovery retains original canonical setting');
 }
 pass('Combined target drift guards, exact legacy authors, large-PNG hash audit, real conflicts, idempotency and audited recovery pass');
 const countBefore=await sql('select count(*) from public.site_icon_slots;');
 for(const revision of [-1,0]){
  const s=await state('site-favicon'),out=await rpc('admin_appearance_restore_draft',owner,{p_element_key:'site-favicon',p_from_revision:revision,p_expected_draft_version:s.draft?.version||0,p_expected_published_revision:s.published.revision});
  check(out.ok&&out.data.config.png===(revision===-1?earlier:original),'Captured favicon restore uses protected fixed origin');
  check((await publish('site-favicon',s.published.revision,out.data.version)).ok,'Earlier/initial favicon recovery publishes as a new version');
 }
 const iconState=await state('site-icon/find'),restoreIcon=await rpc('admin_appearance_restore_draft',owner,{p_element_key:'site-icon/find',p_from_revision:0,p_expected_draft_version:iconState.draft?.version||0,p_expected_published_revision:iconState.published.revision});
 check(restoreIcon.ok,'Compiled icon origin available as private restore draft');
 if(JSON.stringify(iconState.published.config)!==JSON.stringify(restoreIcon.data.config))check((await publish('site-icon/find',iconState.published.revision,restoreIcon.data.version)).ok,'Compiled original recovery is audited');
 check(await sql('select count(*) from public.site_icon_slots;')===countBefore,'Restoring historical artwork never deletes later customer choices');
 check(await sql("select count(*)=0 from public.admin_change_audit where target_key='site-favicon' and diff::text like '%data:image%';")==='t','All new favicon audit entries omit asset bodies');
 pass('Captured earlier/initial favicon and compiled icon recovery retain later catalogue choices and append-only history');
 await verifyReconciledLanguage({h,state,save,publish,rpc});
 const raw=await cli(['db','advisors','--local','--type','security','--level','warn','--fail-on','none','--output-format','json']);
 const advisor=JSON.parse(raw);await writeFile(artifacts+'/reconciliation-security-advisors.json',JSON.stringify(advisor,null,2));
 info.securityAdvisorsExecuted=true;info.auditImageBodies=false;info.retentionDeletionExecuted=false;info.completed=true;
 pass('Official local security advisors executed for the complete reconciled candidate; findings retained for classification');
}
async function verifyReconciledLanguage({h,state,save,publish,rpc}){
 const {sql,check,pass,evidence,owner,page,server,loginUI,actors}=h;
 const targets=['create-listing/language-selector','edit-listing/language-selector'];
 const baseline=new Map();
 for(const [index,key] of targets.entries()){
  const s=await state(key);baseline.set(key,s.published.config);
  for(const value of [25,-1,1.5,'12',null]){
   const out=await rpc('admin_appearance_save_draft',owner,{p_element_key:key,p_config:{all:{padding_left:value}},p_expected_draft_version:s.draft?.version||0,p_expected_published_revision:s.published.revision});
   check(!out.ok&&out.data.code==='22023','Malformed/out-of-bound language padding denied by actual server');
  }
  const config={all:{width:index?'160px':'200px',padding_top:index?7:11,padding_right:index?8:12,padding_bottom:index?9:13,padding_left:index?10:14},mobile:{padding_left:index?18:22}};
  const draft=await save(key,config);check((await publish(key,draft.s.published.revision,draft.version)).ok,'Separate language spacing published');
 }
 await page.goto(server.url+'/#admin');await page.reload();await page.locator('#adminSectionMenu [data-section=design]').click();
 for(const key of targets){await page.locator('[data-design-target="'+key+'"]').click();await expect(page.locator('[data-style-field=padding_left]')).toBeVisible();await expect(page.locator('[data-style-field=padding_left]')).toHaveAttribute('max','24');}
 const customer=actors.find(a=>a.role==='customer publisher'),listing=await sql("select v.id from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where p.owner_id="+quote(customer.id)+"::uuid limit 1;"),ui=await loginUI(customer),p=ui.page;
 try{
  for(const width of [1280,390]){
   await p.setViewportSize({width,height:900});
   for(const [index,route] of ['#list/new','#edit/'+listing].entries()){
    await p.goto(server.url+'/'+route);await p.reload();const select=p.locator('#listingHost .listing-language select');await expect(select).toBeVisible();
    const value=await select.inputValue();await expect(select).toHaveCSS('padding-left',(width===390?(index?18:22):(index?10:14))+'px');
    await expect(select).toHaveCSS('padding-top',(index?7:11)+'px');check(await select.inputValue()===value,'Style publication preserves actual customer language value');
   }
  }
  await p.screenshot({path:artifacts+'/reconciled-language-customer-mobile.png'});
 }finally{await ui.ctx.close();}
 await page.screenshot({path:artifacts+'/reconciled-language-editor-desktop.png'});
 for(const key of targets){const draft=await save(key,baseline.get(key));check((await publish(key,draft.s.published.revision,draft.version)).ok,'Original language appearance restored as new publication');}
 evidence.branchReconciliation.languagePadding={completed:true,targets:2,desktopMobile:true,customerLanguagePreserved:true,originalConfigRestored:true};
 pass('Target language padding survives canonical validation, actual editor controls, independent Create/Edit rendering and desktop/mobile scopes');
}
