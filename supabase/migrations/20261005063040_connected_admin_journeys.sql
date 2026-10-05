-- Additive instrumentation. No publication/auth behavior, deletion job or backfill.
alter table public.analytics_events add column if not exists journey_version smallint not null default 1;
alter table public.analytics_events add column if not exists previous_event_id uuid;
alter table public.analytics_events add column if not exists occurred_at timestamptz;
alter table public.analytics_events add column if not exists from_step smallint;
alter table public.analytics_events add column if not exists to_step smallint;
alter table public.analytics_events add column if not exists unit_request_id uuid;
alter table public.analytics_events add column if not exists journey_mode text;
create index if not exists analytics_connected_journey_idx on public.analytics_events(journey_id,created_at) where journey_version=2;
create index if not exists analytics_connected_request_idx on public.analytics_events(unit_request_id) where unit_request_id is not null;

create or replace function public.record_lister_journey_v2(p_events jsonb)
returns integer language plpgsql security invoker set search_path='' as $$
declare item jsonb; accepted integer:=0; event text;
begin
 if p_events is null or jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>20 or octet_length(p_events::text)>32768 then
  raise exception 'Invalid journey batch' using errcode='22023'; end if;
 for item in select value from jsonb_array_elements(p_events) loop
  event:=item->>'event_name';
  if event is null or event not in ('lister_session_started','lister_landing_viewed','list_property_clicked','listing_started','step_ready','publish_clicked','listing_record_created','listing_submitted','photo_upload','journey_error')
   or item->>'event_id' is null or item->>'visitor_id' is null or item->>'session_id' is null
   or coalesce(item->>'journey_mode','new') not in ('new','legacy')
   or coalesce((item->>'to_step')::integer,0) not between 0 and 3
   or coalesce((item->>'from_step')::integer,0) not between 0 and 3
   or coalesce(item->>'route','other') not in ('find','listing','list','create','auth','other') then
   raise exception 'Unsupported journey fields' using errcode='22023'; end if;
  begin
   insert into public.analytics_events(event_id,user_id,event_name,route,visitor_id,session_id,journey_id,source,medium,campaign,
    campaign_id,adset_id,ad_id,content_id,referrer_host,device_class,duration_ms,error_code,
    journey_version,previous_event_id,occurred_at,from_step,to_step,unit_request_id,journey_mode)
   values((item->>'event_id')::uuid,auth.uid(),event,item->>'route',(item->>'visitor_id')::uuid,(item->>'session_id')::uuid,
    nullif(item->>'journey_id','')::uuid,left(item->>'source',80),left(item->>'medium',80),left(item->>'campaign',100),
    left(item->>'campaign_id',100),left(item->>'adset_id',100),left(item->>'ad_id',100),left(item->>'content_id',100),
    left(item->>'referrer_host',120),left(item->>'device_class',16),least(greatest(coalesce((item->>'duration_ms')::integer,0),0),3600000),left(item->>'error_code',60),
    2,nullif(item->>'previous_event_id','')::uuid,
    greatest(now()-interval '24 hours',least(now(),coalesce((item->>'occurred_at')::timestamptz,now()))),
    (item->>'from_step')::smallint,(item->>'to_step')::smallint,nullif(item->>'unit_request_id','')::uuid,coalesce(item->>'journey_mode','new'));
   accepted:=accepted+1;
  exception when unique_violation then null;
  end;
 end loop;
 return accepted;
end $$;
revoke all on function public.record_lister_journey_v2(jsonb) from public;
grant execute on function public.record_lister_journey_v2(jsonb) to anon,authenticated;

create or replace function public.admin_connected_journeys(p_from timestamptz,p_to timestamptz,p_source text default null,p_campaign text default null,p_device text default null,p_stage integer default null,p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='8s' as $$
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
 ), summaries as materialized (
  select c.*,
   coalesce((select array_agg(distinct e.to_step) from events e where e.journey_id=c.journey_id and e.to_step is not null),'{}'::smallint[]) steps,
   (select count(distinct l.vacancy_id) from links l where l.journey_id=c.journey_id and l.published_at<=c.created_at+interval '7 days') publications,
   (select count(*) from requests q where q.journey_id=c.journey_id) requests,
   (select count(distinct l.unit_request_id) from links l where l.journey_id=c.journey_id) linked_requests,
   exists(select 1 from events e where e.journey_id=c.journey_id and e.event_name='journey_error') had_error,
   (select count(distinct e.session_id) from events e where e.journey_id=c.journey_id)>1 returned,
   (select max(e.created_at) from events e where e.journey_id=c.journey_id) latest
  from cohort c
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
end $$;
revoke all on function public.admin_connected_journeys(timestamptz,timestamptz,text,text,text,integer,integer) from public,anon;
grant execute on function public.admin_connected_journeys(timestamptz,timestamptz,text,text,text,integer,integer) to authenticated;
