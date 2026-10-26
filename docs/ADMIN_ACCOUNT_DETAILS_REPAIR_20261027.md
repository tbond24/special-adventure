# Account Details permission repair — 27 October 2026, Perth

Status: prepared and tested locally; NOT applied to production.

## Issue and cause

The signed-in, authenticator-verified Admin walkthrough found that People & listings → Details fails with `permission denied for function admin_account_hierarchy_impl`.

Production catalogue inspection confirms that the public `admin_account_hierarchy(uuid)` entry point is SECURITY INVOKER and executable by authenticated users. Its private implementation is SECURITY DEFINER, owner-executable only, and begins by enforcing `private.is_admin(auth.uid())`. That predicate requires an active account, membership in `admin_users` and an AAL2 authenticator-verified session. The caller cannot reach those checks because execute permission on the helper is missing.

## Options discussed and choice

| Approach | Decision and reason |
| --- | --- |
| Grant authenticated execution on this one existing guarded helper | Chosen: correct the missing permission while preserving both function bodies, execution modes, data scope and the existing Admin/MFA predicate. Function execution permission is not permission to pass its internal authorization check. |
| Elevate the public wrapper to SECURITY DEFINER | Not chosen: would change the public entry point's privilege boundary unnecessarily. |

The helper stays in the private schema; the patch does not expose that schema through the API, grant table access, add Admin members, change passwords or change MFA.

## Before and after

- Before: the public read call fails before the helper's authorization check, so the Details dialog cannot open.
- Expected after application: an active Admin with AAL2 can inspect the existing profile → properties → units → vacancy status hierarchy. Other callers remain denied. Missing accounts retain the existing `account not found` result.

## Exact change and rollback

Migration: `supabase/migrations/20261026183324_admin_account_hierarchy_execute.sql`, generated with the repository's pinned Supabase CLI 2.121.0. Its baseline preconditions reject unexpected changes to the helper, public wrapper or Admin predicate before this single permission change:

```sql
grant execute on function private.admin_account_hierarchy_impl(uuid) to authenticated;
```

Rollback, restoring the captured helper ACL:

```sql
revoke execute on function private.admin_account_hierarchy_impl(uuid) from authenticated;
```

No frontend release is required. Current frontend rollback reference remains `dpl_8RGCnJpqfBRUKBBjhkngDWS2WwfM`.

## Validation

PASS in disposable PGlite PostgreSQL 0.5.12, using the captured production function definitions and role permissions with synthetic records:

- Original authenticated Admin/AAL2 call reproduces the exact permission error.
- The candidate returns the complete profile/property/unit/vacancy hierarchy.
- Missing account returns its original error object.
- AAL1 Admin, non-admin AAL2, suspended Admin and absent user remain denied, through both entry points.
- Anonymous execution remains denied; authenticated callers gain no direct profile-table access.
- All four captured function bodies, execution modes and search paths remain unchanged.
- Revoke rollback reproduces the original failure.

Run: `node tests/admin-account-hierarchy-sql.check.mjs` with `VACANCY_PGLITE_MODULE` set to the installed PGlite module. A scoped read-only CI workflow runs this same test without hosted credentials.

Security/performance advisors and recent logs were inspected read-only. The log filter returned no matching event; the diagnosis is supported by the observed browser error and the live function ACLs, not a claimed log match. Unrelated advisory findings are outside this repair.

## Publication gate

This changes a production database permission. The repository records a requirement for specific approval before production database changes (`docs/DECISIONS.md`, 2026-10-22 entry). The concrete candidate, rollback and regression are prepared before requesting that approval.

After approval: recheck the captured baseline, apply only this migration, verify ACLs and unchanged guards, repeat the Details read in the real verified owner session, and record the actual live outcome. Do not label the repair live until those checks pass.
