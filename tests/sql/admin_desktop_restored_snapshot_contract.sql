-- Only for the partially seeded vacancy-admin-test restored snapshot.
-- Project ID raauicmfyjpcuhfzknak. NEVER use on production.
-- This snapshot has public.admin_users and private.is_admin, but lacks
-- public.profiles and private.is_active_user which production currently uses.
-- It is a contract fixture, not a complete Vacancy application schema.
do $guard$
begin
  if to_regclass('public.profiles') is not null then
    raise exception 'Refusing isolated fixture: public.profiles already exists';
  end if;
  if to_regclass('public.admin_users') is null
    or to_regprocedure('private.is_admin(uuid)') is null then
    raise exception 'Refusing isolated fixture: expected restored admin contracts missing';
  end if;
end
$guard$;

create table public.profiles (
  id uuid primary key,
  account_status text not null default 'active'
    check (account_status in ('active', 'suspended'))
);
alter table public.profiles enable row level security;

-- The existing snapshot has synthetic admin accounts. Preserve their
-- original effective membership under production's active-account rule.
insert into public.profiles(id, account_status)
select user_id, 'active' from public.admin_users;

create or replace function private.is_active_user(p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.profiles
    where id=p_user and account_status='active'
  )
$$;
revoke all on function private.is_active_user(uuid) from public;
grant execute on function private.is_active_user(uuid) to authenticated;

-- Same logic as verified active production helper on 2026-10-14.
create or replace function private.is_admin(p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select p_user is not null
    and private.is_active_user(p_user)
    and coalesce((select auth.jwt()->>'aal'), 'aal1')='aal2'
    and exists(select 1 from public.admin_users where user_id=p_user)
$$;

revoke all on function private.is_admin(uuid) from public, anon;
grant execute on function private.is_admin(uuid) to authenticated;

comment on table public.profiles is
  'Test-only partial profile contract for isolated admin role/audit verification. Not a production schema migration.';
