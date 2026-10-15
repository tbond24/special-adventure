-- Development only. Preserve exact cached RPC signatures while closing REST INSERT.
create table private.analytics_ingestion_limits (
 bucket text primary key, window_start timestamptz not null, used integer not null check(used>=0)
);
alter table private.analytics_ingestion_limits enable row level security;
revoke all on private.analytics_ingestion_limits from public,anon,authenticated;

create function private.analytics_excluded_user(p_user uuid) returns boolean
language sql stable set search_path='' as $$
 select p_user is not null and (
 exists(select 1 from public.admin_users where user_id=p_user) or
 exists(select 1 from auth.users where id=p_user and
 (raw_app_meta_data->>'analytics_excluded'='true' or raw_app_meta_data->>'vacancy_qa_scope' is not null)))
$$;
create function private.analytics_allowed() returns boolean language sql stable set search_path='' as $$
 select not private.analytics_excluded_user(auth.uid()) and
 coalesce((coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb->>'user-agent') !~* '(bot|spider|crawler|slurp)',true)
$$;
create function private.analytics_budget(p_count integer) returns void language plpgsql set search_path='' as $$
declare k text; cap integer; n integer; boundary timestamptz:=date_trunc('minute',clock_timestamp());
begin
 if p_count not between 1 and 20 then raise exception 'Invalid event budget' using errcode='22023'; end if;
 -- Global lock first, then principal lock: concurrent calls have a consistent order.
 for k,cap in select 'global',6000 union all
   select case when auth.uid() is null then 'anonymous' else 'user:'||auth.uid()::text end,
   case when auth.uid() is null then 1000 else 600 end loop
  n:=null;
  insert into private.analytics_ingestion_limits as q(bucket,window_start,used) values(k,boundary,p_count)
  on conflict(bucket) do update set window_start=boundary,
   used=case when q.window_start=boundary then q.used+p_count else p_count end
  where q.window_start<>boundary or q.used+p_count<=cap returning used into n;
  if n is null then raise exception 'Analytics budget exceeded; retry later' using errcode='PT429'; end if;
 end loop;
end $$;
create function private.analytics_route(p_route text) returns text language sql immutable set search_path='' as $$
 select case when p_route in ('find','listing','list','create','auth','other') then p_route
 when p_route ~ '^/?(#home|#find|)$' then 'find'
 when p_route ~ '^(/listings/|#detail)' then 'listing'
 when p_route ~ '^#list/new' then 'create' when p_route ~ '^#list' then 'list'
 when p_route ~ '^#auth' then 'auth' else 'other' end
$$;
create function private.analytics_label(p_value text,p_length integer) returns text language sql immutable set search_path='' as $$
 select case when length(p_value)<=p_length and p_value ~ '^[a-zA-Z0-9 _./():-]*$'
 and p_value !~ '(://|[?@#])' then p_value else null end
$$;

-- Preserve the already tested insertion/deduplication implementations internally.
alter function public.record_lister_journey(jsonb) set schema private;
alter function private.record_lister_journey(jsonb) rename to analytics_write_v1;
alter function public.record_lister_journey_v2(jsonb) set schema private;
alter function private.record_lister_journey_v2(jsonb) rename to analytics_write_v2;
revoke all on function private.analytics_write_v1(jsonb),private.analytics_write_v2(jsonb) from public,anon,authenticated;

create function private.analytics_batch(p_events jsonb,p_version integer) returns integer
language plpgsql set search_path='' as $$
declare item jsonb; clean jsonb; batch jsonb:='[]'; k text; value text; n integer;
 common text[]:=array['event_id','event_name','visitor_id','session_id','journey_id','source','medium','campaign','campaign_id','adset_id','ad_id','content_id','referrer_host','route','device_class','duration_ms','error_code'];
 fields text[];
begin
 if p_events is null or jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>20 or octet_length(p_events::text)>32768 then
  raise exception 'Bounded event array required' using errcode='22023'; end if;
 fields:=common||case when p_version=2 then array['previous_event_id','occurred_at','from_step','to_step','unit_request_id','journey_mode']
 else array['vacancy_id','first_source','first_medium','first_campaign','landing_path','step','browser_family','os_family','active_ms'] end;
 for item in select e.value from jsonb_array_elements(p_events) e loop
  if jsonb_typeof(item)<>'object' or exists(select 1 from jsonb_object_keys(item) x where not x=any(fields)) then
   raise exception 'Unregistered analytics fields' using errcode='22023'; end if;
  if item->>'event_name' is null or item->>'event_name' not in ('lister_session_started','lister_landing_viewed','list_property_clicked','signup_started','signup_completed','signup_pending_confirmation','listing_started','property_type_completed','location_started','location_completed','listing_details_started','listing_details_completed','photos_completed','pricing_completed','listing_previewed','publish_clicked','listing_record_created','listing_submitted','step_ready','photo_upload','journey_error') then
   raise exception 'Unregistered analytics event' using errcode='22023'; end if;
  clean:=item;
  foreach k in array array['event_id','visitor_id','session_id','journey_id','previous_event_id','unit_request_id','vacancy_id'] loop
   value:=item->>k;
   if k in ('event_id','visitor_id','session_id') and value is null then raise exception 'Analytics IDs required' using errcode='22023'; end if;
   if nullif(value,'') is not null and value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Invalid analytics ID' using errcode='22023'; end if;
  end loop;
  foreach k in array array['duration_ms','active_ms','from_step','to_step'] loop
   if item ? k and item->k<>'null'::jsonb then
    if jsonb_typeof(item->k)<>'number' or (item->>k) !~ '^\d{1,8}$' then raise exception 'Invalid analytics timing/step' using errcode='22023'; end if;
    n:=(item->>k)::integer;
    if (k in ('from_step','to_step') and n>3) or (k in ('duration_ms','active_ms') and n>3600000) then raise exception 'Analytics value out of range' using errcode='22023'; end if;
   end if;
  end loop;
  foreach k in array array['source','medium','campaign','campaign_id','adset_id','ad_id','content_id','first_source','first_medium','first_campaign','referrer_host','browser_family','os_family'] loop
   if item ? k then clean:=jsonb_set(clean,array[k],coalesce(to_jsonb(private.analytics_label(item->>k,case when k='referrer_host' then 120 else 100 end)),'null'::jsonb)); end if;
  end loop;
  if item ? 'referrer_host' and coalesce(item->>'referrer_host','') !~ '^[A-Za-z0-9.-]*$' then clean:=jsonb_set(clean,'{referrer_host}','null'); end if;
  clean:=jsonb_set(clean,'{route}',to_jsonb(private.analytics_route(item->>'route')));
  if item ? 'landing_path' then clean:=jsonb_set(clean,'{landing_path}',to_jsonb(private.analytics_route(item->>'landing_path'))); end if;
  if item ? 'device_class' and item->>'device_class' not in ('desktop','mobile','tablet','unknown') then raise exception 'Invalid analytics device' using errcode='22023'; end if;
  if item ? 'step' and item->>'step' not in ('location','listing_details','review','signup') then raise exception 'Invalid analytics step' using errcode='22023'; end if;
  if item ? 'error_code' and item->>'error_code' not in ('photo_upload_failed','publish_failed','listing_save_failed','signup_failed') then raise exception 'Invalid analytics error category' using errcode='22023'; end if;
  batch:=batch||jsonb_build_array(clean);
 end loop;
 if not private.analytics_allowed() or jsonb_array_length(batch)=0 then return 0; end if;
 perform private.analytics_budget(jsonb_array_length(batch));
 if p_version=2 then return private.analytics_write_v2(batch); end if;
 return private.analytics_write_v1(batch);
end $$;
create function public.record_lister_journey(p_events jsonb) returns integer
language sql security definer set search_path='' as $$ select private.analytics_batch(p_events,1) $$;
create function public.record_lister_journey_v2(p_events jsonb) returns integer
language sql security definer set search_path='' as $$ select private.analytics_batch(p_events,2) $$;

create or replace function public.track_event(p_event_name text,p_vacancy_id uuid default null,p_route text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_event_name is null or p_event_name not in ('home_viewed','search_used','vacancy_opened','vacancy_saved','enquiry_started','enquiry_sent','listing_started','listing_published','message_sent','report_submitted','user_blocked','listing_impression') then raise exception 'Unsupported event' using errcode='22023'; end if;
 if not private.analytics_allowed() then return; end if;
 perform private.analytics_budget(1);
 insert into public.analytics_events(user_id,event_name,vacancy_id,route) values(auth.uid(),p_event_name,p_vacancy_id,private.analytics_route(p_route));
end $$;
create or replace function public.track_listing_open(p_vacancy_id uuid,p_visitor_id uuid default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.analytics_allowed() then return; end if;
 perform private.analytics_budget(1);
 insert into public.analytics_events(user_id,event_name,vacancy_id,route,visitor_id) values(auth.uid(),'vacancy_opened',p_vacancy_id,'listing',p_visitor_id);
end $$;

revoke insert on public.analytics_events from public,anon,authenticated;
do $$ declare columns text; begin
 select string_agg(quote_ident(attname),',') into columns from pg_attribute where attrelid='public.analytics_events'::regclass and attnum>0 and not attisdropped;
 execute 'revoke insert ('||columns||') on public.analytics_events from public,anon,authenticated';
end $$;
revoke all on function private.analytics_excluded_user(uuid),private.analytics_allowed(),private.analytics_budget(integer),private.analytics_route(text),private.analytics_label(text,integer),private.analytics_batch(jsonb,integer) from public,anon,authenticated;
revoke all on function public.record_lister_journey(jsonb),public.record_lister_journey_v2(jsonb),public.track_event(text,uuid,text),public.track_listing_open(uuid,uuid) from public,anon,authenticated;
grant execute on function public.record_lister_journey(jsonb),public.record_lister_journey_v2(jsonb),public.track_event(text,uuid,text),public.track_listing_open(uuid,uuid) to anon,authenticated;

-- Preserve v2 cohorts, authoritative publication facts, 50-row paging and withheld rate.
create or replace function public.admin_connected_journeys(p_from timestamptz,p_to timestamptz,p_source text default null,p_campaign text default null,p_device text default null,p_stage integer default null,p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='8s' as $$
declare result jsonb;
begin
 if not private.is_admin(auth.uid()) then raise exception 'Admin verification required' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>interval '90 days' or p_offset<0 or p_offset>100000 or p_stage not between 0 and 3 then
  raise exception 'Invalid report range' using errcode='22023'; end if;
 if p_from<now()-interval '90 days' then
  return jsonb_build_object('schemaVersion',2,'generatedAt',clock_timestamp(),'complete',false,'reason','Range exceeds the 90-day evidence window. Narrow the dates.'); end if;
 with excluded as materialized (select user_id from public.admin_users union select id from auth.users where raw_app_meta_data->>'analytics_excluded'='true' or raw_app_meta_data->>'vacancy_qa_scope' is not null), starts as materialized (
  select distinct on (journey_id) journey_id,visitor_id,created_at,coalesce(nullif(source,''),'Unknown') source,coalesce(campaign,'') campaign,coalesce(device_class,'unknown') device_class,journey_mode
  from public.analytics_events where not exists(select 1 from excluded x where x.user_id=analytics_events.user_id) and journey_version=2 and event_name='listing_started' and journey_id is not null
  order by journey_id,created_at,id
 ), cohort as materialized (
  select * from starts where created_at>=p_from and created_at<p_to and journey_mode='new'
   and (nullif(p_source,'') is null or source=p_source) and (nullif(p_campaign,'') is null or campaign=p_campaign) and (nullif(p_device,'') is null or device_class=p_device)
 ), events as materialized (
  select e.* from public.analytics_events e join cohort c on c.journey_id=e.journey_id and c.visitor_id=e.visitor_id
  where not exists(select 1 from excluded x where x.user_id=e.user_id) and e.journey_version=2 and e.created_at>=c.created_at and e.created_at<=c.created_at+interval '7 days'
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
  where not exists(select 1 from excluded x where x.user_id=analytics_events.user_id) and journey_version=2 and event_name='lister_session_started' and created_at>=p_from and created_at<p_to
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
  'exclusionNotice','Known admin/test accounts excluded; bot filtering is prospective and heuristic. Historical anonymous/test coverage is unknown.','rate',null,'rateNotice','Unavailable: best-effort collection cannot establish complete outcome coverage. Counts describe recorded journeys, not all visitors.',
  'details',coalesce((select jsonb_agg(to_jsonb(a)) from (select row_number() over(order by created_at desc,journey_id) label,source,created_at,publications,requests,linked_requests,steps,had_error from summaries where p_stage is null or p_stage=any(steps) order by created_at desc,journey_id limit 50 offset p_offset) a),'[]'::jsonb),
  'detailTotal',(select count(*) from summaries where p_stage is null or p_stage=any(steps)),
  'diagnostics',jsonb_build_object('errorCategories',coalesce((select jsonb_agg(to_jsonb(a)) from (select error_code,count(*) n from events where event_name='journey_error' group by error_code) a),'[]'::jsonb),'timingSamples',(select count(*) from events where event_name='photo_upload'),'uploadMedianMs',(select percentile_cont(0.5) within group(order by duration_ms) from events where event_name='photo_upload'))
 ) into result;
 return result;
end $$;
revoke all on function public.admin_connected_journeys(timestamptz,timestamptz,text,text,text,integer,integer) from public,anon;
grant execute on function public.admin_connected_journeys(timestamptz,timestamptz,text,text,text,integer,integer) to authenticated;

alter function public.admin_connected_journeys(timestamptz,timestamptz,text,text,text,integer,integer) set enable_nestloop=off;
alter function public.admin_connected_journeys(timestamptz,timestamptz,text,text,text,integer,integer) set jit=off;
