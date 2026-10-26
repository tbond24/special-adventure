-- Scoped candidate. NOT applied to hosted databases. No replay of earlier migrations.
set lock_timeout='2s';
set statement_timeout='15s';
create table private.engagement_coverage(id boolean primary key default true check(id),enabled boolean not null default false,started_at timestamptz);
insert into private.engagement_coverage(id) values(true);
create table private.engagement_events(
 event_id uuid primary key,point text not null check(point in ('contact_button_pressed','text_button_pressed','context')),
 visitor_id uuid not null,session_id uuid not null,user_id uuid,occurred_at timestamptz not null,
 received_at timestamptz not null default now(),city text,country text check(country is null or country ~ '^[A-Z]{2}$'),
 check(city is null or length(city)<=80)
);
create index engagement_events_time on private.engagement_events(occurred_at desc,point);
create index engagement_events_user on private.engagement_events(user_id,occurred_at desc) where user_id is not null;
create index engagement_events_budget on private.engagement_events(visitor_id,received_at desc);
create table private.site_change_feed(
 id text primary key,category text not null check(category in ('ui','code')),section text not null,
 summary text not null,occurred_at timestamptz not null default now(),source_commit text,deployment_id text,
 check(length(id)<=160 and length(section)<=100 and length(summary)<=240)
);
create index site_change_feed_time on private.site_change_feed(occurred_at desc);
alter table private.engagement_coverage enable row level security;
alter table private.engagement_events enable row level security;
alter table private.site_change_feed enable row level security;
revoke all on private.engagement_coverage,private.engagement_events,private.site_change_feed from public,anon,authenticated;

create function public.record_site_engagement(p_events jsonb) returns integer language plpgsql security definer set search_path='' set statement_timeout='3s' as $$
declare item jsonb;accepted integer:=0;stamp timestamptz;browser uuid;kind text;n integer;
begin
 if exists(select 1 from public.admin_users where user_id=(select auth.uid())) or not exists(select 1 from private.engagement_coverage where id and enabled and started_at is not null) then return 0;end if;
 if p_events is null or jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>20 or octet_length(p_events::text)>30000 then raise exception 'Invalid batch' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(p_events) loop
  if jsonb_typeof(item)<>'object' or exists(select 1 from jsonb_object_keys(item) k where k not in ('event_id','point','visitor_id','session_id','occurred_at','city','country')) then raise exception 'Unsupported field' using errcode='22023';end if;
  kind:=item->>'point';browser:=(item->>'visitor_id')::uuid;stamp:=(item->>'occurred_at')::timestamptz;
  if kind is null or kind not in ('contact_button_pressed','text_button_pressed','context') or browser is null or nullif(item->>'session_id','') is null or nullif(item->>'event_id','') is null or stamp is null or not isfinite(stamp) or stamp<now()-interval '15 minutes' or stamp>now()+interval '1 minute' or length(coalesce(item->>'city',''))>80 or (nullif(item->>'country','') is not null and item->>'country' !~ '^[A-Z]{2}$') then raise exception 'Invalid event' using errcode='22023';end if;
  if stamp<(select started_at from private.engagement_coverage where id) then continue;end if;
  -- Serialize the same browser's budget; identifiers remain untrusted telemetry.
  perform pg_advisory_xact_lock(hashtextextended(browser::text,0));
  if (select count(*) from private.engagement_events where visitor_id=browser and received_at>now()-interval '1 minute')>=120 then raise exception 'Event limit reached' using errcode='54000';end if;
  insert into private.engagement_events(event_id,point,visitor_id,session_id,user_id,occurred_at,city,country)
  values((item->>'event_id')::uuid,kind,browser,(item->>'session_id')::uuid,(select auth.uid()),least(stamp,now()),nullif(item->>'city',''),nullif(item->>'country','')) on conflict do nothing;
  get diagnostics n=row_count;accepted:=accepted+n;
 end loop;return accepted;
end $$;
revoke all on function public.record_site_engagement(jsonb) from public,anon,authenticated;
grant execute on function public.record_site_engagement(jsonb) to anon,authenticated;

create function public.admin_engagement_series(p_point text,p_buckets jsonb) returns jsonb language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare b jsonb;lo timestamptz;hi timestamptz;first_at timestamptz;last_at timestamptz;coverage timestamptz;output jsonb:='[]';v bigint;u bigint;total bigint;unique_total bigint;
begin
 if not private.is_admin((select auth.uid())) then raise exception 'Admin verification required' using errcode='42501';end if;
 if p_point is null or p_point not in ('contact_button_pressed','text_button_pressed') or p_buckets is null or jsonb_typeof(p_buckets)<>'array' or jsonb_array_length(p_buckets) not between 1 and 100 or octet_length(p_buckets::text)>30000 then raise exception 'Invalid series' using errcode='22023';end if;
 select greatest(started_at,now()-interval '90 days') into coverage from private.engagement_coverage where id and enabled;
 if coverage is null then return jsonb_build_object('schemaVersion',1,'point',p_point,'coverageStart',null,'complete',false,'events',0,'browsers',0,'series','[]'::jsonb);end if;
 for b in select value from jsonb_array_elements(p_buckets) loop
  lo:=(b->>'start')::timestamptz;hi:=(b->>'end')::timestamptz;
  if lo is null or hi is null or not isfinite(lo) or not isfinite(hi) or lo>hi or hi-lo>interval '26 hours' or hi>now()+interval '1 minute' or (last_at is not null and lo<>last_at) then raise exception 'Invalid bucket' using errcode='22023';end if;
  first_at:=coalesce(first_at,lo);last_at:=hi;if hi-first_at>interval '91 days' then raise exception 'Range too large' using errcode='22023';end if;
  select count(*),count(distinct e.visitor_id) into v,u from private.engagement_events e where point=p_point and occurred_at>=greatest(lo,coverage) and occurred_at<hi and not exists(select 1 from public.admin_users a where a.user_id=e.user_id);
  output:=output||jsonb_build_array(jsonb_build_object('at',hi,'events',v,'browsers',u));
 end loop;
 select count(*),count(distinct e.visitor_id) into total,unique_total from private.engagement_events e where point=p_point and occurred_at>=greatest(first_at,coverage) and occurred_at<last_at and not exists(select 1 from public.admin_users a where a.user_id=e.user_id);
 return jsonb_build_object('schemaVersion',1,'point',p_point,'coverageStart',coverage,'complete',first_at>=coverage,'events',total,'browsers',unique_total,'series',output);
end $$;
revoke all on function public.admin_engagement_series(text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_engagement_series(text,jsonb) to authenticated;

-- Publication tooling records verified deployment receipts here; browsers cannot.
create function public.record_admin_release(p_deployment text,p_commit text,p_summary text,p_sections text[]) returns void language plpgsql security definer set search_path='' as $$
declare s text;
begin
 if p_deployment !~ '^dpl_[A-Za-z0-9]+$' or p_commit !~ '^[a-f0-9]{40}$' or p_summary is null or length(p_summary) not between 1 and 240 or coalesce(array_length(p_sections,1),0)>12 then raise exception 'Invalid release receipt';end if;
 update private.engagement_coverage set enabled=true,started_at=clock_timestamp() where id and not enabled;
 insert into private.site_change_feed(id,category,section,summary,source_commit,deployment_id) values(p_deployment,'code','Code release',p_summary,p_commit,p_deployment) on conflict do nothing;
 foreach s in array coalesce(p_sections,array[]::text[]) loop
  insert into private.site_change_feed(id,category,section,summary,source_commit,deployment_id) values(p_deployment||':'||s,'ui',s,s||' updated',p_commit,p_deployment) on conflict do nothing;
 end loop;
end $$;
revoke all on function public.record_admin_release(text,text,text,text[]) from public,anon,authenticated;
grant execute on function public.record_admin_release(text,text,text,text[]) to service_role;

-- Record installed UI configuration edits without retaining values or private drafts.
create function private.capture_site_ui_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new is not distinct from old then return null;end if;
 insert into private.site_change_feed(id,category,section,summary) values(gen_random_uuid()::text,'ui',case tg_table_name when 'site_favicon' then 'Site favicon' when 'site_icon_overrides' then 'Site icons' when 'site_icon_slots' then 'Icon placement' else 'Published appearance' end,replace(tg_table_name,'_',' ')||' updated');
 return null;
end $$;
revoke all on function private.capture_site_ui_change() from public,anon,authenticated;
do $$ declare t text;begin foreach t in array array['site_favicon','site_icon_overrides','site_icon_slots','admin_appearance_current'] loop
 if to_regclass('public.'||t) is not null then execute format('create trigger vacancy_site_change_feed after insert or update or delete on public.%I for each row execute function private.capture_site_ui_change()',t);end if;
end loop;end $$;

create function public.admin_activity_feed(p_kind text,p_from timestamptz,p_to timestamptz,p_category text default null) returns jsonb language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare result jsonb;
begin
 if not private.is_admin((select auth.uid())) then raise exception 'Admin verification required' using errcode='42501';end if;
 if p_kind is null or p_kind not in ('site','visitor') or p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to) or p_to<=p_from or p_to-p_from>interval '7 days 1 minute' or p_to>now()+interval '1 minute' or coalesce(p_category,'all') not in ('all','ui','code','clicks','listing','registrations') then raise exception 'Invalid feed' using errcode='22023';end if;
 if p_kind='site' then
  select jsonb_build_object('schemaVersion',1,'kind',p_kind,'generatedAt',now(),'rows',coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb)) into result from (
   select md5(concat_ws('|',category,section,summary,date_trunc('minute',occurred_at),source_commit,deployment_id)) as id,category,section,summary as title,max(occurred_at) as at,count(*) as count,source_commit as commit,deployment_id as deployment,null::text as city,null::text as country
   from private.site_change_feed where occurred_at>=p_from and occurred_at<p_to and (p_category is null or p_category='all' or category=p_category) group by category,section,summary,date_trunc('minute',occurred_at),source_commit,deployment_id order by at desc,id desc limit 50
  ) r;
 else
  with events as (
   select 'clicks'::text category,e.point as name,'Listing'::text section,e.occurred_at as at,e.city,e.country from private.engagement_events e
    where point<>'context' and occurred_at>=p_from and occurred_at<p_to and not exists(select 1 from public.admin_users a where a.user_id=e.user_id)
   union all
   select 'listing',case when event_name='listing_started' then 'Location step opened' when to_step=0 then 'Location step opened' when to_step=1 then 'Listing details opened' when to_step=2 then 'Listing review opened' else 'Publish attempted' end,'Create listing',coalesce(occurred_at,created_at),null,null
    from public.analytics_events e where journey_version=2 and event_name in ('listing_started','step_ready','publish_clicked') and created_at>=p_from and created_at<p_to and not exists(select 1 from public.admin_users a where a.user_id=e.user_id)
   union all
   select 'listing','Listing published','Listings',l.created_at,null,null from public.listing_activity_log l join public.vacancies v on v.id=l.entity_id join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id
    where l.entity_type='listing' and l.new_status='active' and l.old_status is distinct from 'active' and l.created_at>=p_from and l.created_at<p_to and not exists(select 1 from public.admin_users a where a.user_id=p.owner_id)
     and not exists(select 1 from public.listing_activity_log older where older.entity_id=l.entity_id and older.entity_type='listing' and older.new_status='active' and older.old_status is distinct from 'active' and older.created_at<l.created_at)
   union all
   select 'registrations','Account registered','Account',u.email_confirmed_at,g.city,g.country from auth.users u left join lateral (
    select city,country from private.engagement_events e where e.user_id=u.id and e.point='context' and abs(extract(epoch from e.occurred_at-u.email_confirmed_at))<=900 order by abs(extract(epoch from e.occurred_at-u.email_confirmed_at)) limit 1
   ) g on true where not coalesce(u.is_anonymous,false) and u.email_confirmed_at>=p_from and u.email_confirmed_at<p_to and not exists(select 1 from public.admin_users a where a.user_id=u.id)
  ), grouped as (
   select category,name,section,date_trunc('minute',at) as minute,max(at) as at,count(*) as count,city,country from events where p_category is null or p_category='all' or category=p_category group by category,name,section,date_trunc('minute',at),city,country
  ) select jsonb_build_object('schemaVersion',1,'kind',p_kind,'generatedAt',now(),'rows',coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb)) into result from (
   select md5(concat_ws('|',category,name,section,minute,city,country)) as id,category,section,case name when 'contact_button_pressed' then 'Contact clicked' when 'text_button_pressed' then 'Text clicked' else name end as title,at,count,city,country,null::text as commit,null::text as deployment from grouped order by at desc,id desc limit 50
  ) r;
 end if;return result;
end $$;
revoke all on function public.admin_activity_feed(text,timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.admin_activity_feed(text,timestamptz,timestamptz,text) to authenticated;

-- Add identity breakdowns to the existing expiring snapshot, preserving old fields.
create or replace function public.admin_visitor_presence(p_device text default null) returns jsonb language plpgsql security definer set search_path='' set statement_timeout='3s' as $$
declare result jsonb;
begin
 if not private.is_admin((select auth.uid())) then raise exception 'Admin verification required' using errcode='42501';end if;
 if p_device is not null and p_device not in ('desktop','mobile','tablet') then raise exception 'Invalid device' using errcode='22023';end if;
 with live as materialized(select p.*,case when p.user_id is null or u.is_anonymous then 'guest' when u.id is not null then 'registered' else 'unknown' end as identity
  from private.visitor_presence p left join auth.users u on u.id=p.user_id where active and seen_at>now()-interval '45 seconds' and (p_device is null or device=p_device) and not exists(select 1 from public.admin_users a where a.user_id=p.user_id)),
 visitors as(select visitor_id,case when bool_or(identity='registered') then 'registered' when bool_or(identity='unknown') then 'unknown' else 'guest' end as identity from live group by visitor_id),
 nodes as(select node as id,count(distinct visitor_id) as count from live group by node)
 select jsonb_build_object('generatedAt',now(),'expiresAt',now()+interval '10 seconds','total',(select count(*) from visitors),'registered',(select count(*) from visitors where identity='registered'),'nonRegistered',(select count(*) from visitors where identity='guest'),'unknown',(select count(*) from visitors where identity='unknown'),'nodes',coalesce((select jsonb_agg(to_jsonb(n)) from nodes n),'[]'::jsonb)) into result;return result;
end $$;
notify pgrst,'reload schema';

-- Separate bounded maintenance entry point; no scheduler is installed or activated.
create function private.prune_site_engagement() returns integer language plpgsql set search_path='' as $$
declare n integer;begin
 delete from private.engagement_events where event_id in (select event_id from private.engagement_events where occurred_at<now()-interval '90 days' order by occurred_at limit 5000);
 get diagnostics n=row_count;return n;end $$;
revoke all on function private.prune_site_engagement() from public,anon,authenticated;
