-- Reuse the existing admin-readable analytics table. No property or auth table changes.
alter table public.analytics_events add column if not exists event_id uuid;
alter table public.analytics_events add column if not exists visitor_id uuid;
alter table public.analytics_events add column if not exists session_id uuid;
alter table public.analytics_events add column if not exists journey_id uuid;
alter table public.analytics_events add column if not exists source text;
alter table public.analytics_events add column if not exists medium text;
alter table public.analytics_events add column if not exists campaign text;
alter table public.analytics_events add column if not exists campaign_id text;
alter table public.analytics_events add column if not exists adset_id text;
alter table public.analytics_events add column if not exists ad_id text;
alter table public.analytics_events add column if not exists content_id text;
alter table public.analytics_events add column if not exists first_source text;
alter table public.analytics_events add column if not exists first_medium text;
alter table public.analytics_events add column if not exists first_campaign text;
alter table public.analytics_events add column if not exists referrer_host text;
alter table public.analytics_events add column if not exists landing_path text;
alter table public.analytics_events add column if not exists step text;
alter table public.analytics_events add column if not exists device_class text;
alter table public.analytics_events add column if not exists browser_family text;
alter table public.analytics_events add column if not exists os_family text;
alter table public.analytics_events add column if not exists duration_ms integer;
alter table public.analytics_events add column if not exists active_ms integer;
alter table public.analytics_events add column if not exists error_code text;

create unique index if not exists analytics_events_event_id_unique on public.analytics_events(event_id) where event_id is not null;
create index if not exists analytics_events_session_time_idx on public.analytics_events(session_id,created_at) where session_id is not null;
create index if not exists analytics_events_visitor_time_idx on public.analytics_events(visitor_id,created_at) where visitor_id is not null;
create index if not exists analytics_events_vacancy_time_idx on public.analytics_events(vacancy_id,created_at) where vacancy_id is not null;

alter table public.analytics_events drop constraint if exists analytics_events_event_name_check;
alter table public.analytics_events add constraint analytics_events_event_name_check check (event_name in (
  'home_viewed','search_used','vacancy_opened','vacancy_saved','enquiry_started','enquiry_sent','listing_started','listing_published','message_sent','report_submitted','user_blocked','listing_impression',
  'lister_session_started','lister_landing_viewed','list_property_clicked','signup_started','signup_completed','signup_pending_confirmation',
  'property_type_completed','location_started','location_completed','listing_details_started','listing_details_completed',
  'photos_completed','pricing_completed','listing_previewed','publish_clicked','listing_record_created','listing_submitted',
  'step_ready','photo_upload','journey_error'
));

create or replace function public.record_lister_journey(p_events jsonb)
returns integer language plpgsql security invoker set search_path='' as $$
declare item jsonb; accepted integer := 0; event_name text;
begin
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 20 then
    raise exception 'Invalid journey batch' using errcode='22023';
  end if;
  for item in select value from jsonb_array_elements(p_events) as value loop
    event_name := item->>'event_name';
    if event_name not in (
      'lister_session_started','lister_landing_viewed','list_property_clicked','signup_started','signup_completed','signup_pending_confirmation',
      'listing_started','property_type_completed','location_started','location_completed','listing_details_started','listing_details_completed',
      'photos_completed','pricing_completed','listing_previewed','publish_clicked','listing_record_created','listing_submitted',
      'step_ready','photo_upload','journey_error'
    ) then raise exception 'Unsupported journey event' using errcode='22023'; end if;
    insert into public.analytics_events(
      event_id,user_id,event_name,vacancy_id,route,visitor_id,session_id,journey_id,
      source,medium,campaign,campaign_id,adset_id,ad_id,content_id,first_source,first_medium,first_campaign,
      referrer_host,landing_path,step,device_class,browser_family,os_family,duration_ms,active_ms,error_code
    ) values (
      (item->>'event_id')::uuid,(select auth.uid()),event_name,nullif(item->>'vacancy_id','')::uuid,left(item->>'route',120),
      (item->>'visitor_id')::uuid,(item->>'session_id')::uuid,nullif(item->>'journey_id','')::uuid,
      left(item->>'source',80),left(item->>'medium',80),left(item->>'campaign',100),left(item->>'campaign_id',100),
      left(item->>'adset_id',100),left(item->>'ad_id',100),left(item->>'content_id',100),
      left(item->>'first_source',80),left(item->>'first_medium',80),left(item->>'first_campaign',100),
      left(item->>'referrer_host',120),left(item->>'landing_path',120),left(item->>'step',40),
      left(item->>'device_class',16),left(item->>'browser_family',24),left(item->>'os_family',24),
      least(greatest(coalesce((item->>'duration_ms')::integer,0),0),3600000),
      least(greatest(coalesce((item->>'active_ms')::integer,0),0),3600000),left(item->>'error_code',60)
    ) on conflict (event_id) where event_id is not null do nothing;
    accepted := accepted + 1;
  end loop;
  return accepted;
end $$;
revoke all on function public.record_lister_journey(jsonb) from public;
grant execute on function public.record_lister_journey(jsonb) to anon,authenticated;

-- Publication is read from the existing database status-change log, not client events.
create or replace function public.admin_lister_marketing(p_from timestamptz,p_to timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.is_admin((select auth.uid())) then raise exception 'Admin verification required' using errcode='42501'; end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to-p_from > interval '90 days' then
    raise exception 'Choose a date range up to 90 days' using errcode='22023';
  end if;
  select jsonb_build_object(
    'events',coalesce((select jsonb_agg(to_jsonb(e)) from (
      select id,user_id,event_name,vacancy_id,created_at,visitor_id,session_id,journey_id,source,medium,campaign,
        campaign_id,adset_id,ad_id,content_id,first_source,first_medium,first_campaign,step,device_class,browser_family,
        os_family,duration_ms,active_ms,error_code
      from public.analytics_events
      where event_id is not null and created_at>=p_from and created_at<p_to
      order by created_at desc limit 5001
    ) e),'[]'::jsonb),
    'publications',coalesce((select jsonb_agg(to_jsonb(pub)) from (
      select first_active.entity_id as vacancy_id,first_active.created_at,p.id as property_id,p.owner_id,
        first_active.created_at=(
          select min(log.created_at) from public.listing_activity_log log
          join public.vacancies other_v on other_v.id=log.entity_id
          join public.rooms other_r on other_r.id=other_v.room_id
          where log.entity_type='listing' and log.new_status='active'
            and log.old_status is distinct from 'active' and other_r.property_id=p.id
        ) as is_first_property_publication,
        attribution.visitor_id,attribution.session_id,attribution.source,attribution.medium,attribution.campaign,
        attribution.campaign_id,attribution.adset_id,attribution.ad_id,attribution.device_class
      from (
        select distinct on (entity_id) entity_id,created_at from public.listing_activity_log
        where entity_type='listing' and new_status='active' and (old_status is distinct from 'active')
        order by entity_id,created_at
      ) first_active
      join public.vacancies v on v.id=first_active.entity_id
      join public.rooms r on r.id=v.room_id
      join public.properties p on p.id=r.property_id
      left join lateral (
        select e.visitor_id,e.session_id,e.source,e.medium,e.campaign,e.campaign_id,e.adset_id,e.ad_id,e.device_class
        from public.analytics_events e where e.vacancy_id=v.id and e.user_id=p.owner_id
          and e.event_name in ('listing_submitted','listing_record_created')
          and e.created_at<=first_active.created_at+interval '10 minutes'
        order by e.created_at desc limit 1
      ) attribution on true
      where first_active.created_at>=p_from and first_active.created_at<p_to
      order by first_active.created_at desc limit 5001
    ) pub),'[]'::jsonb)
  ) into result;
  return result;
end $$;
revoke all on function public.admin_lister_marketing(timestamptz,timestamptz) from public,anon;
grant execute on function public.admin_lister_marketing(timestamptz,timestamptz) to authenticated;
