-- Admin-curated listing choices reuse the existing icon library and its revision history.
alter table public.site_icon_slots add column if not exists listing_kind text
  check (listing_kind in ('amenity','utility'));
create unique index if not exists site_icon_listing_label_unique
  on public.site_icon_slots (listing_kind, lower(label)) where listing_kind is not null;

create or replace function public.admin_add_listing_icon(p_label text,p_kind text,p_path_d text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_slot text := 'custom-' || replace(gen_random_uuid()::text,'-','');
begin
  if not private.is_admin((select auth.uid())) then
    raise exception 'Not an MFA-verified administrator' using errcode='42501';
  end if;
  p_label := trim(p_label);
  if p_kind not in ('amenity','utility') or length(p_label) not between 2 and 60 then
    raise exception 'Choose a category and a name of 2–60 characters' using errcode='22023';
  end if;
  if p_path_d is null or length(p_path_d) not between 3 and 1200
     or p_path_d !~ '^[MmLlHhVvCcSsQqTtAaZz0-9 .,+-]+$' then
    raise exception 'Use a supported SVG icon' using errcode='22023';
  end if;
  insert into public.site_icon_slots(slot,label,listing_kind) values(v_slot,p_label,p_kind);
  insert into public.site_icon_overrides(slot,path_d) values(v_slot,p_path_d);
  insert into public.site_icon_revisions(slot,path_d,actor_id)
    values(v_slot,p_path_d,(select auth.uid()));
  return v_slot;
end $$;
revoke all on function public.admin_add_listing_icon(text,text,text) from public,anon,authenticated;
grant execute on function public.admin_add_listing_icon(text,text,text) to authenticated;

-- Keep the original zero-argument RPC available to older deployed clients.
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
        and e.created_at>=p_from and e.created_at<p_to),
    'clicks', (select count(*) from public.analytics_events e
      join public.vacancies v on v.id=e.vacancy_id join public.rooms r on r.id=v.room_id
      join public.properties p on p.id=r.property_id
      where p.owner_id=v_owner and e.event_name='vacancy_opened'
        and e.created_at>=p_from and e.created_at<p_to),
    'messages', (select count(*) from public.conversations c
      join public.vacancies v on v.id=c.vacancy_id join public.rooms r on r.id=v.room_id
      join public.properties p on p.id=r.property_id
      where p.owner_id=v_owner and c.created_at>=p_from and c.created_at<p_to)
  );
end $$;
revoke all on function public.owner_dashboard_metrics(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.owner_dashboard_metrics(timestamptz,timestamptz) to authenticated;
