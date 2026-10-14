-- TEST-ONLY minimal isolated admin contracts, NOT an application migration.
-- Use ONLY in newly restored EMPTY vacancy-admin-test project after
-- verifying project ref raauicmfyjpcuhfzknak and absence of public tables.
-- This is not a complete Vacancy schema and is NOT for production.
-- Reproduces observed public.profiles/admin_users and
-- private.is_active_user/is_admin authorization contracts.

create schema if not exists private;

create table public.profiles (
  id uuid primary key,
  account_status text not null default 'active'
    check (account_status in ('active','suspended'))
);
create table public.admin_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
create policy admin_users_self_read on public.admin_users
  for select to authenticated using (user_id=(select auth.uid()));
grant select on public.admin_users to authenticated;

create or replace function private.is_active_user(p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=p_user and account_status='active')
$$;
revoke all on function private.is_active_user(uuid) from public;
grant execute on function private.is_active_user(uuid) to authenticated;

create or replace function private.is_admin(p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select p_user is not null
    and private.is_active_user(p_user)
    and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
    and exists(select 1 from public.admin_users where user_id=p_user)
$$;
revoke all on function private.is_admin(uuid) from public,anon;
grant execute on function private.is_admin(uuid) to authenticated;

comment on table public.profiles is
  'TEST STUB only: isolated admin-foundation SQL checks, not the full Vacancy schema.';
