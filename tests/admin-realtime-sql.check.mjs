// Disposable PostgreSQL, synthetic rows only. Managed send is stubbed transactionally.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.VACANCY_PGLITE_MODULE);const db=new PGlite();
const migration=await readFile('supabase/migrations/20261027082948_admin_overview_realtime.sql','utf8');
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema private;create schema storage;create schema realtime;
grant usage on schema public,private,auth,realtime to authenticated;grant usage on schema realtime,public to anon;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.user',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('aal',current_setting('test.aal',true))$$;
create table public.profiles(id uuid primary key,account_status text);create table public.admin_users(user_id uuid primary key);
create table realtime.messages(topic text,extension text,payload jsonb,event text,private boolean);
alter table realtime.messages enable row level security;grant select,insert on realtime.messages to authenticated,anon;
create function realtime.topic() returns text language sql as $$select current_setting('realtime.topic',true)$$;
create function realtime.send(payload jsonb,event text,topic text,private boolean) returns void language plpgsql as $$begin if current_setting('test.fail_broadcast',true)='yes' then raise exception 'Synthetic delivery failure';end if;insert into realtime.messages values(topic,'broadcast',payload,event,private);end$$;
revoke all on function realtime.send(jsonb,text,text,boolean) from public,anon,authenticated;
`);
const tables=['auth.users','public.vacancies','public.rooms','public.properties','public.media','public.conversations','public.messages','public.analytics_events','public.listing_activity_log','private.visitor_presence','private.engagement_events','private.site_change_feed','storage.objects'];
for(const table of tables)await db.exec(`create table ${table}(id integer,data text)`);
const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
await db.exec(`insert into public.profiles values('${uid(1)}','active'),('${uid(2)}','active'),('${uid(3)}','suspended');insert into public.admin_users values('${uid(1)}'),('${uid(3)}');`);
const baseline=JSON.parse(await readFile('tests/fixtures/admin-account-hierarchy-baseline.json','utf8'));for(const name of ['is_active_user','is_admin'])await db.exec(baseline.find(r=>r.proname===name).definition);
const original=(await db.query("select pg_get_functiondef('private.is_admin(uuid)'::regprocedure) as definition")).rows[0].definition;
await db.exec(migration);
assert.equal((await db.query("select count(*)::int as n from pg_trigger where tgname='vacancy_admin_live'")).rows[0].n,15);
for(const table of tables)await db.exec(`insert into ${table} values(1,'customer content must never enter notification')`);
let rows=(await db.query('select * from realtime.messages')).rows;assert.equal(rows.length,tables.length);for(const r of rows){assert.equal(r.topic,'vacancy-admin-overview-v1');assert.equal(r.private,true);assert.equal(r.event,'changed');assert.deepEqual(Object.keys(r.payload).sort(),['groups','schemaVersion']);assert.equal(r.payload.schemaVersion,1);assert(!JSON.stringify(r).includes('customer content'))}
await db.exec('insert into public.messages select n,\'synthetic\' from generate_series(2,101) n');assert.equal((await db.query('select count(*)::int n from realtime.messages')).rows[0].n,tables.length+1);
const before=(await db.query('select count(*)::int n from realtime.messages')).rows[0].n;await db.exec("begin;insert into public.messages values(102,'rollback');rollback;");assert.equal((await db.query('select count(*)::int n from realtime.messages')).rows[0].n,before);
await db.exec("set test.fail_broadcast='yes';insert into public.messages values(103,'must succeed');set test.fail_broadcast='no'");assert.equal((await db.query('select count(*)::int n from public.messages where id=103')).rows[0].n,1);
const actor=async(user,aal='aal2',role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('test.user',$1,false),set_config('test.aal',$2,false),set_config('realtime.topic','vacancy-admin-overview-v1',false)",[user||'',aal]);await db.exec('set role '+role)};
for(const [user,aal,allowed]of [[uid(1),'aal2',true],[uid(1),'aal1',false],[uid(2),'aal2',false],[uid(3),'aal2',false],[null,'aal2',false]]){await actor(user,aal);assert.equal((await db.query('select public.admin_overview_live_access() as ok')).rows[0].ok,allowed);assert.equal((await db.query('select count(*)::int n from realtime.messages')).rows[0].n>0,allowed);await assert.rejects(db.exec("insert into realtime.messages values('vacancy-admin-overview-v1','broadcast','{}','changed',true)"));await assert.rejects(db.exec('select private.notify_admin_overview()'))}
await actor(uid(1));await db.exec("set realtime.topic='other-topic'");assert.equal((await db.query('select count(*)::int n from realtime.messages')).rows[0].n,0);
await actor(null,'aal1','anon');assert.equal((await db.query('select count(*)::int n from realtime.messages')).rows[0].n,0);await assert.rejects(db.exec('select public.admin_overview_live_access()'));
await db.exec('reset role;grant insert on public.messages to authenticated');await actor(uid(2));await db.exec("insert into public.messages values(104,'ordinary successful write')");await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from public.messages where id=104')).rows[0].n,1);
await db.exec('create policy unrelated_preserved on realtime.messages for select to anon using(false)');const contentCount=(await db.query('select count(*)::int n from public.messages')).rows[0].n;await db.exec(await readFile('supabase/rollback/admin_overview_realtime_20261027.sql','utf8'));
assert.equal((await db.query("select count(*)::int n from pg_trigger where tgname='vacancy_admin_live'")).rows[0].n,0);assert.equal((await db.query('select count(*)::int n from public.messages')).rows[0].n,contentCount);assert.equal((await db.query("select count(*)::int n from pg_policies where policyname='unrelated_preserved'")).rows[0].n,1);assert.equal((await db.query("select pg_get_functiondef('private.is_admin(uuid)'::regprocedure) as definition")).rows[0].definition,original);
await db.close();console.log('PASS: 15 source triggers, no record payloads, bulk coalescing, transactional rollback, optional-delivery failure isolation, Admin/AAL2 and denied-role RLS/access, cross-topic denial, client publishing denied, ordinary writes preserved, exact scoped rollback and unchanged Admin guard.');
