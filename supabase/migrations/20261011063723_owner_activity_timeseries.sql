-- Extend the existing owner metrics endpoint. No new event collection, tables,
-- indexes, raw-data grants, or recurring jobs. Time buckets never expose actors.
create or replace function public.owner_dashboard_metrics(
  p_from timestamptz, p_to timestamptz, p_timezone text
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  v_owner uuid := (select auth.uid());
  v_until timestamptz := greatest(p_from,least(p_to,now()));
  v_hourly boolean;
  v_result jsonb;
begin
  if v_owner is null or p_from is null or p_to is null or p_from>=p_to
    or not isfinite(p_from) or not isfinite(p_to) or p_to-p_from>interval '366 days' then
    raise exception 'Invalid metrics date range' using errcode='22023';
  end if;
  if p_timezone is null or length(p_timezone)>100 or not exists (
    select 1 from pg_catalog.pg_timezone_names z where z.name=p_timezone
  ) then raise exception 'Invalid metrics timezone' using errcode='22023'; end if;
  v_hourly := (p_to at time zone p_timezone)-(p_from at time zone p_timezone)<=interval '1 day';
  with owned as materialized (
    select v.id from public.vacancies v
    join public.rooms r on r.id=v.room_id
    join public.properties p on p.id=r.property_id where p.owner_id=v_owner
  ), events as materialized (
    select e.vacancy_id,e.event_name,e.user_id,e.visitor_id,e.created_at,
      case when v_hourly then date_bin(interval '1 hour',e.created_at,p_from)
        else date_bin(interval '1 day',e.created_at at time zone p_timezone,p_from at time zone p_timezone) at time zone p_timezone end as bucket
    from public.analytics_events e join owned o on o.id=e.vacancy_id
    where e.event_name in ('listing_impression','vacancy_opened')
      and e.created_at>=p_from and e.created_at<p_to
      and e.user_id is distinct from v_owner
      and not exists(select 1 from public.admin_users a where a.user_id=e.user_id)
  ), event_totals as (
    select count(*) filter(where event_name='listing_impression') as impressions,
      count(distinct (vacancy_id,coalesce('user:'||user_id::text,'browser:'||visitor_id::text)))
        filter(where event_name='vacancy_opened' and (user_id is not null or visitor_id is not null)) as clicks,
      count(*) filter(where event_name='vacancy_opened' and user_id is null and visitor_id is null) as unidentified
    from events
  ), event_buckets as (
    select bucket,count(*) filter(where event_name='listing_impression') as impressions,
      count(distinct (vacancy_id,coalesce('user:'||user_id::text,'browser:'||visitor_id::text)))
        filter(where event_name='vacancy_opened' and (user_id is not null or visitor_id is not null)) as clicks
    from events where created_at<v_until group by bucket
  ), incoming as materialized (
    select m.created_at,m.created_at>cm.last_read_at as unread,
      case when v_hourly then date_bin(interval '1 hour',m.created_at,p_from)
        else date_bin(interval '1 day',m.created_at at time zone p_timezone,p_from at time zone p_timezone) at time zone p_timezone end as bucket
    from public.conversations c join owned o on o.id=c.vacancy_id
    join public.conversation_members cm on cm.conversation_id=c.id and cm.user_id=v_owner
    join public.messages m on m.conversation_id=c.id and m.sender_id<>v_owner
    where m.created_at>=least(p_from,cm.last_read_at)
  ), message_buckets as (
    select bucket,count(*) as arrivals from incoming
    where created_at>=p_from and created_at<v_until group by bucket
  ), bounds as (
    select t as starts,least(t+interval '1 hour',v_until) as ends
    from generate_series(p_from,v_until-interval '1 microsecond',interval '1 hour') t where v_hourly
    union all
    select t at time zone p_timezone,least((t+interval '1 day') at time zone p_timezone,v_until)
    from generate_series(p_from at time zone p_timezone,(v_until-interval '1 microsecond') at time zone p_timezone,interval '1 day') t where not v_hourly
  ), points as (
    select b.starts,b.ends,coalesce(e.impressions,0) as impressions,
      coalesce(e.clicks,0) as clicks,coalesce(m.arrivals,0) as arrivals
    from bounds b left join event_buckets e on e.bucket=b.starts
    left join message_buckets m on m.bucket=b.starts
  )
  select jsonb_build_object(
    'clicks_are_unique',true,'impressions',t.impressions,'clicks',t.clicks,
    'unidentified_click_events',t.unidentified,
    'messages',(select count(*) from incoming where unread),
    'series',jsonb_build_object('from',p_from,'to',p_to,'timezone',p_timezone,
      'granularity',case when v_hourly then 'hour' else 'day' end,
      'observed_until',v_until,'clicks_are_unique',true,
      'unidentified_click_events',t.unidentified,
      'buckets',coalesce((select jsonb_agg(jsonb_build_object(
        'from',p.starts,'to',p.ends,'impressions',p.impressions,'clicks',p.clicks,
        'message_arrivals',p.arrivals) order by p.starts) from points p),'[]'::jsonb))
  ) into v_result from event_totals t;
  return v_result;
end $$;
revoke all on function public.owner_dashboard_metrics(timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.owner_dashboard_metrics(timestamptz,timestamptz,text) to authenticated,service_role;

-- Preserve the exact existing endpoint and named parameters for old clients.
-- The no-argument legacy overload remains unchanged.
create or replace function public.owner_dashboard_metrics(p_from timestamptz,p_to timestamptz)
returns jsonb language sql stable security definer set search_path='' as $$
  select public.owner_dashboard_metrics(p_from,p_to,'UTC');
$$;
revoke all on function public.owner_dashboard_metrics(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.owner_dashboard_metrics(timestamptz,timestamptz) to authenticated,service_role;
notify pgrst, 'reload schema';
