-- Existing publication history only. No product write, grant or collector change.
do $$begin if md5(pg_get_functiondef('public.admin_card_series(text,jsonb)'::regprocedure))<>'c36121fc1a44387b950ae6b925270966' then raise exception 'Card series changed since capture; review before applying';end if;end $$;
do $$begin if md5(pg_get_functiondef('private.record_listing_activity()'::regprocedure))<>'54fd47b10511163eb2669a17761a9d7f' or (select pg_get_expr(d.adbin,d.adrelid) from pg_attrdef d join pg_attribute a on a.attrelid=d.adrelid and a.attnum=d.adnum where d.adrelid='public.listing_activity_log'::regclass and a.attname='created_at') is distinct from 'now()' then raise exception 'Publication history recording changed since capture; review before applying';end if;end $$;
CREATE OR REPLACE FUNCTION public.admin_card_series(p_metric text, p_buckets jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET statement_timeout TO '5s'
AS $function$
declare tbl text;sch text:='public';extra text:='';item jsonb;lo timestamptz;hi timestamptz;first_at timestamptz;last_at timestamptz;n bigint;output jsonb:='[]';
begin
 if not private.is_admin((select auth.uid())) then raise exception 'Admin verification required' using errcode='42501';end if;
 case p_metric when 'accounts' then sch:='auth';tbl:='users';extra:=' and not coalesce(is_anonymous,false) and not exists(select 1 from public.admin_users a where a.user_id=source.id)';
 when 'listings' then tbl:='vacancies';extra:=' and not exists(select 1 from public.rooms r join public.properties p on p.id=r.property_id join public.admin_users a on a.user_id=p.owner_id where r.id=source.room_id)';when 'enquiries' then tbl:='conversations';extra:=' and not exists(select 1 from public.conversation_members m join public.admin_users a on a.user_id=m.user_id where m.conversation_id=source.id)';when 'messages' then tbl:='messages';extra:=' and not exists(select 1 from public.admin_users a where a.user_id=source.sender_id)';when 'images' then tbl:='media';extra:=' and not exists(select 1 from public.admin_users a where a.user_id=source.owner_id)';else raise exception 'Invalid metric' using errcode='22023';end case;
 if p_buckets is null or jsonb_typeof(p_buckets)<>'array' or octet_length(p_buckets::text)>30000 or jsonb_array_length(p_buckets) not between 1 and 100 then raise exception 'Invalid buckets' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(p_buckets) loop
 lo:=(item->>'start')::timestamptz;hi:=(item->>'end')::timestamptz;
 if lo is null or hi is null or not isfinite(lo) or not isfinite(hi) or lo>hi or hi-lo>interval '26 hours' or hi>now()+interval '1 minute' or (last_at is not null and last_at<>lo) then raise exception 'Invalid bucket' using errcode='22023';end if;
 first_at:=coalesce(first_at,lo);last_at:=hi;if hi-first_at>interval '91 days' then raise exception 'Range too long' using errcode='22023';end if;
 if p_metric='accounts' then
  select count(*) into n from auth.users source
  where source.confirmed_at>=lo and source.confirmed_at<hi
   and not coalesce(source.is_anonymous,false)
   and not exists(select 1 from public.admin_users a where a.user_id=source.id);
 elsif p_metric='listings' then
  -- now() is the activity table's transaction timestamp. The current create
  -- wrappers insert active and reset to draft in that same transaction.
  -- Those intermediate created-active events are not successful publications.
  with publications as(
   select l.entity_id,min(l.created_at) first_at
   from public.listing_activity_log l
   where l.entity_type='listing' and l.new_status='active'
    and(l.old_status='draft' or(l.action='created' and l.old_status is null and not exists(
     select 1 from public.listing_activity_log reset
     where reset.entity_type='listing' and reset.entity_id=l.entity_id
      and reset.created_at=l.created_at and reset.id>l.id
      and reset.old_status='active' and reset.new_status='draft')))
   group by l.entity_id
  )
  select count(*) into n from publications pub join public.vacancies source on source.id=pub.entity_id
  where pub.first_at>=lo and pub.first_at<hi
   and not exists(select 1 from public.rooms r join public.properties p on p.id=r.property_id
    join public.admin_users a on a.user_id=p.owner_id where r.id=source.room_id);
 else
 execute format('select count(*) from %I.%I source where created_at >= $1 and created_at < $2%s',sch,tbl,extra) into n using lo,hi;
 end if;
 output:=output||jsonb_build_array(jsonb_build_object('at',hi,'value',n));
 end loop;
 return jsonb_build_object('metric',p_metric,'series',output);
end $function$;
