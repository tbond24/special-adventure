-- TEST-ONLY: disposable PostgreSQL 17 fixture for Stage 2 SQL contracts.
-- Never apply this bootstrap to Supabase, staging, or production.
create schema auth;
create schema private;
create role anon nologin;
create role authenticated nologin;
grant usage on schema auth to anon, authenticated;
grant usage on schema private to authenticated;
grant usage on schema public to anon, authenticated;

create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt()->>'sub','')::uuid
$$;
grant execute on function auth.jwt() to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

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

create function private.is_active_user(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles
   where id=p_user and account_status='active')
$$;
create function private.is_admin(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select p_user is not null
   and private.is_active_user(p_user)
   and coalesce((select auth.jwt()->>'aal'),'aal1')='aal2'
   and exists(select 1 from public.admin_users where user_id=p_user)
$$;
revoke all on function private.is_active_user(uuid),private.is_admin(uuid)
from public,anon;
grant execute on function private.is_active_user(uuid),private.is_admin(uuid)
to authenticated;

insert into public.profiles(id,account_status) values
 ('00000000-0000-4000-8000-0000000000a1','active'),
 ('00000000-0000-4000-8000-0000000000a2','active'),
 ('00000000-0000-4000-8000-0000000000a3','active'),
 ('00000000-0000-4000-8000-0000000000a4','suspended');
insert into public.admin_users(user_id) values
 ('00000000-0000-4000-8000-0000000000a1'),
 ('00000000-0000-4000-8000-0000000000a2'),
 ('00000000-0000-4000-8000-0000000000a4');
