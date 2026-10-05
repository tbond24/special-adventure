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
end $$;
revoke all on function public.admin_connected_journeys(timestamptz,timestamptz,text,text,text,integer,integer) from public,anon;
grant execute on function public.admin_connected_journeys(timestamptz,timestamptz,text,text,text,integer,integer) to authenticated;
