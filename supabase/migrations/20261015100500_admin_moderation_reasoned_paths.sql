-- Release-candidate security hardening: route administrative listing
-- status mutations through reasoned, audited RPCs, while preserving actual
-- listing-owner UPDATE and ordinary non-admin ownership checks.
--
-- DO NOT apply to production without separate SQL release approval.
-- Audit observation (read-only, 2026-10-15): production has a permissive
-- vacancies_admin_update policy that lets an AAL2 admin update a third-party
-- listing directly without a moderation reason. The supported RPC
-- admin_set_vacancy_status(uuid,text,text) already performs a reasoned,
-- transactional moderation-log insert and remains unchanged.
--
-- The legacy admin_deactivate_vacancy(uuid) RPC has no reason argument.
-- Keep its existing callers functional, but audit the compatibility action
-- accurately as having no individual reason supplied rather than inventing
-- a human explanation.
do $gate$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='vacancies'
      and policyname='vacancies_admin_update' and cmd='UPDATE'
      and permissive='PERMISSIVE'
  ) then
    raise exception 'Expected baseline admin vacancy UPDATE policy not found; review the deployed schema before changing it';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='vacancies'
      and policyname='vacancies_owner_update' and cmd='UPDATE'
  ) then
    raise exception 'Listing-owner UPDATE policy missing; no safe admin hardening without reviewing owner edits';
  end if;
  if to_regprocedure('public.admin_set_vacancy_status(uuid,text,text)') is null
    or to_regprocedure('public.admin_deactivate_vacancy(uuid)') is null then
    raise exception 'Existing moderation RPC contract missing; do not apply blind migration';
  end if;
end
$gate$;

-- Only the broad *admin* direct-write path goes away; the owner policy,
-- restrictive active/permanent-account policies and admin read remain intact.
drop policy vacancies_admin_update on public.vacancies;

-- Backward compatibility for cached JS/admin clients still invoking the
-- legacy RPC: it now records the status in the same transaction as the
-- existing reasoned moderation log, with explicit no-reason provenance.
create or replace function public.admin_deactivate_vacancy(p_vacancy_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $legacy$
begin
  if not private.is_admin((select auth.uid())) then
    raise exception 'Verified admin required'
      using errcode='42501';
  end if;

  perform public.admin_set_vacancy_status(
    p_vacancy_id,
    'removed',
    'Legacy admin deactivation (individual reason not supplied)'
  );
end
$legacy$;

revoke all on function public.admin_deactivate_vacancy(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_deactivate_vacancy(uuid)
  to authenticated;

comment on function public.admin_deactivate_vacancy(uuid) is
  'Backward-compatible verified-admin deactivation; audits legacy absence of a user-supplied reason. New clients use admin_set_vacancy_status with an actual reason.';
