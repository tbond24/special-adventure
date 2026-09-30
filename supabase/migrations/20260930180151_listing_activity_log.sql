create table public.listing_activity_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  entity_type text not null check (entity_type in ('property','unit','listing')),
  entity_id uuid not null,
  action text not null check (action in ('created','updated','deleted','status_changed')),
  old_status text,
  new_status text,
  created_at timestamptz not null default now()
);

create index listing_activity_log_created_idx on public.listing_activity_log(created_at desc);
alter table public.listing_activity_log enable row level security;
revoke all on public.listing_activity_log from anon, authenticated;
grant select on public.listing_activity_log to authenticated;
create policy listing_activity_admin_read on public.listing_activity_log
  for select to authenticated using (private.is_admin((select auth.uid())));

create function private.record_listing_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  entity text;
  event text;
begin
  if tg_op = 'UPDATE' and to_jsonb(new) - 'updated_at' = to_jsonb(old) - 'updated_at' then
    return new;
  end if;
  entity := case tg_table_name when 'properties' then 'property' when 'rooms' then 'unit' else 'listing' end;
  event := case tg_op when 'INSERT' then 'created' when 'DELETE' then 'deleted' else 'updated' end;
  if tg_table_name = 'vacancies' and tg_op = 'UPDATE' and new.status is distinct from old.status then
    event := 'status_changed';
  end if;
  insert into public.listing_activity_log(actor_id,entity_type,entity_id,action,old_status,new_status)
    values ((select auth.uid()),entity,coalesce(new.id,old.id),event,
      case when tg_table_name = 'vacancies' and tg_op <> 'INSERT' then old.status else null end,
      case when tg_table_name = 'vacancies' and tg_op <> 'DELETE' then new.status else null end);
  return coalesce(new,old);
end $$;
revoke all on function private.record_listing_activity() from public, anon, authenticated;

create trigger listing_activity_properties after insert or update or delete on public.properties
  for each row execute function private.record_listing_activity();
create trigger listing_activity_rooms after insert or update or delete on public.rooms
  for each row execute function private.record_listing_activity();
create trigger listing_activity_vacancies after insert or update or delete on public.vacancies
  for each row execute function private.record_listing_activity();
