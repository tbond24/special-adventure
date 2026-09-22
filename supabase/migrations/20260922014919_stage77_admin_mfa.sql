-- Stage 77: every admin data path requires an AAL2 session. The existing
-- admin_users_self_read policy intentionally remains available at AAL1 so an
-- operator can discover that setup/challenge is required without seeing any
-- other operator or admin data.
create or replace function private.is_admin(p_user uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select
    p_user is not null
    and coalesce((select auth.jwt()->>'aal'),'aal1') = 'aal2'
    and exists(select 1 from public.admin_users where user_id=p_user);
$$;

revoke all on function private.is_admin(uuid) from public, anon;
grant execute on function private.is_admin(uuid) to authenticated;
