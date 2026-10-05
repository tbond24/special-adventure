-- Synthetic dependency schema for the exact reporting function, NOT a full app schema.
-- Run only through run.cjs after verifying a dedicated empty loopback database.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema private;
revoke all on schema private from public;
grant usage on schema public, auth, private to anon, authenticated;

-- Supabase SQL claim-reader contracts, not JWT signature validation or an Auth service.
-- https://github.com/supabase/auth/blob/master/migrations/20220531120530_add_auth_jwt_function.up.sql
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim',true),''),
                  nullif(current_setting('request.jwt.claims',true),''))::jsonb;
$$;
-- https://github.com/supabase/auth/blob/master/migrations/20211124214934_update_auth_functions.up.sql
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(current_setting('request.jwt.claim.sub',true),
                  current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid;
$$;

create table public.admin_users(user_id uuid primary key);
create table public.properties(id uuid primary key,owner_id uuid not null);
create table public.rooms(id uuid primary key,property_id uuid references public.properties);
create table public.vacancies(id uuid primary key,room_id uuid references public.rooms);
create table public.listing_activity_log(
  id bigint generated always as identity primary key,entity_type text,entity_id uuid,
  old_status text,new_status text,created_at timestamptz not null);
create table public.analytics_events(
  id bigint generated always as identity primary key,event_id uuid,event_name text not null,
  user_id uuid,vacancy_id uuid,created_at timestamptz not null,visitor_id uuid,session_id uuid,
  journey_id uuid,source text,medium text,campaign text,campaign_id text,adset_id text,ad_id text,
  content_id text,first_source text,first_medium text,first_campaign text,step text,
  device_class text,browser_family text,os_family text,duration_ms integer,active_ms integer,error_code text);
alter table public.admin_users enable row level security;
alter table public.properties enable row level security;
alter table public.rooms enable row level security;
alter table public.vacancies enable row level security;
alter table public.listing_activity_log enable row level security;
alter table public.analytics_events enable row level security;
-- No direct fixture-table grants to API roles; reads must pass through the exact RPC.
create index on public.analytics_events(created_at);
create index on public.analytics_events(vacancy_id,created_at);
create index on public.listing_activity_log(entity_id,created_at);
insert into public.admin_users values ('00000000-0000-4000-8000-000000000001');

-- Test assertions run as the current role (never SECURITY DEFINER).
create function public.qa_assert(ok boolean,label text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %',label; end if;
  raise notice 'PASS: %',label;
end $$;
