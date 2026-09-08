alter table public.profiles add column if not exists account_status text not null default 'active' check (account_status in ('active','suspended'));

create table if not exists public.admin_moderation_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.profiles(id),
  action text not null check (length(action) between 3 and 60),
  target_type text not null check (target_type in ('report','vacancy','user')),
  target_id uuid not null,
  reason text not null check (length(trim(reason)) between 3 and 500),
  created_at timestamptz not null default now()
);
alter table public.admin_moderation_log enable row level security;
create policy admin_moderation_log_admin_read on public.admin_moderation_log for select to authenticated using (private.is_admin((select auth.uid())));
grant select on public.admin_moderation_log to authenticated;
create index if not exists admin_moderation_log_created_idx on public.admin_moderation_log(created_at desc);

create or replace function private.is_active_user(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=p_user and account_status='active')
$$;
revoke all on function private.is_active_user(uuid) from public;
grant execute on function private.is_active_user(uuid) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['properties','rooms','vacancies','media','saved_vacancies','conversations','conversation_members','messages','reports','blocks'] loop
    execute format('drop policy if exists active_account_required on public.%I',t);
    execute format('create policy active_account_required on public.%I as restrictive for all to authenticated using (private.is_active_user((select auth.uid()))) with check (private.is_active_user((select auth.uid())))',t);
  end loop;
end $$;

create or replace function public.admin_dashboard() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not private.is_admin((select auth.uid())) then return jsonb_build_object('error','admin required'); end if;
  select jsonb_build_object(
    'users_total',(select count(*) from public.profiles),
    'users_7d',(select count(*) from public.profiles where created_at>now()-interval '7 days'),
    'users_suspended',(select count(*) from public.profiles where account_status='suspended'),
    'properties',(select count(*) from public.properties),
    'units',(select count(*) from public.rooms),
    'active_listings',(select count(*) from public.vacancies where status='active'),
    'paused_listings',(select count(*) from public.vacancies where status='paused'),
    'open_reports',(select count(*) from public.reports where status='open'),
    'oldest_report_hours',coalesce((select floor(extract(epoch from now()-min(created_at))/3600) from public.reports where status='open'),0),
    'messages_7d',(select count(*) from public.messages where created_at>now()-interval '7 days'),
    'listings_7d',(select count(*) from public.analytics_events where event_name='listing_published' and created_at>now()-interval '7 days'),
    'enquiries_7d',(select count(*) from public.analytics_events where event_name='enquiry_sent' and created_at>now()-interval '7 days'),
    'errors_24h',(select count(*) from public.client_errors where created_at>now()-interval '24 hours')
  ) into result;
  return result;
end $$;

create or replace function public.admin_search(p_query text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare q text:=left(trim(coalesce(p_query,'')),100); result jsonb;
begin
  if not private.is_admin((select auth.uid())) then return jsonb_build_object('error','admin required'); end if;
  select jsonb_build_object(
    'users',coalesce((select jsonb_agg(x) from (select id,display_name,account_status,created_at from public.profiles where q='' or display_name ilike '%'||q||'%' or id::text=q order by created_at desc limit 20)x),'[]'::jsonb),
    'listings',coalesce((select jsonb_agg(x) from (select v.id,v.status,v.created_at,r.name,p.title,p.suburb,p.city,p.owner_id from public.vacancies v join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id where q='' or r.name ilike '%'||q||'%' or p.title ilike '%'||q||'%' or p.suburb ilike '%'||q||'%' or v.id::text=q order by v.created_at desc limit 30)x),'[]'::jsonb)
  ) into result; return result;
end $$;

create or replace function public.admin_resolve_report(p_report_id uuid,p_status text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.is_admin((select auth.uid())) then raise exception 'admin required'; end if;
  if p_status not in ('resolved','dismissed') or length(trim(coalesce(p_reason,'')))<3 then raise exception 'valid status and reason required'; end if;
  update public.reports set status=p_status where id=p_report_id;
  if not found then raise exception 'report not found'; end if;
  insert into public.admin_moderation_log(admin_id,action,target_type,target_id,reason) values ((select auth.uid()),'report_'||p_status,'report',p_report_id,left(trim(p_reason),500));
end $$;

create or replace function public.admin_set_vacancy_status(p_vacancy_id uuid,p_status text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.is_admin((select auth.uid())) then raise exception 'admin required'; end if;
  if p_status not in ('active','paused','removed') or length(trim(coalesce(p_reason,'')))<3 then raise exception 'valid status and reason required'; end if;
  update public.vacancies set status=p_status where id=p_vacancy_id;
  if not found then raise exception 'vacancy not found'; end if;
  insert into public.admin_moderation_log(admin_id,action,target_type,target_id,reason) values ((select auth.uid()),'vacancy_'||p_status,'vacancy',p_vacancy_id,left(trim(p_reason),500));
end $$;

create or replace function public.admin_set_user_status(p_user_id uuid,p_status text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.is_admin((select auth.uid())) then raise exception 'admin required'; end if;
  if p_user_id=(select auth.uid()) then raise exception 'cannot moderate your own account'; end if;
  if p_status not in ('active','suspended') or length(trim(coalesce(p_reason,'')))<3 then raise exception 'valid status and reason required'; end if;
  update public.profiles set account_status=p_status where id=p_user_id;
  if not found then raise exception 'user not found'; end if;
  insert into public.admin_moderation_log(admin_id,action,target_type,target_id,reason) values ((select auth.uid()),'user_'||p_status,'user',p_user_id,left(trim(p_reason),500));
end $$;

revoke all on function public.admin_dashboard() from public;
revoke all on function public.admin_search(text) from public;
revoke all on function public.admin_resolve_report(uuid,text,text) from public;
revoke all on function public.admin_set_vacancy_status(uuid,text,text) from public;
revoke all on function public.admin_set_user_status(uuid,text,text) from public;
grant execute on function public.admin_dashboard() to authenticated;
grant execute on function public.admin_search(text) to authenticated;
grant execute on function public.admin_resolve_report(uuid,text,text) to authenticated;
grant execute on function public.admin_set_vacancy_status(uuid,text,text) to authenticated;
grant execute on function public.admin_set_user_status(uuid,text,text) to authenticated;
