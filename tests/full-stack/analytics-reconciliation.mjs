// Source port of feature 0a5d4d8 analytics-ingestion.mjs, adapted to canonical counters, QA exclusions and private-helper permissions.
// Genuine disposable GoTrue + REST + original browser collectors, never hosted.
import {randomBytes,randomUUID} from 'node:crypto';
import {expect} from '@playwright/test';
export async function verifyAnalyticsReconciliation(h){
 const {ROOT,sql,rpc,request,owner,operator,viewer,suspended,page,operatorPage,loginUI,browser,server,frontendServer,key,baselineApp,actors,check,pass,evidence,artifacts,sensitive}=h;
 check(process.env.CI==='true'&&process.env.VACANCY_DISPOSABLE_STACK==='1'&&ROOT==='http://127.0.0.1:54321','Exact disposable analytics guard');
 const report=evidence.analyticsReconciliation={completed:false,newCollection:false,retentionChanged:false,upstream:'0a5d4d826277a60131e9a5e301bb9cff7633f722',canonicalBudgetsRetained:true},ids=[],json=async q=>JSON.parse(await sql('select to_jsonb(t) from ('+q.trim().replace(/;$/,'')+') t;'));
 const actor={role:'analytics reconciliation customer',email:'qa-analytics@vacancy.invalid',password:'Qa1!'+randomBytes(24).toString('base64url')};sensitive.add(actor.password);
 const created=await request('auth/v1/admin/users',{admin:true,body:{email:actor.email,password:actor.password,email_confirm:true,app_metadata:{}}});check(created.ok,'Confirmed disposable analytics actor');actor.id=created.data.id;actors.push(actor);
 const login=await request('auth/v1/token?grant_type=password',{body:{email:actor.email,password:actor.password}});check(login.ok,'Genuine analytics password session');actor.session=login.data;sensitive.add(login.data.access_token);sensitive.add(login.data.refresh_token);
 check(JSON.parse(Buffer.from(actor.session.access_token.split('.')[1],'base64url')).aal==='aal1','Ordinary AAL1 customer can record product events');
 for(const [a,p]of [[owner,page],[operator,operatorPage]])a.session=await p.evaluate(async()=>{await VACANCY_BACKEND.currentUser();return VACANCY_BACKEND.session();});
 for(const a of [viewer,suspended]){const out=await request('auth/v1/token?grant_type=refresh_token',{body:{refresh_token:a.session.refresh_token}});check(out.ok,'Refresh genuine analytics actor');a.session=out.data;sensitive.add(out.data.access_token);sensitive.add(out.data.refresh_token);}
 const target=await sql("select id from public.vacancies where status='active' and (expires_at is null or expires_at>now()) limit 1;");check(target,'Actual public listing fixture');
 const snapshot=()=>sql("select md5(jsonb_build_object('events',(select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]'::jsonb) from public.analytics_events e),'budgets',(select coalesce(jsonb_agg(to_jsonb(b) order by bucket),'[]'::jsonb) from private.analytics_ingestion_limits b))::text);");
 const count=()=>sql('select count(*) from public.analytics_events;');
 const event=(version=2,extra={})=>{const id=randomUUID();ids.push(id);return {event_id:id,event_name:'listing_started',visitor_id:randomUUID(),session_id:randomUUID(),journey_id:randomUUID(),route:'create',source:'qa-ingestion',device_class:'desktop',...(version===2?{to_step:0,occurred_at:new Date().toISOString(),journey_mode:'new'}:{step:'location'}),...extra};};
 const send=(a,version,events)=>rpc(version===2?'record_lister_journey_v2':'record_lister_journey',a,{p_events:events});
 const directBefore=await snapshot();
 for(const [a,label]of [[null,'anonymous'],[actor,'customer AAL1'],[owner,'Owner AAL2'],[operator,'Operator AAL2'],[viewer,'nonadmin AAL2'],[suspended,'suspended AAL2']]){
  for(const [method,body]of [['POST',{event_name:'home_viewed',user_id:a?.id||null}],['PATCH',{event_name:'search_used'}],['DELETE',undefined]]){
   const out=await request('rest/v1/analytics_events?event_id=eq.'+randomUUID(),{method,body,token:a?.session?.access_token});check(!out.ok&&[401,403].includes(out.status),'Direct '+label+' '+method+' denied');
  }
 }
 check(await snapshot()===directBefore,'Direct-write probes have zero effects');
 check(await sql("select (not has_sequence_privilege('anon','public.analytics_events_id_seq','usage') and not has_sequence_privilege('authenticated','public.analytics_events_id_seq','usage') and not has_table_privilege('anon','public.analytics_events','truncate') and not has_table_privilege('authenticated','public.analytics_events','trigger'))::text;")==='true','No browser sequence/TRUNCATE/TRIGGER access');
 check(await sql("select bool_and(not has_any_column_privilege(r,'public.analytics_events','INSERT') and not has_any_column_privilege(r,'public.analytics_events','UPDATE') and not has_table_privilege(r,'public.analytics_events','TRUNCATE') and not has_table_privilege(r,'public.analytics_events','TRIGGER') and not has_sequence_privilege(r,'public.analytics_events_id_seq','USAGE,SELECT,UPDATE'))::text from unnest(array['anon','authenticated']) r;")==='true','Both browser roles lack all effective column mutations, destructive table operations and sequence privileges');
 check(await sql("select (count(*)=9 and bool_and(not has_function_privilege('anon',p.oid,'EXECUTE') and not has_function_privilege('authenticated',p.oid,'EXECUTE') and p.proconfig @> array['search_path=\"\"']))::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('analytics_ingest','analytics_batch','analytics_write_v1','analytics_write_v2','analytics_allowed','analytics_excluded_user','analytics_budget','analytics_route','analytics_label');")==='true','All nine private ingestion helpers have empty search paths and no effective browser EXECUTE');
 const hidden=await request('rest/v1/analytics_events',{method:'GET'}),privateRpc=await rpc('analytics_ingest',null,{p_kind:'v2',p_events:[]});check(!hidden.ok&&[401,403].includes(hidden.status)&&privateRpc.status===404,'No anonymous event read or exposed private executor');
 pass('Six genuine actor classes cannot directly insert/update/delete analytics; sequence and destructive privileges are closed and the private gateway is absent from public RPC');
 for(const a of [null,actor])for(const version of [1,2]){
  const rows=[event(version),event(version)];let out=await send(a,version,rows);check(out.ok&&out.data===2,'Compatible original version-'+version+' batch accepted');
  out=await send(a,version,rows);check(out.ok&&out.data===0,'Event-ID retry deduplicated');
  const stored=await json("select user_id,journey_version,event_name,route from public.analytics_events where event_id='"+rows[0].event_id+"';");
  check(stored.user_id===(a?.id||null)&&stored.journey_version===version&&stored.route==='create','Server-derived actor and preserved version');
  const replay=[{...rows[0],event_name:'list_property_clicked'}];check((await send(a,version,replay)).data===0,'First write remains authoritative for repeated event ID');
 }
 const basic=await rpc('track_event',actor,{p_event_name:'home_viewed',p_vacancy_id:null,p_route:'/#home?email=private@example.invalid'});check(basic.ok,'Existing basic tracking RPC');
 const open=await rpc('track_listing_open',actor,{p_vacancy_id:target,p_visitor_id:randomUUID()});check(open.ok,'Existing listing-open RPC');
 pass('Anonymous and genuine ordinary-customer v1/v2 RPCs retain trusted actor/version and event-ID deduplication; legacy basic/open signatures still work');
 const badBefore=await snapshot();
 for(const version of [1,2]){
  const base=event(version);
  const malformed=[null,{},[null],[{...base,user_id:owner.id}],[{...base,created_at:'2000-01-01'}],[{...base,address:'private'}],[{...base,event_name:'rental_completed'}],[{...base,event_id:'bad'}],[{...base,visitor_id:null}],[{...base,duration_ms:-1}],[{...base,duration_ms:3600001}],[{...base,device_class:'raw-user-agent'}],[{...base,error_code:'private exception'}],[{...base,source:{nested:'bad'}}],Array.from({length:21},()=>base),[{...base,campaign:'x'.repeat(33000)}]];
  if(version===2)malformed.push([{...base,to_step:4}],[{...base,occurred_at:'invalid timestamp'}],[{...base,journey_mode:'edit'}],[{...base,route:'https://private.invalid/path'}]);
  for(const payload of malformed){const out=await send(actor,version,payload);check(!out.ok&&out.data?.code==='22023','Malformed existing analytics contract rejected');}
  const valid=event(version),out=await send(actor,version,[valid,{...event(version),event_name:'unregistered'}]);check(!out.ok&&out.data?.code==='22023','Invalid second item fails whole batch');
 }
 check(await snapshot()===badBefore,'All malformed/partial batches leave exact table snapshot unchanged');
 const safe=event(1,{route:'/reset-password?secret=never-store#access_token=never-store',landing_path:'/listings/private-id/private-slug?exact=private',source:'private@example.invalid',medium:'https://private.invalid/?token=secret',campaign:'Safe campaign',referrer_host:'https://private.invalid/path?secret=1'});
 check((await send(actor,1,[safe])).data===1,'Privacy normalization accepts compatible self-reported metadata');
 const sanitized=await json("select route,landing_path,source,medium,campaign,referrer_host from public.analytics_events where event_id='"+safe.event_id+"';");
 check(sanitized.route==='auth'&&sanitized.landing_path==='listing'&&sanitized.source===null&&sanitized.medium===null&&sanitized.campaign==='Safe campaign'&&sanitized.referrer_host===null,'No full routes, query/fragment credentials, email-like labels or full referrer URL persisted');
 const unavailable=await rpc('track_listing_open',null,{p_vacancy_id:randomUUID(),p_visitor_id:null});check(!unavailable.ok&&unavailable.data?.code==='22023','Unknown private/unavailable vacancy is not accepted by definer path');
 pass('Both versions reject unknown fields/names/types, oversized and partial batches atomically; routes/referrers and metadata are bounded without persisting URL secrets');
 const excludedBefore=await snapshot();
 for(const a of [owner,operator,suspended]){
  check((await send(a,1,[event(1)])).data===0&&(await send(a,2,[event(2)])).data===0,'Current admin/suspended identity excluded');
  check((await rpc('track_event',a,{p_event_name:'home_viewed',p_vacancy_id:null,p_route:'#home'})).ok,'Excluded actor basic request remains best-effort success');
  check((await rpc('track_listing_open',a,{p_vacancy_id:target,p_visitor_id:null})).ok,'Excluded actor listing request remains best-effort success');
 }
 check(await snapshot()===excludedBefore,'Exclusions do not persist traffic');
 await sql("update public.profiles set account_status='suspended' where id='"+actor.id+"';");
 const membershipBefore=await snapshot();
 try{check((await send(actor,2,[event(2)])).data===0&&await snapshot()===membershipBefore,'Same genuine JWT observes current suspension');}
 finally{await sql("update public.profiles set account_status='active' where id='"+actor.id+"';");}
 check((await send(actor,2,[event(2)])).data===1,'Same session resumes after current status restoration');
 const banBefore=await snapshot();await sql("update auth.users set banned_until=now()+interval '1 hour' where id='"+actor.id+"';");
 try{check((await send(actor,2,[event(2)])).data===0&&await snapshot()===banBefore,'Unchanged JWT observes current Auth ban without new traffic');}
 finally{await sql("update auth.users set banned_until=null where id='"+actor.id+"';");}
 check((await send(actor,2,[event(2)])).data===1,'Same JWT recovers after ban removal');
 const landlord=actors.find(a=>a.role==='customer publisher');check(landlord?.session?.access_token,'Genuine existing listing-owner session');
 const owned=await json("select v.id,v.expires_at from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where p.owner_id='"+landlord.id+"' and v.status='active' limit 1");
 check(owned?.id,'Owned active listing fixture');
 await sql("update public.vacancies set expires_at=now()-interval '1 day' where id='"+owned.id+"';");
 try{
  for(const a of [null,actor]){const out=await rpc('track_listing_open',a,{p_vacancy_id:owned.id,p_visitor_id:randomUUID()});check(!out.ok&&out.data.code==='22023','Expired nonowned listing rejected');}
  check((await rpc('track_listing_open',landlord,{p_vacancy_id:owned.id,p_visitor_id:randomUUID()})).ok,'Actual owner retains tracking for their own nonpublic listing');
 }finally{await sql("update public.vacancies set expires_at="+(owned.expires_at===null?'null':"'"+owned.expires_at.replaceAll("'","''")+"'::timestamptz")+" where id='"+owned.id+"';");}
 pass('Current profile suspension/Auth ban are observed by the unchanged JWT; public, unavailable and actually owned nonpublic vacancy references follow the guarded contract');
 const ownRead=await request('rest/v1/analytics_events?select=id',{method:'GET',token:actor.session.access_token}),adminRead=await request('rest/v1/analytics_events?select=id&limit=1',{method:'GET',token:owner.session.access_token});
 check(ownRead.ok&&ownRead.data.length===0&&adminRead.ok&&adminRead.data.length===1,'Existing AAL2 admin read retained; customer cannot read rows');
 pass('Current administrators and suspended actors produce no new traffic across all four RPCs; existing protected admin reads remain compatible');

 const contexts=[];let legacyServer;
 try{
  const ui=await loginUI(actor);contexts.push(ui.ctx);const current=ui.page;
  await current.goto(server.url+'/#list/new');await expect(current.locator('#listingHost')).toHaveAttribute('data-mode','create',{timeout:30000});await expect(current.locator('#listingHost .listing-language select')).toBeVisible();
  await current.evaluate(async()=>{await window.VACANCY_LISTER_JOURNEY?.flush();await VACANCY_CONNECTED_JOURNEY.flush();});
  const currentVisitor=await current.evaluate(()=>JSON.parse(localStorage.getItem('vacancy-connected-visitor')).id);
  await expect.poll(()=>sql("select count(*) from public.analytics_events where visitor_id='"+currentVisitor+"' and journey_version=2 and user_id='"+actor.id+"';")).not.toBe('0');
  legacyServer=await frontendServer(key,{apiOrigin:ROOT,appRoot:baselineApp});
  const legacyCtx=await browser.newContext({viewport:{width:1536,height:1024},serviceWorkers:'block'});contexts.push(legacyCtx);
  await legacyCtx.route('**/*',route=>[legacyServer.url,ROOT].includes(new URL(route.request().url()).origin)?route.continue():route.abort());
  const old=await legacyCtx.newPage();await old.goto(legacyServer.url+'/#list/new');await expect(old.locator('#listingHost')).toHaveAttribute('data-mode','create',{timeout:30000});await expect(old.locator('#listingHost .listing-language select')).toBeVisible();
  await old.evaluate(async()=>{await window.VACANCY_LISTER_JOURNEY?.flush();await VACANCY_CONNECTED_JOURNEY.flush();});
  const oldVisitor=await old.evaluate(()=>JSON.parse(localStorage.getItem('vacancy-connected-visitor')).id);
  await expect.poll(()=>sql("select count(*) from public.analytics_events where visitor_id='"+oldVisitor+"' and journey_version=2 and user_id is null;")).not.toBe('0');
  for(const p of [current,old])await expect(p.locator('#listingHost .listing-language select')).toBeVisible();
  report.currentBrowserCollector=true;report.deployedBrowserCollector=true;
  pass('Actual current customer and pinned deployed guest Create pages send accepted version-2 collector traffic through unchanged RPC signatures and retain usable language controls');
 }finally{for(const ctx of contexts)await ctx.close();await legacyServer?.close();}
 const busyBefore=await snapshot(),holding=sql("begin;select pg_advisory_xact_lock(hashtextextended('vacancy:analytics-ingestion:v1',0));select pg_sleep(2);commit;");
 try{
  await expect.poll(()=>sql("select pg_try_advisory_xact_lock(hashtextextended('vacancy:analytics-ingestion:v1',0))::text;")).toBe('false');
  const busy=await send(actor,2,[event(2)]);check(busy.status===429&&busy.data?.code==='PT429'&&/busy/i.test(busy.data.message),'Real contended transaction fails fast HTTP429');
 }finally{await holding;}
 check(await snapshot()===busyBefore,'Busy rejection has no analytics state effects');
 pass('A genuinely held transaction lock returns HTTP429 without queueing or partial writes');
 const duplicate=event(2);check((await send(actor,2,[duplicate])).data===1,'Quota retry fixture');
 const beforeMinute=async()=>{const seconds=new Date().getUTCSeconds();if(seconds>52)await new Promise(r=>setTimeout(r,(61-seconds)*1000));};
 const seed=async(global,principal,bucket)=>sql("insert into private.analytics_ingestion_limits(bucket,window_start,used) values('global',date_trunc('minute',clock_timestamp()),"+global+"),('"+bucket+"',date_trunc('minute',clock_timestamp()),"+principal+") on conflict(bucket) do update set window_start=excluded.window_start,used=excluded.used;");
 const used=bucket=>sql("select used from private.analytics_ingestion_limits where bucket='"+bucket+"' and window_start=date_trunc('minute',clock_timestamp());");
 await beforeMinute();await seed(0,599,'user:'+actor.id);
 const actorFullBefore=await snapshot(),over=await send(actor,2,[event(2),event(2)]);check(over.status===429&&over.data?.code==='PT429'&&await snapshot()===actorFullBefore,'Entire over-budget batch and counters roll back atomically');
 const race=await Promise.all([send(actor,2,[event(2)]),send(actor,2,[event(2)])]);
 check(race.filter(x=>x.ok&&x.data===1).length===1&&race.filter(x=>x.status===429&&x.data?.code==='PT429').length===1&&await used('user:'+actor.id)==='600','Concurrent original principal boundary accepts exactly one event');
 const full=await snapshot();check((await send(actor,2,[duplicate])).data===0&&await snapshot()===full,'Stored event-ID acknowledgement retry at quota changes no rows or counters');
 pass('Genuine principal race respects canonical 600/minute budget; full rejected batches roll back rows/counters and stored event-ID retries at quota cost zero');
 await beforeMinute();await seed(5999,0,'anonymous');
 const globalSnap=await snapshot(),globalOver=await send(null,2,[event(2),event(2)]);check(globalOver.status===429&&await snapshot()===globalSnap,'Global budget rejects full batch without counter effects');
 const globalRace=await Promise.all([send(null,2,[event(2)]),send(null,2,[event(2)])]);
 check(globalRace.filter(x=>x.ok&&x.data===1).length===1&&globalRace.filter(x=>x.status===429).length===1&&await used('global')==='6000','Global race permits exactly one final event');
 pass('Canonical global 6000/minute counter cannot be bypassed by anonymous identifier rotation under a genuine request race');
 await beforeMinute();await seed(0,999,'anonymous');
 const anonymousRace=await Promise.all([send(null,2,[event(2)]),send(null,2,[event(2)])]);
 check(anonymousRace.filter(x=>x.ok&&x.data===1).length===1&&anonymousRace.filter(x=>x.status===429).length===1&&await used('anonymous')==='1000','Shared anonymous race ignores rotated visitor/session identifiers');
 await seed(0,0,'anonymous');await seed(0,0,'user:'+actor.id);
 pass('Shared anonymous 1000/minute boundary stays atomic and fixture counters are restored for subsequent independent checks');
 const range={p_from:new Date(Date.now()-86400000).toISOString(),p_to:new Date(Date.now()+60000).toISOString()},beforeRead=await snapshot();
 for(const name of ['admin_connected_journeys','admin_lister_marketing']){const out=await rpc(name,owner,range);check(out.ok&&out.data,'Existing protected report remains functional after write hardening');}
 await page.locator('#adminSectionMenu [data-section=marketing]').click();await expect(page.locator('.console-journey .journey-freshness')).toContainText('Report generated');await expect(page.locator('.console-journey [role=alert]')).toHaveCount(0);
 await page.screenshot({path:artifacts+'/analytics-existing-report-desktop.png'});
 check(await snapshot()===beforeRead,'Existing reports do not write events');
 report.completed=true;report.directWriteDenials=18;report.accountEventsPerMinute=600;report.globalEventsPerMinute=6000;report.sharedAnonymousEventsPerMinute=1000;report.currentBrowserCollector=true;report.deployedBrowserCollector=true;report.security='Real customer/anonymous RPCs, trusted actor, direct-write denials, atomic validation and real lock/budget races';
 pass('Existing protected connected/legacy reports and the real Marketing screen render after ingestion hardening; no new collection, business mutation or retention change');
}
