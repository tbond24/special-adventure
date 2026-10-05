-- Reverse only the property-first optimization; retain generated_at.
-- Add server report-generation time; preserve the signature, authorization, query, and grants.
create or replace function public.admin_lister_marketing(p_from timestamptz,p_to timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.is_admin((select auth.uid())) then raise exception 'Admin verification required' using errcode='42501'; end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to-p_from > interval '90 days' then
    raise exception 'Choose a date range up to 90 days' using errcode='22023';
  end if;
  select jsonb_build_object(
    'events',coalesce((select jsonb_agg(to_jsonb(e)) from (
      select id,user_id,event_name,vacancy_id,created_at,visitor_id,session_id,journey_id,source,medium,campaign,
        campaign_id,adset_id,ad_id,content_id,first_source,first_medium,first_campaign,step,device_class,browser_family,
        os_family,duration_ms,active_ms,error_code
      from public.analytics_events
      where event_id is not null and created_at>=p_from and created_at<p_to
      order by created_at desc limit 5001
    ) e),'[]'::jsonb),
    'publications',coalesce((select jsonb_agg(to_jsonb(pub)) from (
      select first_active.entity_id as vacancy_id,first_active.created_at,p.id as property_id,p.owner_id,
        first_active.created_at=(
          select min(log.created_at) from public.listing_activity_log log
          join public.vacancies other_v on other_v.id=log.entity_id
          join public.rooms other_r on other_r.id=other_v.room_id
          where log.entity_type='listing' and log.new_status='active'
            and log.old_status is distinct from 'active' and other_r.property_id=p.id
        ) as is_first_property_publication,
        attribution.visitor_id,attribution.session_id,attribution.source,attribution.medium,attribution.campaign,
        attribution.campaign_id,attribution.adset_id,attribution.ad_id,attribution.device_class
      from (
        select distinct on (entity_id) entity_id,created_at from public.listing_activity_log
        where entity_type='listing' and new_status='active' and (old_status is distinct from 'active')
        order by entity_id,created_at
      ) first_active
      join public.vacancies v on v.id=first_active.entity_id
      join public.rooms r on r.id=v.room_id
      join public.properties p on p.id=r.property_id
      left join lateral (
        select e.visitor_id,e.session_id,e.source,e.medium,e.campaign,e.campaign_id,e.adset_id,e.ad_id,e.device_class
        from public.analytics_events e where e.vacancy_id=v.id and e.user_id=p.owner_id
          and e.event_name in ('listing_submitted','listing_record_created')
          and e.created_at<=first_active.created_at+interval '10 minutes'
        order by e.created_at desc limit 1
      ) attribution on true
      where first_active.created_at>=p_from and first_active.created_at<p_to
      order by first_active.created_at desc limit 5001
    ) pub),'[]'::jsonb)
  ) into result;
  return result || jsonb_build_object('generated_at', clock_timestamp());
end $$;
revoke all on function public.admin_lister_marketing(timestamptz,timestamptz) from public,anon;
grant execute on function public.admin_lister_marketing(timestamptz,timestamptz) to authenticated;
