-- Stage 1 (development only): additive authorization and audit foundation.
-- NO bootstrap owner assignment, production execution, or changes to existing admin functions.
-- Roles govern NEW admin editor endpoints; existing administrative operations remain untouched.

create table public.admin_access_roles (
  user_id uuid primary key references public.admin_users(user_id) on delete restrict,
  role text not null check (role in ('owner', 'operator')),
  granted_at timestamptz not null default now(),
  granted_by uuid,
  grant_reason text not null check (char_length(trim(grant_reason)) between 3 and 500)
);
alter table public.admin_access_roles enable row level security;
revoke all on public.admin_access_roles from public, anon, authenticated;

create table public.admin_change_audit (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid not null,
  action text not null check (char_length(action) between 3 and 80),
  target_kind text not null check (char_length(target_kind) between 3 and 80),
  target_key text not null check (char_length(target_key) between 1 and 200),
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  previous_version bigint,
  new_version bigint,
  request_id uuid not null,
  diff jsonb not null default '{}'::jsonb check (jsonb_typeof(diff) = 'object'),
  unique (actor_id, request_id)
);
create index admin_change_audit_recent_idx on public.admin_change_audit (occurred_at desc, id desc);
alter table public.admin_change_audit enable row level security;
revoke all on public.admin_change_audit from public, anon, authenticated;

-- This table is intentionally immutable even to accidental privileged updates;
-- retention and archival require a separately reviewed migration.
create function private.reject_admin_audit_rewrite()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Admin audit history is append-only' using errcode = '42501';
end
$$;
create trigger admin_change_audit_no_rewrite
before update or delete on public.admin_change_audit
for each row execute function private.reject_admin_audit_rewrite();
create trigger admin_change_audit_no_truncate
before truncate on public.admin_change_audit
for each statement execute function private.reject_admin_audit_rewrite();
revoke all on function private.reject_admin_audit_rewrite() from public, anon, authenticated;

-- Fixed capabilities, not a user-definable permission designer.
-- Owners: all 5. Operators: read analytics, moderate, and save appearance drafts.
-- Owner-only: publish/restore and access management.
create function private.admin_can(p_capability text)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    private.is_admin((select auth.uid()))
    and exists (
      select 1
      from public.admin_access_roles r
      where r.user_id = (select auth.uid())
      and (
        (r.role = 'owner' and p_capability in (
          'analytics_read', 'moderate', 'appearance_draft',
          'appearance_publish', 'access_manage'
        ))
        or
        (r.role = 'operator' and p_capability in (
          'analytics_read', 'moderate', 'appearance_draft'
        ))
      )
    )
$$;
revoke all on function private.admin_can(text) from public, anon;
grant execute on function private.admin_can(text) to authenticated;

create function public.admin_my_capabilities()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_role text;
begin
  if not private.is_admin((select auth.uid())) then
    raise exception 'MFA-verified active administrator required' using errcode = '42501';
  end if;
  select role into v_role
  from public.admin_access_roles where user_id = (select auth.uid());
  return jsonb_build_object(
    'role', coalesce(v_role, 'unassigned'),
    'analytics_read', private.admin_can('analytics_read'),
    'moderate', private.admin_can('moderate'),
    'appearance_draft', private.admin_can('appearance_draft'),
    'appearance_publish', private.admin_can('appearance_publish'),
    'access_manage', private.admin_can('access_manage')
  );
end
$$;

-- Only owners may inspect assigned admin roles.
create function public.admin_access_roles_read()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.admin_can('access_manage') then
    raise exception 'Owner verification required' using errcode = '42501';
  end if;
  return coalesce(
    (select jsonb_agg(jsonb_build_object(
      'user_id', r.user_id, 'role', r.role,
      'granted_at', r.granted_at
    ) order by r.user_id)
    from public.admin_access_roles r),
    '[]'::jsonb
  );
end
$$;

-- Owner-only, transactional, idempotent access changes.
-- Initial owner is explicitly designated outside this function by an authorized
-- privileged bootstrap step AFTER the isolated checks; never auto-assign by email.
create function public.admin_set_access_role(
  p_target_user_id uuid, p_role text, p_reason text, p_request_id uuid
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_before text;
  v_seen_target text;
  v_seen_role text;
  v_active_owners integer;
begin
  if not private.admin_can('access_manage') then
    raise exception 'Owner verification required' using errcode = '42501';
  end if;
  if p_target_user_id is null or p_request_id is null then
    raise exception 'Target and request ID are required' using errcode = '22023';
  end if;
  if p_target_user_id = v_actor then
    raise exception 'Cannot change your own access role' using errcode = '42501';
  end if;
  if p_role is not null and p_role not in ('owner', 'operator') then
    raise exception 'Unsupported access role' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) not between 3 and 500 then
    raise exception 'A reason of 3 to 500 characters is required' using errcode = '22023';
  end if;

  -- Serialize role changes so two requests cannot remove the last active owner.
  perform pg_advisory_xact_lock(2026101401::bigint);

  select a.target_key, a.diff->>'after_role'
    into v_seen_target, v_seen_role
  from public.admin_change_audit a
  where a.actor_id = v_actor and a.request_id = p_request_id;
  if found then
    if v_seen_target <> p_target_user_id::text
      or v_seen_role is distinct from p_role then
      raise exception 'Request ID already used for a different change' using errcode = '23505';
    end if;
    return jsonb_build_object('changed', true, 'already_applied', true, 'role', p_role);
  end if;

  select role into v_before
  from public.admin_access_roles where user_id = p_target_user_id for update;
  if v_before is not distinct from p_role then
    return jsonb_build_object('changed', false, 'role', p_role);
  end if;
  if p_role is not null and not exists (
    select 1 from public.admin_users a
    join public.profiles p on p.id = a.user_id
    where a.user_id = p_target_user_id and p.account_status = 'active'
  ) then
    raise exception 'Target must be an active existing admin member' using errcode = '42501';
  end if;
  if v_before = 'owner' and p_role is distinct from 'owner' then
    select count(*) into v_active_owners
    from public.admin_access_roles a
    join public.profiles p on p.id = a.user_id
    where a.role = 'owner' and p.account_status = 'active';
    if v_active_owners <= 1 then
      raise exception 'Cannot remove the last active owner' using errcode = '42501';
    end if;
  end if;

  if p_role is null then
    delete from public.admin_access_roles where user_id = p_target_user_id;
  else
    insert into public.admin_access_roles(user_id, role, granted_by, grant_reason)
    values (p_target_user_id, p_role, v_actor, trim(p_reason))
    on conflict (user_id) do update set
      role = excluded.role, granted_at = now(),
      granted_by = excluded.granted_by, grant_reason = excluded.grant_reason;
  end if;

  insert into public.admin_change_audit(
    actor_id, action, target_kind, target_key, reason, request_id, diff
  ) values (
    v_actor, 'access_role_changed', 'admin_access_role',
    p_target_user_id::text, trim(p_reason), p_request_id,
    jsonb_build_object('before_role', v_before, 'after_role', p_role)
  );
  return jsonb_build_object('changed', true, 'role', p_role);
end
$$;

-- New audit entries are read only through a protected, bounded RPC.
create function public.admin_change_audit_recent(p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.admin_can('analytics_read') then
    raise exception 'Admin verification required' using errcode = '42501';
  end if;
  return coalesce(
    (select jsonb_agg(to_jsonb(t) order by t.id desc) from (
      select id, occurred_at, actor_id, action, target_kind, target_key,
             reason, previous_version, new_version, request_id, diff
      from public.admin_change_audit
      order by id desc limit least(greatest(coalesce(p_limit, 50), 1), 100)
    ) t),
    '[]'::jsonb
  );
end
$$;

revoke all on function public.admin_my_capabilities() from public, anon;
revoke all on function public.admin_access_roles_read() from public, anon;
revoke all on function public.admin_set_access_role(uuid,text,text,uuid) from public, anon;
revoke all on function public.admin_change_audit_recent(integer) from public, anon;
grant execute on function public.admin_my_capabilities() to authenticated;
grant execute on function public.admin_access_roles_read() to authenticated;
grant execute on function public.admin_set_access_role(uuid,text,text,uuid) to authenticated;
grant execute on function public.admin_change_audit_recent(integer) to authenticated;

comment on table public.admin_access_roles is
  'Fixed Owner/Operator assignments; initially empty until a separately approved bootstrap.';
comment on table public.admin_change_audit is
  'Append-only audit for new admin access and appearance changes; no customer content or tokens.';
