-- Forward-only aggregate observations. Existing hourly history/API/job stay intact.
create table private.admin_capacity_observations (
 id bigint generated always as identity primary key,
 observed_at timestamptz not null unique,
 storage_bytes bigint check(storage_bytes>=0),
 unknown_size_objects bigint not null check(unknown_size_objects>=0),
 live_listings bigint not null check(live_listings>=0),
 check((storage_bytes is null)=(unknown_size_objects>0))
);
create table private.admin_capacity_recording (
 id boolean primary key default true check(id),
 started_at timestamptz not null,
 checked_at timestamptz not null,
 observed_at timestamptz not null,
 next_expiry_at timestamptz,
 sample jsonb not null
);
create table private.admin_capacity_pending(id bigint generated always as identity primary key);
alter table private.admin_capacity_pending enable row level security;
revoke all on private.admin_capacity_pending from public,anon,authenticated,service_role;
revoke all on sequence private.admin_capacity_pending_id_seq from public,anon,authenticated,service_role;
alter table private.admin_capacity_observations enable row level security;
alter table private.admin_capacity_recording enable row level security;
revoke all on private.admin_capacity_observations,private.admin_capacity_recording from public,anon,authenticated,service_role;
revoke all on sequence private.admin_capacity_observations_id_seq from public,anon,authenticated,service_role;

-- Same existing capacity definition, with an explicit observation cutoff.
create function private.admin_capacity_at(p_at timestamptz)
returns jsonb language sql stable security invoker set search_path='' as $$
 with sizes as (
  select case when metadata->>'size' ~ '^[0-9]{1,16}$' then (metadata->>'size')::bigint end bytes from storage.objects
 ), totals as(select coalesce(sum(bytes),0)::bigint bytes,count(*) filter(where bytes is null) unknown from sizes)
 select jsonb_build_object('at',p_at,'storageBytes',case when unknown=0 then bytes end,'unknownSizeObjects',unknown,
  'liveListings',(select count(*) from public.vacancies v join public.rooms r on r.id=v.room_id
   join public.properties p on p.id=r.property_id join public.profiles owner on owner.id=p.owner_id
   where v.status='active' and(v.expires_at is null or v.expires_at>p_at))) from totals;
$$;
revoke all on function private.admin_capacity_at(timestamptz) from public,anon,authenticated,service_role;

create function private.capture_admin_capacity_observation()
returns void language plpgsql volatile security invoker set search_path='' set statement_timeout='5s' as $$
declare at timestamptz; sample jsonb; prior private.admin_capacity_recording; next_expiry timestamptz; changed boolean;
begin
 -- Never wait on another capacity transaction: enqueue a committed reconciliation
 -- hint. Concurrent bursts may coalesce; no customer operation waits on this lock.
 if not pg_try_advisory_xact_lock(196733,27094055) then
  insert into private.admin_capacity_pending default values;return;
 end if;
 select * into prior from private.admin_capacity_recording where id;
 at:=greatest(clock_timestamp(),prior.observed_at+interval '1 microsecond');
 sample:=private.admin_capacity_at(at)-'at';
 changed:=prior.id is null or sample is distinct from prior.sample;
 select min(v.expires_at) into next_expiry from public.vacancies v
 join public.rooms r on r.id=v.room_id join public.properties p on p.id=r.property_id
 join public.profiles owner on owner.id=p.owner_id
 where v.status='active' and v.expires_at>at;
 if changed or at-prior.observed_at>=interval '1 hour' then
  insert into private.admin_capacity_observations(observed_at,storage_bytes,unknown_size_objects,live_listings)
  values(at,(sample->>'storageBytes')::bigint,(sample->>'unknownSizeObjects')::bigint,(sample->>'liveListings')::bigint);
 else at:=prior.observed_at;end if;
 insert into private.admin_capacity_recording(id,started_at,checked_at,observed_at,next_expiry_at,sample)
 values(true,coalesce(prior.started_at,at),clock_timestamp(),at,next_expiry,sample)
 on conflict(id) do update set checked_at=excluded.checked_at,observed_at=excluded.observed_at,next_expiry_at=excluded.next_expiry_at,sample=excluded.sample;
 delete from private.admin_capacity_pending;
 if changed then
  begin
   perform realtime.send(jsonb_build_object('schemaVersion',1,'groups',array['capacity','locations']),'changed','vacancy-admin-overview-v1',true);
  exception when others then raise warning 'Admin capacity notification unavailable';end;
 end if;
end;
$$;
revoke all on function private.capture_admin_capacity_observation() from public,anon,authenticated,service_role;

-- A failed optional observation must never make a successful product write fail.
create function private.observe_admin_capacity_change()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.capture_admin_capacity_observation();
 return null;
exception when others then
 begin insert into private.admin_capacity_pending default values;exception when others then null;end;
 raise warning 'Admin capacity recording unavailable';return null;
end;
$$;
revoke all on function private.observe_admin_capacity_change() from public,anon,authenticated,service_role;
create trigger vacancy_capacity_observe after insert or update or delete on storage.objects for each statement execute function private.observe_admin_capacity_change();
create trigger vacancy_capacity_observe after insert or update or delete on public.vacancies for each statement execute function private.observe_admin_capacity_change();
create trigger vacancy_capacity_observe after insert or update or delete on public.rooms for each statement execute function private.observe_admin_capacity_change();
create trigger vacancy_capacity_observe after insert or update or delete on public.properties for each statement execute function private.observe_admin_capacity_change();
-- Profile field/heartbeat changes do not affect the preserved capacity definition.
create trigger vacancy_capacity_observe after insert or delete on public.profiles for each statement execute function private.observe_admin_capacity_change();

-- Clock-only listing expiry has no row write. Check a singleton deadline, not all
-- source tables. An aggregate scan occurs only at a due expiry or hourly safety check.
create function private.reconcile_admin_capacity_clock()
returns void language plpgsql security invoker set search_path='' set statement_timeout='5s' as $$
begin
 if exists(select 1 from private.admin_capacity_pending) or not exists(select 1 from private.admin_capacity_recording where id)
 or exists(select 1 from private.admin_capacity_recording where id and(next_expiry_at<=clock_timestamp() or checked_at<=clock_timestamp()-interval '1 hour'))
 then perform private.capture_admin_capacity_observation();end if;
end;
$$;
revoke all on function private.reconcile_admin_capacity_clock() from public,anon,authenticated,service_role;

create function private.admin_capacity_changes_impl(p_from timestamptz,p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path='' set statement_timeout='5s' as $$
declare samples jsonb; coverage timestamptz; latest timestamptz; resolution integer;
begin
 if not private.is_admin((select auth.uid())) then raise exception 'Admin verification required' using errcode='42501';end if;
 if p_from is null or p_to is null or not isfinite(p_from) or not isfinite(p_to) or p_from>p_to
 or p_to-p_from>interval '91 days' or p_to>now()+interval '1 minute' then raise exception 'Invalid history range' using errcode='22023';end if;
 resolution:=greatest(1,ceil(extract(epoch from p_to-p_from)/2000)::integer);
 with observations as (
  select captured_at at,storage_bytes,unknown_size_objects,live_listings from private.admin_capacity_snapshots where captured_at>=p_from and captured_at<=p_to
  union all select observed_at,storage_bytes,unknown_size_objects,live_listings from private.admin_capacity_observations where observed_at>=p_from and observed_at<=p_to
 ), ranked as (
  select *,row_number() over(partition by floor(extract(epoch from at-p_from)/resolution) order by at desc) position from observations
 ), selected as (
  select at,storage_bytes,unknown_size_objects,live_listings from ranked where position=1
  union select at,storage_bytes,unknown_size_objects,live_listings from (select * from observations order by at limit 1) first_observation
 ) select coalesce(jsonb_agg(jsonb_build_object('at',s.at,'storageBytes',s.storage_bytes,'unknownSizeObjects',s.unknown_size_objects,'liveListings',s.live_listings) order by s.at),'[]'::jsonb)
 into samples from selected s;
 select min(at),max(at) into coverage,latest from (
 select min(captured_at) at from private.admin_capacity_snapshots union all select max(captured_at) from private.admin_capacity_snapshots
 union all select min(observed_at) from private.admin_capacity_observations union all select max(observed_at) from private.admin_capacity_observations) times;
 return jsonb_build_object('schemaVersion',2,'recordingMode','changes','generatedAt',now(),'from',p_from,'to',p_to,
 'coverageStart',coverage,'latestSnapshotAt',latest,'recordingStartedAt',(select started_at from private.admin_capacity_recording where id),
 'lastCheckedAt',(select checked_at from private.admin_capacity_recording where id),'resolutionSeconds',resolution,'current',private.admin_capacity_at(now()),'snapshots',samples);
end;
$$;
revoke all on function private.admin_capacity_changes_impl(timestamptz,timestamptz) from public,anon,authenticated,service_role;
grant execute on function private.admin_capacity_changes_impl(timestamptz,timestamptz) to authenticated;
create function public.admin_capacity_changes(p_from timestamptz,p_to timestamptz)
returns jsonb language sql stable security invoker set search_path='' as $$select private.admin_capacity_changes_impl(p_from,p_to);$$;
revoke all on function public.admin_capacity_changes(timestamptz,timestamptz) from public,anon,authenticated,service_role;
grant execute on function public.admin_capacity_changes(timestamptz,timestamptz) to authenticated;

select private.capture_admin_capacity_observation();
