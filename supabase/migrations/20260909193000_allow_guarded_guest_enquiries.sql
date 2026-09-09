create or replace function private.is_permanent_user()
returns boolean language sql stable security invoker set search_path='' as $$
  select (select auth.uid()) is not null
    and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false) is false
$$;
revoke all on function private.is_permanent_user() from public,anon;
grant execute on function private.is_permanent_user() to authenticated,service_role;

do $$
declare t text;
begin
  foreach t in array array['properties','rooms','vacancies','media','saved_vacancies','reports','blocks','property_private_locations'] loop
    execute format('drop policy if exists permanent_user_insert_required on public.%I',t);
    execute format('drop policy if exists permanent_user_update_required on public.%I',t);
    execute format('drop policy if exists permanent_user_delete_required on public.%I',t);
    execute format('create policy permanent_user_insert_required on public.%I as restrictive for insert to authenticated with check (private.is_permanent_user())',t);
    execute format('create policy permanent_user_update_required on public.%I as restrictive for update to authenticated using (private.is_permanent_user()) with check (private.is_permanent_user())',t);
    execute format('create policy permanent_user_delete_required on public.%I as restrictive for delete to authenticated using (private.is_permanent_user())',t);
  end loop;
end $$;

drop policy if exists permanent_user_profile_update_required on public.profiles;
create policy permanent_user_profile_update_required on public.profiles as restrictive for update to authenticated
using (private.is_permanent_user()) with check (private.is_permanent_user());

create or replace function private.guard_guest_message_rate()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)
     and (select count(*) from public.messages where sender_id=(select auth.uid()) and created_at>now()-interval '1 hour') >= 10 then
    raise exception 'Guest message limit reached. Please try again later or sign in.';
  end if;
  return new;
end $$;
revoke all on function private.guard_guest_message_rate() from public,anon,authenticated;

drop trigger if exists guard_guest_message_rate on public.messages;
create trigger guard_guest_message_rate before insert on public.messages
for each row execute function private.guard_guest_message_rate();

comment on function private.is_permanent_user() is 'Separates registered identities from temporary anonymous Auth users for account-only mutations.';
comment on function private.guard_guest_message_rate() is 'Limits anonymous Auth users to ten messages per rolling hour.';
