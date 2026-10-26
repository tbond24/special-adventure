-- Development candidate only. Disabled by default; no hosted activation.
create table private.element_tracking_settings (
 id boolean primary key default true check(id), enabled boolean not null default false,
 started_at timestamptz, notice_version text not null default '20261021-elements-v1',
 check(not enabled or started_at is not null)
);
insert into private.element_tracking_settings(id) values(true);
-- A resumed collector starts a new coverage window; disabled gaps are not zero.
create function private.element_tracking_coverage() returns trigger language plpgsql set search_path='' as $$
begin
 if new.enabled and not old.enabled then new.started_at:=clock_timestamp();
 elsif not new.enabled then new.started_at:=null;
 else new.started_at:=old.started_at;end if;return new;
end $$;
create trigger element_tracking_coverage before update on private.element_tracking_settings
 for each row execute function private.element_tracking_coverage();
revoke all on function private.element_tracking_coverage() from public,anon,authenticated;
create table private.element_tracking_points (
 name text primary key,kind text not null check(kind in ('press','view','complete'))
);
insert into private.element_tracking_points values
 ('contact_button_pressed','press'),('text_button_pressed','press'),
 ('location_started','view'),('listing_details_started','view'),
 ('listing_previewed','view'),('listing_submitted','complete');
create table private.element_tracking_events (
 event_id uuid primary key,event_name text not null references private.element_tracking_points(name),
 visitor_id uuid not null,session_id uuid not null,journey_id uuid,
 occurred_at timestamptz not null,received_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '30 days'
);
create index element_tracking_events_time on private.element_tracking_events(occurred_at,event_id);
create index element_tracking_events_expiry on private.element_tracking_events(expires_at,event_id);
alter table private.element_tracking_settings enable row level security;
alter table private.element_tracking_points enable row level security;
alter table private.element_tracking_events enable row level security;
revoke all on private.element_tracking_settings,private.element_tracking_points,private.element_tracking_events from public,anon,authenticated;
create function public.element_tracking_policy() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('enabled',enabled,'noticeVersion',notice_version,'retentionDays',30)
 from private.element_tracking_settings where id
$$;
create function public.record_element_tracking(p_events jsonb,p_notice_version text) returns integer
language plpgsql security definer set search_path='' as $$
declare item jsonb;accepted integer:=0;n integer;point_name text;stamp timestamptz;
begin
 if not exists(select 1 from private.element_tracking_settings where id and enabled and notice_version=p_notice_version)
 or not private.analytics_allowed() then return 0;end if;
 if p_events is null or jsonb_typeof(p_events)<>'array' then raise exception 'Event array required' using errcode='22023';end if;
 if jsonb_array_length(p_events)>20 or octet_length(p_events::text)>30000 then raise exception 'Event batch too large' using errcode='22023';end if;
 if jsonb_array_length(p_events)=0 then return 0;end if;
 perform private.analytics_budget(jsonb_array_length(p_events));
 for item in select value from jsonb_array_elements(p_events) loop
  if jsonb_typeof(item)<>'object' or exists(select 1 from jsonb_object_keys(item) k where k not in ('event_id','event_name','visitor_id','session_id','journey_id','occurred_at')) then raise exception 'Unregistered tracking field' using errcode='22023';end if;
  point_name:=item->>'event_name';stamp:=(item->>'occurred_at')::timestamptz;
  if not exists(select 1 from private.element_tracking_points p where p.name=point_name)
   or nullif(item->>'event_id','') is null or nullif(item->>'visitor_id','') is null or nullif(item->>'session_id','') is null
   or stamp is null or stamp<now()-interval '15 minutes' or stamp>now()+interval '1 minute'
   or (point_name in ('location_started','listing_details_started','listing_previewed','listing_submitted') and nullif(item->>'journey_id','') is null)
   then raise exception 'Invalid tracking event' using errcode='22023';end if;
  insert into private.element_tracking_events(event_id,event_name,visitor_id,session_id,journey_id,occurred_at)
  values((item->>'event_id')::uuid,point_name,(item->>'visitor_id')::uuid,(item->>'session_id')::uuid,nullif(item->>'journey_id','')::uuid,least(stamp,now())) on conflict do nothing;
  get diagnostics n=row_count;accepted:=accepted+n;
 end loop;return accepted;
end $$;
create function public.admin_element_tracking(p_from timestamptz,p_to timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;coverage timestamptz;
begin
 if not private.is_admin((select auth.uid())) then raise exception 'Admin required' using errcode='42501';end if;
 if p_from is null or p_to is null or p_from>=p_to or p_to-p_from>interval '180 days' or p_to>now()+interval '1 minute' then raise exception 'Invalid tracking range' using errcode='22023';end if;
 select greatest(started_at,now()-interval '30 days') into coverage from private.element_tracking_settings where id and enabled;
 select jsonb_build_object('coverageStart',coverage,'generatedAt',now(),'events',coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb)) into result
 from (select event_id,event_name,visitor_id,session_id,journey_id,occurred_at from private.element_tracking_events
 where occurred_at>=p_from and occurred_at<p_to and expires_at>now() order by occurred_at,event_id limit 5001) e;
 return result;
end $$;
-- Bounded cleanup for a separately authorized scheduler; never runs on a product action.
create function private.prune_element_tracking() returns integer language plpgsql set search_path='' as $$
declare n integer;begin
 delete from private.element_tracking_events where event_id in (select event_id from private.element_tracking_events where expires_at<=now() order by expires_at limit 5000);
 get diagnostics n=row_count;return n;end $$;
revoke all on function public.element_tracking_policy(),public.record_element_tracking(jsonb,text),public.admin_element_tracking(timestamptz,timestamptz),private.prune_element_tracking() from public,anon,authenticated;
grant execute on function public.element_tracking_policy(),public.record_element_tracking(jsonb,text) to anon,authenticated;
grant execute on function public.admin_element_tracking(timestamptz,timestamptz) to authenticated;
