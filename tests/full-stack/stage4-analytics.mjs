import {randomUUID,randomBytes} from 'node:crypto';
import {expect} from '@playwright/test';
import {assertActivityEnvironment} from './activity-log-reports.mjs';
export async function verifyStage4Analytics(h){
 const {ROOT,sql,request,check,pass,evidence,owner,operator,viewer,suspended,page,server,sensitive,actors,loginUI,artifacts}=h;
 assertActivityEnvironment(ROOT);const info=evidence.stage4Analytics={completed:false,genuineAuth:true,retentionTargetDays:30,productionCollection:false};
 const rpc=(name,actor,body)=>request('rest/v1/rpc/'+name,{token:actor?.session?.access_token,body});
 owner.session=await page.evaluate(async()=>{await VACANCY_BACKEND.currentUser();return VACANCY_BACKEND.session()});for(const v of [owner.session.access_token,owner.session.refresh_token])sensitive.add(v);
 const participant={role:'stage4 participant',email:'qa-stage4@vacancy.invalid',password:'Qs4!'+randomBytes(20).toString('base64url')};sensitive.add(participant.password);
 const created=await request('auth/v1/admin/users',{admin:true,body:{email:participant.email,password:participant.password,email_confirm:true,user_metadata:{display_name:'Synthetic analytics participant'}}});check(created.ok&&created.data.id,'Disposable analytics participant');participant.id=created.data.id;actors.push(participant);
 const signIn=async actor=>{const out=await request('auth/v1/token?grant_type=password',{body:{email:actor.email,password:actor.password}});check(out.ok,'Analytics actor password Auth');actor.session=out.data;sensitive.add(out.data.access_token);sensitive.add(out.data.refresh_token);};await signIn(participant);
 const event=(name='listing_started',extra={})=>({event_id:randomUUID(),event_name:name,visitor_id:randomUUID(),session_id:randomUUID(),journey_id:randomUUID(),route:'create',...extra});
 const ingest=(actor,events,v=2)=>rpc(v===2?'record_lister_journey_v2':'record_lister_journey',actor,{p_events:events});
 const original=event(),before=Number(await sql('select count(*) from public.analytics_events;'));
 for(const actor of [null,participant,owner,operator,viewer,suspended]){const out=await request('rest/v1/analytics_events',{token:actor?.session?.access_token,body:{event_name:'home_viewed',user_id:actor?.id||null}});check(!out.ok&&[401,403].includes(out.status),'Direct analytics REST INSERT denied for every role');}
 check(Number(await sql('select count(*) from public.analytics_events;'))===before,'REST denials preserve telemetry');
 check(await sql("select (not has_table_privilege('anon','public.analytics_events','INSERT') and not has_any_column_privilege('authenticated','public.analytics_events','INSERT'))::text;")==='true','Table and column INSERT bypasses closed');
 check((await ingest(participant,[original])).data===1&&(await ingest(participant,[original])).data===0,'V2 cached RPC works and event retry deduplicates');
 const legacy=event('location_started',{step:'location',route:'#list/new?private=address',source:'https://private.invalid/?token=bad',referrer_host:'https://private.invalid/path',landing_path:'/private/precise-address'});
 check((await ingest(participant,[legacy],1)).data===1,'V1 cached RPC remains callable');
 const recorded=JSON.parse(await sql(`select json_build_object('user_id',user_id,'route',route,'source',source,'referrer',referrer_host,'landing',landing_path) from public.analytics_events where event_id='${legacy.event_id}';`));
 check(recorded.user_id===participant.id&&recorded.route==='create'&&recorded.source===null&&recorded.referrer===null&&recorded.landing==='other','Server Auth identity and coarse/sanitized context');
 for(const [name,body]of [['track_event',{p_event_name:'home_viewed',p_vacancy_id:null,p_route:'#home?secret=bad'}],['track_listing_open',{p_vacancy_id:'55555555-5555-4555-8555-555555555555',p_visitor_id:randomUUID()}]])check((await rpc(name,participant,body)).ok,'Cached simple tracking signature preserved');
 for(const bad of [[{...event(),user_id:owner.id}],[event('unsupported')],[event('journey_error',{error_code:'private form text'})],[event('step_ready',{to_step:9})],Array.from({length:21},()=>event()),[event('listing_started',{campaign:'x'.repeat(40000)})]]){const out=await ingest(participant,bad);check(!out.ok&&out.data.code==='22023','Invalid, spoofed or oversized batch rejected');}
 const emptyBefore=Number(await sql('select count(*) from public.analytics_events;'));
 check((await ingest(owner,[event()])).data===0&&(await ingest(viewer,[event()])).data===0,'Known administrator and trusted QA traffic excluded');
 const spoof=await request('auth/v1/admin/users',{admin:true,body:{email:'qa-stage4-excluded@vacancy.invalid',password:participant.password,email_confirm:true,app_metadata:{analytics_excluded:true}}});check(spoof.ok,'Trusted excluded test identity');const excluded={id:spoof.data.id,email:'qa-stage4-excluded@vacancy.invalid',password:participant.password};await signIn(excluded);check((await ingest(excluded,[event()])).data===0,'Trusted server app metadata exclusion');
 const bot=await fetch(ROOT+'/rest/v1/rpc/record_lister_journey_v2',{method:'POST',headers:{apikey:h.key,Authorization:'Bearer '+participant.session.access_token,'Content-Type':'application/json','User-Agent':'Synthetic crawler'},body:JSON.stringify({p_events:[event()]})});check(bot.ok&&await bot.json()===0,'Recognizable bot request excluded');
 check(Number(await sql('select count(*) from public.analytics_events;'))===emptyBefore,'Excluded traffic adds no telemetry');
 // Shared anonymous and trusted authenticated budgets cannot be bypassed by rotating browser IDs.
 if(new Date().getUTCSeconds()>55)await new Promise(r=>setTimeout(r,6000));
 await sql(`insert into private.analytics_ingestion_limits(bucket,window_start,used) values('user:${participant.id}',date_trunc('minute',clock_timestamp()),598) on conflict(bucket) do update set window_start=excluded.window_start,used=excluded.used;`);
 const outcomes=await Promise.all(Array.from({length:5},()=>ingest(participant,[event()])));check(outcomes.filter(r=>r.ok).length===2&&outcomes.filter(r=>r.status===429).length===3,'Concurrent principal quota is atomic');
 await sql("insert into private.analytics_ingestion_limits(bucket,window_start,used) values('anonymous',date_trunc('minute',clock_timestamp()),999) on conflict(bucket) do update set window_start=excluded.window_start,used=excluded.used;");
 check((await ingest(null,[event()])).ok&&(await ingest(null,[event()])).status===429,'Shared anonymous budget ignores supplied browser identities');
 await sql(`update private.analytics_ingestion_limits set used=0 where bucket in ('anonymous','user:${participant.id}');`);
 pass('Four cached analytics RPCs work after direct INSERT revocation; genuine identity, validation, deduplication, exclusion and concurrent/shared budgets pass');

 const dateRange={p_from:new Date(Date.now()-86400000).toISOString(),p_to:new Date(Date.now()+60000).toISOString(),p_offset:0};
 const policy=await rpc('renter_analytics_policy',null,{});check(policy.ok&&policy.data.enabled===false&&policy.data.retentionDays===30,'Renter collection starts disabled with 30-day target');
 const recordRenter=(actor,events)=>rpc('record_renter_journey',actor,{p_events:events,p_notice_version:'20261016-renter-v1'});
 const search=event('search_used');delete search.route;delete search.journey_id;
 check((await recordRenter(participant,[search])).data===0&&(await rpc('admin_renter_journeys',owner,dateRange)).data.complete===false,'Disabled collection and report are unavailable, not fake zero');
 await sql('update private.renter_analytics_settings set collection_enabled=true where id;'); // Disposable test opt-in only; restored below.
 const landlord=actors.find(a=>a.role==='customer publisher');
 // These synthetic identities deliberately model unexcluded traffic in this isolated test.
 await sql(`update auth.users set raw_app_meta_data=raw_app_meta_data-'vacancy_qa_scope' where id='${landlord.id}';`);await signIn(landlord);
 const listing=await sql(`select v.id from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where p.owner_id='${landlord.id}' and v.status='active' limit 1;`);
 const opened={...search,event_id:randomUUID(),event_name:'vacancy_opened',parent_id:search.event_id,vacancy_id:listing};
 check((await recordRenter(participant,[search,opened])).data===2,'Prospective explicit search/open link');
 const conversation=await rpc('start_enquiry',participant,{p_vacancy_id:listing,p_requested_move_in:null,p_stay_weeks:null,p_renter_intro:null,p_message:'Synthetic Stage 4 enquiry contents never returned in analytics'});check(conversation.ok&&typeof conversation.data==='string','Actual business enquiry, no analytics replacement');
 const linked={...opened,event_id:randomUUID(),event_name:'enquiry_linked',parent_id:opened.event_id,conversation_id:conversation.data};
 check((await recordRenter(participant,[linked])).data===1&&(await recordRenter(participant,[linked])).data===0,'Authoritative enquiry link is idempotent');
 check((await recordRenter(participant,[{...linked,event_id:randomUUID()}])).data===0,'Conversation cannot be relinked to inflate searches');
 let report=await rpc('admin_renter_journeys',owner,dateRange);check(report.ok&&report.data.searches===1&&report.data.withOpen===1&&report.data.withEnquiry===1&&report.data.withReply===0&&report.data.rate===null,'No reply inferred from successful enquiry');
 check((await rpc('send_message',landlord,{p_conversation_id:conversation.data,p_body:'Synthetic first owner reply never returned in analytics'})).ok,'Actual first owner reply');
 report=await rpc('admin_renter_journeys',owner,dateRange);check(report.ok&&report.data.withReply===1&&report.data.repliedConversations===1&&!JSON.stringify(report.data).includes('Synthetic')&&!JSON.stringify(report.data).includes(participant.id),'Reply comes from authoritative owner message without bodies or identities');
 for(const bad of [[{...opened,event_id:randomUUID(),message:'private'}],[{...opened,event_id:randomUUID(),parent_id:randomUUID()}],[{...linked,event_id:randomUUID(),conversation_id:randomUUID()}]])check(!(await recordRenter(participant,bad)).ok,'Forged payload/parent/enquiry rejected');
 const low=await request('auth/v1/token?grant_type=password',{body:{email:owner.email,password:owner.password}});sensitive.add(low.data.access_token);sensitive.add(low.data.refresh_token);
 for(const actor of [null,participant,viewer,suspended,{session:low.data}])check(!(await rpc('admin_renter_journeys',actor,dateRange)).ok,'Renter report requires active administrator AAL2');
 check((await rpc('admin_renter_journeys',operator,dateRange)).ok,'AAL2 Operator reads bounded renter report');
 const old=await rpc('admin_renter_journeys',owner,{...dateRange,p_from:new Date(Date.now()-31*86400000).toISOString(),p_to:new Date(Date.now()-30*86400000).toISOString()});check(old.ok&&old.data.complete===false,'Expired window is unavailable');
 const seeds=Array.from({length:54},()=>({...search,event_id:randomUUID(),session_id:randomUUID()}));for(let i=0;i<seeds.length;i+=20)check((await recordRenter(participant,seeds.slice(i,i+20))).ok,'Bounded renter page fixture');
 const first=await rpc('admin_renter_journeys',owner,dateRange),second=await rpc('admin_renter_journeys',owner,{...dateRange,p_offset:50});check(first.data.details.length===50&&second.data.details.length===5&&second.data.details[0].label===51,'50-summary server pagination');
 const measures=[];for(let i=0;i<20;i++){const r=await rpc('admin_renter_journeys',owner,dateRange);check(r.ok,'Bounded renter measurement read');measures.push(r.elapsedMs);}info.localRenterReadSamples=measures;
 pass('Prospective renter search/open/enquiry/owner-reply linkage uses real Auth/business outcomes, rejects forged links and keeps bodies/identities out of bounded reports');
 // Actual admin adapter against real PostgREST. No mocked report data.
 await page.setViewportSize({width:1536,height:1024});await page.goto(server.url+'/#admin');await expect(page.locator('#adminHost')).toBeVisible();await page.locator('#adminSectionMenu [data-section=marketing]').click();
 await expect(page.locator('[data-renter-report] [data-body]')).toContainText('55 recorded searches');await page.locator('[data-renter-report] [data-next]').click();await expect(page.locator('[data-renter-report] tbody tr').first()).toContainText('51');await page.screenshot({path:artifacts+'/stage4-renter-report-desktop.png'});
 await page.locator('#adminSectionMenu [data-section=design]').click();await page.locator('#adminSectionMenu [data-section=marketing]').click();await page.locator('[data-renter-report] [data-refresh]').click();await expect(page.locator('[data-renter-report] [data-body]')).toContainText('55 recorded searches');
 await sql('update private.renter_analytics_settings set collection_enabled=false where id;');await page.locator('[data-renter-report] [data-refresh]').click();await expect(page.locator('[data-renter-report] [data-body]')).toContainText('Counts are unavailable, not zero');
 info.completed=true;info.serverGateRestoredDisabled=true;info.retentionDeletionExecuted=false;info.samples=20;info.reportUi=true;
 pass('Real admin renter report pages and refreshes correctly; development gate restored disabled with unavailable counts and no retention deletion');
}
