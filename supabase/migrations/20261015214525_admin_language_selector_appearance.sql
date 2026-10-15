-- Development only. Two exact page instances; existing draft/publish/audit workflow.
alter function private.validate_appearance_config(text,jsonb) rename to validate_prelanguage_appearance_config;
create function private.validate_appearance_config(p_element_key text,p_config jsonb)
returns void language plpgsql set search_path='' as $$
declare sc record; normalized jsonb:=p_config;
begin
 if p_element_key in ('create-listing/language-selector','edit-listing/language-selector') then
  if p_config is null or jsonb_typeof(p_config)<>'object' or length(p_config::text)>4096 then
   raise exception 'Appearance config must be a bounded object' using errcode='22023';
  end if;
  for sc in select key,value from jsonb_each(p_config) loop
   if jsonb_typeof(sc.value)='object' and sc.value ? 'width' then
    if jsonb_typeof(sc.value->'width')<>'string' or sc.value->>'width' not in ('auto','120px','160px','200px','240px') then
     raise exception 'Unsupported language selector width' using errcode='22023';
    end if;
    normalized:=jsonb_set(normalized,array[sc.key,'width'],'"auto"'::jsonb);
   end if;
  end loop;
  -- Reuse frozen style bounds/scopes, without accepting Save's narrow widths.
  perform private.validate_display_appearance_config('listing-detail/save-button',normalized);
  return;
 end if;
 perform private.validate_prelanguage_appearance_config(p_element_key,p_config);
end $$;
revoke all on function private.validate_appearance_config(text,jsonb) from public,anon,authenticated;
revoke all on function private.validate_prelanguage_appearance_config(text,jsonb) from public,anon,authenticated;

alter table public.admin_appearance_current drop constraint admin_appearance_current_element_key_check;
alter table public.admin_appearance_current add constraint admin_appearance_current_element_key_check check(element_key in ('listing-detail/save-button','site-favicon','create-listing/language-selector','edit-listing/language-selector') or element_key like 'listing-display/%' or element_key like 'site-icon/%' or element_key ~ '^icon-catalog/custom-[0-9a-f]{32}$');
alter table public.admin_appearance_drafts drop constraint admin_appearance_drafts_element_key_check;
alter table public.admin_appearance_drafts add constraint admin_appearance_drafts_element_key_check check(element_key in ('listing-detail/save-button','site-favicon','create-listing/language-selector','edit-listing/language-selector') or element_key like 'listing-display/%' or element_key like 'site-icon/%' or element_key ~ '^icon-catalog/custom-[0-9a-f]{32}$');
alter table public.admin_appearance_revisions drop constraint admin_appearance_revisions_element_key_check;
alter table public.admin_appearance_revisions add constraint admin_appearance_revisions_element_key_check check(element_key in ('listing-detail/save-button','site-favicon','create-listing/language-selector','edit-listing/language-selector') or element_key like 'listing-display/%' or element_key like 'site-icon/%' or element_key ~ '^icon-catalog/custom-[0-9a-f]{32}$');

create or replace function public.site_appearance_published()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('key',element_key,'revision',revision,'config',config) order by element_key),'[]'::jsonb)
 from public.admin_appearance_current where revision>0 and
 (element_key in ('listing-detail/save-button','site-favicon','create-listing/language-selector','edit-listing/language-selector') or element_key like 'listing-display/%' or element_key like 'site-icon/%' or element_key like 'icon-catalog/%')
$$;
