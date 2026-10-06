-- Scoped owner analytics, recent admin activity, and tab favicon. No retention changes.
create function public.track_listing_open(p_vacancy_id uuid,p_visitor_id uuid default null)
returns void language sql security invoker set search_path='' as $$
 insert into public.analytics_events(user_id,event_name,vacancy_id,route,visitor_id)
 values(auth.uid(),'vacancy_opened',p_vacancy_id,'listing',p_visitor_id);
$$;
revoke all on function public.track_listing_open(uuid,uuid) from public;
grant execute on function public.track_listing_open(uuid,uuid) to anon,authenticated;

-- A listing's owner and administrators are not visitors. Count unread incoming
-- messages independently of the activity date range shown for views and clicks.
create or replace function public.owner_dashboard_metrics(p_from timestamptz,p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_owner uuid := (select auth.uid());
begin
  if v_owner is null or p_from is null or p_to is null or p_from >= p_to
     or p_to - p_from > interval '366 days' then
    raise exception 'Invalid metrics date range' using errcode='22023';
  end if;
  return jsonb_build_object(
    'clicks_are_unique',true,
    'impressions', (select count(*) from public.analytics_events e
      join public.vacancies v on v.id=e.vacancy_id join public.rooms r on r.id=v.room_id
      join public.properties p on p.id=r.property_id
      where p.owner_id=v_owner and e.event_name='listing_impression'
        and e.created_at>=p_from and e.created_at<p_to
        and e.user_id is distinct from v_owner
        and not exists (select 1 from public.admin_users a where a.user_id=e.user_id)),
    'clicks', (select count(distinct (e.vacancy_id,coalesce('user:'||e.user_id::text,'browser:'||e.visitor_id::text))) filter (where e.user_id is not null or e.visitor_id is not null) from public.analytics_events e
      join public.vacancies v on v.id=e.vacancy_id join public.rooms r on r.id=v.room_id
      join public.properties p on p.id=r.property_id
      where p.owner_id=v_owner and e.event_name='vacancy_opened'
        and e.created_at>=p_from and e.created_at<p_to
        and e.user_id is distinct from v_owner
        and not exists (select 1 from public.admin_users a where a.user_id=e.user_id)),
    'unidentified_click_events', (select count(*) filter (where e.user_id is null and e.visitor_id is null) from public.analytics_events e
      join public.vacancies v on v.id=e.vacancy_id join public.rooms r on r.id=v.room_id
      join public.properties p on p.id=r.property_id
      where p.owner_id=v_owner and e.event_name='vacancy_opened'
        and e.created_at>=p_from and e.created_at<p_to
        and e.user_id is distinct from v_owner
        and not exists (select 1 from public.admin_users a where a.user_id=e.user_id)),
    'messages', (select count(*) from public.messages m
      join public.conversation_members cm on cm.conversation_id=m.conversation_id and cm.user_id=v_owner
      join public.conversations c on c.id=m.conversation_id
      join public.vacancies v on v.id=c.vacancy_id join public.rooms r on r.id=v.room_id
      join public.properties p on p.id=r.property_id
      where p.owner_id=v_owner and m.sender_id<>v_owner and m.created_at>cm.last_read_at)
  );
end $$;
revoke all on function public.owner_dashboard_metrics(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.owner_dashboard_metrics(timestamptz,timestamptz) to authenticated;

create function public.admin_recent_activity() returns jsonb language plpgsql security definer set search_path='' as $$
declare snapshot timestamptz:=clock_timestamp(); result jsonb;
begin
 if not private.is_admin(auth.uid()) then raise exception 'Admin verification required' using errcode='42501'; end if;
 with recent as materialized (select event_name,route,source,visitor_id,session_id,created_at from public.analytics_events e where created_at>=snapshot-interval '24 hours' and created_at<snapshot and not exists(select 1 from public.admin_users a where a.user_id=e.user_id)),
 sources as (select coalesce(nullif(source,''),'Unknown') source,count(distinct session_id) sessions from recent where event_name='lister_session_started' group by 1),
 actions as (select event_name,count(*) events from recent group by 1),
 latest as (select event_name,case when route in ('find','listing','list','create','auth') then route else 'other' end route,created_at from recent order by created_at desc limit 20)
 select jsonb_build_object('generated_at',snapshot,'window_hours',24,
 'browsers_recent', (select count(distinct visitor_id) from recent where created_at>=snapshot-interval '5 minutes'),
 'accounts_created',(select count(*) from auth.users where created_at>=snapshot-interval '24 hours' and created_at<snapshot and is_anonymous=false),
 'sources',coalesce((select jsonb_agg(to_jsonb(s) order by sessions desc,source) from sources s),'[]'::jsonb),
 'actions',coalesce((select jsonb_agg(to_jsonb(a) order by events desc,event_name) from actions a),'[]'::jsonb),
 'recent',coalesce((select jsonb_agg(to_jsonb(l) order by created_at desc) from latest l),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.admin_recent_activity() from public,anon,authenticated;
grant execute on function public.admin_recent_activity() to authenticated;

create table public.site_favicon (
 id boolean primary key default true check(id),png text,previous_png text,revision integer not null default 0,updated_at timestamptz not null default now()
);
alter table public.site_favicon enable row level security;
revoke all on public.site_favicon from public,anon,authenticated;
grant select(id,png,revision,updated_at) on public.site_favicon to anon,authenticated;
create policy favicon_public_read on public.site_favicon for select to anon,authenticated using(true);
insert into public.site_favicon(id) values(true);
create function public.admin_favicon() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin(auth.uid()) then raise exception 'Admin verification required' using errcode='42501'; end if;
 return (select to_jsonb(f) from public.site_favicon f where id);
end $$;
create function public.admin_set_favicon(p_png text,p_revision integer,p_restore boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare old public.site_favicon; raw bytea; target text;
begin
 if not private.is_admin(auth.uid()) then raise exception 'Admin verification required' using errcode='42501'; end if;
 select * into old from public.site_favicon where id for update;
 if p_revision is distinct from old.revision then raise exception 'Favicon changed; refresh before saving'; end if;
 target:=case when p_restore then old.previous_png else p_png end;
 if target is not null then
  if length(target)>40000 or target !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$' then raise exception 'Use a PNG favicon'; end if;
  raw:=decode(substr(target,23),'base64');
  if length(raw)<32 or encode(substring(raw from 1 for 8),'hex')<>'89504e470d0a1a0a' or encode(substring(raw from 13 for 12),'hex')<>'494844520000004000000040' then raise exception 'Use a 64 by 64 PNG favicon'; end if;
 end if;
 update public.site_favicon set png=target,previous_png=old.png,revision=revision+1,updated_at=clock_timestamp() where id;
 return public.admin_favicon();
end $$;
revoke all on function public.admin_favicon() from public,anon,authenticated;
revoke all on function public.admin_set_favicon(text,integer,boolean) from public,anon,authenticated;
grant execute on function public.admin_favicon(),public.admin_set_favicon(text,integer,boolean) to authenticated;
