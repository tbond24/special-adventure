// Disposable PostgreSQL only: never uses a hosted URL or credentials.
import {readFile,readdir}from'node:fs/promises';import assert from'node:assert/strict';
const {PGlite}=await import(process.env.VACANCY_PGLITE_MODULE||'/tmp/vacancy-analytics-sql/node_modules/@electric-sql/pglite/dist/index.js'),db=new PGlite();
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),admin=id(1),user=id(2),visitor=id(3),session=id(4);
await db.exec(`create role anon;create role authenticated;create role service_role;create schema private;create schema auth;
create function auth.uid()returns uuid language sql as $$select nullif(current_setting('test.user',true),'')::uuid$$;
create function private.is_admin(u uuid)returns boolean language sql as $$select u='${admin}'::uuid and current_setting('test.aal',true)='aal2'$$;
create table public.admin_users(user_id uuid primary key);insert into public.admin_users values('${admin}');
create table auth.users(id uuid primary key,is_anonymous boolean,created_at timestamptz,email_confirmed_at timestamptz);
create table public.profiles(id uuid,created_at timestamptz,account_status text);
create table public.properties(id uuid primary key,owner_id uuid,city text);
create table public.rooms(id uuid primary key,property_id uuid);
create table public.vacancies(id uuid primary key,room_id uuid,created_at timestamptz,status text,expires_at timestamptz,client_request_id uuid);
create table public.listing_activity_log(id bigint generated always as identity,entity_id uuid,entity_type text,new_status text,old_status text,created_at timestamptz);
create table public.conversations(id uuid primary key,created_at timestamptz);
create table public.conversation_members(conversation_id uuid,user_id uuid);
create table public.messages(id uuid,sender_id uuid,created_at timestamptz);
create table public.reports(status text,created_at timestamptz);
create table public.client_errors(user_id uuid,created_at timestamptz);
create table public.analytics_events(id bigint generated always as identity,user_id uuid,event_name text,event_id uuid,previous_event_id uuid,journey_version integer,journey_id uuid,visitor_id uuid,session_id uuid,created_at timestamptz,occurred_at timestamptz,source text,medium text,campaign text,campaign_id text,adset_id text,ad_id text,content_id text,first_source text,first_medium text,first_campaign text,step text,device_class text,browser_family text,os_family text,journey_mode text,route text,to_step smallint,from_step smallint,unit_request_id uuid,error_code text,duration_ms int,active_ms int,vacancy_id uuid);
insert into auth.users values('${admin}',false,now()-interval '1 day',now()),('${user}',false,now()-interval '1 day',now());
insert into public.profiles values('${admin}',now(),'active'),('${user}',now(),'active');
insert into public.properties values('${id(10)}','${user}','Nairobi'),('${id(11)}','${admin}','Admin city');
insert into public.rooms values('${id(20)}','${id(10)}'),('${id(21)}','${id(11)}');
insert into public.vacancies values('${id(30)}','${id(20)}',now()-interval '1 day','active',now()+interval '1 day',null),('${id(31)}','${id(20)}',now()-interval '2 days','active',now()-interval '1 hour',null),('${id(32)}','${id(21)}',now()-interval '1 day','active',null,null);
insert into public.listing_activity_log(entity_id,entity_type,new_status,old_status,created_at)values('${id(30)}','listing','active','draft',now()-interval '1 day'),('${id(30)}','listing','active','paused',now()-interval '1 hour'),('${id(32)}','listing','active','draft',now()-interval '1 day');
insert into public.conversations values('${id(40)}',now()-interval '1 hour'),('${id(41)}',now()-interval '1 hour');
insert into public.conversation_members values('${id(40)}','${user}'),('${id(41)}','${user}'),('${id(41)}','${admin}');
insert into public.messages values('${id(50)}','${user}',now()-interval '1 hour'),('${id(51)}','${admin}',now()-interval '1 hour');
insert into public.reports values('open',now()-interval '2 days');insert into public.client_errors values('${user}',now()-interval '1 hour'),('${admin}',now()-interval '1 hour');`);
const previous=await readFile('supabase/migrations/20261021162009_admin_engagement_and_activity_feeds.sql','utf8');await db.exec(previous.slice(0,previous.indexOf('create function public.record_site_engagement')));for(const name of ['record_site_engagement','admin_engagement_series','admin_activity_feed']){const match=previous.match(new RegExp('create function public\\.'+name+'[\\s\\S]*?end \\$\\$;'));assert.ok(match,name);await db.exec(match[0]);}
const migration=(await readdir('supabase/migrations')).find(n=>n.endsWith('_admin_analytics_accuracy.sql'));await db.exec(await readFile('supabase/migrations/'+migration,'utf8'));
const actor=async(who=admin,aal='aal2')=>db.query("select set_config('test.user',$1,false),set_config('test.aal',$2,false)",[who,aal]);
const query=async(sql,args=[])=> (await db.query(sql,args)).rows[0].value;
await actor();let locations=await query('select public.admin_listing_locations()value');assert.equal(locations.total,1);assert.deepEqual(locations.locations,[{city:'Nairobi',count:1,other:false}]);
let snapshot=await query("select public.admin_dashboard_range(now()-interval '3 days',now())value");for(const key of ['active_listings','users_total','properties','enquiries_7d','messages_7d','listings_7d','errors_24h'])assert.equal(snapshot[key],1,key);assert.equal(snapshot.units,1);assert.equal(snapshot.open_reports,1);
await db.exec(`insert into public.analytics_events(user_id,event_name,event_id,journey_version,journey_id,visitor_id,session_id,created_at,occurred_at,source,campaign,device_class,journey_mode,route,to_step)values
('${user}','lister_session_started','${id(100)}',2,null,'${visitor}','${session}',now()-interval '2 hours',now()-interval '2 hours','Public',null,'desktop','new','find',null),
('${admin}','lister_session_started','${id(101)}',2,null,'${id(5)}','${id(6)}',now()-interval '2 hours',now()-interval '2 hours','Admin',null,'desktop','new','find',null),
('${user}','listing_started','${id(102)}',2,'${id(7)}','${visitor}','${session}',now()-interval '1 hour',now()-interval '1 hour','Public',null,'desktop','new','create',0),
('${admin}','listing_started','${id(103)}',2,'${id(8)}','${id(5)}','${id(6)}',now()-interval '1 hour',now()-interval '1 hour','Admin',null,'desktop','new','create',0);`);
let connected=await query("select public.admin_connected_journeys(now()-interval '3 days',now())value");assert.equal(connected.total,1);assert.equal(connected.arrivals,1);assert.equal(connected.stages[0].count,1);assert.deepEqual(connected.sources,[{source:'Public',n:1}]);
let legacy=await query("select public.admin_lister_marketing(now()-interval '3 days',now())value");assert.equal(legacy.events.length,2);assert.equal(legacy.publications.length,1);assert.ok(legacy.events.every(e=>e.user_id===user));
const bucket=(ago,endAgo)=>({start:new Date(Date.now()-ago*60000).toISOString(),end:new Date(Date.now()-endAgo*60000).toISOString()}),traffic=async b=>query('select public.admin_traffic_metrics($1::jsonb)value',[JSON.stringify(b)]);
let t=await traffic([bucket(180,0)]);assert.equal(t.visits,1);assert.equal(t.unique,1);assert.equal(t.complete,false);assert.ok(t.historyStart);
t=await traffic([bucket(50,0)]);assert.equal(t.complete,true);assert.equal(t.visits,0);t=await traffic([bucket(300,200)]);assert.equal(t.complete,false);assert.equal(t.visits,0);
await db.exec("update private.engagement_coverage set enabled=true,started_at=now()-interval '3 days'");
const events=['contact_button_pressed','text_button_pressed'].map((point,i)=>({event_id:id(200+i),point,visitor_id:visitor,session_id:session,occurred_at:new Date().toISOString(),city:null,country:null}));
await actor(user);await assert.rejects(query('select public.record_site_engagement($1::jsonb)value',[JSON.stringify([{...events[0],acquisition:{},newSession:false}])]),/Unsupported field/);assert.equal(await query('select public.record_site_engagement($1::jsonb)value',[JSON.stringify(events)]),2);assert.equal(await query('select public.record_site_engagement($1::jsonb)value',[JSON.stringify(events)]),0);
await actor();assert.equal(await query('select public.record_site_engagement($1::jsonb)value',[JSON.stringify([{...events[0],event_id:id(205)}])]),0);
const buckets=[bucket(60,0)];for(const point of ['contact_button_pressed','text_button_pressed']){const r=await query('select public.admin_engagement_series($1,$2::jsonb)value',[point,JSON.stringify(buckets)]);assert.equal(r.events,1);assert.equal(r.browsers,1)}
let feed=await query("select public.admin_activity_feed('visitor',now()-interval '3 days',now(),'clicks')value");assert.equal(feed.rows.length,2);assert.ok(feed.rows.every(r=>r.count===1));
await actor(admin,'aal1');await assert.rejects(query('select public.admin_listing_locations()value'));await assert.rejects(query("select public.admin_dashboard_range(now()-interval '1 day',now())value"));await actor(user);await assert.rejects(query('select public.admin_listing_locations()value'));await actor();
assert.equal(await query("select has_function_privilege('anon','public.admin_listing_locations()','execute')value"),false);assert.equal(await query("select has_function_privilege('anon','public.admin_dashboard_range(timestamptz,timestamptz)','execute')value"),false);
await db.exec(`insert into public.properties select md5('p'||i)::uuid,'${user}','City '||i from generate_series(1,55)i;insert into public.rooms select md5('r'||i)::uuid,md5('p'||i)::uuid from generate_series(1,55)i;insert into public.vacancies select md5('v'||i)::uuid,md5('r'||i)::uuid,now(),'active',null,null from generate_series(1,55)i;`);locations=await query('select public.admin_listing_locations()value');assert.equal(locations.total,56);assert.equal(locations.locations.length,50);assert.equal(locations.locations.reduce((n,r)=>n+r.count,0),56);assert.equal(locations.locations.filter(r=>r.other).length,1);
await db.exec('delete from public.analytics_events');t=await traffic([bucket(60,0)]);assert.equal(t.historyStart,null);assert.equal(t.complete,false);
await db.close();console.log('PASS: admin exclusions in cohorts/legacy/business snapshots; expiry and bounded city totals; publication deduplication; truthful traffic history; strict click payload, deduplication, cards and feed; admin/AAL1/anonymous guards.');
