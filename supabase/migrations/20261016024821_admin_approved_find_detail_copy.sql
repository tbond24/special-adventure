-- Development only. Six explicitly approved existing bindings; no customer data.
alter function private.validate_appearance_config(text,jsonb) rename to validate_preapproved_appearance_config;
create function private.validate_appearance_config(p_element_key text,p_config jsonb)
returns void language plpgsql set search_path='' as $$
declare sc record; f record; normalized jsonb:=p_config; v_text text;
begin
 if p_element_key in ('listing-detail/about-heading','listing-detail/features-heading','find/search-button','find/listing-card','listing-detail/back-button','listing-detail/share-button') then
  if p_config is null or jsonb_typeof(p_config)<>'object' or octet_length(p_config::text)>4096 then raise exception 'Bounded appearance object required' using errcode='22023'; end if;
  if p_element_key in ('listing-detail/about-heading','listing-detail/features-heading') then
   if p_config='{}'::jsonb then return; end if;
   v_text:=p_config->'all'->>'text';
   if jsonb_typeof(p_config->'all'->'text')='string'
     and p_config=jsonb_build_object('all',jsonb_build_object('text',p_config->'all'->'text'))
     and char_length(v_text) between 1 and 80 and v_text=btrim(v_text)
     and v_text !~ '[<>[:cntrl:]]' then return; end if;
   raise exception 'Only one bounded English plain-text heading is approved' using errcode='22023';
  end if;
  if p_element_key='find/listing-card' then
   for sc in select key,value from jsonb_each(p_config) loop
    if sc.key not in ('all','mobile','desktop') or jsonb_typeof(sc.value)<>'object' then raise exception 'Unsupported card scope' using errcode='22023'; end if;
    for f in select key,value from jsonb_each(sc.value) loop
     if f.key in ('padding_top','padding_right','padding_bottom','padding_left') then
      if jsonb_typeof(f.value)<>'number' or f.value::text !~ '^(0|[1-9][0-9]?)$' or (f.value::text)::integer>32 then raise exception 'Card padding must be 0 to 32 pixels' using errcode='22023'; end if;
      normalized:=normalized#-array[sc.key,f.key];
     elsif f.key not in ('radius','background','border_width','border_colour','shadow','margin_top','margin_right','margin_bottom','margin_left') then
      raise exception 'Card frame cannot hide or constrain mandatory content' using errcode='22023';
     end if;
    end loop;
   end loop;
  end if;
  perform private.validate_display_appearance_config('listing-detail/save-button',normalized);
  return;
 end if;
 perform private.validate_preapproved_appearance_config(p_element_key,p_config);
end $$;
revoke all on function private.validate_appearance_config(text,jsonb),private.validate_preapproved_appearance_config(text,jsonb) from public,anon,authenticated;

alter table public.admin_appearance_current drop constraint admin_appearance_current_element_key_check;
alter table public.admin_appearance_current add constraint admin_appearance_current_element_key_check check(element_key in ('listing-detail/save-button','site-favicon','create-listing/language-selector','edit-listing/language-selector','find/search-button','find/listing-card','listing-detail/back-button','listing-detail/share-button','listing-detail/about-heading','listing-detail/features-heading') or element_key like 'listing-display/%' or element_key like 'site-icon/%' or element_key ~ '^icon-catalog/custom-[0-9a-f]{32}$');
alter table public.admin_appearance_drafts drop constraint admin_appearance_drafts_element_key_check;
alter table public.admin_appearance_drafts add constraint admin_appearance_drafts_element_key_check check(element_key in ('listing-detail/save-button','site-favicon','create-listing/language-selector','edit-listing/language-selector','find/search-button','find/listing-card','listing-detail/back-button','listing-detail/share-button','listing-detail/about-heading','listing-detail/features-heading') or element_key like 'listing-display/%' or element_key like 'site-icon/%' or element_key ~ '^icon-catalog/custom-[0-9a-f]{32}$');
alter table public.admin_appearance_revisions drop constraint admin_appearance_revisions_element_key_check;
alter table public.admin_appearance_revisions add constraint admin_appearance_revisions_element_key_check check(element_key in ('listing-detail/save-button','site-favicon','create-listing/language-selector','edit-listing/language-selector','find/search-button','find/listing-card','listing-detail/back-button','listing-detail/share-button','listing-detail/about-heading','listing-detail/features-heading') or element_key like 'listing-display/%' or element_key like 'site-icon/%' or element_key ~ '^icon-catalog/custom-[0-9a-f]{32}$');

create or replace function public.site_appearance_published()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('key',element_key,'revision',revision,'config',config) order by element_key),'[]'::jsonb)
 from public.admin_appearance_current where revision>0 and
 (element_key in ('listing-detail/save-button','site-favicon','create-listing/language-selector','edit-listing/language-selector','find/search-button','find/listing-card','listing-detail/back-button','listing-detail/share-button','listing-detail/about-heading','listing-detail/features-heading') or element_key like 'listing-display/%' or element_key like 'site-icon/%' or element_key like 'icon-catalog/%')
$$;
revoke all on function public.site_appearance_published() from public;
grant execute on function public.site_appearance_published() to anon,authenticated;
