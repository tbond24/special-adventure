-- Protect the last active Owner from suspension through existing profile
-- mutation paths, including legacy moderation. Additive, narrow status guard.
-- This does not change other profile fields or customer status transitions.
create function private.protect_last_admin_owner_status()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_active_owners integer;
begin
  if old.account_status = 'active'
    and new.account_status is distinct from 'active'
    and exists (
      select 1 from public.admin_access_roles
      where user_id = old.id and role = 'owner'
    )
  then
    -- Serialize with admin_set_access_role, which uses the same lock.
    perform pg_advisory_xact_lock(2026101401::bigint);
    select count(*) into v_active_owners
    from public.admin_access_roles a
    join public.profiles p on p.id=a.user_id
    where a.role='owner' and p.account_status='active';
    if v_active_owners <= 1 then
      raise exception 'Cannot suspend the last active administrator Owner'
        using errcode='42501';
    end if;
  end if;
  return new;
end
$$;

create trigger admin_owner_prevent_last_suspension
before update of account_status on public.profiles
for each row
execute function private.protect_last_admin_owner_status();

revoke all on function private.protect_last_admin_owner_status()
from public, anon, authenticated;
