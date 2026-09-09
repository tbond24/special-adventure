create or replace function public.admin_daily_metrics(p_metric text default 'accounts', p_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  metric text := lower(trim(coalesce(p_metric,'accounts')));
  days integer := greatest(7,least(coalesce(p_days,7),30));
  result jsonb;
begin
  if not private.is_admin((select auth.uid())) then
    return jsonb_build_object('error','admin required');
  end if;
  if metric not in ('accounts','listings','images','enquiries','messages') then
    raise exception 'invalid metric';
  end if;

  with dates as (
    select generate_series(current_date-days+1,current_date,'1 day'::interval)::date as day
  ), values_by_day as (
    select d.day,
      case metric
        when 'accounts' then (select count(*) from auth.users u where u.created_at>=d.day and u.created_at<d.day+1 and not coalesce(u.is_anonymous,false))
        when 'listings' then (select count(*) from public.vacancies v where v.created_at>=d.day and v.created_at<d.day+1)
        when 'images' then (select count(*) from public.media m where m.created_at>=d.day and m.created_at<d.day+1)
        when 'enquiries' then (select count(*) from public.conversations c where c.created_at>=d.day and c.created_at<d.day+1)
        when 'messages' then (select count(*) from public.messages m where m.created_at>=d.day and m.created_at<d.day+1)
      end as value
    from dates d
  )
  select jsonb_build_object(
    'metric',metric,
    'days',days,
    'total',coalesce(sum(value),0),
    'series',coalesce(jsonb_agg(jsonb_build_object('date',day,'value',value) order by day),'[]'::jsonb)
  ) into result from values_by_day;
  return result;
end
$$;

revoke all on function public.admin_daily_metrics(text,integer) from public, anon;
grant execute on function public.admin_daily_metrics(text,integer) to authenticated;
