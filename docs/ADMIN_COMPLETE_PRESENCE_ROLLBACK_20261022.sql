-- Captured read-only before activation. Preserve all new history tables.
-- Restore only if the new presence breakdown report needs rollback.
CREATE OR REPLACE FUNCTION public.admin_visitor_presence(p_device text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '3s'
AS $function$
declare result jsonb;
begin
 if not private.is_admin((select auth.uid())) then raise exception 'Admin verification required' using errcode='42501';end if;
 if p_device is not null and p_device not in ('desktop','mobile','tablet') then raise exception 'Invalid device' using errcode='22023';end if;
 with live as materialized(select * from private.visitor_presence p where active and seen_at>now()-interval '45 seconds' and (p_device is null or device=p_device) and not exists(select 1 from public.admin_users a where a.user_id=p.user_id)), nodes as(select node as id,count(distinct visitor_id) as count from live group by node)
 select jsonb_build_object('generatedAt',now(),'expiresAt',now()+interval '10 seconds','total',(select count(distinct visitor_id) from live),'nodes',coalesce((select jsonb_agg(to_jsonb(n)) from nodes n),'[]'::jsonb)) into result;return result;
end $function$
;

