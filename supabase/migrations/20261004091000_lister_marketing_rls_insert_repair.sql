create or replace function public.record_lister_journey(p_events jsonb)
returns integer language plpgsql security invoker set search_path='' as $$
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
revoke all on function public.record_lister_journey(jsonb) from public;
grant execute on function public.record_lister_journey(jsonb) to anon,authenticated;
