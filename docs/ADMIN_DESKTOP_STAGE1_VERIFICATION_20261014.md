# Vacancy desktop admin — Stage 1 isolated verification

**Date:** 2026-10-14  
**Source branch:** `feature/admin-desktop-editor-20261014`  
**Target:** **only** Supabase `vacancy-admin-test` (`raauicmfyjpcuhfzknak`)  
**Production:** `vacancy` (`xtutkwiivqkgkqjpkxvj`) — no writes, migrations, or deployment.

## Isolation and fixture provenance

- The user's explicit approval covered temporarily pausing `charity-student-fund-beta` to free the second free-tier slot and restoring the **existing** Vacancy admin test project. Both actions were accepted.
- The restored test database became `ACTIVE_HEALTHY` with a **partial synthetic schema**: six public tables, including `admin_users`, `analytics_events`, and listing-related fixtures. Previously reported zero tables was a **transient startup result** and must not be used as evidence of an empty healthy database.
- Existing test project migration history contains `synthetic_admin_report_verification`, `synthetic_connected_dependencies`, `connected_admin_journeys`, `connected_journey_grouped_facts`, `connected_journey_plan_guard`, and `synthetic_admin_membership_browser_policy`.
- It has no full `profiles` table and its former `private.is_admin` helper did not check active-profile status. Applied **test-only** contract parity fixture `tests/sql/admin_desktop_restored_snapshot_contract.sql`; this creates minimal `profiles` and `private.is_active_user` for SQL authorization checks and aligns test `private.is_admin` with the observed production helper. Do **not** apply the test fixture to production.
- Synthetic role-test records use reserved test UUIDs. No customer records were copied or modified.
- A temporary empty-database bootstrap was authored but **deleted from the source branch before any application** after the restored schema appeared.

## Applied test-only migrations

1. Test contract parity fixture (`test_only_restored_admin_contract`) — **SQL applied successfully**.
2. `supabase/migrations/20261014185000_admin_roles_audit_foundation.sql` (`admin_roles_audit_foundation`) — **SQL applied successfully**.
3. `supabase/migrations/20261014201000_protect_last_admin_owner.sql` (`protect_last_admin_owner`) — **SQL applied successfully**.

Production migration state is untouched. There is **no real Owner assigned on production**, and no editor publication endpoint is implemented yet.

## Test matrix

| Check | Outcome | Evidence class |
|---|---|---|
| Owner AAL2 capability read/publish | PASS | DB session with simulated JWT claims and `authenticated` role |
| Operator AAL2 can read, not publish | PASS | DB simulated claims/role |
| No JWT, Owner AAL1, ordinary user, suspended admin denied | PASS | DB simulated claims/role |
| Anonymous invoking private capability helper | PASS — permission denied | DB anonymous role |
| Direct authenticated role-table SELECT/INSERT, audit UPDATE; anon audit SELECT; anon access-RPC EXECUTE | PASS — grants absent | Live test DB catalog |
| Owner role change, idempotent retry, exactly one audit entry | PASS | Single transaction, rolled back |
| Operator changing access roles | PASS — denied 42501 | DB simulated claims/role |
| Owner self-change | PASS — denied 42501 | DB simulated claims/role |
| Invalid target role / short reason | PASS — denied 22023 | DB simulated claims/role |
| Owner AAL1 changing roles directly | UNVERIFIED — security filter blocked execution; separate AAL1 capability denial passed | No genuine hosted test |
| Last active Owner suspension | PASS — denied 42501 | Isolated profile trigger test, rolled back |
| Ordinary-profile suspension while unrelated to Owner | PASS — allowed | Isolated transaction, rolled back |
| Owner suspension when another active Owner exists | PASS — allowed | Isolated transaction, rolled back |
| Admin audit UPDATE and DELETE | PASS — rejected even via elevated test SQL; record preserved during transaction | Isolated synthetic audit row, rolled back |
| Forced audit insert failure rolls back role change | PASS — unchanged role, zero audit entries | Temporary rejecting trigger within rolled-back SQL transaction |
| Clean post-test role and audit counts | PASS — three synthetic role assignments, zero audit rows | Test DB read |
| Browser/UI, genuine Auth/MFA, direct REST denial, real frontend, tenant flows, p95 and SQL/schema parity | **UNVERIFIED** | Requires an authorized full isolated environment and browser tests |

**Important:** The test environment is a partial synthetic snapshot, not the complete production application. DB claim simulations are **not** genuine Supabase Auth sessions. The SQL migration compiles and the tested contracts behave correctly in isolation; do not mark the desktop editor or complete authentication security as launched.

## Remaining work and recovery

- Stage 1 remaining: genuine hosted Auth/MFA, grant/RLS direct REST tests, owner/operator mapping from explicitly authorized parties, integration with existing moderation paths, no last-owner-loss by all supported account actions, and full schema regression.
- Stage 2 remains: code registry, real public selection-only page preview, bounded appearance controls, private drafts, conflict-safe transactional publish/revert, history, public resolver and tests.
- Stage 3: existing icon/display/favicon save paths migrated into consistent history/audit/publish.
- Stage 4: measurement validation and bounded truthful analytics.
- Stage 5–6: full browser/performance/recovery verification and explicit production release approvals.
- Do **not** touch the two production projects or copy real user data for test fixtures.
- Charity Student Fund Beta was **temporarily paused** to run these tests. At the end of the testing window, pause the Vacancy admin test project then restore Charity Student Fund Beta, and verify its eventual `ACTIVE_HEALTHY` state. Existing test migrations and synthetic fixtures remain stored while paused.

## Temporary free-tier slot swap — completed

- Supabase accepted pause of Charity Student Fund Beta (`sdhfefhaasvttvykgxbe`).
- The existing Vacancy Admin Test (`raauicmfyjpcuhfzknak`) was restored and reached `ACTIVE_HEALTHY`, used for the limited synthetic SQL tests, then paused again and confirmed `INACTIVE`.
- Supabase accepted the Charity Student Fund Beta restore. Follow-up read confirmed `ACTIVE_HEALTHY`.
- Read-only follow-up confirmed Vacancy production (`xtutkwiivqkgkqjpkxvj`) remains `ACTIVE_HEALTHY`.
- GitHub diff against deployed baseline includes only Stage 0/1 documentation, two additive SQL migrations and one test-only fixture script; no `app/` changes or Vercel deployment. The role/audit migrations were **not** applied to production.
- The temporary isolated test project's schema/test fixtures remain stored while paused; to test later, the user must authorize another capacity swap or increase project capacity.
