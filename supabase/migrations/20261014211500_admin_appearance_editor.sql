-- Stage 2 (development branch, unapplied to production): one bounded page element.
-- Requires Stage 1 fixed capabilities and immutable admin_change_audit.
-- No arbitrary selector or CSS text ever crosses the trust boundary.

create table public.admin_appearance_current (
  element_key text primary key
    check (element_key = 'listing-detail/save-button'),
  revision bigint not null default 0 check (revision >= 0),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  updated_at timestamptz,
  updated_by uuid
);
alter table public.admin_appearance_current enable row level security;
revoke all on public.admin_appearance_current from public, anon, authenticated;

create table public.admin_appearance_drafts (
  actor_id uuid not null,
  element_key text not null check (element_key='listing-detail/save-button'),
  version bigint not null check (version > 0),
  base_revision bigint not null check (base_revision >= 0),
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (actor_id,element_key)
);
alter table public.admin_appearance_drafts enable row level security;
revoke all on public.admin_appearance_drafts from public, anon, authenticated;

-- Every private draft mutation is included in the append-only application
-- audit, in the *same transaction* as the draft row. The trigger uses a server
-- request ID so existing save callers need no new client-side authority.
create function private.audit_admin_appearance_draft()
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
      'before',case when tg_op='UPDATE' then old.config else '{}'::jsonb end,
      'after',new.config
    )
  );
  return new;
end
$appearance_audit$;
revoke all on function private.audit_admin_appearance_draft()
from public,anon,authenticated;
create trigger admin_appearance_draft_audit
after insert or update on public.admin_appearance_drafts
for each row execute function private.audit_admin_appearance_draft();

create table public.admin_appearance_revisions (
  id bigint generated always as identity primary key,
  element_key text not null check (element_key='listing-detail/save-button'),
  revision bigint not null check (revision > 0),
  config jsonb not null check (jsonb_typeof(config)='object'),
  actor_id uuid not null,
  reason text not null check (length(trim(reason)) between 3 and 500),
  request_id uuid not null,
  source_draft_version bigint not null check (source_draft_version > 0),
  published_at timestamptz not null default now(),
  unique (element_key,revision),
  unique (actor_id,request_id)
);
create index admin_appearance_history_idx
on public.admin_appearance_revisions(element_key,revision desc);
alter table public.admin_appearance_revisions enable row level security;
revoke all on public.admin_appearance_revisions from public, anon, authenticated;

create trigger admin_appearance_revisions_no_rewrite
before update or delete on public.admin_appearance_revisions
for each row execute function private.reject_admin_audit_rewrite();

-- Keep releases, including historical revisions, immutable.
create trigger admin_appearance_revisions_no_truncate
before truncate on public.admin_appearance_revisions
for each statement execute function private.reject_admin_audit_rewrite();

create function private.validate_appearance_config(p_element_key text,p_config jsonb)
returns void language plpgsql set search_path='' as $$
declare sc record; field record; t text; n integer;
begin
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
revoke all on function private.validate_appearance_config(text,jsonb)
from public,anon,authenticated;

create function public.admin_appearance_state(p_element_key text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_current record; v_draft record; v_actor uuid := (select auth.uid());
begin
 if not private.admin_can('appearance_draft') then
   raise exception 'Verified appearance editor required' using errcode='42501';
 end if;
 perform private.validate_appearance_config(p_element_key,'{}'::jsonb);
 select revision,config into v_current from public.admin_appearance_current
 where element_key=p_element_key;
 select version,base_revision,config into v_draft from public.admin_appearance_drafts
 where element_key=p_element_key and actor_id=v_actor;
 return jsonb_build_object(
   'published',jsonb_build_object('revision',coalesce(v_current.revision,0),
                                 'config',coalesce(v_current.config,'{}'::jsonb)),
   'draft',case when v_draft.version is null then null else jsonb_build_object(
       'version',v_draft.version,'baseRevision',v_draft.base_revision,'config',v_draft.config) end,
   'canPublish',private.admin_can('appearance_publish'));
end
$$;

create function public.admin_appearance_save_draft(
 p_element_key text,p_config jsonb,
 p_expected_draft_version bigint,p_expected_published_revision bigint)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid()); v_revision bigint; v_draft_version bigint; v_new bigint;
begin
 if not private.admin_can('appearance_draft') then
   raise exception 'Verified editor required' using errcode='42501';
 end if;
 perform private.validate_appearance_config(p_element_key,p_config);
 if p_expected_draft_version is null or p_expected_published_revision is null then
   raise exception 'Expected versions are required' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(2026101402::bigint);
 select revision into v_revision from public.admin_appearance_current
 where element_key=p_element_key;
 if coalesce(v_revision,0) <> p_expected_published_revision then
   raise exception 'Published appearance changed; reload before editing' using errcode='40001';
 end if;
 select version into v_draft_version from public.admin_appearance_drafts
 where actor_id=v_actor and element_key=p_element_key for update;
 if coalesce(v_draft_version,0) <> p_expected_draft_version then
   raise exception 'Draft changed in another tab; reload before saving' using errcode='40001';
 end if;
 v_new := coalesce(v_draft_version,0)+1;
 insert into public.admin_appearance_drafts(actor_id,element_key,version,base_revision,config)
 values(v_actor,p_element_key,v_new,p_expected_published_revision,p_config)
 on conflict(actor_id,element_key) do update set
 version=excluded.version,base_revision=excluded.base_revision,
 config=excluded.config,updated_at=now();
 return jsonb_build_object('version',v_new,'baseRevision',p_expected_published_revision,
                           'config',p_config);
end
$$;

create function public.admin_appearance_history(p_element_key text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.admin_can('appearance_draft') then
   raise exception 'Verified editor required' using errcode='42501';
 end if;
 perform private.validate_appearance_config(p_element_key,'{}'::jsonb);
 return coalesce((select jsonb_agg(to_jsonb(h) order by h.revision desc)
   from (select revision,config,actor_id,reason,published_at
     from public.admin_appearance_revisions where element_key=p_element_key
     order by revision desc limit 20) h),'[]'::jsonb);
end
$$;

create function public.admin_appearance_publish(
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
   raise exception 'Published revision changed; review the latest version' using errcode='40001';
 end if;
 select version,base_revision,config into v_draft from public.admin_appearance_drafts
 where actor_id=v_actor and element_key=p_element_key for update;
 if v_draft.version is null or v_draft.version<>p_expected_draft_version
    or v_draft.base_revision<>v_current.revision then
   raise exception 'Saved draft is missing or outdated' using errcode='40001';
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
    jsonb_build_object('before',v_previous,'after',v_draft.config));
 delete from public.admin_appearance_drafts
 where actor_id=v_actor and element_key=p_element_key;
 return jsonb_build_object('revision',v_new_revision,'alreadyApplied',false);
end
$$;

-- Restore is deliberately a new private draft, reviewed and published through
-- the same conflict-safe publish RPC. History is never deleted or overwritten.
create function public.admin_appearance_restore_draft(
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
 if v_config is null then
   raise exception 'Previous published revision not found' using errcode='22023';
 end if;
 return public.admin_appearance_save_draft(
   p_element_key,v_config,p_expected_draft_version,p_expected_published_revision);
end
$$;

-- Public RPC exposes ONLY current published, validated styles (no drafts, actors,
-- audit, role assignments, or customer values); empty styles preserve code CSS.
create function public.site_appearance_published()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('key',element_key,
   'revision',revision,'config',config)),'[]'::jsonb)
 from public.admin_appearance_current
 where revision>0 and element_key='listing-detail/save-button'
$$;

revoke all on function public.admin_appearance_state(text) from public,anon;
revoke all on function public.admin_appearance_save_draft(text,jsonb,bigint,bigint) from public,anon;
revoke all on function public.admin_appearance_history(text) from public,anon;
revoke all on function public.admin_appearance_publish(text,bigint,bigint,text,uuid) from public,anon;
revoke all on function public.admin_appearance_restore_draft(text,bigint,bigint,bigint) from public,anon;
revoke all on function public.site_appearance_published() from public;
grant execute on function public.admin_appearance_state(text) to authenticated;
grant execute on function public.admin_appearance_save_draft(text,jsonb,bigint,bigint) to authenticated;
grant execute on function public.admin_appearance_history(text) to authenticated;
grant execute on function public.admin_appearance_publish(text,bigint,bigint,text,uuid) to authenticated;
grant execute on function public.admin_appearance_restore_draft(text,bigint,bigint,bigint) to authenticated;
grant execute on function public.site_appearance_published() to anon,authenticated;

comment on table public.admin_appearance_current is
  'One allowlisted public page element, code defaults until approved publication.';
comment on table public.admin_appearance_drafts is
  'Actor-private appearance drafts; no public access.';
comment on table public.admin_appearance_revisions is
  'Immutable published appearance snapshots; restore creates new versions.';
