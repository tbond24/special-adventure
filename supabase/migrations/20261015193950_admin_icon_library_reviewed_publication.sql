-- Stage 3 icon artwork and additive listing catalog. Candidate only.
create function private.icon_library_snapshot()
returns jsonb language sql stable set search_path='' as $snapshot$
 select jsonb_build_object('icons',coalesce(jsonb_object_agg(s.slot,
   jsonb_build_object('label',s.label,'kind',s.listing_kind,'source',o.source_slot,'path',o.path_d)
   order by s.slot),'{}'::jsonb))
 from public.site_icon_slots s left join public.site_icon_overrides o using(slot)
$snapshot$;
revoke all on function private.icon_library_snapshot() from public,anon,authenticated;

create function private.validate_icon_library(p_config jsonb)
returns void language plpgsql stable set search_path='' as $validate$
declare item record; existing public.site_icon_slots; entry jsonb; src text; path text; label text; kind text;
begin
 if p_config is null or jsonb_typeof(p_config)<>'object' or length(p_config::text)>200000
    or (select count(*) from jsonb_object_keys(p_config))<>1 or not p_config ? 'icons'
    or jsonb_typeof(p_config->'icons')<>'object' then
   raise exception 'Use a bounded icon library snapshot' using errcode='22023';
 end if;
 if (select count(*) from jsonb_object_keys(p_config->'icons')) not between 1 and 128
    or exists(select 1 from public.site_icon_slots s where not (p_config->'icons') ? s.slot) then
   raise exception 'Keep all published icon slots; at most 128 are supported' using errcode='22023';
 end if;
 for item in select key,value from jsonb_each(p_config->'icons') loop
   entry:=item.value;
   if jsonb_typeof(entry)<>'object' or (select count(*) from jsonb_object_keys(entry))<>4
      or not entry ?& array['label','kind','source','path']
      or jsonb_typeof(entry->'label')<>'string'
      or jsonb_typeof(entry->'kind') not in ('string','null')
      or jsonb_typeof(entry->'source') not in ('string','null')
      or jsonb_typeof(entry->'path') not in ('string','null') then
     raise exception 'Unsupported icon fields' using errcode='22023';
   end if;
   label:=entry->>'label';kind:=entry->>'kind';src:=entry->>'source';path:=entry->>'path';
   if label<>trim(label) or length(label) not between 2 and 60
      or (kind is not null and kind not in ('amenity','utility')) then
     raise exception 'Choose a category and a name of 2-60 characters' using errcode='22023';
   end if;
   select * into existing from public.site_icon_slots where slot=item.key;
   if found then
     if existing.label is distinct from label or existing.listing_kind is distinct from kind then
       raise exception 'Published icon names and categories cannot be changed' using errcode='22023';
     end if;
   elsif item.key !~ '^custom-[0-9a-f]{32}$' or kind is null then
     raise exception 'New listing choices require a stable custom ID and category' using errcode='22023';
   end if;
   if src is not null and (path is not null or not exists(
       select 1 from public.site_icon_slots where slot=src and listing_kind is null)) then
     raise exception 'Choose one compiled built-in source' using errcode='22023';
   end if;
   if path is not null and (length(path) not between 3 and 1200
      or path !~ '^[MmLlHhVvCcSsQqTtAaZz0-9 .,+-]+$') then
     raise exception 'Use a supported SVG path' using errcode='22023';
   end if;
   if kind is not null and src is null and path is null then
     raise exception 'Listing choices require icon artwork' using errcode='22023';
   end if;
 end loop;
 if exists(select 1 from jsonb_each(p_config->'icons') e where e.value->>'kind' is not null
   group by e.value->>'kind',lower(e.value->>'label') having count(*)>1) then
   raise exception 'A listing choice with this name and category already exists' using errcode='22023';
 end if;
end
$validate$;
revoke all on function private.validate_icon_library(jsonb) from public,anon,authenticated;

alter table public.admin_appearance_current drop constraint admin_appearance_current_element_key_check,
 add constraint admin_appearance_current_element_key_check
 check(element_key in ('listing-detail/save-button','site/listing-display','site/favicon','site/icon-library'));
alter table public.admin_appearance_drafts drop constraint admin_appearance_drafts_element_key_check,
 add constraint admin_appearance_drafts_element_key_check
 check(element_key in ('listing-detail/save-button','site/listing-display','site/favicon','site/icon-library'));
alter table public.admin_appearance_revisions drop constraint admin_appearance_revisions_element_key_check,
 add constraint admin_appearance_revisions_element_key_check
 check(element_key in ('listing-detail/save-button','site/listing-display','site/favicon','site/icon-library'));

-- ICON_SEED_BEGIN
insert into public.admin_appearance_current(element_key,config,initial_config)
select 'site/icon-library',private.icon_library_snapshot(),private.icon_library_snapshot();
-- ICON_SEED_END
do $baseline$ begin
 perform private.validate_icon_library((select config from public.admin_appearance_current where element_key='site/icon-library'));
end $baseline$;

create function private.project_reviewed_icon_library()
returns trigger language plpgsql security definer set search_path='' as $projection$
declare item record; entry jsonb;
begin
 perform private.validate_icon_library(new.config);
 if tg_table_name='admin_appearance_current' then
   if new.initial_config is distinct from old.initial_config then
     raise exception 'Initial icon snapshot is immutable' using errcode='42501';
   end if;
   -- The publisher holds the existing global appearance transaction lock.
   -- Cached writes are closed below; refuse any privileged out-of-band drift.
   if private.icon_library_snapshot() is distinct from old.config then
     raise exception 'Icon library changed outside review; reconcile before publishing' using errcode='PT409';
   end if;
   for item in select key,value from jsonb_each(new.config->'icons') order by key loop
     entry:=item.value;
     if entry is not distinct from (old.config->'icons'->item.key) then continue;end if;
     insert into public.site_icon_slots(slot,label,listing_kind)
       values(item.key,entry->>'label',entry->>'kind') on conflict do nothing;
     if entry->>'source' is null and entry->>'path' is null then
       delete from public.site_icon_overrides where slot=item.key;
     else
       insert into public.site_icon_overrides(slot,source_slot,path_d)
       values(item.key,entry->>'source',entry->>'path') on conflict(slot)
       do update set source_slot=excluded.source_slot,path_d=excluded.path_d,updated_at=now();
     end if;
     insert into public.site_icon_revisions(slot,source_slot,path_d,actor_id)
       values(item.key,entry->>'source',entry->>'path',new.updated_by);
   end loop;
 end if;
 return new;
end
$projection$;
revoke all on function private.project_reviewed_icon_library() from public,anon,authenticated;
create trigger admin_icon_library_draft_valid before insert or update on public.admin_appearance_drafts
for each row when(new.element_key='site/icon-library') execute function private.project_reviewed_icon_library();
create trigger admin_icon_library_publication before update on public.admin_appearance_current
for each row when(new.element_key='site/icon-library') execute function private.project_reviewed_icon_library();
create or replace function private.validate_appearance_config(p_element_key text,p_config jsonb)
returns void language plpgsql set search_path='' as $$
declare sc record; field record; t text; n integer;
begin
 if p_element_key='site/icon-library' then
   if p_config='{}'::jsonb then return;end if;
   perform private.validate_icon_library(p_config);return;
 end if;
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
 if p_element_key in ('site/listing-display','site/favicon','site/icon-library') then
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
 if p_element_key in ('site/listing-display','site/favicon','site/icon-library') and p_from_revision=0 then
   select initial_config into v_config from public.admin_appearance_current where element_key=p_element_key;
 end if;
 if p_element_key='site/favicon' and p_from_revision=-1 then
   select favicon_initial_previous into v_config from public.admin_appearance_current where element_key=p_element_key;
 end if;
 if v_config is null then
   raise exception 'Previous published revision not found' using errcode='22023';
 end if;
 if p_element_key='site/icon-library' then
   -- Never delete catalog choices that customer listings may reference.
   v_config:=jsonb_build_object('icons',(private.icon_library_snapshot()->'icons') || (v_config->'icons'));
 end if;
 return public.admin_appearance_save_draft(
   p_element_key,v_config,p_expected_draft_version,p_expected_published_revision);
end
$$;
create or replace function public.admin_set_site_icon(p_slot text,p_source_slot text default null,p_path_d text default null)
returns void language plpgsql security definer set search_path='' as $legacy$
begin
 if not private.admin_can('appearance_draft') then
   raise exception 'Verified appearance editor required' using errcode='42501';
 end if;
 raise exception 'Reload the admin page. Save a private icon library draft and ask an Owner to review and publish it.' using errcode='PT409';
end
$legacy$;
create or replace function public.admin_add_listing_icon(p_label text,p_kind text,p_path_d text)
returns text language plpgsql security definer set search_path='' as $legacy$
begin
 if not private.admin_can('appearance_draft') then
   raise exception 'Verified appearance editor required' using errcode='42501';
 end if;
 raise exception 'Reload the admin page. Save a private icon library draft and ask an Owner to review and publish it.' using errcode='PT409';
end
$legacy$;

create or replace function public.admin_appearance_save_draft(
 p_element_key text,p_config jsonb,
 p_expected_draft_version bigint,p_expected_published_revision bigint)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_actor uuid := (select auth.uid()); v_revision bigint; v_draft_version bigint; v_new bigint;
begin
 if not private.admin_can('appearance_draft') then
   raise exception 'Verified editor required' using errcode='42501';
 end if;
 -- Icon additions change required membership: report stale versions before validating a current snapshot.
 if p_element_key<>'site/icon-library' then
   perform private.validate_appearance_config(p_element_key,p_config);
 end if;
 if p_expected_draft_version is null or p_expected_published_revision is null then
   raise exception 'Expected versions are required' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(2026101402::bigint);
 select revision into v_revision from public.admin_appearance_current
 where element_key=p_element_key;
 if coalesce(v_revision,0) <> p_expected_published_revision then
   raise exception 'Published appearance changed; reload before editing' using errcode='PT409';
 end if;
 select version into v_draft_version from public.admin_appearance_drafts
 where actor_id=v_actor and element_key=p_element_key for update;
 if coalesce(v_draft_version,0) <> p_expected_draft_version then
   raise exception 'Draft changed in another tab; reload before saving' using errcode='PT409';
 end if;
 if p_element_key='site/icon-library' then
   perform private.validate_icon_library(p_config);
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

