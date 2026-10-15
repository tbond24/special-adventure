-- Icon artwork and listing catalogue publication. Development candidate only.
create or replace function private.validate_display_appearance_config(p_element_key text,p_config jsonb)
returns void language plpgsql set search_path='' as $$
declare sc record; field record; t text; n integer;
begin
 if p_config is null or jsonb_typeof(p_config)<>'object'
    or length(p_config::text)>4096 then
   raise exception 'Appearance config must be a bounded object' using errcode='22023';
 end if;
 if p_element_key in ('listing-display/card-services','listing-display/listing-wifi','listing-display/listing-parking','listing-display/listing-furnished','listing-display/listing-ensuite','listing-display/listing-bills','listing-display/listing-security','listing-display/listing-custom','listing-display/listing-water','listing-display/listing-electricity') then
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
revoke all on function private.validate_display_appearance_config(text,jsonb) from public,anon,authenticated;


alter table public.admin_appearance_current drop constraint admin_appearance_current_element_key_check;
alter table public.admin_appearance_current add constraint admin_appearance_current_element_key_check check(element_key='listing-detail/save-button' or element_key like 'listing-display/%' or element_key like 'site-icon/%' or element_key ~ '^icon-catalog/custom-[0-9a-f]{32}$');
alter table public.admin_appearance_drafts drop constraint admin_appearance_drafts_element_key_check;
alter table public.admin_appearance_drafts add constraint admin_appearance_drafts_element_key_check check(element_key='listing-detail/save-button' or element_key like 'listing-display/%' or element_key like 'site-icon/%' or element_key ~ '^icon-catalog/custom-[0-9a-f]{32}$');
alter table public.admin_appearance_revisions drop constraint admin_appearance_revisions_element_key_check;
alter table public.admin_appearance_revisions add constraint admin_appearance_revisions_element_key_check check(element_key='listing-detail/save-button' or element_key like 'listing-display/%' or element_key like 'site-icon/%' or element_key ~ '^icon-catalog/custom-[0-9a-f]{32}$');

create or replace function private.validate_appearance_config(p_element_key text,p_config jsonb)
returns void language plpgsql set search_path='' as $$
declare v_slot text;
begin
 if p_element_key like 'site-icon/%' or p_element_key like 'icon-catalog/%' then
  if p_config is null or jsonb_typeof(p_config)<>'object' or length(p_config::text)>4096 then raise exception 'Bounded icon config required' using errcode='22023'; end if;
  v_slot:=split_part(p_element_key,'/',2);
  if p_element_key like 'site-icon/%' then
   if not exists(select 1 from public.site_icon_slots where slot=v_slot) then raise exception 'Unregistered icon' using errcode='22023'; end if;
   if p_config='{}'::jsonb then return; end if;
   if p_config=jsonb_build_object('source_slot',p_config->'source_slot') and jsonb_typeof(p_config->'source_slot')='string'
    and exists(select 1 from public.site_icon_slots where slot=p_config->>'source_slot') then return; end if;
  else
   if p_element_key !~ '^icon-catalog/custom-[0-9a-f]{32}$' then raise exception 'Unregistered catalogue proposal' using errcode='22023'; end if;
   if p_config='{}'::jsonb then return; end if;
   if p_config<>jsonb_build_object('label',p_config->'label','kind',p_config->'kind','path_d',p_config->'path_d')
    or jsonb_typeof(p_config->'label')<>'string' or length(trim(p_config->>'label')) not between 2 and 60
    or p_config->>'kind' not in ('amenity','utility') then raise exception 'Bounded catalogue name and kind required' using errcode='22023'; end if;
  end if;
  if jsonb_typeof(p_config->'path_d')='string' and length(p_config->>'path_d') between 3 and 1200 and p_config->>'path_d' ~ '^[MmLlHhVvCcSsQqTtAaZz0-9 .,+-]+$'
   and (p_element_key like 'icon-catalog/%' or p_config=jsonb_build_object('path_d',p_config->'path_d')) then return; end if;
  raise exception 'Use a supported single SVG path or registered source' using errcode='22023';
 end if;
 perform private.validate_display_appearance_config(p_element_key,p_config);
end $$;
revoke all on function private.validate_appearance_config(text,jsonb) from public,anon,authenticated;
insert into public.admin_appearance_current(element_key,revision,config)
select 'site-icon/'||s.slot,0,case when o.source_slot is not null then jsonb_build_object('source_slot',o.source_slot)
 when o.path_d is not null then jsonb_build_object('path_d',o.path_d) else '{}'::jsonb end
from public.site_icon_slots s left join public.site_icon_overrides o using(slot);

create function private.publish_icon_projection() returns trigger language plpgsql security definer set search_path='' as $$
declare v_slot text;
begin
 if new.revision<1 or (new.element_key not like 'site-icon/%' and new.element_key not like 'icon-catalog/%') then return new; end if;
 perform private.validate_appearance_config(new.element_key,new.config);
 v_slot:=split_part(new.element_key,'/',2);
 if new.element_key like 'icon-catalog/%' then
  if old.revision>0 or new.config='{}'::jsonb then raise exception 'Catalogue creation is published once; edit its icon separately' using errcode='22023'; end if;
  insert into public.site_icon_slots(slot,label,listing_kind) values(v_slot,trim(new.config->>'label'),new.config->>'kind');
 elsif new.config='{}'::jsonb and exists(select 1 from public.site_icon_slots where slot=v_slot and listing_kind is not null) then
  raise exception 'Custom listing icons have no compiled original; choose a valid icon' using errcode='22023';
 end if;
 if new.config='{}'::jsonb then delete from public.site_icon_overrides where slot=v_slot;
 else
  insert into public.site_icon_overrides(slot,source_slot,path_d) values(v_slot,new.config->>'source_slot',new.config->>'path_d')
  on conflict(slot) do update set source_slot=excluded.source_slot,path_d=excluded.path_d,updated_at=now();
 end if;
 insert into public.site_icon_revisions(slot,source_slot,path_d,actor_id) values(v_slot,new.config->>'source_slot',new.config->>'path_d',(select auth.uid()));
 if new.element_key like 'icon-catalog/%' then
  insert into public.admin_appearance_current(element_key,revision,config) values('site-icon/'||v_slot,0,jsonb_build_object('path_d',new.config->'path_d'));
 end if;
 return new;
end $$;
revoke all on function private.publish_icon_projection() from public,anon,authenticated;
create trigger admin_appearance_icon_projection after update on public.admin_appearance_current for each row execute function private.publish_icon_projection();
create or replace function public.admin_set_site_icon(p_slot text,p_source_slot text default null,p_path_d text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin((select auth.uid())) then raise exception 'MFA-verified administrator required' using errcode='42501'; end if;
 raise exception 'Save and review an icon draft before publishing' using errcode='PT409';
end $$;
create or replace function public.admin_add_listing_icon(p_label text,p_kind text,p_path_d text)
returns text language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin((select auth.uid())) then raise exception 'MFA-verified administrator required' using errcode='42501'; end if;
 raise exception 'Save and review a private catalogue proposal before publishing' using errcode='PT409';
end $$;
-- No new public appearance payload is needed: existing safe public icon readers
-- are the projection. Draft/current/history remain inaccessible to clients.
create or replace function public.site_appearance_published()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('key',element_key,'revision',revision,'config',config) order by element_key),'[]'::jsonb)
 from public.admin_appearance_current where revision>0 and
 (element_key='listing-detail/save-button' or element_key like 'listing-display/%' or element_key like 'site-icon/%' or element_key like 'icon-catalog/%')
$$;

create function public.admin_icon_proposals() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.admin_can('appearance_draft') then raise exception 'Verified editor required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(element_key order by updated_at desc) from
 (select element_key,updated_at from public.admin_appearance_drafts where actor_id=(select auth.uid()) and element_key like 'icon-catalog/%' order by updated_at desc limit 20) d),'[]'::jsonb);
end $$;
revoke all on function public.admin_icon_proposals() from public,anon;
grant execute on function public.admin_icon_proposals() to authenticated;
