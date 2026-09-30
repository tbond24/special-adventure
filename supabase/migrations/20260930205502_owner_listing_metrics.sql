-- Owner-only totals. Impressions are a card entering a visitor's viewport;
-- clicks are listing opens; messages are distinct conversations.
alter table public.analytics_events drop constraint if exists analytics_events_event_name_check;
alter table public.analytics_events add constraint analytics_events_event_name_check
  check (event_name in ('home_viewed','search_used','vacancy_opened','vacancy_saved','enquiry_started','enquiry_sent','listing_started','listing_published','message_sent','report_submitted','user_blocked','listing_impression'));

create or replace function public.track_event(p_event_name text,p_vacancy_id uuid default null,p_route text default null)
returns void language plpgsql security invoker set search_path=public as $$
begin
  if p_event_name not in ('home_viewed','search_used','vacancy_opened','vacancy_saved','enquiry_started','enquiry_sent','listing_started','listing_published','message_sent','report_submitted','user_blocked','listing_impression') then raise exception 'unsupported event'; end if;
  insert into public.analytics_events(user_id,event_name,vacancy_id,route)
  values ((select auth.uid()),p_event_name,p_vacancy_id,left(p_route,120));
end;$$;

create index if not exists analytics_events_vacancy_name_idx on public.analytics_events(vacancy_id,event_name);

create or replace function public.owner_dashboard_metrics()
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'impressions', (select count(*) from public.analytics_events e join public.vacancies v on v.id=e.vacancy_id join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where p.owner_id=(select auth.uid()) and e.event_name='listing_impression'),
    'clicks', (select count(*) from public.analytics_events e join public.vacancies v on v.id=e.vacancy_id join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where p.owner_id=(select auth.uid()) and e.event_name='vacancy_opened'),
    'messages', (select count(*) from public.conversations c join public.vacancies v on v.id=c.vacancy_id join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where p.owner_id=(select auth.uid()))
  );
$$;
revoke all on function public.owner_dashboard_metrics() from public, anon;
grant execute on function public.owner_dashboard_metrics() to authenticated;
