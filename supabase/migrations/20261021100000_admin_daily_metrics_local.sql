-- Local-day companion to the existing daily reader. Hosted application is separate.
create or replace function public.admin_daily_metrics_local(
 p_metric text default 'accounts', p_days integer default 7, p_timezone text default 'UTC'
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 metric text := lower(trim(coalesce(p_metric,'accounts')));
 days integer := greatest(7,least(coalesce(p_days,7),30));
 today date;
 result jsonb;
begin
 if not private.is_admin((select auth.uid())) then
  return jsonb_build_object('error','admin required');
 end if;
 if metric not in ('accounts','listings','images','enquiries','messages') then
  raise exception 'invalid metric';
 end if;
 if p_timezone is null or length(p_timezone)>100 or not exists (
  select 1 from pg_catalog.pg_timezone_names z where z.name=p_timezone
 ) then raise exception 'Invalid metrics timezone' using errcode='22023'; end if;
 today := (now() at time zone p_timezone)::date;
 with dates as (
  select today-days+1+i as day from generate_series(0,days-1) i
 ), bounds as (
  select day,day::timestamp at time zone p_timezone as lo,
   (day+1)::timestamp at time zone p_timezone as hi from dates
 ), values_by_day as (
  select d.day,case metric
   when 'accounts' then (select count(*) from auth.users u where u.created_at>=d.lo and u.created_at<d.hi and not coalesce(u.is_anonymous,false))
   when 'listings' then (select count(*) from public.vacancies v where v.created_at>=d.lo and v.created_at<d.hi)
   when 'images' then (select count(*) from public.media m where m.created_at>=d.lo and m.created_at<d.hi)
   when 'enquiries' then (select count(*) from public.conversations c where c.created_at>=d.lo and c.created_at<d.hi)
   when 'messages' then (select count(*) from public.messages m where m.created_at>=d.lo and m.created_at<d.hi)
  end as value from bounds d
 ) select jsonb_build_object('metric',metric,'days',days,'timeZone',p_timezone,
  'total',coalesce(sum(value),0),'series',coalesce(jsonb_agg(jsonb_build_object('date',day,'value',value) order by day),'[]'::jsonb))
 into result from values_by_day;
 return result;
end $$;
revoke all on function public.admin_daily_metrics_local(text,integer,text) from public,anon;
grant execute on function public.admin_daily_metrics_local(text,integer,text) to authenticated;
