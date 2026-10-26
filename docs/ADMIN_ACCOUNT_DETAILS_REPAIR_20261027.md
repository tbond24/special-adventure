# Account Details permission repair — 27 October 2026, Perth

Status: LIVE — approved, applied and verified on 27 October 2026 (Perth).

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
- Now: the real authenticator-verified owner can open Details. Live reads confirmed the empty-account state and a populated account with two properties and two draft listing statuses. The complete hierarchy, missing-account response and denied-caller cases also pass in disposable PostgreSQL.

## Exact change and rollback

Migration: `supabase/migrations/20261026183324_admin_account_hierarchy_execute.sql`, generated with the repository's pinned Supabase CLI 2.121.0. Its baseline preconditions reject unexpected changes to the helper, public wrapper or Admin predicate before this single permission change:

```sql
grant execute on function private.admin_account_hierarchy_impl(uuid) to authenticated;
```

Rollback, restoring the captured helper ACL:

```sql
revoke execute on function private.admin_account_hierarchy_impl(uuid) from authenticated;
```

No frontend release is required. The existing frontend deployment remains `dpl_8RGCnJpqfBRUKBBjhkngDWS2WwfM`; rollback of this permission repair uses the REVOKE above, not a frontend deployment.

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

## Approval and live receipt

This changes a production database permission. The repository records a requirement for specific approval before production database changes (`docs/DECISIONS.md`, 2026-10-22 entry). The concrete candidate, rollback and regression are prepared before requesting that approval.

The owner approved the concrete candidate with “approve”. The baseline-guarded migration was applied successfully to production project `xtutkwiivqkgkqjpkxvj` through Supabase apply_migration. Hosted migration history records version **20261026184117**, name **admin_account_hierarchy_execute**. Its source is commit `a1a501b096fd0c6611cf86955078e93cb51f2574`, migration file `20261026183324_admin_account_hierarchy_execute.sql`. The hosted service generated a different timestamp; these are the same applied change, not two migrations to replay.

Post-application verification at approximately 18:44 UTC on 26 October / 02:44 Perth on 27 October:

- PASS: live catalogue shows only the intended helper EXECUTE grant changed. The public wrapper, helper and both authorization predicates retain identical definitions, owners, execution modes and search paths. Anonymous execution remains denied.
- PASS: no new security-advisor findings compared with the captured pre-change report. Pre-existing unrelated findings are not resolved by this repair.
- PASS: genuine signed-in owner session at `https://getvacancy.site/#admin`, People & listings → Details. Two accounts with no properties returned their existing empty state; one populated account displayed two properties and two draft listing statuses. The original permission error did not recur. Dialogs closed successfully and the account list remained usable.
- PASS: exact-source GitHub CI runs `40379592302` and `40379585895` (Account Details permission regression), and `40379585901` (Vacancy isolated workspace).

The live walkthrough was read-only; no customer account, listing or moderation state was changed. Non-admin/AAL1/suspended-user and rollback execution were verified in disposable PostgreSQL, not by impersonating production users or revoking the live repair. The full synthetic hierarchy test covers vacancy records; the populated live account checked here contained draft listings. No new frontend deployment, Auth setting, Admin membership, password or MFA change was needed.

Evidence: [live receipt](evidence/admin-account-details-20261027.json). Source and completion record remain in [draft PR #45](https://github.com/tbond24/special-adventure/pull/45), unmerged. This supersedes the earlier prepared/not-live status; it does not claim that unrelated drafts have been released.
