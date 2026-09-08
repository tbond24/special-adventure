alter table public.properties
  add column if not exists public_latitude numeric(9,6),
  add column if not exists public_longitude numeric(9,6);

alter table public.properties
  drop constraint if exists properties_public_latitude_check;
alter table public.properties
  add constraint properties_public_latitude_check check (public_latitude is null or public_latitude between -90 and 90);
alter table public.properties
  drop constraint if exists properties_public_longitude_check;
alter table public.properties
  add constraint properties_public_longitude_check check (public_longitude is null or public_longitude between -180 and 180);
;
