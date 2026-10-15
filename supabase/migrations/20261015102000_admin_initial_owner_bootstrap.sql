-- Candidate-only, unapplied to production.
-- A first Owner cannot use admin_set_access_role: no Owner exists yet.
-- This one-time privileged bootstrap has explicit release-approval provenance,
-- no hard-coded account/email, and no falsified self-grant audit actor.
-- Creating this helper never changes any person's role by itself.

-- Only an initial privileged bootstrap has no human *database actor*.
-- All normal admin mutations continue requiring the actual signed-in actor.
alter table public.admin_change_audit alter column actor_id drop not null;
alter table public.admin_change_audit
  add constraint admin_change_audit_bootstrap_actor_contract check (
    (actor_id is not null and action <> 'access_roles_bootstrapped')
    or
    (actor_id is null
      and action='access_roles_bootstrapped'
      and target_kind='admin_access_role'
      and diff->>'source'='privileged_sql_release')
  );

-- Neither caller retries nor concurrent migrations may create a second
-- initial-owner audit entry. History remains immutable.
create unique index admin_change_audit_single_bootstrap
  on public.admin_change_audit ((true))
  where action='access_roles_bootstrapped';

-- A SECURITY INVOKER helper, intentionally in unexposed private schema.
-- PostgREST cannot call it. A database administrator must separately invoke
-- the helper with a privately verified existing admin email *after* specific
-- approval to apply the production migrations and assign the first Owner.
create function private.bootstrap_first_admin_owner(
  p_owner_email text,
  p_approval_reference text
)
returns jsonb
language plpgsql volatile security invoker
set search_path=''
as $bootstrap$
declare
  v_owner_id uuid;
  v_matches integer;
  v_ref text := trim(coalesce(p_approval_reference,''));
begin
  -- Do not allow authenticated users, API service roles, an inherited role
  -- or an active JWT session to use a privileged one-time grant.
  if current_user not in ('postgres','supabase_admin')
    or session_user not in ('postgres','supabase_admin')
    or (select auth.uid()) is not null
  then
    raise exception 'Privileged SQL release operator required'
      using errcode='42501';
  end if;

  if p_owner_email is null
    or length(trim(p_owner_email)) not between 5 and 254
    or length(v_ref) not between 12 and 96
    or v_ref !~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$'
  then
    raise exception 'Private Owner email and a traceable release approval reference are required'
      using errcode='22023';
  end if;

  -- Same lock as role changes and last-Owner suspension checks.
  perform pg_advisory_xact_lock(2026101401::bigint);

  if exists(select 1 from public.admin_access_roles)
    or exists(select 1 from public.admin_change_audit
              where action='access_roles_bootstrapped')
  then
    raise exception 'First-Owner bootstrap may run only before any role assignment'
      using errcode='42501';
  end if;

  select count(*),min(u.id)
    into v_matches,v_owner_id
  from auth.users u
  join public.admin_users a on a.user_id=u.id
  join public.profiles p on p.id=u.id
  where lower(u.email)=lower(trim(p_owner_email))
    and p.account_status='active'
    and u.email_confirmed_at is not null
    and u.deleted_at is null
    and coalesce(u.is_anonymous,false)=false
    and (u.banned_until is null or u.banned_until<=now());

  if v_matches <> 1 or v_owner_id is null then
    raise exception 'The named Owner must uniquely match an active, confirmed existing admin account'
      using errcode='42501';
  end if;

  insert into public.admin_access_roles(
    user_id,role,granted_by,grant_reason
  ) values (
    v_owner_id,'owner',null,'One-time privileged bootstrap, approval '||v_ref
  );

  insert into public.admin_change_audit(
    actor_id,action,target_kind,target_key,reason,request_id,diff
  ) values (
    null,'access_roles_bootstrapped','admin_access_role',
    v_owner_id::text,
    'One-time database role bootstrap approved under '||v_ref,
    gen_random_uuid(),
    jsonb_build_object(
      'before_role',null,'after_role','owner',
      'source','privileged_sql_release',
      'approval_reference',v_ref,
      'executed_by_db_role',current_user::text,
      'granted_by_human',false
    )
  );

  return jsonb_build_object('owner_assigned',true,
                            'operator_assigned',false,
                            'audit_recorded',true);
end
$bootstrap$;

revoke all on function private.bootstrap_first_admin_owner(text,text)
from public,anon,authenticated;

comment on function private.bootstrap_first_admin_owner(text,text) is
  'Privileged SQL-only, approval-tracked single-use initial Owner assignment. Not a website or client RPC; no hard-coded identity.';
