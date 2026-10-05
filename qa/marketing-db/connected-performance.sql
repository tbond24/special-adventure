begin;
create temp table perf_result(events integer,journeys integer,milliseconds numeric,json_bytes integer);
do $$ declare n integer; t timestamptz; r jsonb; owner uuid; begin
select user_id into owner from public.admin_users limit 1;
perform set_config('request.jwt.claims',jsonb_build_object('sub',owner,'aal','aal2')::text,true);
foreach n in array array[250,25000] loop
insert into public.analytics_events(event_id,event_name,created_at,visitor_id,session_id,journey_id,source,journey_version,journey_mode,previous_event_id,from_step,to_step)
select md5('perf'||n||':'||i||':'||s)::uuid,case when s=0 then 'listing_started' else 'step_ready' end,now()-interval '1 day'+s*interval '1 minute',
md5('visitor'||n||':'||i)::uuid,md5('session'||n||':'||i)::uuid,md5('journey'||n||':'||i)::uuid,'synthetic-perf-'||n,2,'new',case when s>0 then md5('perf'||n||':'||i||':'||(s-1))::uuid end,case when s>0 then s-1 end,s
from generate_series(1,n) i cross join generate_series(0,3) s;
t:=clock_timestamp(); r:=public.admin_connected_journeys(now()-interval '2 days',now(),'synthetic-perf-'||n);
if (r->>'total')::int<>n then raise exception 'Wrong total';end if;
insert into perf_result values(n*4,n,extract(epoch from(clock_timestamp()-t))*1000,octet_length(r::text));
end loop;end $$;
select * from perf_result;rollback;
