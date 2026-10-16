-- Stage 4 candidate only. Existing events/RPC ABI; no new collection, retention or purge.
-- Private raw writers retain the existing inserts and event-ID deduplication.
create or replace function private.analytics_append_v1(p_events jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare item jsonb; accepted integer := 0; event_name text;
begin
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 20 then
    raise exception 'Invalid journey batch' using errcode='22023';
  end if;
  for item in select value from jsonb_array_elements(p_events) as value loop
    event_name := item->>'event_name';
    if event_name not in (
      'lister_session_started','lister_landing_viewed','list_property_clicked','signup_started','signup_completed','signup_pending_confirmation',
      'listing_started','property_type_completed','location_started','location_completed','listing_details_started','listing_details_completed',
      'photos_completed','pricing_completed','listing_previewed','publish_clicked','listing_record_created','listing_submitted',
      'step_ready','photo_upload','journey_error'
    ) then raise exception 'Unsupported journey event' using errcode='22023'; end if;
    begin
    insert into public.analytics_events(
      event_id,user_id,event_name,vacancy_id,route,visitor_id,session_id,journey_id,
      source,medium,campaign,campaign_id,adset_id,ad_id,content_id,first_source,first_medium,first_campaign,
      referrer_host,landing_path,step,device_class,browser_family,os_family,duration_ms,active_ms,error_code
    ) values (
      (item->>'event_id')::uuid,(select auth.uid()),event_name,nullif(item->>'vacancy_id','')::uuid,left(item->>'route',120),
      (item->>'visitor_id')::uuid,(item->>'session_id')::uuid,nullif(item->>'journey_id','')::uuid,
      left(item->>'source',80),left(item->>'medium',80),left(item->>'campaign',100),left(item->>'campaign_id',100),
      left(item->>'adset_id',100),left(item->>'ad_id',100),left(item->>'content_id',100),
      left(item->>'first_source',80),left(item->>'first_medium',80),left(item->>'first_campaign',100),
      left(item->>'referrer_host',120),left(item->>'landing_path',120),left(item->>'step',40),
      left(item->>'device_class',16),left(item->>'browser_family',24),left(item->>'os_family',24),
      least(greatest(coalesce((item->>'duration_ms')::integer,0),0),3600000),
      least(greatest(coalesce((item->>'active_ms')::integer,0),0),3600000),left(item->>'error_code',60)
    );
    accepted := accepted + 1;
    exception when unique_violation then null;
    end;
  end loop;
  return accepted;
end $$;
revoke all on function private.analytics_append_v1(jsonb) from public,anon,authenticated;

create or replace function private.analytics_append_v2(p_events jsonb)
returns integer language plpgsql security definer set search_path='' as $$
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
revoke all on function private.analytics_append_v2(jsonb) from public,anon,authenticated;

create function private.analytics_route(p_route text)
returns text language sql immutable set search_path='' as $route$
 select case
  when p_route in ('find','listing','list','create','auth','other') then p_route
  when p_route like '/listings/%' or p_route like '#detail%' or p_route like '/#detail%' then 'listing'
  when p_route like '#list/new%' or p_route like '/#list/new%' then 'create'
  when p_route like '#list%' or p_route like '/#list%' then 'list'
  when p_route like '#auth%' or p_route like '/#auth%' or p_route like '/reset-password%' then 'auth'
  when p_route in ('/','','#home','/#home','#find','/#find') then 'find'
  else 'other' end;
$route$;
revoke all on function private.analytics_route(text) from public,anon,authenticated;

create function private.analytics_label(p_value text,p_limit integer)
returns text language sql immutable set search_path='' as $label$
 select case when p_value='Direct / Unknown' then p_value
  when length(p_value)<=p_limit and p_value ~ '^[A-Za-z0-9 _.-]*$' then nullif(p_value,'')
  else null end;
$label$;
revoke all on function private.analytics_label(text,integer) from public,anon,authenticated;

create function private.analytics_ingest(p_kind text,p_events jsonb)
returns integer language plpgsql security definer set search_path='' as $ingest$
declare item jsonb; cleaned jsonb:='[]'; f record; allowed text[]; name text;
 actor uuid:=(select auth.uid()); requested integer; recent integer; actor_recent integer; total integer:=0;
begin
 if p_kind is null or p_kind not in ('basic','open','v1','v2') then raise exception 'Unsupported analytics contract' using errcode='22023';end if;
 if p_events is null or jsonb_typeof(p_events)<>'array' or octet_length(p_events::text)>32768 then
  raise exception 'Analytics batch must be a bounded array' using errcode='22023';end if;
 if jsonb_array_length(p_events)>20 then raise exception 'Analytics batch exceeds 20 events' using errcode='22023';end if;
 allowed:=case p_kind
  when 'basic' then array['event_name','vacancy_id','route']
  when 'open' then array['event_name','vacancy_id','visitor_id','route']
  when 'v1' then array['event_id','event_name','visitor_id','session_id','journey_id','vacancy_id','route','source','medium','campaign','campaign_id','adset_id','ad_id','content_id','first_source','first_medium','first_campaign','referrer_host','landing_path','step','device_class','browser_family','os_family','duration_ms','active_ms','error_code']
  else array['event_id','event_name','visitor_id','session_id','journey_id','route','source','medium','campaign','campaign_id','adset_id','ad_id','content_id','referrer_host','device_class','duration_ms','error_code','previous_event_id','occurred_at','from_step','to_step','unit_request_id','journey_mode'] end;
 for item in select value from jsonb_array_elements(p_events) loop
  if jsonb_typeof(item)<>'object' then raise exception 'Analytics event must be an object' using errcode='22023';end if;
  for f in select key,value from jsonb_each(item) loop
   if not f.key=any(allowed) then raise exception 'Unsupported analytics field' using errcode='22023';end if;
   if f.key in ('duration_ms','active_ms','from_step','to_step') then
    if f.value<>'null'::jsonb and (jsonb_typeof(f.value)<>'number' or f.value::text !~ '^[0-9]{1,7}$') then raise exception 'Invalid analytics integer' using errcode='22023';end if;
    if f.value<>'null'::jsonb and (f.value::text)::integer>case when f.key in ('from_step','to_step') then 3 else 3600000 end then raise exception 'Analytics integer out of range' using errcode='22023';end if;
   elsif f.value<>'null'::jsonb and jsonb_typeof(f.value)<>'string' then
    raise exception 'Invalid analytics string' using errcode='22023';
   end if;
  end loop;
  name:=item->>'event_name';
  if name is null or not case when p_kind='open' then name='vacancy_opened'
   when p_kind='basic' then name=any(array['home_viewed','search_used','vacancy_opened','vacancy_saved','enquiry_started','enquiry_sent','listing_started','listing_published','message_sent','report_submitted','user_blocked','listing_impression'])
   when p_kind='v1' then name=any(array['lister_session_started','lister_landing_viewed','list_property_clicked','signup_started','signup_completed','signup_pending_confirmation','listing_started','property_type_completed','location_started','location_completed','listing_details_started','listing_details_completed','photos_completed','pricing_completed','listing_previewed','publish_clicked','listing_record_created','listing_submitted','step_ready','photo_upload','journey_error'])
   else name=any(array['lister_session_started','lister_landing_viewed','list_property_clicked','listing_started','step_ready','publish_clicked','listing_record_created','listing_submitted','photo_upload','journey_error']) end then
   raise exception 'Unsupported analytics event' using errcode='22023';end if;
  foreach name in array array['event_id','visitor_id','session_id','journey_id','vacancy_id','previous_event_id','unit_request_id'] loop
   if p_kind in ('v1','v2') and name in ('event_id','visitor_id','session_id') and nullif(item->>name,'') is null then raise exception 'Missing analytics identifier' using errcode='22023';end if;
   if nullif(item->>name,'') is not null and item->>name !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Invalid analytics identifier' using errcode='22023';end if;
  end loop;
  if p_kind='open' and nullif(item->>'vacancy_id','') is null then raise exception 'Listing identifier required' using errcode='22023';end if;
  if nullif(item->>'vacancy_id','') is not null and not exists(
   select 1 from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id
   where v.id=(item->>'vacancy_id')::uuid and ((v.status='active' and (v.expires_at is null or v.expires_at>now())) or p.owner_id=actor)) then
   raise exception 'Unavailable analytics listing' using errcode='22023';end if;
  if p_kind='v2' and ((item ? 'route' and item->>'route' not in ('find','listing','list','create','auth','other')) or coalesce(item->>'journey_mode','new') not in ('new','legacy')) then raise exception 'Invalid connected journey scope' using errcode='22023';end if;
  item:=item || jsonb_build_object('route',private.analytics_route(item->>'route'));
  if item ? 'landing_path' then item:=jsonb_set(item,'{landing_path}',to_jsonb(private.analytics_route(item->>'landing_path')));end if;
  foreach name in array array['source','medium','campaign','campaign_id','adset_id','ad_id','content_id','first_source','first_medium','first_campaign'] loop
   if item ? name then item:=jsonb_set(item,array[name],coalesce(to_jsonb(private.analytics_label(item->>name,case when name in ('source','medium','first_source','first_medium') then 80 else 100 end)),'null'::jsonb));end if;
  end loop;
  if item ? 'referrer_host' then item:=jsonb_set(item,'{referrer_host}',case when length(item->>'referrer_host')<=120 and item->>'referrer_host' ~ '^[a-zA-Z0-9][a-zA-Z0-9.-]*$' then to_jsonb(lower(item->>'referrer_host')) else 'null'::jsonb end);end if;
  if item ? 'step' and item->>'step' is not null and item->>'step' not in ('location','listing_details','review','signup') then raise exception 'Invalid legacy step' using errcode='22023';end if;
  if item ? 'device_class' and item->>'device_class' is not null and item->>'device_class' not in ('mobile','desktop','tablet','unknown') then raise exception 'Invalid device category' using errcode='22023';end if;
  if item ? 'browser_family' and item->>'browser_family' is not null and item->>'browser_family' not in ('Edge','Firefox','Chrome','Safari','Other') then raise exception 'Invalid browser category' using errcode='22023';end if;
  if item ? 'os_family' and item->>'os_family' is not null and item->>'os_family' not in ('Android','iOS','Windows','macOS','Linux','Other') then raise exception 'Invalid OS category' using errcode='22023';end if;
  if item ? 'error_code' and item->>'error_code' is not null and item->>'error_code' not in ('listing_save_failed','photo_upload_failed','publish_failed','signup_failed') then raise exception 'Invalid analytics error category' using errcode='22023';end if;
  if item ? 'occurred_at' and (length(item->>'occurred_at')>40 or item->>'occurred_at' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.Zz+-]+$') then raise exception 'Invalid analytics timestamp' using errcode='22023';end if;
  cleaned:=cleaned || jsonb_build_array(item);
 end loop;
 if jsonb_array_length(cleaned)=0 then return 0;end if;
 -- Current membership/status, not client flags or mutable user metadata.
 if actor is not null and (exists(select 1 from public.admin_users where user_id=actor)
  or not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=actor and p.account_status='active' and (u.banned_until is null or u.banned_until<=now()))) then return 0;end if;
 -- All browser inserts use this short transaction lock. Never queue behind analytics.
 if not pg_try_advisory_xact_lock(hashtextextended('vacancy:analytics-ingestion:v1',0)) then
  raise exception 'Analytics busy; retry later' using errcode='PT429';end if;
 select count(*) into requested from jsonb_array_elements(cleaned) x
  where nullif(x->>'event_id','') is null or not exists(select 1 from public.analytics_events e where e.event_id=(x->>'event_id')::uuid);
 select count(*) into recent from (select 1 from public.analytics_events where created_at>now()-interval '1 minute' limit 1201) e;
 select count(*) into actor_recent from (select 1 from public.analytics_events where created_at>now()-interval '1 minute' and user_id is not distinct from actor limit 241) e;
 if recent+requested>1200 or actor_recent+requested>240 then raise exception 'Analytics budget exceeded; retry later' using errcode='PT429';end if;
 if p_kind='v1' then return private.analytics_append_v1(cleaned);
 elsif p_kind='v2' then return private.analytics_append_v2(cleaned);
 end if;
 for item in select value from jsonb_array_elements(cleaned) loop
  insert into public.analytics_events(user_id,event_name,vacancy_id,route,visitor_id)
  values(actor,item->>'event_name',nullif(item->>'vacancy_id','')::uuid,item->>'route',nullif(item->>'visitor_id','')::uuid);
  total:=total+1;
 end loop;
 return total;
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
 raise exception 'Invalid analytics value' using errcode='22023';
end
$ingest$;
revoke all on function private.analytics_ingest(text,jsonb) from public,anon,authenticated;
grant execute on function private.analytics_ingest(text,jsonb) to anon,authenticated,service_role;

-- Public ABI stays compatible. Privileged inserts live only behind the private validator.
create or replace function public.record_lister_journey(p_events jsonb)
returns integer language plpgsql security invoker set search_path='' as $rpc$
begin return private.analytics_ingest('v1',p_events);end
$rpc$;
create or replace function public.record_lister_journey_v2(p_events jsonb)
returns integer language plpgsql security invoker set search_path='' as $rpc$
begin return private.analytics_ingest('v2',p_events);end
$rpc$;
create or replace function public.track_event(p_event_name text,p_vacancy_id uuid default null,p_route text default null)
returns void language plpgsql security invoker set search_path='' as $rpc$
begin perform private.analytics_ingest('basic',jsonb_build_array(jsonb_build_object('event_name',p_event_name,'vacancy_id',p_vacancy_id,'route',p_route)));end
$rpc$;
create or replace function public.track_listing_open(p_vacancy_id uuid,p_visitor_id uuid default null)
returns void language plpgsql security invoker set search_path='' as $rpc$
begin perform private.analytics_ingest('open',jsonb_build_array(jsonb_build_object('event_name','vacancy_opened','vacancy_id',p_vacancy_id,'visitor_id',p_visitor_id,'route','listing')));end
$rpc$;
revoke all on function public.track_event(text,uuid,text),public.track_listing_open(uuid,uuid),
 public.record_lister_journey(jsonb),public.record_lister_journey_v2(jsonb) from public;
grant execute on function public.track_event(text,uuid,text),public.track_listing_open(uuid,uuid),
 public.record_lister_journey(jsonb),public.record_lister_journey_v2(jsonb) to anon,authenticated,service_role;
-- Preserve active AAL2 administrative read policies, remove every browser write path.
revoke all on public.analytics_events from public,anon,authenticated;
grant select on public.analytics_events to authenticated;
revoke all on sequence public.analytics_events_id_seq from public,anon,authenticated;
drop policy analytics_insert_anon on public.analytics_events;
drop policy analytics_insert_auth on public.analytics_events;
