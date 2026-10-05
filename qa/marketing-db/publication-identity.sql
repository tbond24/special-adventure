-- Synthetic identity regression: properties do not define publication counts.
truncate public.analytics_events,public.listing_activity_log,public.vacancies,public.rooms,public.properties;
insert into properties select md5('identity-p'||i)::uuid,'00000000-0000-4000-8000-000000000001' from generate_series(1,3)i;
insert into rooms select md5('identity-r'||i)::uuid,md5('identity-p'||case when i<=3 then 1 when i<=6 then 2 else 3 end)::uuid from generate_series(1,10)i;
insert into vacancies select md5('identity-v'||i)::uuid,md5('identity-r'||i)::uuid from generate_series(1,10)i;
insert into listing_activity_log(entity_type,entity_id,old_status,new_status,created_at)
select 'listing',md5('identity-v'||v)::uuid,old,new,at::timestamptz from (values
 (1,null,'active','2026-01-01 00:00Z'),
 (2,'draft','active','2026-01-01 00:00Z'),
 (3,'draft','active','2026-01-01 03:00Z'),
 (3,'active','active','2026-01-01 04:00Z'),
 (3,'paused','active','2026-01-01 05:00Z'),
 (4,null,'active','2025-12-31 23:59Z'),
 (4,'paused','active','2026-01-01 01:00Z'),
 (5,null,'active','2026-01-01 02:00Z'),
 (6,'draft','active','2026-01-01 02:00Z'),
 (7,'active','active','2026-01-01 06:00Z'),
 (8,null,'active','2026-01-02 00:00Z'),
 (9,'draft','active','2026-01-01 23:59:59.999999Z'),
 (10,'draft','paused','2026-01-01 10:00Z')) f(v,old,new,at);
insert into analytics_events(event_id,event_name,user_id,vacancy_id,created_at,source)
select md5('identity-event'||i)::uuid,'listing_submitted','00000000-0000-4000-8000-000000000001',md5('identity-v'||i)::uuid,'2025-12-31 23:00Z','synthetic' from generate_series(1,10)i;
analyze;
