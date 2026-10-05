-- Fixed synthetic dates; no production rows, identities, addresses or media.
insert into public.properties values ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001');
insert into public.rooms select md5('qa-room-'||i)::uuid,'10000000-0000-4000-8000-000000000001'::uuid from generate_series(1,6) i;
insert into public.vacancies select md5('qa-listing-'||i)::uuid,md5('qa-room-'||i)::uuid from generate_series(1,6) i;
insert into public.listing_activity_log(entity_type,entity_id,old_status,new_status,created_at) values
 ('listing',md5('qa-listing-1')::uuid,null,'active','2026-01-01 00:00Z'),
 ('listing',md5('qa-listing-1')::uuid,'active','active','2026-01-01 01:00Z'),
 ('listing',md5('qa-listing-1')::uuid,'paused','active','2026-01-01 02:00Z'),
 ('listing',md5('qa-listing-2')::uuid,'draft','active','2025-12-31 23:59:59.999999Z'),
 ('listing',md5('qa-listing-2')::uuid,'paused','active','2026-01-01 03:00Z'),
 ('listing',md5('qa-listing-3')::uuid,'draft','active','2026-01-02 00:00Z'),
 ('listing',md5('qa-listing-4')::uuid,'draft','active','2026-01-01 23:59:59.999999Z'),
 ('listing',md5('qa-listing-5')::uuid,'active','active','2026-01-01 04:00Z'),
 ('room',md5('qa-listing-6')::uuid,null,'active','2026-01-01 05:00Z');
insert into public.analytics_events(event_id,event_name,created_at) values
 (gen_random_uuid(),'before','2025-12-31 23:59:59.999999Z'),
 (gen_random_uuid(),'start','2026-01-01 00:00Z'),
 (gen_random_uuid(),'last','2026-01-01 23:59:59.999999Z'),
 (gen_random_uuid(),'end','2026-01-02 00:00Z'),
 (null,'legacy-uninstrumented','2026-01-01 12:00Z');

set role anon;
select set_config('request.jwt.claims','{}',false);
do $$ begin
  perform public.admin_lister_marketing('2026-01-01 00:00Z','2026-01-02 00:00Z');
  raise exception 'FAIL: anonymous access permitted';
exception when insufficient_privilege then raise notice 'PASS: anonymous denied (42501)'; end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","aal":"aal1"}',false);
do $$ begin
  perform public.admin_lister_marketing('2026-01-01 00:00Z','2026-01-02 00:00Z');
  raise exception 'FAIL: AAL1 admin access permitted';
exception when insufficient_privilege then raise notice 'PASS: AAL1 admin denied (42501)'; end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","aal":"aal2"}',false);
do $$ begin
  perform public.admin_lister_marketing('2026-01-01 00:00Z','2026-01-02 00:00Z');
  raise exception 'FAIL: non-admin access permitted';
exception when insufficient_privilege then raise notice 'PASS: AAL2 non-admin denied (42501)'; end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","aal":"aal2"}',false);
set timezone='Australia/Perth';
do $$ declare a jsonb; b jsonb; begin
  a:=public.admin_lister_marketing('2026-01-01 00:00Z','2026-01-02 00:00Z');
  perform public.qa_assert(jsonb_array_length(a->'events')=2,'UTC analytics boundaries and legacy exclusion');
  perform public.qa_assert((select array_agg(x->>'event_name' order by x->>'event_name') from jsonb_array_elements(a->'events') x)=array['last','start'],'correct boundary events');
  perform public.qa_assert(jsonb_array_length(a->'publications')=2,'publication boundaries and deduplication');
  perform public.qa_assert((select count(*) from jsonb_array_elements(a->'publications') x where x->>'vacancy_id' in (md5('qa-listing-1')::uuid::text,md5('qa-listing-4')::uuid::text))=2,'NULL old status qualifies; earlier history excludes republication; active-active ignored');
  perform public.qa_assert((a->>'generated_at')::timestamptz between clock_timestamp()-interval '10 seconds' and clock_timestamp(),'server timestamp is current');
  perform pg_sleep(0.05);
  b:=public.admin_lister_marketing('2026-01-01 00:00Z','2026-01-02 00:00Z');
  perform public.qa_assert((b->>'generated_at')::timestamptz>(a->>'generated_at')::timestamptz,'generated_at advances within a transaction');
end $$;
reset role;

-- Exercise each sentinel independently, on this dedicated synthetic database only.
truncate public.analytics_events;
insert into public.analytics_events(event_id,event_name,created_at)
select gen_random_uuid(),'synthetic_limit','2026-01-01 12:00Z'::timestamptz from generate_series(1,5000);
set role authenticated;
select public.qa_assert(jsonb_array_length(public.admin_lister_marketing('2026-01-01 00:00Z','2026-01-02 00:00Z')->'events')=5000,'5000 analytics rows complete');
reset role;
insert into public.analytics_events(event_id,event_name,created_at) values(gen_random_uuid(),'synthetic_sentinel','2026-01-01 12:00Z');
set role authenticated;
do $$ declare a jsonb; begin
  a:=public.admin_lister_marketing('2026-01-01 00:00Z','2026-01-02 00:00Z');
  perform public.qa_assert(jsonb_array_length(a->'events')=5001 and jsonb_array_length(a->'publications')=2,'analytics sentinel leaves independent publications complete');
end $$;
reset role;
truncate public.analytics_events,public.listing_activity_log;
insert into public.rooms select md5('qa-limit-room-'||i)::uuid,'10000000-0000-4000-8000-000000000001'::uuid from generate_series(1,5001) i;
insert into public.vacancies select md5('qa-limit-listing-'||i)::uuid,md5('qa-limit-room-'||i)::uuid from generate_series(1,5001) i;
insert into public.listing_activity_log(entity_type,entity_id,old_status,new_status,created_at)
select 'listing',md5('qa-limit-listing-'||i)::uuid,null,'active','2026-01-01 12:00Z'::timestamptz from generate_series(1,5000) i;
set role authenticated;
select public.qa_assert(jsonb_array_length(public.admin_lister_marketing('2026-01-01 00:00Z','2026-01-02 00:00Z')->'publications')=5000,'5000 publications complete');
reset role;
insert into public.listing_activity_log(entity_type,entity_id,old_status,new_status,created_at)
values('listing',md5('qa-limit-listing-5001')::uuid,null,'active','2026-01-01 12:00Z');
set role authenticated;
do $$ declare a jsonb; begin
  a:=public.admin_lister_marketing('2026-01-01 00:00Z','2026-01-02 00:00Z');
  perform public.qa_assert(jsonb_array_length(a->'events')=0 and jsonb_array_length(a->'publications')=5001,'publication sentinel leaves independent analytics complete');
end $$;
reset role;
