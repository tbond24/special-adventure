-- Stage 3 development only. Existing public display rows remain the renderer contract.
create function private.validate_listing_display_config(p_config jsonb)
returns void language plpgsql immutable set search_path='' as $display$
declare entry record;
begin
 if p_config is null or jsonb_typeof(p_config)<>'object' or length(p_config::text)>1024 then
   raise exception 'Display settings must be a bounded object' using errcode='22023';
 end if;
 if (select count(*) from jsonb_object_keys(p_config))<>1
    or jsonb_typeof(p_config->'all') is distinct from 'object' then
   raise exception 'Display settings require one shared all-screen snapshot' using errcode='22023';
 end if;
 if (select count(*) from jsonb_object_keys(p_config->'all'))<>10 then
   raise exception 'All ten existing display switches are required' using errcode='22023';
 end if;
 for entry in select key,value from jsonb_each(p_config->'all') loop
   if entry.key not in ('card-services','listing-wifi','listing-parking','listing-furnished',
      'listing-ensuite','listing-bills','listing-security','listing-custom','listing-water','listing-electricity')
      or jsonb_typeof(entry.value)<>'boolean' then
     raise exception 'Unknown display switch or nonboolean value' using errcode='22023';
   end if;
 end loop;
end
$display$;
revoke all on function private.validate_listing_display_config(jsonb) from public,anon,authenticated;

alter table public.admin_appearance_current
 drop constraint admin_appearance_current_element_key_check,
 add constraint admin_appearance_current_element_key_check
 check(element_key in ('listing-detail/save-button','site/listing-display')),
 add column initial_config jsonb;
alter table public.admin_appearance_drafts
 drop constraint admin_appearance_drafts_element_key_check,
 add constraint admin_appearance_drafts_element_key_check
 check(element_key in ('listing-detail/save-button','site/listing-display'));
alter table public.admin_appearance_revisions
 drop constraint admin_appearance_revisions_element_key_check,
 add constraint admin_appearance_revisions_element_key_check
 check(element_key in ('listing-detail/save-button','site/listing-display'));

-- Capture actual values, no invented actor or new publication. Keep revision 0
-- for reviewed rollback. Clients have no table writes, and triggers freeze it.
insert into public.admin_appearance_current(element_key,config,initial_config)
select 'site/listing-display',jsonb_build_object('all',jsonb_object_agg(slot,enabled)),
 jsonb_build_object('all',jsonb_object_agg(slot,enabled))
from public.listing_display_options;
do $baseline$
begin
 perform private.validate_listing_display_config((
   select config from public.admin_appearance_current where element_key='site/listing-display'));
end
$baseline$;
comment on column public.admin_appearance_current.initial_config is
 'Initial listing-display snapshot for revision-zero recovery; not an invented publication.';

-- Publication updates the existing public rows in the SAME transaction as the
-- current snapshot, immutable revision, audit and draft deletion. Failure rolls
-- back all effects. No change to lister facts, rent, moderation or product actions.
create function private.apply_listing_display_snapshot()
returns trigger language plpgsql security definer set search_path='' as $apply$
declare v_rows integer;
begin
 perform private.validate_listing_display_config(new.config);
 if tg_table_name='admin_appearance_current' then
   if tg_op='UPDATE' and new.initial_config is distinct from old.initial_config then
     raise exception 'Initial settings are immutable' using errcode='42501';
   end if;
   update public.listing_display_options d set
     enabled=(new.config->'all'->>d.slot)::boolean,updated_at=now()
   where d.slot in ('card-services','listing-wifi','listing-parking','listing-furnished',
      'listing-ensuite','listing-bills','listing-security','listing-custom','listing-water','listing-electricity');
   get diagnostics v_rows=row_count;
   if v_rows<>10 then
     raise exception 'Existing display switches changed; publication cancelled' using errcode='23514';
   end if;
 end if;
 return new;
end
$apply$;
revoke all on function private.apply_listing_display_snapshot() from public,anon,authenticated;
create trigger admin_listing_display_draft_valid
before insert or update on public.admin_appearance_drafts
for each row when(new.element_key='site/listing-display')
execute function private.apply_listing_display_snapshot();
-- AFTER ignores the publish RPC ON CONFLICT DO NOTHING placeholder insert.
-- Exceptions still roll back the complete publication transaction.
create trigger admin_listing_display_publication
after insert or update on public.admin_appearance_current
for each row when(new.element_key='site/listing-display')
execute function private.apply_listing_display_snapshot();

create or replace function private.validate_appearance_config(p_element_key text,p_config jsonb)
returns void language plpgsql set search_path='' as $$
declare sc record; field record; t text; n integer;
begin
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
 if p_element_key='site/listing-display' then
   return (select jsonb_agg(to_jsonb(h) order by h.revision desc) from (
     select revision,config,actor_id,reason,published_at from (
       select revision,config,actor_id,reason,published_at from public.admin_appearance_revisions
       where element_key=p_element_key order by revision desc limit 20
     ) recent
     union all
     select 0::bigint,initial_config,null::uuid,'Initial published settings',null::timestamptz
     from public.admin_appearance_current where element_key=p_element_key
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
 if p_element_key='site/listing-display' and p_from_revision=0 then
   select initial_config into v_config from public.admin_appearance_current where element_key=p_element_key;
 end if;
 if v_config is null then
   raise exception 'Previous published revision not found' using errcode='22023';
 end if;
 return public.admin_appearance_save_draft(
   p_element_key,v_config,p_expected_draft_version,p_expected_published_revision);
end
$$;

-- Cached immediate-save callers fail closed with a clear upgrade instruction.
create or replace function public.admin_set_listing_display_option(p_slot text,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $legacy$
begin
 if not private.admin_can('appearance_draft') then
   raise exception 'Verified appearance editor required' using errcode='42501';
 end if;
 raise exception 'Reload the admin page. Save a private Listing display draft and ask an Owner to review and publish it.'
   using errcode='PT409';
end
$legacy$;
revoke all on function public.admin_set_listing_display_option(text,boolean) from public,anon,authenticated;
grant execute on function public.admin_set_listing_display_option(text,boolean) to authenticated;

revoke all on function private.validate_appearance_config(text,jsonb) from public,anon,authenticated;
revoke all on function public.admin_appearance_history(text) from public,anon;
revoke all on function public.admin_appearance_restore_draft(text,bigint,bigint,bigint) from public,anon;
grant execute on function public.admin_appearance_history(text) to authenticated;
grant execute on function public.admin_appearance_restore_draft(text,bigint,bigint,bigint) to authenticated;
