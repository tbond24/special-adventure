alter table public.property_private_locations
  add column if not exists manager_nickname text;

do $$ begin
  alter table public.property_private_locations
    add constraint property_private_locations_manager_nickname_length
    check (manager_nickname is null or char_length(manager_nickname) <= 80);
exception when duplicate_object then null;
end $$;

create or replace function public.set_property_manager_nickname(p_property_id uuid, p_nickname text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.properties
    where id = p_property_id and owner_id = auth.uid()
  ) then
    raise exception 'Property not found';
  end if;

  update public.property_private_locations
  set manager_nickname = nullif(trim(p_nickname), '')
  where property_id = p_property_id;
end;
$$;

revoke all on function public.set_property_manager_nickname(uuid, text) from public, anon;
grant execute on function public.set_property_manager_nickname(uuid, text) to authenticated;
