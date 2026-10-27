-- Aggregate observations only: no paths, customer IDs or reconstructed history.
create table private.admin_capacity_snapshots (
  hour_at timestamptz primary key,
  captured_at timestamptz not null,
  storage_bytes bigint check (storage_bytes >= 0),
  unknown_size_objects bigint not null check (unknown_size_objects >= 0),
  live_listings bigint not null check (live_listings >= 0),
  check (captured_at >= hour_at and captured_at < hour_at + interval '1 hour'),
  check ((storage_bytes is null) = (unknown_size_objects > 0))
);
alter table private.admin_capacity_snapshots enable row level security;
revoke all on private.admin_capacity_snapshots from public,anon,authenticated,service_role;

-- Owner-only invoker. Used by the scheduled postgres job and guarded reader.
create function private.admin_capacity_current()
returns jsonb language sql stable security invoker set search_path='' as $$
  with sizes as (
    select case when metadata->>'size' ~ '^[0-9]{1,16}$'
      then (metadata->>'size')::bigint end as bytes from storage.objects
  ), totals as (
    select coalesce(sum(bytes),0)::bigint as bytes,
      count(*) filter (where bytes is null) as unknown from sizes
  )
  select jsonb_build_object('at',now(),
    'storageBytes',case when unknown=0 then bytes end,
    'unknownSizeObjects',unknown,
    'liveListings',(select count(*) from public.vacancies v
      join public.rooms r on r.id=v.room_id
      join public.properties p on p.id=r.property_id
      join public.profiles owner on owner.id=p.owner_id
      where v.status='active' and (v.expires_at is null or v.expires_at>now())))
  from totals;
$$;
revoke all on function private.admin_capacity_current() from public,anon,authenticated,service_role;

create function private.capture_admin_capacity_snapshot()
returns void language plpgsql security invoker set search_path='' set statement_timeout='5s' as $$
declare sample jsonb;
begin
  -- No overwrite: a retry cannot relabel a later observation as an earlier one.
  if exists(select 1 from private.admin_capacity_snapshots where hour_at=date_trunc('hour',now())) then return;end if;
  sample:=private.admin_capacity_current();
  insert into private.admin_capacity_snapshots(hour_at,captured_at,storage_bytes,unknown_size_objects,live_listings)
  values(date_trunc('hour',now()),now(),(sample->>'storageBytes')::bigint,
    (sample->>'unknownSizeObjects')::bigint,(sample->>'liveListings')::bigint)
  on conflict(hour_at) do nothing;
end;
$$;
revoke all on function private.capture_admin_capacity_snapshot() from public,anon,authenticated,service_role;

-- Private privilege boundary; the public entry point stays invoker.
create function private.admin_capacity_history_impl(p_from timestamptz,p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path='' set statement_timeout='5s' as $$
declare samples jsonb;current_sample jsonb;
begin
  if not private.is_admin((select auth.uid())) then
    raise exception 'Admin verification required' using errcode='42501';
  end if;
  if p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to)
    or p_from>p_to or p_to-p_from>interval '91 days' or p_to>now()+interval '1 minute'
  then raise exception 'Invalid history range' using errcode='22023';end if;
  current_sample:=private.admin_capacity_current();
  select coalesce(jsonb_agg(jsonb_build_object('at',s.captured_at,'storageBytes',s.storage_bytes,
    'unknownSizeObjects',s.unknown_size_objects,'liveListings',s.live_listings) order by s.captured_at),'[]'::jsonb)
    into samples from private.admin_capacity_snapshots s where s.hour_at>=date_trunc('hour',p_from)
      and s.captured_at>=p_from and s.captured_at<=p_to;
  return jsonb_build_object('schemaVersion',1,'generatedAt',now(),'from',p_from,'to',p_to,
    'coverageStart',(select min(captured_at) from private.admin_capacity_snapshots),
    'latestSnapshotAt',(select max(captured_at) from private.admin_capacity_snapshots),
    'intervalMinutes',60,'current',current_sample,'snapshots',samples);
end;
$$;
revoke all on function private.admin_capacity_history_impl(timestamptz,timestamptz) from public,anon,authenticated,service_role;
grant execute on function private.admin_capacity_history_impl(timestamptz,timestamptz) to authenticated;
create function public.admin_capacity_history(p_from timestamptz,p_to timestamptz)
returns jsonb language sql stable security invoker set search_path='' as $$
  select private.admin_capacity_history_impl(p_from,p_to);
$$;
revoke all on function public.admin_capacity_history(timestamptz,timestamptz) from public,anon,authenticated,service_role;
grant execute on function public.admin_capacity_history(timestamptz,timestamptz) to authenticated;
