// Disposable PostgreSQL. No hosted connection, credentials or customer records.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.VACANCY_PGLITE_MODULE||'/tmp/vacancy-details-sql/node_modules/@electric-sql/pglite/dist/index.js');
const db=new PGlite(),id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const admin=id(1),member=id(2),suspended=id(3),property=id(4),room=id(5),vacancy=id(6);
const baseline=JSON.parse(await readFile('tests/fixtures/admin-account-hierarchy-baseline.json','utf8'));
await db.exec(`create role anon;create role authenticated;create role service_role;
create schema auth;create schema private;grant usage on schema auth,private to authenticated;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.user',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('aal',current_setting('test.aal',true))$$;
grant usage on schema public to anon,authenticated;
create table public.profiles(id uuid primary key,display_name text,account_status text,created_at timestamptz,phone_verified boolean);
create table public.admin_users(user_id uuid primary key);
create table public.properties(id uuid primary key,owner_id uuid,title text,suburb text,city text,created_at timestamptz);
create table public.rooms(id uuid primary key,property_id uuid,name text);
create table public.vacancies(id uuid primary key,room_id uuid,status text,created_at timestamptz);
insert into public.profiles values('${admin}','Operator','active',now(),true),('${member}','Synthetic member','active',now(),false),('${suspended}','Suspended operator','suspended',now(),true);
insert into public.admin_users values('${admin}'),('${suspended}');
insert into public.properties values('${property}','${member}','Synthetic property','Synthetic suburb','Synthetic city',now());
insert into public.rooms values('${room}','${property}','Synthetic room');
insert into public.vacancies values('${vacancy}','${room}','active',now());`);
for(const name of ['is_active_user','is_admin','admin_account_hierarchy_impl','admin_account_hierarchy']){
 const row=baseline.find(r=>r.proname===name),signature=row.schema+'.'+name+'(uuid)';
 await db.exec(row.definition);
 await db.exec(`revoke all on function ${signature} from public,anon,authenticated,service_role`);
 for(const role of ['anon','authenticated','service_role'])if(new RegExp('(?:[,{])'+role+'=X/').test(row.proacl||''))await db.exec(`grant execute on function ${signature} to ${role}`);
}
const actor=async(user,aal='aal2',role='authenticated')=>{
 await db.exec('reset role');await db.query("select set_config('test.user',$1,false),set_config('test.aal',$2,false)",[user||'',aal]);await db.exec('set role '+role);
};
const read=async target=>(await db.query('select public.admin_account_hierarchy($1::uuid) as result',[target])).rows[0].result;
await actor(admin);await assert.rejects(read(member),/permission denied for function admin_account_hierarchy_impl/);
await db.exec('reset role');
const definitions=()=>db.query("select n.nspname,p.proname,p.prosrc,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname='admin_account_hierarchy') or (n.nspname='private' and p.proname in ('is_active_user','is_admin','admin_account_hierarchy_impl')) order by 1,2");
const before=(await definitions()).rows;
await db.exec(await readFile('supabase/migrations/20261026183324_admin_account_hierarchy_execute.sql','utf8'));
assert.deepEqual((await definitions()).rows,before);
await actor(admin);const data=await read(member);
assert.equal(data.profile.id,member);assert.equal(data.properties.length,1);
assert.equal(data.properties[0].id,property);assert.equal(data.properties[0].units[0].id,room);
assert.equal(data.properties[0].units[0].vacancies[0].id,vacancy);
assert.deepEqual(await read(id(99)),{error:'account not found'});
for(const [user,aal] of [[admin,'aal1'],[member,'aal2'],[suspended,'aal2'],[null,'aal2']]){
 await actor(user,aal);await assert.rejects(read(member),/admin required/);
 await assert.rejects(db.query('select private.admin_account_hierarchy_impl($1::uuid)',[member]),/admin required/);
}
await actor(null,'aal1','anon');await assert.rejects(read(member),/permission denied/);
await db.exec('reset role');
const permissions=(await db.query("select has_function_privilege('authenticated','private.admin_account_hierarchy_impl(uuid)','execute') as helper,has_function_privilege('anon','private.admin_account_hierarchy_impl(uuid)','execute') as anon_helper,has_function_privilege('anon','public.admin_account_hierarchy(uuid)','execute') as anon_wrapper,has_table_privilege('authenticated','public.profiles','select') as direct_profiles")).rows[0];
assert.deepEqual(permissions,{helper:true,anon_helper:false,anon_wrapper:false,direct_profiles:false});
await db.exec('revoke execute on function private.admin_account_hierarchy_impl(uuid) from authenticated');
await actor(admin);await assert.rejects(read(member),/permission denied for function admin_account_hierarchy_impl/);
await db.close();
console.log('PASS: original permission failure reproduced; complete hierarchy and missing-account result; AAL1/non-admin/suspended/no-user/anonymous denial; direct helper retains guards; function bodies/modes unchanged; no table grant; rollback restores baseline.');
