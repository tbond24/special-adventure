create schema if not exists private;

create or replace function private.property_has_public_vacancy(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.rooms r
    join public.vacancies v on v.room_id = r.id
    where r.property_id = p_property_id
      and v.status = 'active'
      and (v.expires_at is null or v.expires_at > now())
  );
$$;

create or replace function private.room_has_public_vacancy(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.vacancies v
    where v.room_id = p_room_id
      and v.status = 'active'
      and (v.expires_at is null or v.expires_at > now())
  );
$$;

create or replace function private.profile_has_public_vacancy(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.properties p
    join public.rooms r on r.property_id = p.id
    join public.vacancies v on v.room_id = r.id
    where p.owner_id = p_profile_id
      and v.status = 'active'
      and (v.expires_at is null or v.expires_at > now())
  );
$$;

revoke all on function private.property_has_public_vacancy(uuid) from public;
revoke all on function private.room_has_public_vacancy(uuid) from public;
revoke all on function private.profile_has_public_vacancy(uuid) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.property_has_public_vacancy(uuid) to anon, authenticated;
grant execute on function private.room_has_public_vacancy(uuid) to anon, authenticated;
grant execute on function private.profile_has_public_vacancy(uuid) to anon, authenticated;

drop policy if exists properties_public_read on public.properties;
create policy properties_public_or_owner_read on public.properties
for select to anon, authenticated
using (owner_id = (select auth.uid()) or private.property_has_public_vacancy(id));

drop policy if exists rooms_public_read on public.rooms;
create policy rooms_public_or_owner_read on public.rooms
for select to anon, authenticated
using (
  private.room_has_public_vacancy(id)
  or exists (select 1 from public.properties p where p.id = property_id and p.owner_id = (select auth.uid()))
);

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_or_self_read on public.profiles
for select to anon, authenticated
using (id = (select auth.uid()) or private.profile_has_public_vacancy(id));

drop policy if exists media_read on public.media;
create policy media_public_or_owner_read on public.media
for select to anon, authenticated
using (owner_id = (select auth.uid()) or (status='active' and room_id is not null and private.room_has_public_vacancy(room_id)));
;
