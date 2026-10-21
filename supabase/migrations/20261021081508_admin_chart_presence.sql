-- Scoped activation only; do not replay the pending development migration history.
set lock_timeout='2s';
set statement_timeout='15s';
create table private.visitor_presence (
 visitor_id uuid not null,tab_id uuid not null,user_id uuid,node text not null,
 device text not null,seen_at timestamptz not null default now(),active boolean not null,
 primary key(visitor_id,tab_id)
);
alter table private.visitor_presence enable row level security;
revoke all on private.visitor_presence from public,anon,authenticated;
create index visitor_presence_seen_at on private.visitor_presence(seen_at);
create function public.record_visitor_presence(p_visitor uuid,p_tab uuid,p_node text,p_active boolean,p_device text) returns void
language plpgsql security definer set search_path='' set statement_timeout='2s' as $$
begin
 if p_visitor is null or p_tab is null or p_active is null or p_node is null or p_node not in ('find','listing','list','create','auth','other','step:0','step:1','step:2','step:3') or p_device is null or p_device not in ('desktop','mobile','tablet') then raise exception 'Invalid presence' using errcode='22023';end if;
 if exists(select 1 from public.admin_users where user_id=(select auth.uid())) then
  delete from private.visitor_presence where visitor_id=p_visitor;return;
 end if;
 -- Expired state is excluded immediately from reads; bounded physical cleanup.
 delete from private.visitor_presence where (visitor_id,tab_id) in (select visitor_id,tab_id from private.visitor_presence where seen_at<now()-interval '2 minutes' order by seen_at limit 100);
 insert into private.visitor_presence(visitor_id,tab_id,user_id,node,device,seen_at,active)
 values(p_visitor,p_tab,(select auth.uid()),p_node,p_device,now(),p_active)
 on conflict(visitor_id,tab_id) do update set user_id=excluded.user_id,node=excluded.node,device=excluded.device,seen_at=excluded.seen_at,active=excluded.active
 where not excluded.active or not visitor_presence.active or visitor_presence.node<>excluded.node or visitor_presence.seen_at<now()-interval '20 seconds';
end $$;
revoke all on function public.record_visitor_presence(uuid,uuid,text,boolean,text) from public,anon,authenticated;
grant execute on function public.record_visitor_presence(uuid,uuid,text,boolean,text) to anon,authenticated;
create function public.admin_visitor_presence(p_device text default null) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='3s' as $$
declare result jsonb;
begin
 if not private.is_admin((select auth.uid())) then raise exception 'Admin verification required' using errcode='42501';end if;
 if p_device is not null and p_device not in ('desktop','mobile','tablet') then raise exception 'Invalid device' using errcode='22023';end if;
 with live as materialized(select * from private.visitor_presence p where active and seen_at>now()-interval '45 seconds' and (p_device is null or device=p_device) and not exists(select 1 from public.admin_users a where a.user_id=p.user_id)), nodes as(select node as id,count(distinct visitor_id) as count from live group by node)
 select jsonb_build_object('generatedAt',now(),'expiresAt',now()+interval '10 seconds','total',(select count(distinct visitor_id) from live),'nodes',coalesce((select jsonb_agg(to_jsonb(n)) from nodes n),'[]'::jsonb)) into result;return result;
end $$;
revoke all on function public.admin_visitor_presence(text) from public,anon,authenticated;
grant execute on function public.admin_visitor_presence(text) to authenticated;
create function public.admin_card_series(p_metric text,p_buckets jsonb) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='5s' as $$
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
 execute format('select count(*) from %I.%I source where created_at >= $1 and created_at < $2%s',sch,tbl,extra) into n using lo,hi;
 output:=output||jsonb_build_array(jsonb_build_object('at',hi,'value',n));
 end loop;
 return jsonb_build_object('metric',p_metric,'series',output);
end $$;
revoke all on function public.admin_card_series(text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_card_series(text,jsonb) to authenticated;
