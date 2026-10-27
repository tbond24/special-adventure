do $$begin if pg_get_functiondef('public.admin_card_series(text,jsonb)'::regprocedure) is distinct from $new_reader$CREATE OR REPLACE FUNCTION public.admin_card_series(p_metric text, p_buckets jsonb)
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
 elsif p_metric='enquiries' then
  with first_contacts as(
   select c.vacancy_id,m.sender_id,min(m.created_at) first_at
   from public.conversations c join public.messages m on m.conversation_id=c.id
   join public.vacancies v on v.id=c.vacancy_id
   join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id
   where m.sender_id<>p.owner_id and nullif(trim(m.body),'') is not null
    and exists(select 1 from public.conversation_members member where member.conversation_id=c.id and member.user_id=m.sender_id)
    and exists(select 1 from public.conversation_members owner_member where owner_member.conversation_id=c.id and owner_member.user_id=p.owner_id)
    and not exists(select 1 from public.conversation_members member join public.admin_users a on a.user_id=member.user_id where member.conversation_id=c.id)
   group by c.vacancy_id,m.sender_id
  )
  select count(*) into n from first_contacts contact where contact.first_at>=lo and contact.first_at<hi;
 else
 execute format('select count(*) from %I.%I source where created_at >= $1 and created_at < $2%s',sch,tbl,extra) into n using lo,hi;
 end if;
 output:=output||jsonb_build_array(jsonb_build_object('at',hi,'value',n));
 end loop;
 return jsonb_build_object('metric',p_metric,'series',output);
end $function$
$new_reader$ then raise exception 'Enquiry repair baseline changed; review before applying';end if;end $$;
do $$begin if (select pg_get_triggerdef(oid) from pg_trigger where tgrelid='public.messages'::regclass and tgname='vacancy_admin_live') is distinct from $new_trigger$CREATE TRIGGER vacancy_admin_live AFTER INSERT OR DELETE OR UPDATE ON public.messages FOR EACH STATEMENT EXECUTE FUNCTION private.notify_admin_overview('messages,enquiries')$new_trigger$ then raise exception 'Enquiry repair baseline changed; review before applying';end if;end $$;
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
drop trigger vacancy_admin_live on public.messages;
CREATE TRIGGER vacancy_admin_live AFTER INSERT OR DELETE OR UPDATE ON public.messages FOR EACH STATEMENT EXECUTE FUNCTION private.notify_admin_overview('messages');
