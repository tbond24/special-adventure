-- Development read-only candidate. Not applied to hosted databases.
create function public.admin_metric_comparison(
 p_metric text,p_from timestamptz,p_to timestamptz,
 p_previous_from timestamptz,p_previous_to timestamptz
) returns jsonb language plpgsql security definer set search_path='' as $$
declare source_schema text;source_table text;extra text:='';current_count bigint;previous_count bigint;
begin
 if not private.is_admin((select auth.uid())) then raise exception 'Admin verification required' using errcode='42501';end if;
 if p_from is null or p_to is null or p_previous_from is null or p_previous_to is null
  or not isfinite(p_from) or not isfinite(p_to) or not isfinite(p_previous_from) or not isfinite(p_previous_to)
  or p_from>p_to or p_previous_from>p_previous_to or p_previous_to>p_from
  or p_to-p_from>interval '91 days' or p_previous_to-p_previous_from>interval '91 days'
  or p_to-p_previous_from>interval '182 days' or p_to>now()+interval '1 minute'
  or abs(extract(epoch from (p_to-p_from)-(p_previous_to-p_previous_from)))>7200
  then raise exception 'Invalid comparison range' using errcode='22023';end if;
 source_schema:='public';
 case p_metric
  when 'accounts' then source_schema:='auth';source_table:='users';extra:=' and not coalesce(is_anonymous,false)';
  when 'listings' then source_table:='vacancies';
  when 'enquiries' then source_table:='conversations';
  when 'messages' then source_table:='messages';
  when 'images' then source_table:='media';
  else raise exception 'Invalid comparison metric' using errcode='22023';
 end case;
 -- Table identifiers come exclusively from the allowlist. Keep time columns bare
 -- so existing created_at indexes can support both bounded counts.
 execute format('select count(*) from %I.%I where created_at >= $1 and created_at < $2%s',source_schema,source_table,extra)
  into current_count using p_from,p_to;
 execute format('select count(*) from %I.%I where created_at >= $1 and created_at < $2%s',source_schema,source_table,extra)
  into previous_count using p_previous_from,p_previous_to;
 return jsonb_build_object('metric',p_metric,'total',current_count,'previous',previous_count,
  'from',p_from,'to',p_to,'previousFrom',p_previous_from,'previousTo',p_previous_to);
end $$;
revoke all on function public.admin_metric_comparison(text,timestamptz,timestamptz,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.admin_metric_comparison(text,timestamptz,timestamptz,timestamptz,timestamptz) to authenticated;
