import {randomUUID} from 'node:crypto';
import {expect} from '@playwright/test';
import {assertActivityEnvironment} from './activity-log-reports.mjs';

export async function verifyDisplayDraft(h){
  const {ROOT,sql,request,check,pass,evidence,owner,operator,viewer,suspended,page,
    operatorPage,context,server,key,artifacts,sensitive}=h;
  assertActivityEnvironment(ROOT);
  const target='listing-display/card-services',config=value=>({all:{enabled:value}});
  const info={environment:'disposable Linux CI; real Auth, SQL, REST and existing card renderer',completed:false};
  evidence.displayDraft=info;
  async function browserSession(actor,p){
    actor.session=await p.evaluate(async()=>{await VACANCY_BACKEND.currentUser();return VACANCY_BACKEND.session();});
    check(actor.session?.access_token,'Existing real browser session required');
    sensitive.add(actor.session.access_token);sensitive.add(actor.session.refresh_token);
  }
  await browserSession(owner,page);await browserSession(operator,operatorPage);
  const rpc=(name,actor,body)=>request('rest/v1/rpc/'+name,{token:actor?.session?.access_token,body});
  const state=async actor=>{const out=await rpc('admin_appearance_state',actor,{p_element_key:target});
    check(out.ok,'Display state HTTP '+out.status);return out.data;};
  const save=(actor,value,version,revision)=>rpc('admin_appearance_save_draft',actor,
    {p_element_key:target,p_config:value,p_expected_draft_version:version,p_expected_published_revision:revision});
  const publish=(actor,revision,version,id=randomUUID())=>rpc('admin_appearance_publish',actor,
    {p_element_key:target,p_expected_published_revision:revision,p_expected_draft_version:version,
      p_reason:'Disposable shared display acceptance',p_request_id:id});
  const publicValue=async()=>{
    const out=await request('rest/v1/listing_display_options?select=slot,enabled&slot=eq.card-services',{method:'GET'});
    check(out.ok&&out.data.length===1,'Anonymous existing display binding available');return out.data[0].enabled;};
  const snapshot=()=>sql(`select jsonb_build_object(
    'current',(select to_jsonb(c) from public.admin_appearance_current c where element_key='${target}'),
    'display',(select to_jsonb(d) from public.listing_display_options d where slot='card-services'),
    'revisions',(select count(*) from public.admin_appearance_revisions where element_key='${target}'),
    'drafts',(select jsonb_agg(to_jsonb(d) order by actor_id) from public.admin_appearance_drafts d where element_key='${target}'),
    'audit',(select count(*) from public.admin_change_audit));`);
  let current=await state(owner);
  check(current.published.revision===0&&current.draft===null&&current.published.config.all.enabled===await publicValue(),
    'Migration adopts actual existing public display without a publication or changed value');
  const initial=await publicValue();
  check(initial===true,'Disposable source display baseline is shown');
  for(const value of [{all:{enabled:'false'}},{mobile:{enabled:false}},{all:{enabled:false,radius:3}},
    {all:{enabled:false},desktop:{}},null,{all:{enabled:null}}]){
    const out=await save(owner,value,0,0);check(!out.ok&&out.data?.code==='22023','Nonboolean or page/viewport display config rejected');
  }
  const unknown=await rpc('admin_appearance_save_draft',owner,{p_element_key:'listing-display/unknown',p_config:config(false),
    p_expected_draft_version:0,p_expected_published_revision:0});
  check(!unknown.ok&&unknown.data?.code==='22023','Unregistered global setting rejected');
  check((await save(operator,config(false),0,0)).ok,'Genuine Operator saves private display draft');
  check((await state(owner)).draft===null&&await publicValue()===initial,'Operator draft stays private and does not publish');
  check(!(await publish(operator,0,1)).ok,'Operator cannot publish display draft');
  const opRestore=await rpc('admin_appearance_restore_draft',operator,{p_element_key:target,p_from_revision:1,
    p_expected_draft_version:1,p_expected_published_revision:0});
  check(!opRestore.ok&&opRestore.data?.code==='42501','Operator cannot restore display history');
  pass('Shared display uses bounded validation and genuine Operator private drafts without public changes');

  check((await save(owner,config(false),0,0)).ok,'Owner saves independent display draft');
  const stale=await save(owner,config(true),0,0);
  check(stale.status===409&&stale.data?.code==='PT409','Stale shared draft conflicts without overwrite');
  const before=await snapshot();
  await sql(`create function private.qa_display_audit_reject() returns trigger language plpgsql as $$
    begin if new.action='appearance_published' and new.target_key='${target}' then
      raise exception 'Disposable display audit rejection' using errcode='23514'; end if; return new; end $$;
    create trigger qa_display_audit_reject before insert on public.admin_change_audit
    for each row execute function private.qa_display_audit_reject();`);
  try{
    const rejected=await publish(owner,0,1);
    check(!rejected.ok&&rejected.data?.code==='23514','Injected audit failure rejects display publication');
    check(await snapshot()===before&&await publicValue()===initial,
      'Audit failure rolls public display projection, state, history and draft back together');
  }finally{await sql('drop trigger qa_display_audit_reject on public.admin_change_audit; drop function private.qa_display_audit_reject();');}
  const id=randomUUID(),first=await publish(owner,0,1,id);check(first.ok&&first.data.revision===1,'First real display publication');
  const after=await snapshot(),retry=await publish(owner,0,1,id);
  check(retry.ok&&retry.data.alreadyApplied===true&&await snapshot()===after,'Display publication retry is idempotent');
  check(await publicValue()===false,'Published display projection changes atomically');
  const anonConfig=await rpc('site_appearance_published',null,{});
  check(anonConfig.ok&&anonConfig.data.some(row=>row.key===target&&row.revision===1)&&
    anonConfig.data.every(row=>Object.keys(row).sort().join(',')==='config,key,revision'),
    'Anonymous configuration exposes only published registered presentation values');
  pass('Display publication has real conflict/idempotency semantics and atomic audit plus public projection');

  for(const actor of [owner,operator]){
    const bypass=await rpc('admin_set_listing_display_option',actor,{p_slot:'card-services',p_enabled:true});
    check(bypass.status===409&&bypass.data?.code==='PT409','Old immediate service-icon RPC must not bypass publication');
  }
  const direct=await request('rest/v1/listing_display_options?slot=eq.card-services',{
    token:owner.session.access_token,method:'PATCH',body:{enabled:true}});
  check(!direct.ok&&[401,403].includes(direct.status)&&await publicValue()===false,'Direct projection UPDATE denied');
  for(const actor of [viewer,suspended]){
    const refreshed=await request('auth/v1/token?grant_type=refresh_token',{body:{refresh_token:actor.session.refresh_token}});
    check(refreshed.ok,'Refresh genuine denial actor');actor.session=refreshed.data;
    sensitive.add(actor.session.access_token);sensitive.add(actor.session.refresh_token);
  }
  const aal1=await request('auth/v1/token?grant_type=password',{body:{email:owner.email,password:owner.password}});
  check(aal1.ok,'Fresh genuine AAL1 session for shared display denial');
  sensitive.add(aal1.data.access_token);sensitive.add(aal1.data.refresh_token);
  for(const actor of [viewer,suspended,{session:aal1.data},null]){
    const out=await save(actor,config(true),0,1);
    check(!out.ok&&[401,403].includes(out.status)&&out.data?.code==='42501','New display draft denied to unprivileged/AAL1 actor');
  }
  const other=await request('rest/v1/listing_display_options?select=enabled&slot=eq.listing-water',{method:'GET'});
  check(other.ok&&other.data.length===1,'Existing adjacent display slot available');
  const otherBefore=other.data[0].enabled;
  const retired=await rpc('admin_set_listing_display_option',owner,{p_slot:'listing-water',p_enabled:!otherBefore});
  check(retired.status===409&&retired.data?.code==='PT409','Remaining display controls require reviewed publication');
  pass('Immediate display mutation paths are closed and fresh denial actors remain protected');

  // Ensure this actual synthetic public listing has a real service pill; no
  // renderer/DTO/backend replacement. This changes disposable fixture data only.
  await sql("update public.properties set internet_available=true where id='77777777-7777-4777-8777-777777777777';");
  await page.goto(server.url+'/#admin');await page.reload();
  await expect(page.locator('#adminHost')).toBeVisible({timeout:30000});
  await page.locator('#adminSectionMenu [data-section=icons]').click();
  await expect(page.locator('[data-display-enabled]')).toBeEnabled({timeout:15000});
  await expect(page.locator('[data-display-enabled]')).not.toBeChecked();
  await page.locator('[data-display-enabled]').check();await page.locator('[data-display-save]').click();
  await expect(page.locator('[data-display-status]')).toContainText('Private draft saved');
  check(await publicValue()===false,'Actual UI private save does not alter public display');
  const anonymousReads=new Set();
  const observe=req=>{if(req.headers().authorization!=='Bearer '+key)return;
    if(req.url().includes('/rpc/site_appearance_published'))anonymousReads.add('config');
    if(req.url().includes('/listing_display_options?'))anonymousReads.add('display');};
  page.on('request',observe);
  try{
    await page.locator('[data-display-review]').click();await page.locator('[data-display-reason]').fill('Disposable visible shared display publication');
    await page.locator('[data-display-publish]').click();
    await expect(page.locator('[data-display-status]')).toContainText('verified in public settings');
  }finally{page.off('request',observe);}
  check(anonymousReads.size===2,'Actual UI confirms both contracts anonymously without the admin bearer');
  await page.locator('[data-display-history]').click();await page.locator('[data-display-restore="1"]').click();
  await expect(page.locator('[data-display-status]')).toContainText('Earlier version copied to a private draft');
  check(await publicValue()===true,'Actual UI historical restore stays private until reviewed');
  await page.locator('[data-display-reason]').fill('Disposable visible shared display restore');
  await page.locator('[data-display-publish]').click();
  await expect(page.locator('[data-display-status]')).toContainText('Published revision 3; verified');
  pass('Actual Appearance UI privately saves, anonymously verifies publication and restores through a new reviewed revision');

  const publicContext=await context(),publicPage=await publicContext.newPage();
  async function rendered(value,width){
    await publicPage.setViewportSize({width,height:900});
    await publicPage.goto(server.url+'/#detail/55555555-5555-4555-8555-555555555555');
    await expect(publicPage.locator('.quiet-detail')).toBeVisible();
    await publicPage.evaluate(async()=>{
      await VACANCY_LISTING_OPTIONS.refresh();
      const rows=await VACANCY_BACKEND.activeVacancies();
      const v=rows.find(row=>row.id==='55555555-5555-4555-8555-555555555555');
      if(!v)throw Error('Real public fixture listing unavailable');
      document.querySelector('[data-display-render-proof]')?.remove();
      const sample=document.createElement('section');sample.dataset.displayRenderProof='';
      sample.innerHTML=card(v);document.querySelector('#app').append(sample);
    });
    const pill=publicPage.locator('[data-display-render-proof] .service-card-pill').first();
    await expect(pill).toHaveCount(1);
    if(value)await expect(pill).toBeVisible();else await expect(pill).toBeHidden();
    await expect(publicPage.locator('[data-display-render-proof] .listing-price')).toBeVisible();
  }
  try{
    await rendered(false,1536);await rendered(false,390);
    await page.screenshot({path:artifacts+'/display-draft-desktop.png'});
    await publicPage.locator('[data-display-render-proof]').screenshot({path:artifacts+'/display-public-hidden-mobile.png'});
    current=await state(owner);
    const restored=await rpc('admin_appearance_restore_draft',owner,{p_element_key:target,p_from_revision:2,
      p_expected_draft_version:current.draft?.version||0,p_expected_published_revision:current.published.revision});
    check(restored.ok,'Restore original shared display through reviewed-history draft');
    check((await publish(owner,current.published.revision,restored.data.version)).ok,'Publish original display as new revision');
    await rendered(true,1536);await rendered(true,390);
    await publicPage.locator('[data-display-render-proof]').screenshot({path:artifacts+'/display-public-restored-mobile.png'});
    check(await publicValue()===initial,'Original public display restored without erasing history');
  }finally{await publicContext.close();}
  const history=await rpc('admin_appearance_history',owner,{p_element_key:target});
  check(history.ok&&JSON.stringify(history.data.map(row=>row.revision))==='[4,3,2,1,0]'&&history.data[4].config.all.enabled===initial&&history.data[4].actor_id===null&&history.data[4].published_at===null,'Four immutable display publications retained alongside the actual uncredited initial baseline');
  info.completed=true;info.publications=4;info.publicValueRestored=true;info.actualUi=true;
  info.anonymousConfirmation=true;info.cardRenderer='Actual card(v) with real anonymous joined listing, mounted in isolated proof section';
  info.cardViewports=[1536,390];info.limit='Card-component propagation proof; not a full Find/map journey or native browser zoom';
  pass('Real anonymous card renderer hides/restores service icons on desktop/mobile, preserves prices and retains four revisions');
}
