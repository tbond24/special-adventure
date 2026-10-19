// Generates bounded, reviewable test SQL. No SQL HTTP gateway or credentials.
import {readFile,writeFile} from 'node:fs/promises';
import {check} from '../hosted-admin/support.mjs';
const dir=new URL('../../work/hosted-release/',import.meta.url),phase=process.argv[2];
check(['seed','audit-failure-on','audit-failure-off','media-cleanup','cleanup','admin-seed','admin-cleanup','reset-cleanup'].includes(phase),'Unknown phase');
const manifest=JSON.parse(await readFile(new URL(phase+'.needed.json',dir),'utf8'));
const adminOnly=phase.startsWith('admin-')||phase.startsWith('reset-'),expected=adminOnly?1:6;
check(/^vacancy-hosted-\d+$/.test(manifest.run)&&manifest.actors.length===expected,'Invalid isolated run');
const roles=['owner','operator','viewer','suspended','lister','renter'];
check(new Set(manifest.actors.map(a=>a.role)).size===expected,'Unique roles required');
for(const a of manifest.actors)check(/^[a-f0-9-]{36}$/.test(a.id)&&roles.includes(a.role),'Invalid actor');
const ids=manifest.actors.map(a=>`'${a.id}'::uuid`).join(','),owner=manifest.actors.find(a=>a.role==='owner');
let sql=`begin;\nselect qa_hosted_control.verify_preservation();\n`;
sql+=`do $guard$ begin
 if (select count(*) from auth.users where id in (${ids}) and raw_app_meta_data->>'vacancy_hosted_scope'='${manifest.run}')<>${expected} then raise exception 'Fixture provenance mismatch';end if;
 if (select count(*) from qa_hosted_control.source_receipts)<>86 then raise exception 'Expected reconciled full schema';end if;
end $guard$;\n`;
if(['seed','admin-seed'].includes(phase)){
  for(const {id,role}of manifest.actors){
    if(['owner','operator','suspended'].includes(role))sql+=`insert into public.admin_users(user_id) values('${id}');\n`;
    if(role==='suspended')sql+=`update public.profiles set account_status='suspended' where id='${id}';\n`;
  }
  sql+=`do $seed_owner$ begin
if not exists(select 1 from public.admin_change_audit where action='access_roles_bootstrapped') then
 perform private.bootstrap_first_admin_owner((select email from auth.users where id='${owner.id}'),'Synthetic-hosted-acceptance/${manifest.run}');
else
 -- A previous test attempt already proved the one-time bootstrap. Retain its immutable audit.
 if exists(select 1 from public.admin_access_roles) then raise exception 'Unexpected existing assigned role';end if;
 insert into public.admin_access_roles(user_id,role,grant_reason) values('${owner.id}','owner','Privileged synthetic fixture reseed ${manifest.run}');
 create table if not exists qa_hosted_control.fixture_actions(at timestamptz not null default now(),run text not null,action text not null,target uuid not null,executor text not null default current_user);
 alter table qa_hosted_control.fixture_actions enable row level security;
 revoke all on qa_hosted_control.fixture_actions from public,anon,authenticated,service_role;
 insert into qa_hosted_control.fixture_actions(run,action,target) values('${manifest.run}','privileged_synthetic_owner_reseed','${owner.id}');
end if;end $seed_owner$;
insert into public.admin_access_roles(user_id,role,grant_reason) select id,'operator','Synthetic suspended admin' from auth.users where id in (${ids}) and raw_app_meta_data->>'vacancy_hosted_role'='suspended';\n`;
 if(phase==='admin-seed')sql+=`do $preview_fixture$ declare p uuid:=gen_random_uuid();r uuid:=gen_random_uuid();begin
 insert into public.properties(id,owner_id,title,country,state,city,suburb,property_type) values(p,'${owner.id}','Synthetic hosted admin preview','Australia','WA','Perth','Joondalup','House');
 insert into public.rooms(id,property_id,name,room_type,unit_type,description) values(r,p,'Synthetic admin preview','private','Studio','Synthetic managed preview fixture');
 insert into public.vacancies(room_id,weekly_rent,monthly_rent,rent_amount,rent_currency,rent_period,available_from,status,confirmed_at,expires_at,published_at) values(r,320,320,320,'AUD','week',current_date,'active',now(),now()+interval '21 days',now());
end $preview_fixture$;\n`;
}
if(phase==='audit-failure-on')sql+=`create function private.qa_reject_hosted_publish() returns trigger language plpgsql set search_path='' as $body$
begin if new.actor_id='${owner.id}'::uuid and new.action='appearance_published' then raise exception 'Synthetic audit failure' using errcode='23514';end if;return new;end $body$;
revoke all on function private.qa_reject_hosted_publish() from public,anon,authenticated;
create trigger qa_reject_hosted_publish before insert on public.admin_change_audit for each row execute function private.qa_reject_hosted_publish();\n`;
if(['audit-failure-off','cleanup','admin-cleanup'].includes(phase))sql+=`drop trigger if exists qa_reject_hosted_publish on public.admin_change_audit;drop function if exists private.qa_reject_hosted_publish();\n`;
if(phase==='media-cleanup')sql+=`select bucket_id,name from storage.objects where owner_id in (select id::text from auth.users where id in (${ids})) order by bucket_id,name;\n`;
if(['cleanup','admin-cleanup','reset-cleanup'].includes(phase))sql+=`delete from auth.sessions where user_id in (${ids});
delete from public.admin_appearance_drafts where actor_id in (${ids});
delete from public.admin_access_roles where user_id in (${ids});
delete from public.admin_users where user_id in (${ids});
update public.listing_drafts set current_transfer_id=null where owner_id in (${ids});
delete from public.listing_draft_manifests where owner_id in (${ids});
delete from public.listing_drafts where owner_id in (${ids});
delete from public.properties where owner_id in (${ids});
delete from public.profiles where id in (${ids});\n`;
sql+='commit;\n';await writeFile(new URL(phase+'.sql',dir),sql);
console.log('Prepared bounded SQL for '+phase+'; no database action.');
