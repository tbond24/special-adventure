-- Scoped activation bundle: earlier candidates remain historical and are not replayed.
set local lock_timeout='2s';
set local statement_timeout='15s';
-- Local-day companion to the existing daily reader. Hosted application is separate.
create function public.admin_daily_metrics_local(
 p_metric text default 'accounts', p_days integer default 7, p_timezone text default 'UTC'
) returns jsonb language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare
 metric text := lower(trim(coalesce(p_metric,'accounts')));
 days integer := greatest(7,least(coalesce(p_days,7),180));
 today date;
 result jsonb;
begin
 if not private.is_admin((select auth.uid())) then
  return jsonb_build_object('error','admin required');
 end if;
 if metric not in ('accounts','listings','images','enquiries','messages') then
  raise exception 'invalid metric';
 end if;
 if p_timezone is null or length(p_timezone)>100 or not exists (
  select 1 from pg_catalog.pg_timezone_names z where z.name=p_timezone
 ) then raise exception 'Invalid metrics timezone' using errcode='22023'; end if;
 today := (now() at time zone p_timezone)::date;
 with dates as (
  select today-days+1+i as day from generate_series(0,days-1) i
 ), bounds as (
  select day,day::timestamp at time zone p_timezone as lo,
   (day+1)::timestamp at time zone p_timezone as hi from dates
 ), values_by_day as (
  select d.day,case metric
   when 'accounts' then (select count(*) from auth.users u where u.created_at>=d.lo and u.created_at<d.hi and not coalesce(u.is_anonymous,false))
   when 'listings' then (select count(*) from public.vacancies v where v.created_at>=d.lo and v.created_at<d.hi)
   when 'images' then (select count(*) from public.media m where m.created_at>=d.lo and m.created_at<d.hi)
   when 'enquiries' then (select count(*) from public.conversations c where c.created_at>=d.lo and c.created_at<d.hi)
   when 'messages' then (select count(*) from public.messages m where m.created_at>=d.lo and m.created_at<d.hi)
  end as value from bounds d
 ) select jsonb_build_object('metric',metric,'days',days,'timeZone',p_timezone,
  'total',coalesce(sum(value),0),'series',coalesce(jsonb_agg(jsonb_build_object('date',day,'value',value) order by day),'[]'::jsonb))
 into result from values_by_day;
 return result;
end $$;
revoke all on function public.admin_daily_metrics_local(text,integer,text) from public,anon;
grant execute on function public.admin_daily_metrics_local(text,integer,text) to authenticated;

-- Development read-only candidate. Not applied to hosted databases.
create function public.admin_metric_comparison(
 p_metric text,p_from timestamptz,p_to timestamptz,
 p_previous_from timestamptz,p_previous_to timestamptz
) returns jsonb language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare source_schema text;source_table text;extra text:='';current_count bigint;previous_count bigint;
begin
 if not private.is_admin((select auth.uid())) then raise exception 'Admin verification required' using errcode='42501';end if;
 if p_from is null or p_to is null or p_previous_from is null or p_previous_to is null
  or not isfinite(p_from) or not isfinite(p_to) or not isfinite(p_previous_from) or not isfinite(p_previous_to)
  or p_from>p_to or p_previous_from>p_previous_to or p_previous_to>p_from
  or p_to-p_from>interval '91 days' or p_previous_to-p_previous_from>interval '91 days'
  or p_to-p_previous_from>interval '182 days' or p_to>now()+interval '1 minute'
  or abs(extract(epoch from (p_to-p_from)-(p_previous_to-p_previous_from)))>7200
  then raise exception 'Invalid comparison range' using errcode='22023';end if;
 source_schema:='public';
 case p_metric
  when 'accounts' then source_schema:='auth';source_table:='users';extra:=' and not coalesce(is_anonymous,false)';
  when 'listings' then source_table:='vacancies';
  when 'enquiries' then source_table:='conversations';
  when 'messages' then source_table:='messages';
  when 'images' then source_table:='media';
  else raise exception 'Invalid comparison metric' using errcode='22023';
 end case;
 -- Table identifiers come exclusively from the allowlist. Keep time columns bare
 -- so existing created_at indexes can support both bounded counts.
 execute format('select count(*) from %I.%I where created_at >= $1 and created_at < $2%s',source_schema,source_table,extra)
  into current_count using p_from,p_to;
 execute format('select count(*) from %I.%I where created_at >= $1 and created_at < $2%s',source_schema,source_table,extra)
  into previous_count using p_previous_from,p_previous_to;
 return jsonb_build_object('metric',p_metric,'total',current_count,'previous',previous_count,
  'from',p_from,'to',p_to,'previousFrom',p_previous_from,'previousTo',p_previous_to);
end $$;
revoke all on function public.admin_metric_comparison(text,timestamptz,timestamptz,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.admin_metric_comparison(text,timestamptz,timestamptz,timestamptz,timestamptz) to authenticated;

-- Read-only reporting candidate. No collection/Auth/retention changes.
create index if not exists analytics_events_v2_session_time on public.analytics_events(created_at,visitor_id,session_id) include(user_id) where journey_version=2;
create function public.admin_traffic_metrics(p_buckets jsonb) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare item jsonb;bound_lo timestamptz;bound_hi timestamptz;first_at timestamptz;last_at timestamptz;result jsonb;
begin
 if not private.is_admin((select auth.uid())) then raise exception 'Admin verification required' using errcode='42501';end if;
 if p_buckets is null or jsonb_typeof(p_buckets)<>'array' then raise exception 'Traffic buckets required' using errcode='22023';end if;
 if octet_length(p_buckets::text)>30000 or jsonb_array_length(p_buckets)<1 or jsonb_array_length(p_buckets)>100 then raise exception 'Bounded traffic range required' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(p_buckets) loop
  bound_lo:=(item->>'start')::timestamptz;bound_hi:=(item->>'end')::timestamptz;
  if bound_lo is null or bound_hi is null or not isfinite(bound_lo) or not isfinite(bound_hi) or bound_lo>bound_hi or bound_hi-bound_lo>interval '26 hours' or bound_hi>now()+interval '1 minute'
   or (last_at is not null and bound_lo<>last_at) then raise exception 'Invalid traffic bucket' using errcode='22023';end if;
  first_at:=coalesce(first_at,bound_lo);last_at:=bound_hi;
  if bound_hi-first_at>interval '91 days' then raise exception 'Traffic range too long' using errcode='22023';end if;
 end loop;
 with bounds as materialized (
  select ordinal,(b->>'start')::timestamptz lo,(b->>'end')::timestamptz hi from jsonb_array_elements(p_buckets) with ordinality x(b,ordinal)
 ), raw as materialized (
  select e.created_at,e.visitor_id,e.session_id,
   case when e.user_id is null then false when u.id is null then null else not coalesce(u.is_anonymous,false) end registered
  from public.analytics_events e left join auth.users u on u.id=e.user_id
  where e.journey_version=2 and e.created_at>=first_at and e.created_at<last_at
   and not exists(select 1 from public.admin_users a where a.user_id=e.user_id)
 ), events as materialized (
  select * from raw where visitor_id is not null and session_id is not null
 ), sessions as materialized (
  select visitor_id,session_id,min(created_at) started_at from events group by visitor_id,session_id
 ), flags as (
  select visitor_id,bool_or(registered is true) registered,bool_or(registered is null) unknown from events group by visitor_id
 ), ranked as (
  select *,row_number() over(partition by visitor_id order by started_at,session_id) position from sessions
 ), repeats as materialized (
  select r.visitor_id,r.started_at returned_at,f.registered,not f.registered and f.unknown unknown
  from ranked r join flags f using(visitor_id) where position=2
 ), buckets as (
  select b.ordinal,b.hi,
   count(distinct (e.visitor_id,e.session_id)) filter(where e.visitor_id is not null) visits,
   count(distinct e.visitor_id) unique_visitors,
   count(distinct e.visitor_id) filter(where r.returned_at<b.hi and r.registered) registered,
   count(distinct e.visitor_id) filter(where r.returned_at<b.hi and not r.registered and not r.unknown) non_registered,
   count(distinct e.visitor_id) filter(where r.returned_at<b.hi and r.unknown) unknown
  from bounds b left join events e on e.created_at>=b.lo and e.created_at<b.hi left join repeats r on r.visitor_id=e.visitor_id
  group by b.ordinal,b.hi
 )
 select jsonb_build_object('schemaVersion',1,'source','connected_v2','generatedAt',now(),
  'visits',(select count(*) from sessions),'unique',(select count(distinct visitor_id) from events),
  'repeat',jsonb_build_object('total',(select count(*) from repeats),'registered',(select count(*) from repeats where registered),
    'nonRegistered',(select count(*) from repeats where not registered and not unknown),'unknown',(select count(*) from repeats where unknown)),
  'unidentifiedEvents',(select count(*) from raw where visitor_id is null or session_id is null),
  'lastRecordedAt',(select max(e.created_at) from public.analytics_events e where e.journey_version=2 and e.visitor_id is not null and e.session_id is not null and not exists(select 1 from public.admin_users a where a.user_id=e.user_id)),
  'series',coalesce(jsonb_agg(jsonb_build_object('at',hi,'visits',visits,'unique',unique_visitors,
    'registered',registered,'nonRegistered',non_registered,'unknown',unknown) order by ordinal),'[]'::jsonb)) into result from buckets;
 return result;
end $$;
revoke all on function public.admin_traffic_metrics(jsonb) from public,anon,authenticated;
grant execute on function public.admin_traffic_metrics(jsonb) to authenticated;

-- Candidate only. Observed route/step transitions; no live presence or new collector.
create function public.admin_journey_map(p_from timestamptz,p_to timestamptz,p_device text default null)
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare result jsonb;
begin
 if not private.is_admin((select auth.uid())) then raise exception 'Admin verification required' using errcode='42501';end if;
 if p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to) or p_from>=p_to or p_to-p_from>interval '91 days' or p_to>now()+interval '1 minute' or (p_device is not null and p_device not in ('desktop','mobile','tablet')) then raise exception 'Invalid journey range/filter' using errcode='22023';end if;
 with observed as materialized (
  select e.id,e.created_at,e.visitor_id,e.session_id,e.event_name,e.previous_event_id,e.event_id,e.journey_id,e.from_step,e.to_step,
   case when e.event_name in ('listing_started','step_ready','publish_clicked') and e.to_step between 0 and 3 then 'step:'||e.to_step::text
   when e.event_name='lister_landing_viewed' and e.route in ('find','listing','list','create','auth','other') then e.route end node
  from public.analytics_events e
  where e.journey_version=2 and e.created_at>=p_from and e.created_at<p_to
   and e.visitor_id is not null and e.session_id is not null
   and (p_device is null or e.device_class=p_device)
   and not exists(select 1 from public.admin_users a where a.user_id=e.user_id)
 ), pages as (
  select *,lag(node) over(partition by visitor_id,session_id order by created_at,id) previous,
   lag(created_at) over(partition by visitor_id,session_id order by created_at,id) previous_at
  from observed where event_name='lister_landing_viewed' and node is not null
 ), ordered_nodes as (
  select *,lag(node) over(partition by visitor_id,session_id order by created_at,id) previous,
   lag(created_at) over(partition by visitor_id,session_id order by created_at,id) previous_at
  from observed where node is not null
 ), links as (
  select visitor_id,previous as origin,node as destination from pages where previous is not null and previous<>node and created_at-previous_at<interval '30 minutes'
  union all
  select visitor_id,previous,node from ordered_nodes where node='step:0' and event_name='listing_started' and previous='create' and created_at-previous_at<interval '30 minutes'
  union all
  select e.visitor_id,p.node,e.node from observed e join observed p on p.event_id=e.previous_event_id
   and p.visitor_id=e.visitor_id and p.session_id=e.session_id and p.journey_id=e.journey_id
   and p.to_step=e.from_step and p.created_at<=e.created_at
  where e.event_name in ('step_ready','publish_clicked') and e.node is not null and p.node is not null and p.node<>e.node
 ), nodes as (select node id,count(distinct visitor_id) count from observed where node is not null group by node),
 edges as (select origin,destination,count(distinct visitor_id) count from links group by origin,destination)
 select jsonb_build_object('schemaVersion',1,'generatedAt',now(),'from',p_from,'to',p_to,'device',p_device,
  'total',(select count(distinct visitor_id) from observed where node is not null),
  'nodes',coalesce((select jsonb_agg(to_jsonb(n) order by n.id) from nodes n),'[]'::jsonb),
  'edges',coalesce((select jsonb_agg(jsonb_build_object('from',origin,'to',destination,'count',count) order by origin,destination) from edges),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.admin_journey_map(timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.admin_journey_map(timestamptz,timestamptz,text) to authenticated;

notify pgrst,'reload schema';
