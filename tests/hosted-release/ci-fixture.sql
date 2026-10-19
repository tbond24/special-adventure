-- Render ONLY into an expiring vacancy-admin-test migration; never a release candidate.
begin;
select qa_hosted_control.verify_preservation();
create table qa_hosted_control.ci_window(
 singleton boolean primary key default true check(singleton),
 run text not null, expires timestamptz not null, active boolean not null default true,
 reject_audit boolean not null default false, baseline jsonb not null);
alter table qa_hosted_control.ci_window enable row level security;
revoke all on qa_hosted_control.ci_window from public,anon,authenticated,service_role;
insert into qa_hosted_control.ci_window(run,expires,baseline)
select '__RUN__','__EXPIRES__',jsonb_object_agg(element_key,config) from public.admin_appearance_current;

create function private.qa_ci_audit_failure() returns trigger language plpgsql set search_path='' as $$
begin
 if new.action='appearance_published' and exists(
  select 1 from qa_hosted_control.ci_window w join auth.users u
   on u.raw_app_meta_data->>'vacancy_hosted_scope'=w.run
  where w.active and w.expires>now() and w.reject_audit and u.id=new.actor_id)
 then raise exception 'Synthetic audit failure' using errcode='23514';end if;
 return new;
end $$;
revoke all on function private.qa_ci_audit_failure() from public,anon,authenticated,service_role;
create trigger qa_ci_audit_failure before insert on public.admin_change_audit
 for each row execute function private.qa_ci_audit_failure();

-- No SQL, user IDs, storage paths or role names accepted from the caller.
-- Invoked only by the nonce-authenticated test Edge runtime's service role.
create function public.qa_hosted_ci_fixture(p_action text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare w qa_hosted_control.ci_window; ids uuid[]; own uuid; result jsonb; restored boolean;
begin
 select * into strict w from qa_hosted_control.ci_window where singleton for update;
 if not w.active or w.expires<=now() then raise exception 'Closed' using errcode='42501';end if;
 perform qa_hosted_control.verify_preservation();
 if (select count(*) from qa_hosted_control.source_receipts)<>86 then raise exception 'Source mismatch';end if;
 select coalesce(array_agg(id),'{}'),max(id::text) filter(where raw_app_meta_data->>'vacancy_hosted_role'='owner')::uuid
 into ids,own from auth.users where raw_app_meta_data->>'vacancy_hosted_scope'=w.run;
 if cardinality(ids)>9 then raise exception 'Actor bound';end if;
 select not exists(select 1 from public.admin_appearance_current c
  where c.config is distinct from coalesce(w.baseline->c.element_key,c.initial_config)) into restored;
 if p_action in ('seed','admin-seed') then
  if own is null or cardinality(ids)<>(case when p_action='seed' then 6 else 1 end)
   or exists(select 1 from public.admin_access_roles) then raise exception 'Invalid seed state';end if;
  insert into public.admin_users(user_id) select id from auth.users where id=any(ids)
   and raw_app_meta_data->>'vacancy_hosted_role' in ('owner','operator','suspended');
  update public.profiles set account_status='suspended' where id in(select id from auth.users where id=any(ids) and raw_app_meta_data->>'vacancy_hosted_role'='suspended');
  insert into public.admin_access_roles(user_id,role,grant_reason) values(own,'owner','Privileged synthetic CI fixture reseed '||w.run);
  insert into qa_hosted_control.fixture_actions(run,action,target) values(w.run,'privileged_synthetic_ci_owner_reseed',own);
  insert into public.admin_access_roles(user_id,role,grant_reason) select id,'operator','Synthetic suspended admin' from auth.users where id=any(ids) and raw_app_meta_data->>'vacancy_hosted_role'='suspended';
  if p_action='admin-seed' then
   with p as(insert into public.properties(owner_id,title,country,state,city,suburb,property_type)
    values(own,'Synthetic hosted admin preview','Australia','WA','Perth','Joondalup','House') returning id),
   r as(insert into public.rooms(property_id,name,room_type,unit_type,description)
    select id,'Synthetic admin preview','private','Studio','Synthetic managed preview fixture' from p returning id)
   insert into public.vacancies(room_id,weekly_rent,monthly_rent,rent_amount,rent_currency,rent_period,available_from,status,confirmed_at,expires_at,published_at)
    select id,320,320,320,'AUD','week',current_date,'active',now(),now()+interval '21 days',now() from r;
  end if;
 elsif p_action in ('audit-failure-on','audit-failure-off') then
  update qa_hosted_control.ci_window set reject_audit=(p_action='audit-failure-on') where singleton;
 elsif p_action='media-manifest' then
  select coalesce(jsonb_agg(jsonb_build_object('bucket_id',bucket_id,'name',name)),'[]') into result
   from storage.objects where owner_id=any(ids::text[]) and bucket_id in ('room-media','listing-draft-media')
   and split_part(name,'/',1)=any(ids::text[]);
  if jsonb_array_length(result)>30 or (select coalesce(sum((metadata->>'size')::bigint),0) from storage.objects where owner_id=any(ids::text[]))>52428800
   then raise exception 'Media bound';end if;
  return result;
 elsif p_action in ('cleanup','admin-cleanup') then
  if not restored then raise exception 'Audited presentation restoration required before cleanup';end if;
  if exists(select 1 from storage.objects where owner_id=any(ids::text[])) then raise exception 'Physical media cleanup required';end if;
  update qa_hosted_control.ci_window set reject_audit=false where singleton;
  delete from auth.sessions where user_id=any(ids);
  delete from public.admin_appearance_drafts where actor_id=any(ids);
  delete from public.admin_access_roles where user_id=any(ids);
  delete from public.admin_users where user_id=any(ids);
  update public.listing_drafts set current_transfer_id=null where owner_id=any(ids);
  delete from public.listing_draft_manifests where owner_id=any(ids);
  delete from public.listing_drafts where owner_id=any(ids);
  delete from public.properties where owner_id=any(ids);
  delete from public.profiles where id=any(ids);
 elsif p_action='close' then
  if cardinality(ids)<>0 or not restored or exists(select 1 from storage.objects) then raise exception 'Not clean';end if;
  update qa_hosted_control.ci_window set active=false,reject_audit=false where singleton;
 elsif p_action<>'check' then raise exception 'Unknown fixture command';
 end if;
 return jsonb_build_object('actors',ids,'restored',restored,'preservation',true,'sourceCount',86);
end $$;
revoke all on function public.qa_hosted_ci_fixture(text) from public,anon,authenticated;
grant execute on function public.qa_hosted_ci_fixture(text) to service_role;
commit;
