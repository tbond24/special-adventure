-- Stage 3 favicon only. Development candidate; never applied to production here.
-- Existing public singleton and column grants remain the public contract.
create function private.validate_favicon_config(p_config jsonb)
returns void language plpgsql immutable set search_path='' as $png$
declare target text; raw bytea;
begin
 if p_config is null or jsonb_typeof(p_config)<>'object' or length(p_config::text)>40100 then
   raise exception 'Favicon settings must be a bounded object' using errcode='22023';
 end if;
 if (select count(*) from jsonb_object_keys(p_config))<>1 or not p_config ? 'png'
    or jsonb_typeof(p_config->'png') not in ('string','null') then
   raise exception 'Only a PNG favicon or the default is supported' using errcode='22023';
 end if;
 target:=p_config->>'png';
 if target is not null then
   -- Preserve the existing 40k data URL, PNG signature and 64x64 IHDR rules.
   if length(target)>40000 or target !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$' then
     raise exception 'Use a PNG favicon' using errcode='22023';
   end if;
   begin raw:=decode(substr(target,23),'base64');
   exception when others then raise exception 'Invalid PNG encoding' using errcode='22023'; end;
   if length(raw)<32 or encode(substring(raw from 1 for 8),'hex')<>'89504e470d0a1a0a'
      or encode(substring(raw from 13 for 12),'hex')<>'494844520000004000000040' then
     raise exception 'Use a 64 by 64 PNG favicon' using errcode='22023';
   end if;
 end if;
end
$png$;
revoke all on function private.validate_favicon_config(jsonb) from public,anon,authenticated;

alter table public.admin_appearance_current
 drop constraint admin_appearance_current_element_key_check,
 add constraint admin_appearance_current_element_key_check
 check(element_key in ('listing-detail/save-button','site/listing-display','site/favicon')),
 add column favicon_revision integer check(favicon_revision>=0),
 add column favicon_initial_previous jsonb;
alter table public.admin_appearance_drafts
 drop constraint admin_appearance_drafts_element_key_check,
 add constraint admin_appearance_drafts_element_key_check
 check(element_key in ('listing-detail/save-button','site/listing-display','site/favicon'));
alter table public.admin_appearance_revisions
 drop constraint admin_appearance_revisions_element_key_check,
 add constraint admin_appearance_revisions_element_key_check
 check(element_key in ('listing-detail/save-button','site/listing-display','site/favicon'));

-- FAVICON_SEED_BEGIN
insert into public.admin_appearance_current(element_key,config,initial_config,favicon_revision,favicon_initial_previous)
select 'site/favicon',jsonb_build_object('png',png),jsonb_build_object('png',png),revision,
 case when revision>0 then jsonb_build_object('png',previous_png) else null end
from public.site_favicon where id;
-- FAVICON_SEED_END
do $baseline$
begin
 if not exists(select 1 from public.admin_appearance_current where element_key='site/favicon') then
   raise exception 'Existing favicon singleton missing' using errcode='23514';
 end if;
 perform private.validate_favicon_config((select config from public.admin_appearance_current where element_key='site/favicon'));
 if (select favicon_initial_previous is not null from public.admin_appearance_current where element_key='site/favicon') then
   perform private.validate_favicon_config((select favicon_initial_previous from public.admin_appearance_current where element_key='site/favicon'));
 end if;
end
$baseline$;
comment on column public.admin_appearance_current.favicon_revision is
 'Last projected legacy favicon revision; checks out-of-band changes without conflating editor history.';
comment on column public.admin_appearance_current.favicon_initial_previous is
 'Captured earlier legacy favicon, when one existed; immutable and available for reviewed restore.';

create function private.project_reviewed_favicon()
returns trigger language plpgsql security definer set search_path='' as $projection$
declare prior public.site_favicon;
begin
 perform private.validate_favicon_config(new.config);
 if tg_table_name='admin_appearance_current' then
   if new.initial_config is distinct from old.initial_config
      or new.favicon_initial_previous is distinct from old.favicon_initial_previous then
     raise exception 'Initial favicon history is immutable' using errcode='42501';
   end if;
   select * into prior from public.site_favicon where id for update;
   if not found or prior.revision is distinct from old.favicon_revision
      or prior.png is distinct from (old.config->>'png') then
     raise exception 'Published favicon changed outside review; reconcile before publishing' using errcode='PT409';
   end if;
   update public.site_favicon set png=new.config->>'png',previous_png=prior.png,
     revision=prior.revision+1,updated_at=clock_timestamp() where id;
   new.favicon_revision:=prior.revision+1;
 end if;
 return new;
end
$projection$;
revoke all on function private.project_reviewed_favicon() from public,anon,authenticated;
create trigger admin_favicon_draft_valid before insert or update on public.admin_appearance_drafts
for each row when(new.element_key='site/favicon') execute function private.project_reviewed_favicon();
-- UPDATE only: the existing publisher's ignored ON CONFLICT placeholder must
-- not run validation or change the public singleton.
create trigger admin_favicon_publication before update on public.admin_appearance_current
for each row when(new.element_key='site/favicon') execute function private.project_reviewed_favicon();

create function private.appearance_audit_config(p_key text,p_config jsonb)
returns jsonb language sql immutable set search_path='' as $summary$
 select case when p_key<>'site/favicon' or p_config='{}'::jsonb then p_config
 else jsonb_build_object(
   'pngSha256',encode(sha256(decode(substr(p_config->>'png',23),'base64')),'hex'),
   'pngBytes',coalesce(octet_length(decode(substr(p_config->>'png',23),'base64')),0)) end
$summary$;
revoke all on function private.appearance_audit_config(text,jsonb) from public,anon,authenticated;

create or replace function private.validate_appearance_config(p_element_key text,p_config jsonb)
returns void language plpgsql set search_path='' as $$
declare sc record; field record; t text; n integer;
begin
 if p_element_key='site/favicon' then
   if p_config='{}'::jsonb then return; end if;
   perform private.validate_favicon_config(p_config);return;
 end if;
 if p_element_key='site/listing-display' then
   -- Empty object is a registration probe; persisted rows require full snapshots.
   if p_config='{}'::jsonb then return; end if;
   perform private.validate_listing_display_config(p_config);
   return;
 end if;
 if p_element_key <> 'listing-detail/save-button' or p_element_key is null then
   raise exception 'Unregistered appearance element' using errcode='22023';
 end if;
 if p_config is null or jsonb_typeof(p_config)<>'object'
    or length(p_config::text)>4096 then
   raise exception 'Appearance config must be a bounded object' using errcode='22023';
 end if;
 for sc in select key,value from jsonb_each(p_config) loop
   if sc.key not in ('all','mobile','desktop') or jsonb_typeof(sc.value)<>'object' then
     raise exception 'Unsupported appearance viewport scope' using errcode='22023';
   end if;
   for field in select key,value from jsonb_each(sc.value) loop
     t := jsonb_typeof(field.value);
     if field.key in ('height','radius','opacity','border_width',
                       'margin_top','margin_right','margin_bottom','margin_left') then
       if t <> 'number' or field.value::text !~ '^(0|[1-9][0-9]*)$'
          or length(field.value::text)>3 then
         raise exception 'Appearance value must be an integer' using errcode='22023';
       end if;
       n := (field.value::text)::integer;
       if (field.key='height' and n not between 28 and 72)
          or (field.key='radius' and n not between 0 and 40)
          or (field.key='opacity' and n not between 20 and 100)
          or (field.key='border_width' and n not between 0 and 3)
          or (field.key like 'margin_%' and n not between 0 and 32) then
         raise exception 'Appearance value out of range' using errcode='22023';
       end if;
     elsif field.key in ('background','colour','border_colour') then
       if t <> 'string' or (field.value #>> '{}') !~ '^#[0-9a-fA-F]{6}$' then
         raise exception 'Appearance colour must be a hex colour' using errcode='22023';
       end if;
     elsif field.key='width' then
       if t <> 'string' or (field.value #>> '{}') not in ('auto','44px','48px','52px') then
         raise exception 'Unsupported appearance width' using errcode='22023';
       end if;
     elsif field.key='shadow' then
       if t <> 'string' or (field.value #>> '{}') not in ('none','subtle','medium') then
         raise exception 'Unsupported appearance shadow' using errcode='22023';
       end if;
     else
       raise exception 'Unregistered appearance field' using errcode='22023';
     end if;
   end loop;
 end loop;
end
$$;

create or replace function public.admin_appearance_history(p_element_key text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.admin_can('appearance_draft') then
   raise exception 'Verified editor required' using errcode='42501';
 end if;
 perform private.validate_appearance_config(p_element_key,'{}'::jsonb);
 if p_element_key in ('site/listing-display','site/favicon') then
   return (select jsonb_agg(to_jsonb(h) order by h.revision desc) from (
     select revision,config,actor_id,reason,published_at from (
       select revision,config,actor_id,reason,published_at from public.admin_appearance_revisions
       where element_key=p_element_key order by revision desc limit 20
     ) recent
     union all
     select 0::bigint,initial_config,null::uuid,'Initial published settings',null::timestamptz
     from public.admin_appearance_current where element_key=p_element_key
     union all
     select -1::bigint,favicon_initial_previous,null::uuid,'Previous favicon before reviewed editor',null::timestamptz
     from public.admin_appearance_current where element_key=p_element_key
       and p_element_key='site/favicon' and favicon_initial_previous is not null
   ) h);
 end if;
 return coalesce((select jsonb_agg(to_jsonb(h) order by h.revision desc)
   from (select revision,config,actor_id,reason,published_at
     from public.admin_appearance_revisions where element_key=p_element_key
     order by revision desc limit 20) h),'[]'::jsonb);
end
$$;

create or replace function public.admin_appearance_restore_draft(
 p_element_key text,p_from_revision bigint,
 p_expected_draft_version bigint,p_expected_published_revision bigint)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_config jsonb;
begin
 if not private.admin_can('appearance_publish') then
   raise exception 'Owner verification required' using errcode='42501';
 end if;
 perform private.validate_appearance_config(p_element_key,'{}'::jsonb);
 select config into v_config from public.admin_appearance_revisions
 where element_key=p_element_key and revision=p_from_revision;
 if p_element_key in ('site/listing-display','site/favicon') and p_from_revision=0 then
   select initial_config into v_config from public.admin_appearance_current where element_key=p_element_key;
 end if;
 if p_element_key='site/favicon' and p_from_revision=-1 then
   select favicon_initial_previous into v_config from public.admin_appearance_current where element_key=p_element_key;
 end if;
 if v_config is null then
   raise exception 'Previous published revision not found' using errcode='22023';
 end if;
 return public.admin_appearance_save_draft(
   p_element_key,v_config,p_expected_draft_version,p_expected_published_revision);
end
$$;

create or replace function private.audit_admin_appearance_draft()
returns trigger language plpgsql security definer set search_path='' as $appearance_audit$
begin
  insert into public.admin_change_audit(
    actor_id,action,target_kind,target_key,reason,
    previous_version,new_version,request_id,diff
  ) values (
    new.actor_id,'appearance_draft_saved','page_element_draft',
    new.element_key,'Private appearance draft saved',
    case when tg_op='UPDATE' then old.version else 0 end,
    new.version,gen_random_uuid(),
    jsonb_build_object(
      'before',private.appearance_audit_config(new.element_key,case when tg_op='UPDATE' then old.config else '{}'::jsonb end),
      'after',private.appearance_audit_config(new.element_key,new.config)
    )
  );
  return new;
end
$appearance_audit$;

create or replace function public.admin_appearance_publish(
 p_element_key text,p_expected_published_revision bigint,
 p_expected_draft_version bigint,p_reason text,p_request_id uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid()); v_current record; v_draft record;
        v_previous jsonb; v_prior record; v_new_revision bigint;
begin
 if not private.admin_can('appearance_publish') then
   raise exception 'Owner MFA verification required' using errcode='42501';
 end if;
 perform private.validate_appearance_config(p_element_key,'{}'::jsonb);
 if p_request_id is null or p_expected_published_revision is null
    or p_expected_draft_version is null
    or length(trim(coalesce(p_reason,''))) not between 3 and 500 then
   raise exception 'Versions, request ID and reason are required' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(2026101402::bigint);
 select element_key,revision,reason,source_draft_version into v_prior from public.admin_appearance_revisions
 where actor_id=v_actor and request_id=p_request_id;
 if found then
   if v_prior.element_key<>p_element_key
      or v_prior.reason<>trim(p_reason)
      or v_prior.source_draft_version<>p_expected_draft_version
      or v_prior.revision-1<>p_expected_published_revision then
     raise exception 'Request ID reused for a different publication' using errcode='23505';
   end if;
   return jsonb_build_object('revision',v_prior.revision,'alreadyApplied',true);
 end if;
 insert into public.admin_appearance_current(element_key,revision,config)
 values(p_element_key,0,'{}'::jsonb) on conflict do nothing;
 select revision,config into v_current from public.admin_appearance_current
 where element_key=p_element_key for update;
 if v_current.revision <> p_expected_published_revision then
   raise exception 'Published revision changed; review the latest version' using errcode='PT409';
 end if;
 select version,base_revision,config into v_draft from public.admin_appearance_drafts
 where actor_id=v_actor and element_key=p_element_key for update;
 if v_draft.version is null or v_draft.version<>p_expected_draft_version
    or v_draft.base_revision<>v_current.revision then
   raise exception 'Saved draft is missing or outdated' using errcode='PT409';
 end if;
 perform private.validate_appearance_config(p_element_key,v_draft.config);
 if v_draft.config=v_current.config then
   raise exception 'Draft does not change the published element' using errcode='22023';
 end if;
 v_previous := v_current.config;
 v_new_revision := v_current.revision + 1;
 update public.admin_appearance_current set revision=v_new_revision,
   config=v_draft.config,updated_at=now(),updated_by=v_actor where element_key=p_element_key;
 insert into public.admin_appearance_revisions(
    element_key,revision,config,actor_id,reason,request_id,source_draft_version)
 values(p_element_key,v_new_revision,v_draft.config,v_actor,trim(p_reason),p_request_id,v_draft.version);
 insert into public.admin_change_audit(
    actor_id,action,target_kind,target_key,reason,previous_version,new_version,
    request_id,diff)
 values(v_actor,'appearance_published','page_element',p_element_key,trim(p_reason),
    v_current.revision,v_new_revision,p_request_id,
    jsonb_build_object('before',private.appearance_audit_config(p_element_key,v_previous),
      'after',private.appearance_audit_config(p_element_key,v_draft.config)));
 delete from public.admin_appearance_drafts
 where actor_id=v_actor and element_key=p_element_key;
 return jsonb_build_object('revision',v_new_revision,'alreadyApplied',false);
end
$$;

create or replace function public.admin_set_favicon(p_png text,p_revision integer,p_restore boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $legacy$
begin
 if not private.admin_can('appearance_draft') then
   raise exception 'Verified appearance editor required' using errcode='42501';
 end if;
 raise exception 'Reload the admin page. Save a private favicon draft and ask an Owner to review and publish it.'
   using errcode='PT409';
end
$legacy$;
revoke all on function public.admin_set_favicon(text,integer,boolean) from public,anon,authenticated;
grant execute on function public.admin_set_favicon(text,integer,boolean) to authenticated;
revoke all on function private.validate_appearance_config(text,jsonb),private.audit_admin_appearance_draft() from public,anon,authenticated;
revoke all on function public.admin_appearance_history(text),public.admin_appearance_restore_draft(text,bigint,bigint,bigint),public.admin_appearance_publish(text,bigint,bigint,text,uuid) from public,anon;
grant execute on function public.admin_appearance_history(text),public.admin_appearance_restore_draft(text,bigint,bigint,bigint),public.admin_appearance_publish(text,bigint,bigint,text,uuid) to authenticated;
