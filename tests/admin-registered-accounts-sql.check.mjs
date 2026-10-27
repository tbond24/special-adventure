// Disposable PostgreSQL engine only; no Auth API, email, hosted rows or sessions.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.VACANCY_PGLITE_MODULE);const db=new PGlite(),uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const baseline=JSON.parse(await readFile('tests/fixtures/admin-registered-accounts-baseline.json','utf8'));
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema private;
grant usage on schema auth,private,public to authenticated;grant usage on schema public to anon;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.user',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('aal',current_setting('test.aal',true))$$;
create table auth.users(id uuid primary key,created_at timestamptz not null,is_anonymous boolean,email_confirmed_at timestamptz,phone_confirmed_at timestamptz,confirmed_at timestamptz generated always as(least(email_confirmed_at,phone_confirmed_at)) stored,last_sign_in_at timestamptz,email text);
create table public.profiles(id uuid primary key,account_status text);
create table public.admin_users(user_id uuid primary key);
create table public.properties(id int primary key,owner_id uuid);create table public.rooms(id int primary key,property_id int);
create table public.vacancies(id int primary key,room_id int,created_at timestamptz);
create table public.conversations(id int primary key,created_at timestamptz);create table public.conversation_members(conversation_id int,user_id uuid);
create table public.messages(id int primary key,sender_id uuid,created_at timestamptz);create table public.media(id int primary key,owner_id uuid,created_at timestamptz);
insert into public.profiles values('${uid(1)}','active'),('${uid(2)}','active'),('${uid(3)}','suspended');insert into public.admin_users values('${uid(1)}'),('${uid(3)}');
insert into auth.users(id,created_at,is_anonymous,email_confirmed_at,phone_confirmed_at) values
('${uid(1)}',now()-interval '8 days',false,now()-interval '7 days',null),
('${uid(2)}',now()-interval '8 days',false,null,null),
('${uid(3)}',now()-interval '8 days',false,now()-interval '7 days',null),
('${uid(4)}',now()-interval '1 minute',false,null,null),
('${uid(5)}',now()-interval '1 minute',true,null,null),
('${uid(6)}',now()-interval '8 days',true,null,null),
('${uid(7)}',now()-interval '8 days',false,now()-interval '7 days',null),
('${uid(8)}',now()-interval '8 days',false,null,now()-interval '1 minute'),
('${uid(9)}',now()-interval '1 minute',false,now()-interval '1 minute',null);
insert into public.properties values(1,'${uid(2)}'),(2,'${uid(1)}');insert into public.rooms values(1,1),(2,2);
insert into public.vacancies values(1,1,now()-interval '1 minute'),(2,2,now()-interval '1 minute');
insert into public.conversations values(1,now()-interval '1 minute'),(2,now()-interval '1 minute');insert into public.conversation_members values(2,'${uid(1)}');
insert into public.messages values(1,'${uid(2)}',now()-interval '1 minute'),(2,'${uid(1)}',now()-interval '1 minute');insert into public.media values(1,'${uid(2)}',now()-interval '1 minute'),(2,'${uid(1)}',now()-interval '1 minute');`);
for(const g of baseline.guards)await db.exec(g.definition);
await db.exec(baseline.cardSeries+';');
await db.exec('revoke all on function public.admin_card_series(text,jsonb) from public,anon,authenticated,service_role;grant execute on function public.admin_card_series(text,jsonb) to authenticated;');
const actor=async(user,aal='aal2',role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('test.user',$1,false),set_config('test.aal',$2,false)",[user||'',aal]);await db.exec('set role '+role)};
const buckets=(await db.query("select jsonb_build_array(jsonb_build_object('start',now()-interval '1 hour','end',now()+interval '1 second')) b")).rows[0].b;
const read=async(metric='accounts',b=buckets)=>(await db.query('select public.admin_card_series($1,$2::jsonb) data',[metric,JSON.stringify(b)])).rows[0].data;
await actor(uid(1));assert.equal((await read()).series[0].value,2,'baseline counts unverified creation and misses older accounts verified recently');
const others={};for(const m of ['listings','enquiries','messages','images'])others[m]=await read(m);
await db.exec('reset role');const beforeACL=(await db.query("select proacl::text acl from pg_proc where oid='public.admin_card_series(text,jsonb)'::regprocedure")).rows[0].acl;
const originalGuards=(await db.query("select proname,pg_get_functiondef(oid) definition from pg_proc where proname in ('is_admin','is_active_user') order by proname")).rows;
const migration=await readFile('supabase/migrations/20261027140536_admin_registered_accounts_verified.sql','utf8');await db.exec(migration);
await actor(uid(1));assert.equal((await read()).series[0].value,2,'recent email and phone verification count, unverified/guest creation does not');
await db.exec(`reset role;update auth.users set email_confirmed_at=now() where id='${uid(2)}'`);await actor(uid(1));assert.equal((await read()).series[0].value,3);
await db.exec(`reset role;update auth.users set is_anonymous=false,email_confirmed_at=now() where id='${uid(6)}'`);await actor(uid(1));assert.equal((await read()).series[0].value,4,'guest upgrade uses verification date, not original guest creation');
await db.exec(`reset role;update auth.users set last_sign_in_at=now(),email='changed@example.test' where id='${uid(6)}';update auth.users set email_confirmed_at=email_confirmed_at where id='${uid(6)}';update auth.users set phone_confirmed_at=now() where id='${uid(7)}';update auth.users set email_confirmed_at=now() where id in ('${uid(1)}','${uid(5)}');`);
await actor(uid(1));assert.equal((await read()).series[0].value,4,'login/repeated timestamp/second channel/Admin/anonymous state do not add registrations');
await db.exec(`reset role;begin;update auth.users set email_confirmed_at=now() where id='${uid(4)}';rollback`);await actor(uid(1));assert.equal((await read()).series[0].value,4,'failed verification transaction does not count');
for(const m of Object.keys(others))assert.deepEqual(await read(m),others[m],m+' branch unchanged');
await assert.rejects(db.exec('select * from auth.users'),/permission denied/);
for(const [u,aal] of [[uid(1),'aal1'],[uid(2),'aal2'],[uid(3),'aal2'],[null,'aal2']]){await actor(u,aal);await assert.rejects(read(),/Admin verification required/)}
await actor(null,'aal1','anon');await assert.rejects(read(),/permission denied/);
await actor(uid(1));await assert.rejects(read('invalid'),/Invalid metric/);await assert.rejects(read('accounts',[]),/Invalid buckets/);await assert.rejects(read('accounts',[{start:'infinity',end:'infinity'}]),/Invalid bucket/);
const cutoff=(await db.query("select (now()-interval '7 days')::text at")).rows[0].at;
await db.exec('reset role');await db.query("update auth.users set email_confirmed_at=$1::timestamptz where id=$2",[cutoff,uid(7)]);
const historical=(await db.query("select jsonb_build_array(jsonb_build_object('start',$1::timestamptz-interval '1 hour','end',$1::timestamptz),jsonb_build_object('start',$1::timestamptz,'end',$1::timestamptz+interval '1 hour')) b",[cutoff])).rows[0].b;
await actor(uid(1));assert.deepEqual((await read('accounts',historical)).series.map(p=>p.value),[0,1],'verification exactly on boundary counts only in following bucket');
await db.exec('reset role');assert.deepEqual((await db.query("select proname,pg_get_functiondef(oid) definition from pg_proc where proname in ('is_admin','is_active_user') order by proname")).rows,originalGuards);
assert.equal((await db.query("select proacl::text acl from pg_proc where oid='public.admin_card_series(text,jsonb)'::regprocedure")).rows[0].acl,beforeACL);
await assert.rejects(db.exec(migration),/changed since capture/);
const preserved=(await db.query('select * from auth.users order by id')).rows;await db.exec(await readFile('supabase/rollback/admin_registered_accounts_20261027.sql','utf8'));assert.deepEqual((await db.query('select * from auth.users order by id')).rows,preserved);
assert.equal((await db.query("select pg_get_functiondef('public.admin_card_series(text,jsonb)'::regprocedure) definition")).rows[0].definition,baseline.cardSeries);
await actor(uid(1));assert.equal((await read()).series[0].value,2,'rollback restores creation-based reader without account mutations');
await db.close();console.log('PASS: verified email/phone dates, excluded unverified/guest/Admin records, guest conversion on existing ID, login/retry/second-channel idempotence, failed-transaction rollback, half-open periods, unchanged other metric branches/guards/ACLs, fail-closed migration precondition and exact data-preserving rollback. Auth API delivery itself is not simulated.');
