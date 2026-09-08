create or replace function private.vacancy_room_owned_by(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.rooms r
    join public.properties p on p.id = r.property_id
    where r.id = p_room_id and p.owner_id = p_user_id
  );
$$;

revoke all on function private.vacancy_room_owned_by(uuid,uuid) from public, anon, authenticated;

drop policy if exists vacancies_public_active_read on public.vacancies;
create policy vacancies_public_active_read on public.vacancies
for select
using (
  (status = 'active' and (expires_at is null or expires_at > now()))
  or private.vacancy_room_owned_by(room_id, (select auth.uid()))
);

drop policy if exists vacancies_owner_insert on public.vacancies;
create policy vacancies_owner_insert on public.vacancies
for insert to authenticated
with check (private.vacancy_room_owned_by(room_id, (select auth.uid())));

drop policy if exists vacancies_owner_update on public.vacancies;
create policy vacancies_owner_update on public.vacancies
for update to authenticated
using (private.vacancy_room_owned_by(room_id, (select auth.uid())))
with check (private.vacancy_room_owned_by(room_id, (select auth.uid())));

drop policy if exists vacancies_owner_delete on public.vacancies;
create policy vacancies_owner_delete on public.vacancies
for delete to authenticated
using (private.vacancy_room_owned_by(room_id, (select auth.uid())));;
