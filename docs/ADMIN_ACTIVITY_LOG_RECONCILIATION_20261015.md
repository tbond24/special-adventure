# Activity-log source recovery and report acceptance

15 October 2026 (Australia/Perth). **Development only. Production release HOLD.** Starting local checkpoint `e9050cb`; remote continuation remains `0433d20`. Previous runtime and compatibility work is preserved.

## Need and boundary — recorded before implementation

The live catalog has `20260930180151_listing_activity_log`, its table, RLS, index and three triggers. The source has its subsequent function repair and report consumers, but lacks the original creation migration. A clean replay can therefore omit the log and fail when the dependent reports execute. Historical 239-milestone acceptance did not explicitly exercise those dependencies.

Read-only inspection retrieved the one historical **schema-only** migration statement. It contains table/index/RLS/function/trigger definitions and an INSERT inside the logging trigger; no account literal, customer record, backfill or bootstrap. Restore that historical source file under its actual recorded version/name, retaining its original definition. Its known old trigger issue remains repaired by the already-present `20261001062018_repair_listing_activity_trigger.sql` later in replay. Do not edit that repair or pretend the historical definition was already corrected.

This restores missing source; it does not add a forward production migration, amend the live receipt, change production schema or replay historical migrations on production. The six prepared release migrations remain unchanged. Historical acceptance counts remain historical.

Proposed files/contracts:

- `supabase/migrations/20260930180151_listing_activity_log.sql`: recovered original source, provenance comment and trailing-newline normalization only.
- `docs/evidence/activity-log-source-recovery-20261015.json`: schema-text provenance, stored statement fingerprint, recovered file fingerprint and read-only push preflight; no log/account rows.
- `tests/full-stack/activity-log-reports.mjs` and its safety unit test: assert table/RLS/three triggers, corrected trigger behavior for all three entity types, timestamp-only no-op, transactional rollback, real REST read/write boundaries and both dependent report RPCs through genuine disposable Auth sessions. Explicit exact loopback/disposable/Linux opt-in.
- `tests/full-stack/run-recovery.mjs`: insert this acceptance into the existing reviewed wrapper. Preserve the pinned original runner/hash and existing Auth/customer/recovery tests, preparation filter and cleanup.

Acceptance: source syntax/lineage and provenance verified; local environment-denial tests; complete 75-migration disposable replay plus the existing integration and new real log/report assertions in the reviewed GitHub workflow; no isolated-stack residue. Record failures and correct evidenced causes before claiming PASS. A source hash or passing test with replacement backend data is not report integration proof.

Recovery: revert only this development slice after checking later changes. Do not remove any live log, audit, trigger, migration receipt or customer row. No production SQL rollback is involved.

## Connections and push boundary

Current Vercel `vacancy` project metadata has no Git link; the team repository-ID query returned no linked projects. The repository workflows were reviewed: none automatically runs this continuation branch, and the disposable workflow has a manual dispatch. PR #2 remains draft against `feature/admin-desktop-editor-20261014`. A normal fast-forward push to **only** `codex/vacancy-admin-continuation-20261015` and explicit dispatch of the existing disposable test workflow are within the recorded development/testing approval; no merge, release, auto-merge or deployment.

GitHub CLI works through normal stored authentication with approved network access. The first sandboxed status incorrectly reported invalid authentication because it could not reach GitHub; an unrestricted read verified the existing account. No token was retrieved. Pinned Supabase CLI 2.121.0 was downloaded into ignored `work/tools` and checked against its release checksum. Its initial sandboxed help failed while writing CLI telemetry metadata; version/help succeeded with normal approved execution. No hosted project is linked to the CLI.

Supabase migration and RLS guidance was checked. New migration files for later Stage 3 development will use the pinned CLI generator. This historical recovery uses the actual existing migration version/name, not an invented timestamp or migration-history repair command.

Status and evidence will be appended after execution. Stage 3 display publication remains the next product slice after this dependency acceptance.
