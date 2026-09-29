alter table public.rooms
  add column if not exists unit_details jsonb not null default '{}'::jsonb;

create table if not exists public.room_private_names (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100)
);

alter table public.room_private_names enable row level security;

create policy room_private_names_owner_select on public.room_private_names
  for select to authenticated
  using (exists (select 1 from public.rooms r join public.properties p on p.id = r.property_id where r.id = room_id and p.owner_id = (select auth.uid())));

create policy room_private_names_owner_insert on public.room_private_names
  for insert to authenticated
  with check (exists (select 1 from public.rooms r join public.properties p on p.id = r.property_id where r.id = room_id and p.owner_id = (select auth.uid())));

create policy room_private_names_owner_update on public.room_private_names
  for update to authenticated
  using (exists (select 1 from public.rooms r join public.properties p on p.id = r.property_id where r.id = room_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.rooms r join public.properties p on p.id = r.property_id where r.id = room_id and p.owner_id = (select auth.uid())));

grant select, insert, update on public.room_private_names to authenticated;
