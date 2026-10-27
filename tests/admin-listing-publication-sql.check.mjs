// Disposable PostgreSQL only. No hosted listing, media upload or customer write.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.VACANCY_PGLITE_MODULE);const db=new PGlite(),id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const baseline=JSON.parse(await readFile('tests/fixtures/admin-listing-publication-baseline.json','utf8'));
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema private;
grant usage on schema auth,private,public to authenticated;grant usage on schema public to anon;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.user',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('aal',current_setting('test.aal',true))$$;
create table auth.users(id uuid primary key,created_at timestamptz,is_anonymous boolean,confirmed_at timestamptz);
create table public.profiles(id uuid primary key,account_status text);create table public.admin_users(user_id uuid primary key);
create table public.properties(id int primary key,owner_id uuid);create table public.rooms(id int primary key,property_id int);
create table public.vacancies(id uuid primary key,room_id int,created_at timestamptz default now(),updated_at timestamptz default now(),status text,confirmed_at timestamptz,expires_at timestamptz);
create table public.listing_activity_log(id bigint generated always as identity primary key,actor_id uuid,entity_type text,entity_id uuid,action text,old_status text,new_status text,created_at timestamptz not null default now());
create table public.conversations(id int,created_at timestamptz);create table public.conversation_members(conversation_id int,user_id uuid);
create table public.messages(id int,sender_id uuid,created_at timestamptz);create table public.media(id int,owner_id uuid,room_id int,status text,created_at timestamptz);
insert into public.profiles values('${id(1)}','active'),('${id(2)}','active'),('${id(3)}','suspended');insert into public.admin_users values('${id(1)}'),('${id(3)}');
insert into auth.users values('${id(2)}',now()-interval '8 days',false,now()-interval '1 minute');
insert into public.properties values(1,'${id(2)}'),(2,'${id(1)}');insert into public.rooms values(1,1),(2,2),(3,1),(4,1);
insert into public.vacancies(id,room_id,created_at,status) values
('${id(10)}',1,now()-interval '8 days','draft'),('${id(11)}',1,now()-interval '1 minute','draft'),
('${id(12)}',1,now()-interval '1 minute','active'),('${id(13)}',1,now()-interval '1 minute','paused'),
('${id(14)}',2,now()-interval '1 minute','active'),('${id(15)}',1,now()-interval '5 days','paused');
insert into public.listing_activity_log(entity_type,entity_id,action,new_status,old_status,created_at) values
('listing','${id(10)}','created','active',null,now()-interval '8 days'),('listing','${id(10)}','status_changed','draft','active',now()-interval '8 days'),
('listing','${id(11)}','created','active',null,now()-interval '1 minute'),('listing','${id(11)}','status_changed','draft','active',now()-interval '1 minute'),
('listing','${id(12)}','created','active',null,now()-interval '1 minute'),('listing','${id(14)}','created','active',null,now()-interval '1 minute'),
('listing','${id(15)}','created','active',null,now()-interval '5 days'),('listing','${id(15)}','status_changed','paused','active',now()-interval '4 days');`);
for(const g of baseline.guards)await db.exec(g.definition);
await db.exec(baseline.recordListingActivity);await db.exec(baseline.reconfirmVacancy);await db.exec(baseline.cardSeries);
await db.exec('create trigger listing_activity_vacancies after insert or delete or update on public.vacancies for each row execute function private.record_listing_activity();revoke all on function public.admin_card_series(text,jsonb) from public,anon,authenticated,service_role;grant execute on function public.admin_card_series(text,jsonb) to authenticated;');
const actor=async(user=id(1),aal='aal2',role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('test.user',$1,false),set_config('test.aal',$2,false)",[user||'',aal]);await db.exec('set role '+role)};
const buckets=(await db.query("select jsonb_build_array(jsonb_build_object('start',now()-interval '1 hour','end',now()+interval '1 minute')) b")).rows[0].b;
const read=async(metric='listings',b=buckets)=>(await db.query('select public.admin_card_series($1,$2::jsonb) data',[metric,JSON.stringify(b)])).rows[0].data;
const count=async()=>{await actor();return (await read()).series[0].value};
assert.equal(await count(),3,'old reader counts two creation/draft/unknown rows plus the real legacy publication');
const others={};for(const metric of ['accounts','enquiries','messages','images'])others[metric]=await read(metric);
await db.exec('reset role');const acl=(await db.query("select proacl::text acl from pg_proc where oid='public.admin_card_series(text,jsonb)'::regprocedure")).rows[0].acl;
const guards=(await db.query("select proname,pg_get_functiondef(oid) definition from pg_proc where proname in ('is_admin','is_active_user','record_listing_activity','reconfirm_vacancy') order by proname")).rows;
const migration=await readFile('supabase/migrations/20261027143848_admin_listing_first_publication.sql','utf8');await db.exec(migration);
assert.equal(await count(),1,'exclude transient created-active/reset-draft events and unproven history; retain committed legacy creation');
await db.exec(`reset role;insert into public.media(id,room_id,status) values(1,1,'active'),(2,1,'active')`);
await assert.rejects(db.exec(`select public.reconfirm_vacancy('${id(10)}')`),/at least 3/);assert.equal(await count(),1,'photo validation failure does not publish');
await db.exec(`reset role;insert into public.media(id,room_id,status) values(3,1,'active')`);
await db.exec(`begin;select public.reconfirm_vacancy('${id(10)}');`);
await assert.rejects(db.exec("do $$begin raise exception 'Synthetic acknowledgement failure';end$$"),/acknowledgement failure/);await db.exec('rollback');
assert.equal(await count(),1,'failed acknowledgement transaction rolls back status and publication evidence');
await db.exec(`reset role;select public.reconfirm_vacancy('${id(10)}')`);assert.equal(await count(),2,'older draft counts when publish commits, not on creation');
await db.exec(`reset role;select public.reconfirm_vacancy('${id(11)}')`);assert.equal(await count(),3,'each successfully published listing contributes once');
await db.exec(`reset role;select public.reconfirm_vacancy('${id(11)}');update public.vacancies set status='paused' where id='${id(11)}';select public.reconfirm_vacancy('${id(11)}');update public.vacancies set status='archived' where id='${id(10)}';select public.reconfirm_vacancy('${id(15)}');`);
assert.equal(await count(),3,'retry/active renewal, pause/resume, archival and old listing reconfirmation do not add first publications');
await db.exec(`reset role;begin;insert into public.vacancies(id,room_id,status) values('${id(16)}',3,'active'),('${id(17)}',4,'active');update public.vacancies set status='draft' where id in ('${id(16)}','${id(17)}');commit;`);
assert.equal(await count(),3,'actual captured activity trigger records create/reset in one transaction without counting publication');
await db.exec(`reset role;insert into public.media(id,room_id,status) select 10+i,3,'active' from generate_series(1,3)i;insert into public.media(id,room_id,status) select 20+i,4,'active' from generate_series(1,3)i;select public.reconfirm_vacancy('${id(16)}');`);
assert.equal(await count(),4,'partial multi-unit success counts only the committed unit');
await db.exec(`reset role;select public.reconfirm_vacancy('${id(17)}')`);assert.equal(await count(),5,'remaining-unit retry counts the second listing once');
for(const metric of Object.keys(others))assert.deepEqual(await read(metric),others[metric],metric+' branch unchanged, including verified accounts');
await assert.rejects(db.exec('select * from public.listing_activity_log'),/permission denied/);
for(const [user,aal] of [[id(1),'aal1'],[id(2),'aal2'],[id(3),'aal2'],[null,'aal2']]){await actor(user,aal);await assert.rejects(read(),/Admin verification required/)}
await actor(null,'aal1','anon');await assert.rejects(read(),/permission denied/);
await actor();await assert.rejects(read('invalid'),/Invalid metric/);await assert.rejects(read('listings',[]),/Invalid buckets/);await assert.rejects(read('listings',[{start:'infinity',end:'infinity'}]),/Invalid bucket/);
await db.exec('reset role');const cut=(await db.query("select now()-interval '2 days' as cut_at")).rows[0].cut_at;
await db.exec(`insert into public.vacancies(id,room_id,created_at,status)values('${id(18)}',1,now()-interval '8 days','active')`);
await db.query("delete from public.listing_activity_log where entity_id=$1",[id(18)]);
await db.query("insert into public.listing_activity_log(entity_type,entity_id,action,old_status,new_status,created_at)values('listing',$1,'status_changed','draft','active',$2)",[id(18),cut]);
const historical=(await db.query("select jsonb_build_array(jsonb_build_object('start',$1::timestamptz-interval '1 hour','end',$1::timestamptz),jsonb_build_object('start',$1::timestamptz,'end',$1::timestamptz+interval '1 hour')) b",[cut])).rows[0].b;
await actor();assert.deepEqual((await read('listings',historical)).series.map(x=>x.value),[0,1],'first publication on a boundary counts only in following bucket');
await db.exec('reset role');assert.deepEqual((await db.query("select proname,pg_get_functiondef(oid) definition from pg_proc where proname in ('is_admin','is_active_user','record_listing_activity','reconfirm_vacancy') order by proname")).rows,guards);
assert.equal((await db.query("select proacl::text acl from pg_proc where oid='public.admin_card_series(text,jsonb)'::regprocedure")).rows[0].acl,acl);
await assert.rejects(db.exec(migration),/changed since capture/);
const saved=(await db.query("select jsonb_build_object('listings',(select jsonb_agg(to_jsonb(v) order by id)from public.vacancies v),'history',(select jsonb_agg(to_jsonb(l)order by id)from public.listing_activity_log l)) data")).rows[0].data;
await db.exec(await readFile('supabase/rollback/admin_listing_first_publication_20261027.sql','utf8'));
assert.equal((await db.query("select pg_get_functiondef('public.admin_card_series(text,jsonb)'::regprocedure) definition")).rows[0].definition,baseline.cardSeries);
assert.deepEqual((await db.query("select jsonb_build_object('listings',(select jsonb_agg(to_jsonb(v)order by id)from public.vacancies v),'history',(select jsonb_agg(to_jsonb(l)order by id)from public.listing_activity_log l)) data")).rows[0].data,saved);
await actor();assert.deepEqual(await read('accounts'),others.accounts,'rollback preserves verified-account repair');
await db.exec('reset role;alter table public.listing_activity_log alter column created_at set default clock_timestamp()');
await assert.rejects(db.exec(migration),/Publication history recording changed/);
await db.close();console.log('PASS: committed first publication, transient create/reset exclusion, failed photos/ack rollback, older drafts, multi-unit partial success/retry, renewal/pause/archive idempotence, legacy/unproven history, time boundaries, other metrics/guards/ACLs and exact data-preserving rollback. Product RLS/UI delivery itself is unchanged and not simulated.');
