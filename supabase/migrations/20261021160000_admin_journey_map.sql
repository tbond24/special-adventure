-- Candidate only. Observed route/step transitions; no live presence or new collector.
create function public.admin_journey_map(p_from timestamptz,p_to timestamptz,p_device text default null)
returns jsonb language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
declare result jsonb;
begin
 if not private.is_admin((select auth.uid())) then raise exception 'Admin verification required' using errcode='42501';end if;
 if p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to) or p_from>=p_to or p_to-p_from>interval '91 days' or p_to>now()+interval '1 minute' or (p_device is not null and p_device not in ('desktop','mobile','tablet')) then raise exception 'Invalid journey range/filter' using errcode='22023';end if;
 with observed as materialized (
  select e.id,e.created_at,e.visitor_id,e.session_id,e.event_name,e.previous_event_id,e.event_id,e.journey_id,e.from_step,e.to_step,
   case when e.event_name in ('listing_started','step_ready','publish_clicked') and e.to_step between 0 and 3 then 'step:'||e.to_step::text
   when e.event_name='lister_landing_viewed' and e.route in ('find','listing','list','create','auth','other') then e.route end node
  from public.analytics_events e
  where e.journey_version=2 and e.created_at>=p_from and e.created_at<p_to
   and e.visitor_id is not null and e.session_id is not null
   and (p_device is null or e.device_class=p_device)
   and not exists(select 1 from public.admin_users a where a.user_id=e.user_id)
 ), pages as (
  select *,lag(node) over(partition by visitor_id,session_id order by created_at,id) previous,
   lag(created_at) over(partition by visitor_id,session_id order by created_at,id) previous_at
  from observed where event_name='lister_landing_viewed' and node is not null
 ), ordered_nodes as (
  select *,lag(node) over(partition by visitor_id,session_id order by created_at,id) previous,
   lag(created_at) over(partition by visitor_id,session_id order by created_at,id) previous_at
  from observed where node is not null
 ), links as (
  select visitor_id,previous as origin,node as destination from pages where previous is not null and previous<>node and created_at-previous_at<interval '30 minutes'
  union all
  select visitor_id,previous,node from ordered_nodes where node='step:0' and event_name='listing_started' and previous='create' and created_at-previous_at<interval '30 minutes'
  union all
  select e.visitor_id,p.node,e.node from observed e join observed p on p.event_id=e.previous_event_id
   and p.visitor_id=e.visitor_id and p.session_id=e.session_id and p.journey_id=e.journey_id
   and p.to_step=e.from_step and p.created_at<=e.created_at
  where e.event_name in ('step_ready','publish_clicked') and e.node is not null and p.node is not null and p.node<>e.node
 ), nodes as (select node id,count(distinct visitor_id) count from observed where node is not null group by node),
 edges as (select origin,destination,count(distinct visitor_id) count from links group by origin,destination)
 select jsonb_build_object('schemaVersion',1,'generatedAt',now(),'from',p_from,'to',p_to,'device',p_device,
  'total',(select count(distinct visitor_id) from observed where node is not null),
  'nodes',coalesce((select jsonb_agg(to_jsonb(n) order by n.id) from nodes n),'[]'::jsonb),
  'edges',coalesce((select jsonb_agg(jsonb_build_object('from',origin,'to',destination,'count',count) order by origin,destination) from edges),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.admin_journey_map(timestamptz,timestamptz,text) from public,anon,authenticated;
grant execute on function public.admin_journey_map(timestamptz,timestamptz,text) to authenticated;
