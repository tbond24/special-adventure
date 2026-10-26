-- Reporting-only rollback. Preserve all recorded history and coverage.
CREATE OR REPLACE FUNCTION public.admin_connected_journeys(p_from timestamp with time zone, p_to timestamp with time zone, p_source text DEFAULT NULL::text, p_campaign text DEFAULT NULL::text, p_device text DEFAULT NULL::text, p_stage integer DEFAULT NULL::integer, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '8s'
 SET enable_nestloop TO 'off'
 SET jit TO 'off'
AS $function$
declare result jsonb;
begin
 if not private.is_admin(auth.uid()) then raise exception 'Admin verification required' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>interval '90 days' or p_offset<0 or p_offset>100000 or p_stage not between 0 and 3 then
  raise exception 'Invalid report range' using errcode='22023'; end if;
 if p_from<now()-interval '90 days' then
  return jsonb_build_object('schemaVersion',2,'generatedAt',clock_timestamp(),'complete',false,'reason','Range exceeds the 90-day evidence window. Narrow the dates.'); end if;
 with starts as materialized (
  select distinct on (journey_id) journey_id,visitor_id,created_at,coalesce(nullif(source,''),'Unknown') source,coalesce(campaign,'') campaign,coalesce(device_class,'unknown') device_class,journey_mode
  from public.analytics_events where journey_version=2 and event_name='listing_started' and journey_id is not null
  order by journey_id,created_at,id
 ), cohort as materialized (
  select * from starts where created_at>=p_from and created_at<p_to and journey_mode='new'
   and (nullif(p_source,'') is null or source=p_source) and (nullif(p_campaign,'') is null or campaign=p_campaign) and (nullif(p_device,'') is null or device_class=p_device)
 ), events as materialized (
  select e.* from public.analytics_events e join cohort c on c.journey_id=e.journey_id and c.visitor_id=e.visitor_id
  where e.journey_version=2 and e.created_at>=c.created_at and e.created_at<=c.created_at+interval '7 days'
 ), requests as materialized (
  select distinct e.journey_id,e.user_id,e.unit_request_id from events e where e.event_name='publish_clicked' and e.unit_request_id is not null
 ), links as materialized (
  select q.journey_id,q.unit_request_id,v.id vacancy_id,first_pub.published_at
  from requests q
  join public.vacancies v on v.client_request_id=q.unit_request_id
  join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id and p.owner_id=q.user_id
  join cohort c on c.journey_id=q.journey_id
  left join lateral (select min(created_at) published_at from public.listing_activity_log l where l.entity_type='listing' and l.entity_id=v.id and l.new_status='active' and l.old_status is distinct from 'active') first_pub on true
  where not exists(select 1 from public.analytics_events other where other.journey_version=2 and other.unit_request_id=q.unit_request_id and other.event_name='publish_clicked' and other.journey_id is distinct from q.journey_id)
   and (first_pub.published_at is null or first_pub.published_at>=c.created_at)
 ), event_facts as (
  select journey_id,array_agg(distinct to_step) filter(where to_step is not null) steps,
   bool_or(event_name='journey_error') had_error,count(distinct session_id)>1 returned,max(created_at) latest
  from events group by journey_id
 ), request_facts as (
  select journey_id,count(*) requests from requests group by journey_id
 ), link_facts as (
  select l.journey_id,count(distinct l.unit_request_id) linked_requests,
   count(distinct l.vacancy_id) filter(where l.published_at<=c.created_at+interval '7 days') publications
  from links l join cohort c on c.journey_id=l.journey_id group by l.journey_id
 ), summaries as materialized (
  select c.*,coalesce(e.steps,'{}'::smallint[]) steps,coalesce(l.publications,0) publications,
   coalesce(q.requests,0) requests,coalesce(l.linked_requests,0) linked_requests,
   coalesce(e.had_error,false) had_error,coalesce(e.returned,false) returned,e.latest
  from cohort c left join event_facts e using(journey_id) left join request_facts q using(journey_id) left join link_facts l using(journey_id)
 ), edges as (
  select e.from_step,e.to_step,count(distinct e.journey_id) n from events e
  join events prev on prev.event_id=e.previous_event_id and prev.journey_id=e.journey_id and prev.to_step=e.from_step and prev.visitor_id=e.visitor_id
  where e.from_step is not null and e.to_step=e.from_step+1 and e.event_name in ('step_ready','publish_clicked')
  group by e.from_step,e.to_step
 ), arrivals as materialized (
  select distinct on (session_id) session_id,source,campaign,device_class,route from public.analytics_events
  where journey_version=2 and event_name='lister_session_started' and created_at>=p_from and created_at<p_to
  order by session_id,created_at,id
 ), chosen_arrivals as (
  select * from arrivals where (nullif(p_source,'') is null or coalesce(nullif(source,''),'Unknown')=p_source) and (nullif(p_campaign,'') is null or campaign=p_campaign) and (nullif(p_device,'') is null or device_class=p_device)
 )
 select jsonb_build_object(
  'schemaVersion',2,'generatedAt',clock_timestamp(),'complete',true,'latestEvent',(select max(latest) from summaries),
  'total',(select count(*) from summaries),'arrivals',(select count(*) from chosen_arrivals),
  'intentSessions',(select count(*) from chosen_arrivals a where exists(select 1 from public.analytics_events e where e.journey_version=2 and e.session_id=a.session_id and e.event_name='list_property_clicked' and e.created_at>=p_from and e.created_at<p_to)),
  'arrivalRoutes',coalesce((select jsonb_agg(to_jsonb(a)) from (select route,count(*) n from chosen_arrivals group by route) a),'[]'::jsonb),
  'stages',(select jsonb_agg(jsonb_build_object('step',i,'count',(select count(*) from summaries where i=any(steps))) order by i) from generate_series(0,3) i),
  'edges',coalesce((select jsonb_agg(jsonb_build_object('from',from_step,'to',to_step,'count',n)) from edges),'[]'::jsonb),
  'sources',coalesce((select jsonb_agg(to_jsonb(a)) from (select source,count(*) n from summaries group by source order by n desc,source) a),'[]'::jsonb),
  'facets',jsonb_build_object('source',coalesce((select jsonb_agg(distinct source) from starts where created_at>=p_from and created_at<p_to and journey_mode='new'),'[]'::jsonb),'campaign',coalesce((select jsonb_agg(distinct campaign) from starts where created_at>=p_from and created_at<p_to and journey_mode='new' and campaign<>''),'[]'::jsonb)),
  'confirmed',(select count(*) from summaries where publications>0),'listings',(select coalesce(sum(publications),0) from summaries),
  'unknown',(select count(*) from summaries where publications=0 and (requests=0 or requests<>linked_requests)),
  'observing',(select count(*) from summaries where created_at>now()-interval '8 days'),
  'mature',(select count(*) from summaries where created_at<=now()-interval '8 days'),
  'errors',(select count(*) from summaries where had_error),'returned',(select count(*) from summaries where returned),
  'inactive',(select count(*) from summaries where latest<now()-interval '24 hours'),
  'rate',null,'rateNotice','Unavailable: best-effort collection cannot establish complete outcome coverage. Counts describe recorded journeys, not all visitors.',
  'details',coalesce((select jsonb_agg(to_jsonb(a)) from (select row_number() over(order by created_at desc,journey_id) label,source,created_at,publications,requests,linked_requests,steps,had_error from summaries where p_stage is null or p_stage=any(steps) order by created_at desc,journey_id limit 50 offset p_offset) a),'[]'::jsonb),
  'detailTotal',(select count(*) from summaries where p_stage is null or p_stage=any(steps)),
  'diagnostics',jsonb_build_object('errorCategories',coalesce((select jsonb_agg(to_jsonb(a)) from (select error_code,count(*) n from events where event_name='journey_error' group by error_code) a),'[]'::jsonb),'timingSamples',(select count(*) from events where event_name='photo_upload'),'uploadMedianMs',(select percentile_cont(0.5) within group(order by duration_ms) from events where event_name='photo_upload'))
 ) into result;
 return result;
end $function$
;
CREATE OR REPLACE FUNCTION public.admin_lister_marketing(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
        first_active.created_at=property_first.first_at as is_first_property_publication,
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
      left join (
        select other_r.property_id,min(log.created_at) as first_at
        from public.listing_activity_log log
        join public.vacancies other_v on other_v.id=log.entity_id
        join public.rooms other_r on other_r.id=other_v.room_id
        where log.entity_type='listing' and log.new_status='active'
          and log.old_status is distinct from 'active'
        group by other_r.property_id
      ) property_first on property_first.property_id=p.id
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
  return result || jsonb_build_object('generated_at', clock_timestamp());
end $function$
;
CREATE OR REPLACE FUNCTION public.admin_traffic_metrics(p_buckets jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '5s'
AS $function$
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
end $function$
;
CREATE OR REPLACE FUNCTION public.admin_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
  if not private.is_admin((select auth.uid())) then return jsonb_build_object('error','admin required'); end if;
  select jsonb_build_object(
    'users_total',(select count(*) from public.profiles),
    'users_7d',(select count(*) from public.profiles where created_at>now()-interval '7 days'),
    'users_suspended',(select count(*) from public.profiles where account_status='suspended'),
    'properties',(select count(*) from public.properties),
    'units',(select count(*) from public.rooms),
    'active_listings',(select count(*) from public.vacancies where status='active'),
    'paused_listings',(select count(*) from public.vacancies where status='paused'),
    'open_reports',(select count(*) from public.reports where status='open'),
    'oldest_report_hours',coalesce((select floor(extract(epoch from now()-min(created_at))/3600) from public.reports where status='open'),0),
    'messages_7d',(select count(*) from public.messages where created_at>now()-interval '7 days'),
    'listings_7d',(select count(*) from public.analytics_events where event_name='listing_published' and created_at>now()-interval '7 days'),
    'enquiries_7d',(select count(*) from public.analytics_events where event_name='enquiry_sent' and created_at>now()-interval '7 days'),
    'errors_24h',(select count(*) from public.client_errors where created_at>now()-interval '24 hours')
  ) into result;
  return result;
end $function$
;