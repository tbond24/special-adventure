-- A listing's owner and administrators are not visitors. Count unread incoming
-- messages independently of the activity date range shown for views and clicks.
create or replace function public.owner_dashboard_metrics(p_from timestamptz,p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_owner uuid := (select auth.uid());
begin
  if v_owner is null or p_from is null or p_to is null or p_from >= p_to
     or p_to - p_from > interval '366 days' then
    raise exception 'Invalid metrics date range' using errcode='22023';
  end if;
  return jsonb_build_object(
    'impressions', (select count(*) from public.analytics_events e
      join public.vacancies v on v.id=e.vacancy_id join public.rooms r on r.id=v.room_id
      join public.properties p on p.id=r.property_id
      where p.owner_id=v_owner and e.event_name='listing_impression'
        and e.created_at>=p_from and e.created_at<p_to
        and e.user_id is distinct from v_owner
        and not exists (select 1 from public.admin_users a where a.user_id=e.user_id)),
    'clicks', (select count(*) from public.analytics_events e
      join public.vacancies v on v.id=e.vacancy_id join public.rooms r on r.id=v.room_id
      join public.properties p on p.id=r.property_id
      where p.owner_id=v_owner and e.event_name='vacancy_opened'
        and e.created_at>=p_from and e.created_at<p_to
        and e.user_id is distinct from v_owner
        and not exists (select 1 from public.admin_users a where a.user_id=e.user_id)),
    'messages', (select count(*) from public.messages m
      join public.conversation_members cm on cm.conversation_id=m.conversation_id and cm.user_id=v_owner
      join public.conversations c on c.id=m.conversation_id
      join public.vacancies v on v.id=c.vacancy_id join public.rooms r on r.id=v.room_id
      join public.properties p on p.id=r.property_id
      where p.owner_id=v_owner and m.sender_id<>v_owner and m.created_at>cm.last_read_at)
  );
end $$;
revoke all on function public.owner_dashboard_metrics(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.owner_dashboard_metrics(timestamptz,timestamptz) to authenticated;
