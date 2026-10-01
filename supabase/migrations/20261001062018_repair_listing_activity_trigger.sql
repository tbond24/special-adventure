-- Keep the existing activity log contract, but only read status from vacancies.
-- Properties and rooms have no status column; direct NEW.status access blocked
-- listing creation and edits when their activity triggers fired.
create or replace function private.record_listing_activity()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  entity text;
  event text;
  previous_status text;
  current_status text;
begin
  if tg_op = 'UPDATE' and to_jsonb(new) - 'updated_at' = to_jsonb(old) - 'updated_at' then
    return new;
  end if;

  entity := case tg_table_name when 'properties' then 'property' when 'rooms' then 'unit' else 'listing' end;
  event := case tg_op when 'INSERT' then 'created' when 'DELETE' then 'deleted' else 'updated' end;

  if tg_table_name = 'vacancies' then
    if tg_op <> 'INSERT' then previous_status := to_jsonb(old)->>'status'; end if;
    if tg_op <> 'DELETE' then current_status := to_jsonb(new)->>'status'; end if;
    if tg_op = 'UPDATE' and current_status is distinct from previous_status then
      event := 'status_changed';
    end if;
  end if;

  insert into public.listing_activity_log(actor_id,entity_type,entity_id,action,old_status,new_status)
    values ((select auth.uid()),entity,
      case when tg_op = 'DELETE' then old.id else new.id end,
      event,previous_status,current_status);
  return case when tg_op = 'DELETE' then old else new end;
end
$$;
