-- Read-only development report. No collection or retention changes; unapplied.
create index if not exists analytics_events_visitor_time on public.analytics_events(created_at,visitor_id) where visitor_id is not null;
create function public.admin_visitor_metrics(p_buckets jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item jsonb;lo timestamptz;hi timestamptz;first_at timestamptz;last_at timestamptz;
 snapshot timestamptz:=clock_timestamp();series jsonb:='[]';active bigint;uniques bigint;live_now bigint;total bigint;
begin
 if not private.is_admin((select auth.uid())) then raise exception 'Admin verification required' using errcode='42501';end if;
 if p_buckets is null or jsonb_typeof(p_buckets)<>'array' then raise exception 'Visitor buckets required' using errcode='22023';end if;
 if octet_length(p_buckets::text)>30000 or jsonb_array_length(p_buckets)<1 or jsonb_array_length(p_buckets)>100 then raise exception 'Bounded visitor range required' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(p_buckets) loop
  lo:=(item->>'start')::timestamptz;hi:=(item->>'end')::timestamptz;
  if lo is null or hi is null or lo>hi or hi-lo>interval '26 hours' or hi>snapshot+interval '1 minute'
   or (last_at is not null and lo<>last_at) then raise exception 'Invalid visitor bucket' using errcode='22023';end if;
  first_at:=coalesce(first_at,lo);last_at:=hi;
  if hi-first_at>interval '91 days' then raise exception 'Visitor range too long' using errcode='22023';end if;
  select count(distinct e.visitor_id) into active from public.analytics_events e
   where e.created_at>=hi-interval '5 minutes' and e.created_at<hi and e.visitor_id is not null
    and not exists(select 1 from public.admin_users a where a.user_id=e.user_id);
  select count(distinct e.visitor_id) into uniques from public.analytics_events e
   where e.created_at>=lo and e.created_at<hi and e.visitor_id is not null
    and not exists(select 1 from public.admin_users a where a.user_id=e.user_id);
  series:=series||jsonb_build_array(jsonb_build_object('at',hi,'live',active,'unique',uniques));
 end loop;
 select count(distinct e.visitor_id) into live_now from public.analytics_events e
  where e.created_at>=snapshot-interval '5 minutes' and e.created_at<snapshot and e.visitor_id is not null
   and not exists(select 1 from public.admin_users a where a.user_id=e.user_id);
 select count(distinct e.visitor_id) into total from public.analytics_events e
  where e.created_at>=first_at and e.created_at<last_at and e.visitor_id is not null
   and not exists(select 1 from public.admin_users a where a.user_id=e.user_id);
 return jsonb_build_object('generatedAt',snapshot,'live',live_now,'unique',total,'series',series);
end $$;
revoke all on function public.admin_visitor_metrics(jsonb) from public,anon,authenticated;
grant execute on function public.admin_visitor_metrics(jsonb) to authenticated;
