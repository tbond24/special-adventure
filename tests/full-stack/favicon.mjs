// Real Auth/PostgREST/browser acceptance in the existing disposable stack only.
import {randomUUID,createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {readFile,writeFile} from 'node:fs/promises';
import {expect} from '@playwright/test';
const K='site/favicon',FILE='20261015191148_admin_favicon_reviewed_publication.sql';
function crc32(data){let crc=0xffffffff;for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1;}return (crc^0xffffffff)>>>0;}
function png(colour,size=64,noise=false){
 const chunk=(type,data)=>{const name=Buffer.from(type),head=Buffer.alloc(4),tail=Buffer.alloc(4);head.writeUInt32BE(data.length);tail.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([head,name,data,tail]);};
 const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 const rows=Buffer.alloc((size*4+1)*size);let seed=87341;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const off=y*(size*4+1)+1+x*4;for(let c=0;c<3;c++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;rows[off+c]=noise?seed&255:colour[c];}rows[off+3]=255;}
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
const url=buffer=>'data:image/png;base64,'+buffer.toString('base64');
const current=url(png([35,91,190])),earlier=url(png([235,101,42]));
const digest=value=>value===null?null:createHash('sha256').update(Buffer.from(value.slice(22),'base64')).digest('hex');
function guard(ROOT){if(process.env.CI!=='true'||process.env.VACANCY_DISPOSABLE_STACK!=='1'||ROOT!=='http://127.0.0.1:54321')throw Error('Disposable favicon checks only');}
export async function prepareFaviconReplay(){
 guard('http://127.0.0.1:54321');if(process.platform!=='linux')throw Error('Linux disposable only');
 const {stackDir,artifacts}=await import('./prepare.mjs'),source=await readFile(new URL('../../supabase/migrations/'+FILE,import.meta.url),'utf8');
 const target=stackDir+'/supabase/migrations/'+FILE;if(await readFile(target,'utf8')!==source)throw Error('Unexpected favicon migration copy');
 const fixture="-- Disposable synthetic earlier/current favicon pair, not hosted data.\nupdate public.site_favicon set png='"+current+"',previous_png='"+earlier+"',revision=2 where id;\n";
 const replay=fixture+source;await writeFile(target,replay);
 const manifestPath=artifacts+'/migration-manifest.json',manifest=JSON.parse(await readFile(manifestPath,'utf8')),row=manifest.find(x=>x.file===FILE);
 if(!row||row.sourceSha256!==createHash('sha256').update(source).digest('hex'))throw Error('Favicon replay manifest mismatch');
 row.replaySha256=createHash('sha256').update(replay).digest('hex');
 row.syntheticPrerequisite='Two valid synthetic PNGs and legacy revision 2 before unchanged source DDL; verifies both captured legacy states';
 await writeFile(manifestPath,JSON.stringify(manifest,null,2));
}
export async function verifyFaviconDefaultSeed({ROOT,sql,check,pass,evidence}){
 guard(ROOT);
 const source=await readFile(new URL('../../supabase/migrations/'+FILE,import.meta.url),'utf8');
 const seed=source.split('-- FAVICON_SEED_BEGIN\n')[1]?.split('-- FAVICON_SEED_END')[0];
 check(seed&&seed.trim().startsWith('insert into public.admin_appearance_current'),'Exact source seed anchors required');
 const snapshot=()=>sql("select jsonb_build_object('public',(select to_jsonb(f) from public.site_favicon f where id),'editor',(select to_jsonb(c) from public.admin_appearance_current c where element_key='"+K+"'));");
 const before=await snapshot();
 await sql("do $default_seed$ begin begin delete from public.admin_appearance_current where element_key='site/favicon';update public.site_favicon set png=null,previous_png=null,revision=0 where id;"+seed+
 "if not exists(select 1 from public.admin_appearance_current where element_key='site/favicon' and revision=0 and favicon_revision=0 and config=jsonb_build_object('png',null) and initial_config=config and favicon_initial_previous is null) then raise exception 'UNSAFE: default favicon seed mismatch';end if;raise exception 'Expected disposable rollback' using errcode='P7001';exception when sqlstate 'P7001' then null;end;end $default_seed$;");
 check(await snapshot()===before,'Default seed probe restores original fixture exactly');
 evidence.faviconDefaultSeed={exactSourceInsert:true,defaultNullRevisionZero:true,rolledBack:true};
 pass('Exact source seed preserves null/default revision-zero favicon without inventing earlier history; probe rolls back completely');
}
export async function verifyLegacyFaviconGate({baselineAdmin,sql,check,pass}){
 const before=await sql('select to_jsonb(f) from public.site_favicon f where id;');
 await baselineAdmin.locator('#adminSectionMenu [data-section=icons]').click();
 const panel=baselineAdmin.locator('[data-favicon-editor]');
 await expect(panel.locator('[role=status]')).toHaveText('Current favicon loaded');
 await panel.locator('input[type=file]').setInputFiles({name:'legacy-synthetic.png',mimeType:'image/png',buffer:png([83,148,77])});
 await expect(panel.locator('[data-favicon-save]')).toBeEnabled();
 await panel.locator('[data-favicon-save]').click();
 await expect(panel.locator('[role=status]')).toContainText('Reload the admin page');
 baselineAdmin.once('dialog',d=>d.accept());
 await panel.locator('[data-favicon-restore]').click();
 await expect(panel.locator('[role=status]')).toContainText('Reload the admin page');
 check(await sql('select to_jsonb(f) from public.site_favicon f where id;')===before,'Cached favicon writes and restore cannot mutate public state');
 pass('Actual pinned old admin favicon save and restore fail closed with reload guidance and no public mutation');
}
export async function verifyFavicon({ROOT,sql,rpc,request,owner,operator,viewer,suspended,page,operatorPage,context,server,check,pass,evidence,artifacts,sensitive}){
 guard(ROOT);evidence.favicon={completed:false,legacyInitialRevision:2};
 const refresh=async(actor,p)=>{actor.session=await p.evaluate(async()=>{await VACANCY_BACKEND.currentUser();return VACANCY_BACKEND.session();});};
 await refresh(owner,page);await refresh(operator,operatorPage);
 for(const actor of [viewer,suspended]){const out=await request('auth/v1/token?grant_type=refresh_token',{body:{refresh_token:actor.session.refresh_token}});check(out.ok,'Real favicon denial actor refresh');actor.session=out.data;sensitive.add(out.data.access_token);sensitive.add(out.data.refresh_token);}
 const login=await request('auth/v1/token?grant_type=password',{body:{email:owner.email,password:owner.password}});
 check(login.ok&&JSON.parse(Buffer.from(login.data.access_token.split('.')[1],'base64url')).aal==='aal1','Actual fresh AAL1 Owner');sensitive.add(login.data.access_token);sensitive.add(login.data.refresh_token);
 const aal1={session:login.data},call=(name,actor,args={})=>rpc('admin_appearance_'+name,actor,{p_element_key:K,...args});
 const get=async actor=>{const out=await call('state',actor);check(out.ok,'Favicon state HTTP '+out.status);return out.data;};
 const save=(actor,config,version,revision)=>call('save_draft',actor,{p_config:config,p_expected_draft_version:version,p_expected_published_revision:revision});
 const pub=(actor,revision,version,id=randomUUID(),reason='Isolated favicon review')=>call('publish',actor,{p_expected_published_revision:revision,p_expected_draft_version:version,p_reason:reason,p_request_id:id});
 const restore=(actor,from,version,revision)=>call('restore_draft',actor,{p_from_revision:from,p_expected_draft_version:version,p_expected_published_revision:revision});
 const snap=()=>sql("select jsonb_build_object('public',(select to_jsonb(f) from public.site_favicon f where id),'current',(select to_jsonb(c) from public.admin_appearance_current c where element_key='"+K+"'),'drafts',(select jsonb_agg(to_jsonb(d) order by actor_id) from public.admin_appearance_drafts d where element_key='"+K+"'),'history',(select jsonb_agg(to_jsonb(r) order by revision) from public.admin_appearance_revisions r where element_key='"+K+"'),'audit',(select jsonb_agg(to_jsonb(a) order by id) from public.admin_change_audit a where target_key='"+K+"'));");
 const before=await snap();
 const deny=(out,label)=>check(!out.ok&&[401,403].includes(out.status)&&out.data?.code==='42501',label+' permission denial HTTP '+out.status);
 for(const [actor,label] of [[null,'anonymous'],[aal1,'AAL1 Owner'],[viewer,'AAL2 nonadmin'],[suspended,'AAL2 suspended']]){
  deny(await call('state',actor),label+' state');deny(await call('history',actor),label+' history');
  deny(await save(actor,{png:null},0,0),label+' draft');deny(await pub(actor,0,1),label+' publish');
  deny(await restore(actor,0,0,0),label+' restore');
  deny(await rpc('admin_set_favicon',actor,{p_png:null,p_revision:2,p_restore:false}),label+' legacy save');
 }
 for(const actor of [null,aal1,viewer,suspended,operator,owner]){
  for(const [method,body] of [['POST',{id:false,png:null}],['PATCH',{png:null}],['DELETE',undefined]]){
   const out=await request('rest/v1/site_favicon?id=eq.true',{method,body,token:actor?.session?.access_token});check(!out.ok&&[401,403].includes(out.status),'Direct favicon '+method+' denied');
  }
  const hidden=await request('rest/v1/site_favicon?select=previous_png&id=eq.true',{method:'GET',token:actor?.session?.access_token});check(!hidden.ok&&[401,403].includes(hidden.status),'Previous favicon column stays private');
 }
 check(await snap()===before,'All denied favicon operations unchanged');
 pass('Real anonymous/AAL1/nonadmin/suspended favicon RPCs and 18 direct writes are denied; previous column stays private for all six actors');
 const initial=await get(owner),hist=await call('history',owner);
 check(initial.published.revision===0&&initial.published.config.png===current&&initial.draft===null,'Current legacy PNG captured at editor zero');
 check(hist.ok&&hist.data.length===2&&hist.data.find(x=>x.revision===-1)?.config.png===earlier&&hist.data.find(x=>x.revision===0)?.config.png===current,'Both real legacy states preserved without invented publications');
 for(const actor of [owner,operator]){
  const out=await rpc('admin_set_favicon',actor,{p_png:null,p_revision:2,p_restore:true});check(out.status===409&&out.data?.code==='PT409','AAL2 legacy write/restore closed');
 }
 const malformed=[{},null,[],{png:42},{png:'https://getvacancy.site/favicon.ico'},{png:'data:image/svg+xml;base64,PHN2Zy8+'},{png:url(png([1,2,3],32))},{png:'data:image/png;base64,'+'A'.repeat(40001)},{png:current,actor_id:owner.id}];
 for(const config of malformed){const out=await save(owner,config,0,0);check(!out.ok&&out.data?.code==='22023','Malformed favicon rejected');}
 check(await snap()===before,'Malformed and legacy calls do not change any favicon state');
 pass('Both earlier/current legacy PNGs are captured; old AAL2 save/restore bypasses and nine invalid configurations are rejected atomically');
 check((await save(operator,{png:url(png([60,150,80]))},0,0)).ok,'Operator favicon private save');
 check((await get(owner)).draft===null,'Favicon draft isolation');
 deny(await pub(operator,0,1),'Operator publish');deny(await restore(operator,-1,1,0),'Operator restore');
 check((await call('history',operator)).ok,'Operator published history read');
 const beforeDraft=await snap();
 await sql("create function private.qa_reject_favicon_draft() returns trigger language plpgsql set search_path='' as $$ begin if new.target_key='site/favicon' and new.action='appearance_draft_saved' then raise exception 'QA favicon draft audit rejection' using errcode='23514';end if;return new;end $$;create trigger qa_reject_favicon_draft before insert on public.admin_change_audit for each row execute function private.qa_reject_favicon_draft();");
 try{const out=await save(owner,{png:earlier},0,0);check(!out.ok&&out.data?.code==='23514'&&await snap()===beforeDraft,'Failed draft audit rolls back draft and hash summary');}
 finally{await sql('drop trigger qa_reject_favicon_draft on public.admin_change_audit;drop function private.qa_reject_favicon_draft();');}
 pass('Real AAL2 Operator drafts stay private; Owner-only publication/restore and atomic draft audit failure are enforced');
 await page.reload();await expect(page.locator('#adminHost')).toBeVisible({timeout:30000});
 await page.locator('#adminSectionMenu [data-section=icons]').click();
 const panel=page.locator('[data-favicon-editor]'),status=panel.locator('[data-favicon-status]');
 await expect(status).toHaveText('Published favicon version 0 loaded.');
 const tabHash=async p=>digest(await p.locator('link[data-site-favicon]').getAttribute('href').catch(()=>null));
 await expect.poll(()=>tabHash(page)).toBe(digest(current));
 await panel.locator('[data-favicon-file]').setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});
 await expect(status).toContainText('supported image formats');
 check((await get(owner)).draft===null,'Rejected upload does not persist a draft');
 await panel.locator('[data-favicon-file]').setInputFiles({name:'large.png',mimeType:'image/png',buffer:Buffer.alloc(10*1024*1024+1)});
 await expect(status).toContainText('smaller than 10 MB');
 const noisy=png([0,0,0],64,true);
 await panel.locator('[data-favicon-file]').setInputFiles({name:'synthetic-noise.png',mimeType:'image/png',buffer:noisy});
 await expect(status).toHaveText('Private preview only. Save the draft before review.');
 await expect(panel.locator('[data-favicon-review]')).toBeDisabled();
 check(await tabHash(page)===digest(current),'Private PNG preview never changes the browser tab icon');
 await page.route('**/rest/v1/rpc/admin_appearance_save_draft',route=>route.abort());
 await panel.locator('[data-favicon-draft]').click();await expect(status).toContainText(/fetch|network/i);
 await page.unroute('**/rest/v1/rpc/admin_appearance_save_draft');
 await panel.locator('[data-favicon-draft]').click();
 await expect(status).toHaveText('Private favicon draft saved. Public favicon is unchanged.');
 let own=await get(owner),selected=own.draft.config.png;
 check(selected.length>4096&&own.draft.version===1,'Valid PNG larger than style-config limit persists');
 check(await tabHash(page)===digest(current),'Saving private PNG does not change tab icon');
 const stale=await save(owner,{png:null},0,0);check(stale.status===409&&stale.data?.code==='PT409','Stale favicon draft conflicts');
 pass('Visible upload MIME/size rejection, real noisy-PNG conversion, failed save retry and private persistence leave published tab icon unchanged');
 const auditSummary=JSON.parse(await sql("select diff from public.admin_change_audit where target_key='site/favicon' and actor_id='"+owner.id+"' and action='appearance_draft_saved' order by id desc limit 1;"));
 check(auditSummary.after.pngSha256===digest(selected)&&auditSummary.after.pngBytes>0&&!JSON.stringify(auditSummary).includes('data:image'),'Favicon audit contains exact hash and byte count without image body');
 const beforePublish=await snap();
 await sql("create function private.qa_reject_favicon_publish() returns trigger language plpgsql set search_path='' as $$ begin if new.target_key='site/favicon' and new.action='appearance_published' then raise exception 'QA favicon publication audit rejection' using errcode='23514';end if;return new;end $$;create trigger qa_reject_favicon_publish before insert on public.admin_change_audit for each row execute function private.qa_reject_favicon_publish();");
 try{const out=await pub(owner,0,1);check(!out.ok&&out.data?.code==='23514'&&await snap()===beforePublish,'Publication audit rejects and rolls back public PNG, previous PNG, timestamp, both revisions, draft and history');}
 finally{await sql('drop trigger qa_reject_favicon_publish on public.admin_change_audit;drop function private.qa_reject_favicon_publish();');}
 await sql('update public.site_favicon set revision=3 where id;');
 const outside=await snap();
 try{const out=await pub(owner,0,1);check(out.status===409&&out.data?.code==='PT409'&&await snap()===outside,'Unexpected legacy public revision conflicts rather than overwriting');}
 finally{await sql('update public.site_favicon set revision=2 where id;');}
 check(await snap()===beforePublish,'Out-of-band revision fixture restored exactly');
 pass('Hash-only audit is attributable; forced publication audit failure rolls back every effect and an out-of-band legacy revision is refused');
 await panel.locator('[data-favicon-review]').click();
 await expect(panel.locator('[data-favicon-publish]')).toBeDisabled();
 await panel.locator('[data-favicon-reason]').fill('Isolated reviewed noisy PNG');
 await expect(panel.locator('[data-favicon-publish]')).toBeDisabled();
 await panel.locator('[data-favicon-confirm]').check();
 await page.screenshot({path:artifacts+'/favicon-review-desktop.png'});
 let committed;
 await page.route('**/rest/v1/rpc/admin_appearance_publish',async route=>{
  committed=route.request().postDataJSON();const response=await route.fetch();check(response.ok(),'Lost acknowledgement follows actual committed favicon publish');await response.dispose();await route.abort();
 });
 await panel.locator('[data-favicon-publish]').click();await expect(status).toContainText(/fetch|network/i);
 check((await get(owner)).published.revision===1,'Real publication committed before lost response');
 await page.unroute('**/rest/v1/rpc/admin_appearance_publish');
 await panel.locator('[data-favicon-publish]').click();await expect(status).toHaveText('Favicon published.');
 check(await sql("select revision from public.site_favicon where id;")==='3','Legacy public revision increments once');
 check(await sql("select count(*) from public.admin_change_audit where target_key='site/favicon' and action='appearance_published' and request_id='"+committed.p_request_id+"';")==='1','Exactly one publication audit after retry');
 const reused=await pub(owner,0,1,committed.p_request_id,'Different idempotency payload');check(reused.status===409&&reused.data?.code==='23505','Changed publication request reuse refused');
 check((await save(operator,{png:null},1,0)).status===409,'Other actor stale published revision conflicts');
 pass('Visible review needs reason/confirmation; a committed favicon publication with lost response retries exactly once with one public revision/audit');
 const publicCtx=await context(),publicPage=await publicCtx.newPage();
 try{
  await publicPage.goto(server.url+'/#detail/55555555-5555-4555-8555-555555555555');
  await expect(publicPage.locator('.quiet-intro h1')).toHaveText('Synthetic integration room');
  await expect.poll(()=>tabHash(publicPage)).toBe(digest(selected));
  for(const width of [1536,390]){
   await publicPage.setViewportSize({width,height:width===390?844:1024});await publicPage.reload();
   await expect.poll(()=>tabHash(publicPage)).toBe(digest(selected));
   check(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Favicon public change preserves layout');
  }
  const published=await request('rest/v1/site_favicon?select=png,revision&id=eq.true',{method:'GET'});
  check(published.ok&&digest(published.data[0].png)===digest(selected)&&published.data[0].revision===3,'Anonymous old table contract receives actual publication');
  pass('Actual anonymous desktop/mobile browser tab links and unchanged public read API receive the reviewed PNG');
  await panel.getByText('Published favicon history',{exact:true}).click();
  await panel.locator('[data-favicon-restore="-1"]').click();
  await expect(status).toContainText('Historical favicon copied');
  check((await get(owner)).draft.config.png===earlier,'Original earlier favicon survives first new publication');
  check(await tabHash(page)===digest(selected),'Historical restore remains private');
  await panel.locator('[data-favicon-review]').click();await panel.locator('[data-favicon-reason]').fill('Restore captured earlier favicon');
  await panel.locator('[data-favicon-confirm]').check();await panel.locator('[data-favicon-publish]').click();
  await expect(status).toHaveText('Favicon published.');
  await publicPage.reload();await expect.poll(()=>tabHash(publicPage)).toBe(digest(earlier));
  pass('Captured earlier legacy favicon restores through a reviewed private draft and new publication, never rewriting history');
  await panel.locator('[data-favicon-default]').click();
  await expect(panel.locator('[data-favicon-picture=draft] p')).toBeVisible();
  await panel.locator('[data-favicon-draft]').click();await expect(status).toContainText('Private favicon draft saved');
  await panel.locator('[data-favicon-review]').click();await panel.locator('[data-favicon-reason]').fill('Restore the default browser icon');
  await panel.locator('[data-favicon-confirm]').check();await panel.locator('[data-favicon-publish]').click();await expect(status).toHaveText('Favicon published.');
  await publicPage.reload();await expect(publicPage.locator('link[data-site-favicon]')).toHaveCount(0);
  own=await get(owner);check(own.published.revision===3&&own.published.config.png===null,'Null/default publication actual server state');
  check((await save(owner,{png:null},0,3)).ok,'Unchanged default private draft saves');
  const unchanged=await snap(),noChange=await pub(owner,3,1);
  check(!noChange.ok&&noChange.data?.code==='22023'&&await snap()===unchanged,'No-op publication is refused atomically');
  await panel.locator('[data-favicon-reload]').click();await expect(status).toContainText('private favicon draft is loaded');
  await expect(panel.locator('[data-favicon-review]')).toBeDisabled();
  await panel.locator('[data-favicon-restore="0"]').click();await expect(status).toContainText('Historical favicon copied');
  await panel.locator('[data-favicon-review]').click();await panel.locator('[data-favicon-reason]').fill('Restore exact initial favicon after default');
  await panel.locator('[data-favicon-confirm]').check();await panel.locator('[data-favicon-publish]').click();await expect(status).toHaveText('Favicon published.');
  await publicPage.reload();await expect.poll(()=>tabHash(publicPage)).toBe(digest(current));
  check(await sql('select revision from public.site_favicon where id;')==='6','Legacy revision increases exactly once per four publications');
  const finalHistory=await call('history',owner);
  check(finalHistory.ok&&finalHistory.data.length===6&&finalHistory.data.find(x=>x.revision===-1).config.png===earlier,'Earlier and initial history survive default/restore cycles');
  check((await get(owner)).published.revision===4,'Four new immutable publications');
  pass('Default icon removes the actual browser link, no-op publication is rejected, and reviewed baseline rollback restores exact original PNG with monotonic legacy revisions');
 }finally{await publicCtx.close();}
 const noMobileWrites=await snap();
 await page.setViewportSize({width:390,height:844});await page.reload();
 await expect(page.locator('#adminHost')).toBeVisible({timeout:30000});await expect(panel).toBeVisible();
 await expect(panel.locator('.favicon-mobile-note')).toBeVisible();await expect(panel.locator('.favicon-desktop')).toBeHidden();
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile favicon admin fallback has no overflow');
 await page.screenshot({path:artifacts+'/favicon-admin-mobile.png'});
 await page.setViewportSize({width:1536,height:1024});
 await expect(status).toHaveText('Published favicon version 4 loaded.');
 await expect(panel.locator('[data-favicon-picture=draft] img').first()).toHaveJSProperty('naturalWidth',64);
 check(await snap()===noMobileWrites,'Mobile-first reload and desktop initialization have no favicon writes');
 const audit=JSON.parse(await sql("select jsonb_build_object('count',count(*),'rawImages',count(*) filter(where diff::text like '%data:image%'),'summaries',bool_and(not(diff ? 'after') or (diff->'after') ? 'pngSha256')) from public.admin_change_audit where target_key='site/favicon';"));
 check(audit.count>0&&audit.rawImages===0&&audit.summaries,'All favicon audit entries use bounded image summaries');
 const security=JSON.parse(await sql("select jsonb_build_object('rls',(select bool_and(relrowsecurity) from pg_class where oid in ('public.site_favicon'::regclass,'public.admin_appearance_current'::regclass,'public.admin_appearance_drafts'::regclass,'public.admin_appearance_revisions'::regclass)),'anonExecute',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('validate_favicon_config','project_reviewed_favicon','appearance_audit_config') and has_function_privilege('anon',p.oid,'EXECUTE')),'emptySearchPath',(select bool_and('search_path=\"\"'=any(proconfig)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('validate_favicon_config','project_reviewed_favicon','appearance_audit_config')));"));
 check(security.rls&&security.anonExecute===0&&security.emptySearchPath,'Favicon grants/RLS/helper search paths are pinned');
 Object.assign(evidence.favicon,{completed:true,editorRevision:4,legacyRevision:6,earlierStatePreserved:true,deniedRpcProbes:24,deniedDirectWrites:18,privateColumnDenials:6,audit,security,selectedPngBytes:Buffer.from(selected.slice(22),'base64').length});
 pass('Favicon mobile-first admin expands into real connected desktop state without writes; audit contains no image bodies and security catalog checks pass');
}
