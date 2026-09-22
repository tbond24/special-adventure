create or replace function public.admin_operational_health(p_days integer default 7)
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
declare days integer:=greatest(1,least(coalesce(p_days,7),30));
begin
  if not private.is_admin((select auth.uid())) then return jsonb_build_object('error','admin required'); end if;
  return jsonb_build_object(
    'days',days,
    'client_errors',(select count(*) from public.client_errors where created_at>=now()-make_interval(days=>days)),
    'storage_bytes',(select coalesce(sum(coalesce((metadata->>'size')::bigint,0)),0) from storage.objects where bucket_id in ('room-media','profile-avatars')),
    'email_sent',(select count(*) from public.email_delivery_events where event_type='email.sent' and occurred_at>=now()-make_interval(days=>days)),
    'email_delivered',(select count(*) from public.email_delivery_events where event_type='email.delivered' and occurred_at>=now()-make_interval(days=>days)),
    'email_bounced',(select count(*) from public.email_delivery_events where event_type='email.bounced' and occurred_at>=now()-make_interval(days=>days)),
    'email_complained',(select count(*) from public.email_delivery_events where event_type='email.complained' and occurred_at>=now()-make_interval(days=>days)),
    'email_failed',(select count(*) from public.email_delivery_events where event_type in ('email.failed','email.suppressed') and occurred_at>=now()-make_interval(days=>days)),
    'recent_errors',coalesce((select jsonb_agg(row_to_json(x)) from (select error_code,route,count(*) as count,max(created_at) as last_seen from public.client_errors where created_at>=now()-make_interval(days=>days) group by error_code,route order by count(*) desc limit 8)x),'[]'::jsonb)
  );
end;
$$;
revoke all on function public.admin_operational_health(integer) from public,anon;
grant execute on function public.admin_operational_health(integer) to authenticated;
