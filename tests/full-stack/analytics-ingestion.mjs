// Genuine disposable GoTrue + REST + original browser collectors, never hosted.
import {randomBytes,randomUUID} from 'node:crypto';
import {expect} from '@playwright/test';
export async function verifyAnalyticsIngestion(h){
 const {ROOT,sql,rpc,request,owner,operator,viewer,suspended,page,operatorPage,loginUI,browser,server,baselineServer,actors,check,pass,evidence,artifacts,sensitive}=h;
 check(process.env.CI==='true'&&process.env.VACANCY_DISPOSABLE_STACK==='1'&&ROOT==='http://127.0.0.1:54321','Exact disposable analytics guard');
 const report=evidence.analyticsIngestion={completed:false,newCollection:false,retentionChanged:false},ids=[],json=async q=>JSON.parse(await sql('select to_jsonb(t) from ('+q.trim().replace(/;$/,'')+') t;'));
 const actor={role:'analytics customer',email:'qa-analytics@vacancy.invalid',password:'Qa1!'+randomBytes(24).toString('base64url')};sensitive.add(actor.password);
 const created=await request('auth/v1/admin/users',{admin:true,body:{email:actor.email,password:actor.password,email_confirm:true,app_metadata:{vacancy_qa_scope:'disposable-ci'}}});check(created.ok,'Confirmed disposable analytics actor');actor.id=created.data.id;actors.push(actor);
 const login=await request('auth/v1/token?grant_type=password',{body:{email:actor.email,password:actor.password}});check(login.ok,'Genuine analytics password session');actor.session=login.data;sensitive.add(login.data.access_token);sensitive.add(login.data.refresh_token);
 check(JSON.parse(Buffer.from(actor.session.access_token.split('.')[1],'base64url')).aal==='aal1','Ordinary AAL1 customer can record product events');
 for(const [a,p]of [[owner,page],[operator,operatorPage]])a.session=await p.evaluate(async()=>{await VACANCY_BACKEND.currentUser();return VACANCY_BACKEND.session();});
 for(const a of [viewer,suspended]){const out=await request('auth/v1/token?grant_type=refresh_token',{body:{refresh_token:a.session.refresh_token}});check(out.ok,'Refresh genuine analytics actor');a.session=out.data;sensitive.add(out.data.access_token);sensitive.add(out.data.refresh_token);}
 const target='55555555-5555-4555-8555-555555555555',snapshot=()=>sql("select md5(coalesce(jsonb_agg(to_jsonb(e) order by id),'[]'::jsonb)::text) from public.analytics_events e;");
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
 const ownRead=await request('rest/v1/analytics_events?select=id',{method:'GET',token:actor.session.access_token}),adminRead=await request('rest/v1/analytics_events?select=id&limit=1',{method:'GET',token:owner.session.access_token});
 check(ownRead.ok&&ownRead.data.length===0&&adminRead.ok&&adminRead.data.length===1,'Existing AAL2 admin read retained; customer cannot read rows');
 pass('Current administrators and suspended actors produce no new traffic across all four RPCs; existing protected admin reads remain compatible');

 const contexts=[];
 try{
  const ui=await loginUI(actor);contexts.push(ui.ctx);const current=ui.page;
  await current.goto(server.url+'/#list/new');await expect(current.locator('#listingForm')).toBeVisible({timeout:30000});
  await current.evaluate(async()=>{await window.VACANCY_LISTER_JOURNEY?.flush();await VACANCY_CONNECTED_JOURNEY.flush();});
  const currentVisitor=await current.evaluate(()=>JSON.parse(localStorage.getItem('vacancy-connected-visitor')).id);
  await expect.poll(()=>sql("select count(*) from public.analytics_events where visitor_id='"+currentVisitor+"' and journey_version=2 and user_id='"+actor.id+"';")).not.toBe('0');
  const legacyCtx=await browser.newContext({viewport:{width:1536,height:1024},serviceWorkers:'block'});contexts.push(legacyCtx);
  await legacyCtx.route('**/*',route=>[baselineServer.url,ROOT].includes(new URL(route.request().url()).origin)?route.continue():route.abort());
  const old=await legacyCtx.newPage();await old.goto(baselineServer.url+'/#list/new');await expect(old.locator('#listingForm')).toBeVisible({timeout:30000});
  await old.evaluate(async()=>{await window.VACANCY_LISTER_JOURNEY?.flush();await VACANCY_CONNECTED_JOURNEY.flush();});
  const oldVisitor=await old.evaluate(()=>JSON.parse(localStorage.getItem('vacancy-connected-visitor')).id);
  await expect.poll(()=>sql("select count(*) from public.analytics_events where visitor_id='"+oldVisitor+"' and journey_version=2 and user_id is null;")).not.toBe('0');
  for(const p of [current,old])await expect(p.locator('#listingHost .listing-language select')).toBeVisible();
  report.currentBrowserCollector=true;report.deployedBrowserCollector=true;
  pass('Actual current customer and pinned deployed guest Create pages send accepted version-2 collector traffic through unchanged RPC signatures and retain usable language controls');
 }finally{for(const ctx of contexts)await ctx.close();}
 const busyBefore=await snapshot(),holding=sql("begin;select pg_advisory_xact_lock(hashtextextended('vacancy:analytics-ingestion:v1',0));select pg_sleep(2);commit;");
 try{
  await expect.poll(()=>sql("select pg_try_advisory_xact_lock(hashtextextended('vacancy:analytics-ingestion:v1',0))::text;")).toBe('false');
  const busy=await send(actor,2,[event(2)]);check(busy.status===429&&busy.data?.code==='PT429'&&/busy/i.test(busy.data.message),'Real contended transaction fails fast HTTP429');
 }finally{await holding;}
 check(await snapshot()===busyBefore,'Busy rejection has no analytics state effects');
 pass('A genuinely held transaction lock returns HTTP429 without queueing or partial writes');
 const duplicate=event(2);check((await send(actor,2,[duplicate])).data===1,'Quota retry fixture');
 const actorRecent=()=>sql("select count(*) from public.analytics_events where user_id='"+actor.id+"' and created_at>now()-interval '1 minute';");
 const ownBefore=Number(await actorRecent());check(ownBefore<239,'Controlled account budget fixture');
 await sql("insert into public.analytics_events(user_id,event_name) select '"+actor.id+"','home_viewed' from generate_series(1,"+(239-ownBefore)+");");
 const actorFullBefore=await snapshot(),over=await send(actor,2,[event(2),event(2)]);check(over.status===429&&over.data?.code==='PT429'&&await snapshot()===actorFullBefore,'Entire over-budget batch is rejected atomically');
 const race=await Promise.all([send(actor,2,[event(2)]),send(actor,2,[event(2)])]);
 check(race.filter(x=>x.ok&&x.data===1).length===1&&race.filter(x=>x.status===429&&x.data?.code==='PT429').length===1&&await actorRecent()==='240','Concurrent account boundary accepts exactly one event');
 check((await send(actor,2,[duplicate])).ok&&(await send(actor,2,[duplicate])).data===0&&await actorRecent()==='240','Acknowledgement retry at quota deduplicates without spending another event');
 pass('Real concurrent account-budget boundary permits exactly 240/minute; rejected batches are atomic and duplicate acknowledgement retries cost no new event');
 const globalRecent=()=>sql("select count(*) from public.analytics_events where created_at>now()-interval '1 minute';"),globalBefore=Number(await globalRecent());check(globalBefore<1199,'Controlled global budget fixture');
 await sql("insert into public.analytics_events(user_id,event_name) select '"+owner.id+"','home_viewed' from generate_series(1,"+(1199-globalBefore)+");");
 const globalSnap=await snapshot(),globalOver=await send(null,2,[event(2),event(2)]);check(globalOver.status===429&&await snapshot()===globalSnap,'Global budget rejects full over-budget batch');
 const globalRace=await Promise.all([send(null,2,[event(2)]),send(null,2,[event(2)])]);
 check(globalRace.filter(x=>x.ok&&x.data===1).length===1&&globalRace.filter(x=>x.status===429).length===1&&await globalRecent()==='1200','Global rotating-identifier race cannot bypass 1200/minute');
 pass('Shared global budget remains effective across anonymous identifiers and permits exactly one final event under a genuine request race');
 const range={p_from:new Date(Date.now()-86400000).toISOString(),p_to:new Date(Date.now()+60000).toISOString()},beforeRead=await snapshot();
 for(const name of ['admin_connected_journeys','admin_lister_marketing']){const out=await rpc(name,owner,range);check(out.ok&&out.data,'Existing protected report remains functional after write hardening');}
 await page.locator('#adminSectionMenu [data-section=marketing]').click();await expect(page.locator('.console-journey .journey-freshness')).toContainText('Report generated');await expect(page.locator('.console-journey [role=alert]')).toHaveCount(0);
 await page.screenshot({path:artifacts+'/analytics-existing-report-desktop.png'});
 check(await snapshot()===beforeRead,'Existing reports do not write events');
 report.completed=true;report.directWriteDenials=18;report.accountEventsPerMinute=240;report.globalEventsPerMinute=1200;report.currentBrowserCollector=true;report.deployedBrowserCollector=true;report.security='Real customer/anonymous RPCs, trusted actor, direct-write denials, atomic validation and real lock/budget races';
 pass('Existing protected connected/legacy reports and the real Marketing screen render after ingestion hardening; no new collection, business mutation or retention change');
}
