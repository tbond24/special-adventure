create table public.property_private_locations (
  property_id uuid primary key references public.properties(id) on delete cascade,
  address_line text not null,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.property_private_locations enable row level security;
create policy "property_private_location_owner_read" on public.property_private_locations
for select using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = (select auth.uid())));
create policy "property_private_location_owner_insert" on public.property_private_locations
for insert with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = (select auth.uid())));
create policy "property_private_location_owner_update" on public.property_private_locations
for update using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = (select auth.uid())))
with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = (select auth.uid())));
create policy "property_private_location_owner_delete" on public.property_private_locations
for delete using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = (select auth.uid())));

alter table public.properties drop column address_line;
alter table public.properties drop column latitude;
alter table public.properties drop column longitude;
;
