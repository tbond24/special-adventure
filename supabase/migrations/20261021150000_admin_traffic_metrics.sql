-- Read-only reporting candidate. No collection/Auth/retention changes.
create index if not exists analytics_events_v2_session_time on public.analytics_events(created_at,visitor_id,session_id) include(user_id) where journey_version=2;
create function public.admin_traffic_metrics(p_buckets jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
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
