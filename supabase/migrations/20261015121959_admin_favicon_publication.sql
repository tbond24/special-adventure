-- Favicon publication, preserving legacy PNG validation and previous value. Development only.
create or replace function private.validate_nonfavicon_appearance_config(p_element_key text,p_config jsonb)
returns void language plpgsql set search_path='' as $$
declare v_slot text;
begin
 if p_element_key like 'site-icon/%' or p_element_key like 'icon-catalog/%' then
  if p_config is null or jsonb_typeof(p_config)<>'object' or length(p_config::text)>4096 then raise exception 'Bounded icon config required' using errcode='22023'; end if;
  v_slot:=split_part(p_element_key,'/',2);
  if p_element_key like 'site-icon/%' then
   if p_element_key<>'site-icon/'||v_slot or not exists(select 1 from public.site_icon_slots where slot=v_slot) then raise exception 'Unregistered icon' using errcode='22023'; end if;
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
-- Registered safe public presentation only: no actor, draft, history or audit.
create or replace function public.site_appearance_published()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('key',element_key,'revision',revision,'config',config) order by element_key),'[]'::jsonb)
 from public.admin_appearance_current where revision>0 and
 (element_key in ('listing-detail/save-button','site-favicon') or element_key like 'listing-display/%' or element_key like 'site-icon/%' or element_key like 'icon-catalog/%')
$$;
revoke all on function private.validate_nonfavicon_appearance_config(text,jsonb) from public,anon,authenticated;
alter table public.admin_appearance_current drop constraint admin_appearance_current_element_key_check;
alter table public.admin_appearance_current add constraint admin_appearance_current_element_key_check check(element_key in ('listing-detail/save-button','site-favicon') or element_key like 'listing-display/%' or element_key like 'site-icon/%' or element_key ~ '^icon-catalog/custom-[0-9a-f]{32}$');
alter table public.admin_appearance_drafts drop constraint admin_appearance_drafts_element_key_check;
alter table public.admin_appearance_drafts add constraint admin_appearance_drafts_element_key_check check(element_key in ('listing-detail/save-button','site-favicon') or element_key like 'listing-display/%' or element_key like 'site-icon/%' or element_key ~ '^icon-catalog/custom-[0-9a-f]{32}$');
alter table public.admin_appearance_revisions drop constraint admin_appearance_revisions_element_key_check;
alter table public.admin_appearance_revisions add constraint admin_appearance_revisions_element_key_check check(element_key in ('listing-detail/save-button','site-favicon') or element_key like 'listing-display/%' or element_key like 'site-icon/%' or element_key ~ '^icon-catalog/custom-[0-9a-f]{32}$');

create or replace function private.validate_appearance_config(p_element_key text,p_config jsonb)
returns void language plpgsql set search_path='' as $$
declare target text; raw bytea;
begin
 if p_element_key<>'site-favicon' or p_element_key is null then perform private.validate_nonfavicon_appearance_config(p_element_key,p_config); return; end if;
 if p_config='{}'::jsonb then return; end if;
 if p_config is null or jsonb_typeof(p_config)<>'object' or p_config<>jsonb_build_object('png',p_config->'png') or jsonb_typeof(p_config->'png')<>'string' then raise exception 'A single normalized PNG is required' using errcode='22023'; end if;
 target:=p_config->>'png';
 if length(target)>40000 or target !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$' then raise exception 'Use a PNG favicon' using errcode='22023'; end if;
 begin raw:=decode(substr(target,23),'base64'); exception when others then raise exception 'Invalid PNG encoding' using errcode='22023'; end;
 if length(raw)<32 or encode(substring(raw from 1 for 8),'hex')<>'89504e470d0a1a0a' or encode(substring(raw from 13 for 12),'hex')<>'494844520000004000000040' then raise exception 'Use a 64 by 64 PNG favicon' using errcode='22023'; end if;
end $$;
revoke all on function private.validate_appearance_config(text,jsonb) from public,anon,authenticated;
insert into public.admin_appearance_current(element_key,revision,config)
select 'site-favicon',0,case when png is null then '{}'::jsonb else jsonb_build_object('png',png) end from public.site_favicon where id;
do $$ begin if not exists(select 1 from public.admin_appearance_current where element_key='site-favicon') then raise exception 'Existing favicon binding required'; end if; end $$;
create function private.publish_favicon_projection() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.element_key='site-favicon' and new.revision>0 then
  perform private.validate_appearance_config(new.element_key,new.config);
  update public.site_favicon set previous_png=png,png=new.config->>'png',revision=revision+1,updated_at=clock_timestamp() where id;
  if not found then raise exception 'Public favicon binding unavailable' using errcode='22023'; end if;
 end if;return new;
end $$;
revoke all on function private.publish_favicon_projection() from public,anon,authenticated;
create trigger admin_appearance_favicon_projection after update on public.admin_appearance_current for each row execute function private.publish_favicon_projection();
create or replace function public.admin_set_favicon(p_png text,p_revision integer,p_restore boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin((select auth.uid())) then raise exception 'MFA-verified administrator required' using errcode='42501'; end if;
 raise exception 'Save and review a favicon draft before publishing or restoring' using errcode='PT409';
end $$;
