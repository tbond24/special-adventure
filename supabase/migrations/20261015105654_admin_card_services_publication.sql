-- Stage 3 development slice: the existing optional card-service icon group.
-- Candidate only. No production execution or historical migration replay.
-- Adopt the already-public legacy value; do not publish a new appearance here.

alter table public.admin_appearance_current drop constraint admin_appearance_current_element_key_check;
alter table public.admin_appearance_current add constraint admin_appearance_current_element_key_check
  check (element_key in ('listing-detail/save-button','listing-display/card-services'));
alter table public.admin_appearance_drafts drop constraint admin_appearance_drafts_element_key_check;
alter table public.admin_appearance_drafts add constraint admin_appearance_drafts_element_key_check
  check (element_key in ('listing-detail/save-button','listing-display/card-services'));
alter table public.admin_appearance_revisions drop constraint admin_appearance_revisions_element_key_check;
alter table public.admin_appearance_revisions add constraint admin_appearance_revisions_element_key_check
  check (element_key in ('listing-detail/save-button','listing-display/card-services'));

-- Existing Save-button bounds remain byte-for-byte in the branch below.
create or replace function private.validate_appearance_config(p_element_key text,p_config jsonb)
returns void language plpgsql set search_path='' as $$
declare sc record; field record; t text; n integer;
begin
 if p_config is null or jsonb_typeof(p_config)<>'object'
    or length(p_config::text)>4096 then
   raise exception 'Appearance config must be a bounded object' using errcode='22023';
 end if;
 if p_element_key='listing-display/card-services' then
   if p_config='{}'::jsonb or coalesce(
     jsonb_typeof(p_config->'all'->'enabled')='boolean' and
     p_config=jsonb_build_object('all',jsonb_build_object('enabled',p_config->'all'->'enabled')),
     false) then return; end if;
   raise exception 'Service icons accept only a shared boolean display setting' using errcode='22023';
 end if;
 if p_element_key <> 'listing-detail/save-button' or p_element_key is null then
   raise exception 'Unregistered appearance element' using errcode='22023';
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
revoke all on function private.validate_appearance_config(text,jsonb) from public,anon,authenticated;

do $baseline$
begin
  if not exists(select 1 from public.listing_display_options where slot='card-services') then
    raise exception 'Existing service-icon display setting is required';
  end if;
  insert into public.admin_appearance_current(element_key,revision,config)
    select 'listing-display/card-services',0,jsonb_build_object('all',jsonb_build_object('enabled',enabled))
    from public.listing_display_options where slot='card-services';
end
$baseline$;

-- Publish the existing public projection inside the same transaction as the
-- appearance revision and audit. An audit rejection rolls this UPDATE back too.
create function private.publish_card_services_projection()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.element_key='listing-display/card-services' and new.revision>0 then
    perform private.validate_appearance_config(new.element_key,new.config);
    update public.listing_display_options
      set enabled=coalesce((new.config->'all'->>'enabled')::boolean,true),updated_at=now()
      where slot='card-services';
    if not found then
      raise exception 'Public service-icon binding is unavailable' using errcode='22023';
    end if;
  end if;
  return new;
end
$$;
revoke all on function private.publish_card_services_projection() from public,anon,authenticated;
create trigger admin_appearance_card_services_projection
after insert or update on public.admin_appearance_current
for each row execute function private.publish_card_services_projection();

-- Close this slot's old mutation path, including cached admin clients. The
-- remaining legacy display switches retain their existing working contract.
create or replace function public.admin_set_listing_display_option(p_slot text,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.is_admin((select auth.uid())) then
    raise exception 'Not an MFA-verified administrator' using errcode='42501';
  end if;
  if p_slot='card-services' then
    raise exception 'Save and review a private service-icon draft before publishing' using errcode='PT409';
  end if;
  update public.listing_display_options set enabled=coalesce(p_enabled,false),updated_at=now() where slot=p_slot;
  if not found then raise exception 'Unknown listing detail' using errcode='22023'; end if;
end
$$;
revoke all on function public.admin_set_listing_display_option(text,boolean) from public,anon,authenticated;
grant execute on function public.admin_set_listing_display_option(text,boolean) to authenticated;

-- Both registered keys contain only safe published presentation values. Drafts,
-- revisions, actors and customer content never enter this anonymous response.
create or replace function public.site_appearance_published()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('key',element_key,'revision',revision,'config',config)
   order by element_key),'[]'::jsonb)
 from public.admin_appearance_current where revision>0
   and element_key in ('listing-detail/save-button','listing-display/card-services')
$$;
revoke all on function public.site_appearance_published() from public;
grant execute on function public.site_appearance_published() to anon,authenticated;
