-- Source reconciliation of continuation 3411cc2 and feature a9c6303.
-- Preserve all fifteen prior files; no alternative aggregate key/write path.
-- This candidate is prepared only, never applied to production by development.

alter table public.admin_appearance_current
 add column initial_config jsonb,
 add column legacy_initial_config jsonb,
 add column projection_state jsonb;

-- Reconciliation is a pre-release baseline adoption, not invented old history.
do $$ begin
 if exists(select 1 from public.admin_appearance_current where revision<>0)
    or exists(select 1 from public.admin_appearance_revisions) then
  raise exception 'Reconcile existing publications separately before adopting initial history' using errcode='23514';
 end if;
end $$;

create function private.presentation_projection(p_key text)
returns jsonb language plpgsql volatile set search_path='' as $$
declare result jsonb; slot_key text:=split_part(p_key,'/',2);
begin
 if p_key='site-favicon' then
  select jsonb_build_object('png',png,'previous_png',previous_png,'revision',revision)
    into result from public.site_favicon where id;
 elsif p_key like 'listing-display/%' then
  select jsonb_build_object('enabled',enabled) into result
    from public.listing_display_options where slot=slot_key;
 elsif p_key like 'site-icon/%' or p_key like 'icon-catalog/%' then
  select jsonb_build_object('label',s.label,'kind',s.listing_kind,'artwork',
     case when o.source_slot is not null then jsonb_build_object('source_slot',o.source_slot)
          when o.path_d is not null then jsonb_build_object('path_d',o.path_d) else '{}'::jsonb end)
    into result from public.site_icon_slots s left join public.site_icon_overrides o using(slot)
    where s.slot=slot_key;
 end if;
 return result;
end $$;
revoke all on function private.presentation_projection(text) from public,anon,authenticated;

alter function private.validate_appearance_config(text,jsonb) rename to validate_pre_reconciliation_appearance_config;
create function private.validate_appearance_config(p_element_key text,p_config jsonb)
returns void language plpgsql set search_path='' as $$
declare normalized jsonb:=p_config; sc record; f record;
begin
 if p_element_key in ('create-listing/language-selector','edit-listing/language-selector') then
  if p_config is null or jsonb_typeof(p_config)<>'object' or length(p_config::text)>4096 then
   raise exception 'Bounded language style required' using errcode='22023';
  end if;
  for sc in select key,value from jsonb_each(p_config) loop
   if jsonb_typeof(sc.value)<>'object' then raise exception 'Viewport style must be an object' using errcode='22023';end if;
   for f in select key,value from jsonb_each(sc.value) loop
    if f.key in ('padding_top','padding_right','padding_bottom','padding_left') then
     if jsonb_typeof(f.value)<>'number' or f.value::text !~ '^(0|[1-9][0-9]?)$' or (f.value::text)::numeric>24 then
      raise exception 'Language padding must be an integer from 0 to 24' using errcode='22023';
     end if;
     normalized:=normalized#-array[sc.key,f.key];
    end if;
   end loop;
  end loop;
 end if;
 perform private.validate_pre_reconciliation_appearance_config(p_element_key,normalized);
 if p_element_key like 'site-icon/%' and p_config ? 'source_slot' and not exists(
   select 1 from public.site_icon_slots where slot=p_config->>'source_slot' and listing_kind is null) then
  raise exception 'Choose a compiled built-in icon source' using errcode='22023';
 end if;
end $$;
revoke all on function private.validate_appearance_config(text,jsonb),
 private.validate_pre_reconciliation_appearance_config(text,jsonb) from public,anon,authenticated;

-- Capture exact initial public values privately, without publishing/churning them.
update public.admin_appearance_current set initial_config=config,
 projection_state=private.presentation_projection(element_key),
 legacy_initial_config=case when element_key='site-favicon' then
  (select case when revision>0 then case when previous_png is null then '{}'::jsonb
    else jsonb_build_object('png',previous_png) end else null end from public.site_favicon where id)
 end;
do $$ declare item record;begin
 for item in select element_key,config,legacy_initial_config from public.admin_appearance_current loop
  perform private.validate_appearance_config(item.element_key,item.config);
  if item.legacy_initial_config is not null then perform private.validate_appearance_config(item.element_key,item.legacy_initial_config);end if;
 end loop;
end $$;

create function private.initialize_presentation_origin()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.initial_config:=new.config;
 new.projection_state:=private.presentation_projection(new.element_key);
 new.legacy_initial_config:=null;
 return new;
end $$;
revoke all on function private.initialize_presentation_origin() from public,anon,authenticated;
create trigger admin_appearance_initial_origin before insert on public.admin_appearance_current
for each row execute function private.initialize_presentation_origin();

-- One canonical projection transaction, carrying the target branch's drift guards.
drop trigger admin_appearance_card_services_projection on public.admin_appearance_current;
drop trigger admin_appearance_icon_projection on public.admin_appearance_current;
drop trigger admin_appearance_favicon_projection on public.admin_appearance_current;
create function private.project_reconciled_presentation()
returns trigger language plpgsql security definer set search_path='' as $$
declare slot_key text:=split_part(new.element_key,'/',2); observed jsonb;
begin
 if new.initial_config is distinct from old.initial_config
    or new.legacy_initial_config is distinct from old.legacy_initial_config then
  raise exception 'Initial presentation history is immutable' using errcode='42501';
 end if;
 if new.element_key='site-favicon' then
  perform 1 from public.site_favicon where id for update;
 elsif new.element_key like 'listing-display/%' then
  perform 1 from public.listing_display_options where slot=slot_key for update;
 elsif new.element_key like 'site-icon/%' or new.element_key like 'icon-catalog/%' then
  perform 1 from public.site_icon_slots where slot=slot_key for update;
  perform 1 from public.site_icon_overrides where slot=slot_key for update;
 else
  new.projection_state:=old.projection_state;return new;
 end if;
 observed:=private.presentation_projection(new.element_key);
 if observed is distinct from old.projection_state then
  raise exception 'Public presentation changed outside review; reconcile before publishing' using errcode='PT409';
 end if;
 if new.revision<>old.revision+1 then
  raise exception 'Presentation changes require a new reviewed revision' using errcode='23514';
 end if;
 perform private.validate_appearance_config(new.element_key,new.config);
 if new.element_key='site-favicon' then
  update public.site_favicon set previous_png=png,png=new.config->>'png',
    revision=revision+1,updated_at=clock_timestamp() where id;
  if not found then raise exception 'Favicon singleton missing' using errcode='23514';end if;
 elsif new.element_key like 'listing-display/%' then
  update public.listing_display_options set enabled=coalesce((new.config->'all'->>'enabled')::boolean,true),
    updated_at=clock_timestamp() where slot=slot_key;
  if not found then raise exception 'Display binding missing' using errcode='23514';end if;
 else
  if new.element_key like 'icon-catalog/%' then
   if old.revision>0 or new.config='{}'::jsonb then raise exception 'Catalogue creation publishes once; edit its icon separately' using errcode='22023';end if;
   if (select count(*) from public.site_icon_slots)>=128 then raise exception 'Icon catalogue supports at most 128 choices' using errcode='22023';end if;
   insert into public.site_icon_slots(slot,label,listing_kind) values(slot_key,trim(new.config->>'label'),new.config->>'kind');
  elsif new.config='{}'::jsonb and exists(select 1 from public.site_icon_slots where slot=slot_key and listing_kind is not null) then
   raise exception 'Custom listing icons require artwork' using errcode='22023';
  end if;
  if new.config='{}'::jsonb then delete from public.site_icon_overrides where slot=slot_key;
  else
   insert into public.site_icon_overrides(slot,source_slot,path_d) values(slot_key,new.config->>'source_slot',new.config->>'path_d')
   on conflict(slot) do update set source_slot=excluded.source_slot,path_d=excluded.path_d,updated_at=clock_timestamp();
  end if;
  insert into public.site_icon_revisions(slot,source_slot,path_d,actor_id)
   values(slot_key,new.config->>'source_slot',new.config->>'path_d',new.updated_by);
  if new.element_key like 'icon-catalog/%' then
   insert into public.admin_appearance_current(element_key,revision,config)
    values('site-icon/'||slot_key,0,jsonb_build_object('path_d',new.config->'path_d'));
  end if;
 end if;
 new.projection_state:=private.presentation_projection(new.element_key);
 return new;
end $$;
revoke all on function private.project_reconciled_presentation() from public,anon,authenticated;
create trigger admin_appearance_reconciled_projection before update on public.admin_appearance_current
for each row execute function private.project_reconciled_presentation();

create function private.appearance_audit_config(p_key text,p_config jsonb)
returns jsonb language sql immutable set search_path='' as $$
 select case when p_key<>'site-favicon' or p_config='{}'::jsonb then p_config
 else jsonb_build_object('pngSha256',encode(sha256(decode(substr(p_config->>'png',23),'base64')),'hex'),
   'pngBytes',octet_length(decode(substr(p_config->>'png',23),'base64'))) end
$$;
revoke all on function private.appearance_audit_config(text,jsonb) from public,anon,authenticated;

-- Initial history adds no fabricated actor/time/publication and remains bounded.
create or replace function public.admin_appearance_history(p_element_key text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare earlier jsonb; initial jsonb;begin
 if not private.admin_can('appearance_draft') then raise exception 'Verified editor required' using errcode='42501';end if;
 perform private.validate_appearance_config(p_element_key,'{}'::jsonb);
 select initial_config,legacy_initial_config into initial,earlier from public.admin_appearance_current where element_key=p_element_key;
 return coalesce((select jsonb_agg(to_jsonb(h) order by revision desc) from (
  select revision,config,actor_id,reason,published_at from (
   select revision,config,actor_id,reason,published_at from public.admin_appearance_revisions
   where element_key=p_element_key order by revision desc limit (case when earlier is null then 19 else 18 end)
  ) recent
  union all select 0::bigint,initial,null::uuid,'Initial published settings',null::timestamptz where initial is not null
  union all select -1::bigint,earlier,null::uuid,'Previous favicon before reviewed editor',null::timestamptz where earlier is not null
 ) h),'[]'::jsonb);
end $$;
create or replace function public.admin_appearance_restore_draft(p_element_key text,p_from_revision bigint,
 p_expected_draft_version bigint,p_expected_published_revision bigint)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare config_value jsonb;begin
 if not private.admin_can('appearance_publish') then raise exception 'Owner verification required' using errcode='42501';end if;
 perform private.validate_appearance_config(p_element_key,'{}'::jsonb);
 select config into config_value from public.admin_appearance_revisions where element_key=p_element_key and revision=p_from_revision;
 if p_from_revision=0 then select initial_config into config_value from public.admin_appearance_current where element_key=p_element_key;end if;
 if p_element_key='site-favicon' and p_from_revision=-1 then select legacy_initial_config into config_value from public.admin_appearance_current where element_key=p_element_key;end if;
 if config_value is null then raise exception 'Previous published revision not found' using errcode='22023';end if;
 return public.admin_appearance_save_draft(p_element_key,config_value,p_expected_draft_version,p_expected_published_revision);
end $$;
revoke all on function public.admin_appearance_history(text),public.admin_appearance_restore_draft(text,bigint,bigint,bigint) from public,anon;
grant execute on function public.admin_appearance_history(text),public.admin_appearance_restore_draft(text,bigint,bigint,bigint) to authenticated;
comment on column public.admin_appearance_current.initial_config is 'Immutable pre-release baseline for reviewed revision-zero recovery; no invented actor or publication time.';
comment on column public.admin_appearance_current.legacy_initial_config is 'Immutable earlier legacy favicon when positive legacy revision establishes that it existed.';
comment on column public.admin_appearance_current.projection_state is 'Private last-projected public values for fail-closed out-of-band drift checks.';
-- AUDIT_RECONCILIATION_BEGIN
-- Preserve original publisher/trigger bodies, adding only target-branch asset summaries.
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
revoke all on function private.audit_admin_appearance_draft() from public,anon,authenticated;
revoke all on function public.admin_appearance_publish(text,bigint,bigint,text,uuid) from public,anon;
grant execute on function public.admin_appearance_publish(text,bigint,bigint,text,uuid) to authenticated;

-- Cached immediate-setter signatures remain closed, with the target's fixed-role
-- verification and actionable reload guidance; no alternate write is restored.
create or replace function public.admin_set_listing_display_option(p_slot text,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.admin_can('appearance_draft') then raise exception 'Verified editor required' using errcode='42501';end if;
 raise exception 'Reload the admin page. Save and review a private display draft before publishing.' using errcode='PT409';
end $$;
create or replace function public.admin_set_site_icon(p_slot text,p_source_slot text default null,p_path_d text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.admin_can('appearance_draft') then raise exception 'Verified editor required' using errcode='42501';end if;
 raise exception 'Reload the admin page. Save and review a private icon draft before publishing.' using errcode='PT409';
end $$;
create or replace function public.admin_add_listing_icon(p_label text,p_kind text,p_path_d text)
returns text language plpgsql security definer set search_path='' as $$
begin
 if not private.admin_can('appearance_draft') then raise exception 'Verified editor required' using errcode='42501';end if;
 raise exception 'Reload the admin page. Save and review a private catalogue proposal before publishing.' using errcode='PT409';
end $$;
create or replace function public.admin_set_favicon(p_png text,p_revision integer,p_restore boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.admin_can('appearance_draft') then raise exception 'Verified editor required' using errcode='42501';end if;
 raise exception 'Reload the admin page. Save and review a private favicon draft before publishing.' using errcode='PT409';
end $$;
revoke all on function public.admin_set_listing_display_option(text,boolean),public.admin_set_site_icon(text,text,text),public.admin_add_listing_icon(text,text,text),public.admin_set_favicon(text,integer,boolean) from public,anon;
grant execute on function public.admin_set_listing_display_option(text,boolean),public.admin_set_site_icon(text,text,text),public.admin_add_listing_icon(text,text,text),public.admin_set_favicon(text,integer,boolean) to authenticated;
