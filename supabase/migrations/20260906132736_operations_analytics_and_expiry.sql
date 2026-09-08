create table if not exists public.admin_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
create policy admin_users_self_read on public.admin_users for select using (user_id=(select auth.uid()));

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid null references public.profiles(id) on delete set null,
  event_name text not null check (event_name in ('home_viewed','search_used','vacancy_opened','vacancy_saved','enquiry_started','enquiry_sent','listing_started','listing_published','message_sent','report_submitted','user_blocked')),
  vacancy_id uuid null references public.vacancies(id) on delete set null,
  route text null check (route is null or length(route)<=120),
  created_at timestamptz not null default now()
);
alter table public.analytics_events enable row level security;

create table if not exists public.client_errors (
  id bigint generated always as identity primary key,
  user_id uuid null references public.profiles(id) on delete set null,
  error_code text not null check (length(error_code) between 1 and 80),
  route text null check (route is null or length(route)<=120),
  created_at timestamptz not null default now()
);
alter table public.client_errors enable row level security;

create index if not exists analytics_events_created_idx on public.analytics_events(created_at desc);
create index if not exists analytics_events_name_idx on public.analytics_events(event_name,created_at desc);
create index if not exists client_errors_created_idx on public.client_errors(created_at desc);

create or replace function public.track_event(p_event_name text,p_vacancy_id uuid default null,p_route text default null)
returns void language plpgsql security invoker set search_path=public as $$
begin
  if p_event_name not in ('home_viewed','search_used','vacancy_opened','vacancy_saved','enquiry_started','enquiry_sent','listing_started','listing_published','message_sent','report_submitted','user_blocked') then raise exception 'unsupported event'; end if;
  insert into public.analytics_events(user_id,event_name,vacancy_id,route)
  values ((select auth.uid()),p_event_name,p_vacancy_id,left(p_route,120));
end;$$;

create policy analytics_insert_anon on public.analytics_events for insert to anon with check (user_id is null);
create policy analytics_insert_auth on public.analytics_events for insert to authenticated with check (user_id=(select auth.uid()));

create or replace function public.record_client_error(p_error_code text,p_route text default null)
returns void language plpgsql security invoker set search_path=public as $$
begin
  insert into public.client_errors(user_id,error_code,route)
  values ((select auth.uid()),left(coalesce(nullif(trim(p_error_code),''),'unknown'),80),left(p_route,120));
end;$$;
create policy errors_insert_anon on public.client_errors for insert to anon with check (user_id is null);
create policy errors_insert_auth on public.client_errors for insert to authenticated with check (user_id=(select auth.uid()));

-- Hide stale active vacancies from public discovery while preserving owner visibility.
drop policy if exists vacancies_public_active_read on public.vacancies;
create policy vacancies_public_active_read on public.vacancies
for select using (
  (status='active' and (expires_at is null or expires_at > now()))
  or exists (
    select 1 from public.rooms r join public.properties p on p.id=r.property_id
    where r.id=vacancies.room_id and p.owner_id=(select auth.uid())
  )
);

create or replace function public.reconfirm_vacancy(p_vacancy_id uuid)
returns void language plpgsql security invoker set search_path=public as $$
begin
  update public.vacancies set confirmed_at=now(), expires_at=now()+interval '21 days', status='active', updated_at=now()
  where id=p_vacancy_id;
  if not found then raise exception 'vacancy not found or not owned'; end if;
end;$$;

create schema if not exists private;
create or replace function private.is_admin(p_user uuid) returns boolean
language sql security definer stable set search_path=public,private as $$
  select exists(select 1 from public.admin_users where user_id=p_user);
$$;
revoke all on function private.is_admin(uuid) from public,anon;
grant execute on function private.is_admin(uuid) to authenticated;

create policy admin_users_read_all on public.admin_users for select to authenticated using (private.is_admin((select auth.uid())));
create policy analytics_admin_read on public.analytics_events for select to authenticated using (private.is_admin((select auth.uid())));
create policy errors_admin_read on public.client_errors for select to authenticated using (private.is_admin((select auth.uid())));
create policy reports_admin_read on public.reports for select to authenticated using (private.is_admin((select auth.uid())));

create or replace function public.admin_deactivate_vacancy(p_vacancy_id uuid)
returns void language plpgsql security invoker set search_path=public,private as $$
begin
  if not private.is_admin((select auth.uid())) then raise exception 'admin required'; end if;
  update public.vacancies set status='removed',updated_at=now() where id=p_vacancy_id;
  if not found then raise exception 'vacancy not found'; end if;
end;$$;

create or replace function public.admin_overview()
returns jsonb language sql security invoker set search_path=public,private as $$
  select case when private.is_admin((select auth.uid())) then jsonb_build_object(
    'users',(select count(*) from public.profiles),
    'active_vacancies',(select count(*) from public.vacancies where status='active' and (expires_at is null or expires_at>now())),
    'reports_open',(select count(*) from public.reports where status='open'),
    'messages',(select count(*) from public.messages),
    'events_7d',(select count(*) from public.analytics_events where created_at>now()-interval '7 days'),
    'errors_24h',(select count(*) from public.client_errors where created_at>now()-interval '24 hours')
  ) else (select jsonb_build_object('error','admin required')) end;
$$;

-- Seed one test operator for acceptance only; real operator account can replace this later.
insert into public.admin_users(user_id) values ('11111111-1111-4111-8111-111111111111') on conflict do nothing;;
