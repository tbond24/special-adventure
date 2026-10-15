-- Stage 3: two independent style-only language-selector bindings. Candidate only.
create function private.validate_listing_language_style(p_config jsonb)
returns void language plpgsql set search_path='' as $language$
declare clean jsonb:='{}'::jsonb; scope record; field record;
begin
 if p_config is null or jsonb_typeof(p_config)<>'object' or length(p_config::text)>4096 then
   raise exception 'Language style must be a bounded object' using errcode='22023';
 end if;
 for scope in select key,value from jsonb_each(p_config) loop
   if scope.key not in ('all','mobile','desktop') or jsonb_typeof(scope.value)<>'object' then
     raise exception 'Unsupported viewport scope' using errcode='22023';
   end if;
   for field in select key,value from jsonb_each(scope.value) loop
     if field.key='width' and (jsonb_typeof(field.value)<>'string'
        or field.value#>>'{}' not in ('auto','160px','200px','240px')) then
       raise exception 'Unsupported language-selector width' using errcode='22023';
     elsif field.key in ('padding_top','padding_right','padding_bottom','padding_left')
       and (jsonb_typeof(field.value)<>'number' or field.value::text !~ '^(0|[1-9][0-9]?)$'
         or (field.value::text)::numeric>24) then
       raise exception 'Padding must be an integer from 0 to 24' using errcode='22023';
     end if;
   end loop;
   clean:=clean || jsonb_build_object(scope.key,scope.value-array[
     'width','padding_top','padding_right','padding_bottom','padding_left']);
 end loop;
 -- Reuse the proven numeric, colour, margin, shadow and unknown-field rules.
 perform private.validate_appearance_config('listing-detail/save-button',clean);
end
$language$;
revoke all on function private.validate_listing_language_style(jsonb) from public,anon,authenticated;

alter table public.admin_appearance_current drop constraint admin_appearance_current_element_key_check,
 add constraint admin_appearance_current_element_key_check check(element_key in
 ('listing-detail/save-button','site/listing-display','site/favicon','site/icon-library',
  'listing-create/language-selector','listing-edit/language-selector'));
alter table public.admin_appearance_drafts drop constraint admin_appearance_drafts_element_key_check,
 add constraint admin_appearance_drafts_element_key_check check(element_key in
 ('listing-detail/save-button','site/listing-display','site/favicon','site/icon-library',
  'listing-create/language-selector','listing-edit/language-selector'));
alter table public.admin_appearance_revisions drop constraint admin_appearance_revisions_element_key_check,
 add constraint admin_appearance_revisions_element_key_check check(element_key in
 ('listing-detail/save-button','site/listing-display','site/favicon','site/icon-library',
  'listing-create/language-selector','listing-edit/language-selector'));

insert into public.admin_appearance_current(element_key,config,initial_config)
values('listing-create/language-selector','{}','{}'),('listing-edit/language-selector','{}','{}');
create or replace function private.validate_appearance_config(p_element_key text,p_config jsonb)
returns void language plpgsql set search_path='' as $$
declare sc record; field record; t text; n integer;
begin
 if p_element_key in ('listing-create/language-selector','listing-edit/language-selector') then
   perform private.validate_listing_language_style(p_config);return;
 end if;
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
 if p_element_key in ('site/listing-display','site/favicon','site/icon-library','listing-create/language-selector','listing-edit/language-selector') then
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
 if p_element_key in ('site/listing-display','site/favicon','site/icon-library','listing-create/language-selector','listing-edit/language-selector') and p_from_revision=0 then
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

create or replace function public.site_appearance_published()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('key',element_key,'revision',revision,'config',config)),'[]'::jsonb)
 from public.admin_appearance_current where revision>0 and element_key in
 ('listing-detail/save-button','listing-create/language-selector','listing-edit/language-selector')
$$;
