// Generate reviewable fixture SQL from NONSECRET IDs. Does not execute SQL.
import {readFile,writeFile} from 'node:fs/promises';
import {check} from './support.mjs';
const dir=new URL('../../work/hosted-admin/',import.meta.url);
const phase=process.argv[2];
check(['seed','audit-failure-on','audit-failure-off','cleanup'].includes(phase),'Unknown phase');
const manifest=JSON.parse(await readFile(new URL(phase+'.needed.json',dir),'utf8'));
check(/^vacancy-qa-\d+$/.test(manifest.run),'Invalid run scope');
check(manifest.actors.length>0&&manifest.actors.length<=4,'Invalid actor count');
for(const actor of manifest.actors)check(/^[a-f0-9-]{36}$/.test(actor.id)&&
  ['owner','operator','viewer','suspended'].includes(actor.role),'Invalid actor manifest');
const ids=manifest.actors.map(a=>`'${a.id}'::uuid`).join(',');
const owner=manifest.actors.find(a=>a.role==='owner');
let sql=`begin;\n-- TEST ONLY: raauicmfyjpcuhfzknak; never production.\n`;
sql+=`do $guard$ begin
 if coalesce(obj_description('public.profiles'::regclass),'') not like 'Test-only partial profile contract%' then
  raise exception 'Expected isolated partial test snapshot'; end if;
 if (select count(*) from auth.users where id in (${ids})
   and raw_app_meta_data->>'vacancy_qa_scope'='${manifest.run}') <> ${manifest.actors.length} then
  raise exception 'Synthetic Auth fixture provenance mismatch'; end if;
end $guard$;\n`;
if(phase==='seed'){
  for(const {id,role} of manifest.actors){
    sql+=`insert into public.profiles(id,account_status) values('${id}','${role==='suspended'?'suspended':'active'}');\n`;
    if(role!=='viewer')sql+=`insert into public.admin_users(user_id) values('${id}');
insert into public.admin_access_roles(user_id,role,granted_by,grant_reason)
values('${id}','${role==='owner'?'owner':'operator'}',null,'Synthetic hosted Auth fixture ${manifest.run}');\n`;
  }
}
if(phase==='audit-failure-on'){
  check(owner,'Owner required');
  sql+=`create function private.qa_reject_hosted_publish() returns trigger language plpgsql set search_path='' as $body$
begin if new.actor_id='${owner.id}'::uuid and new.action='appearance_published' then
 raise exception 'Synthetic audit failure' using errcode='23514'; end if; return new; end $body$;
revoke all on function private.qa_reject_hosted_publish() from public,anon,authenticated;
create trigger qa_reject_hosted_publish before insert on public.admin_change_audit
for each row execute function private.qa_reject_hosted_publish();\n`;
}
if(phase==='audit-failure-off'||phase==='cleanup')sql+=`drop trigger if exists qa_reject_hosted_publish on public.admin_change_audit;
drop function if exists private.qa_reject_hosted_publish();\n`;
if(phase==='cleanup')sql+=`delete from public.admin_appearance_drafts where actor_id in (${ids});
delete from public.admin_access_roles where user_id in (${ids});
delete from public.admin_users where user_id in (${ids});
delete from public.profiles where id in (${ids});\n`;
sql+='commit;\n';
await writeFile(new URL(phase+'.sql',dir),sql);
console.log('Reviewable test-only SQL generated for '+phase+'. No database action performed.');
