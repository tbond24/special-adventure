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

## Executed acceptance

**PASS** on source `96d3ddd`: [disposable run 38723570479](https://github.com/tbond24/special-adventure/actions/runs/38723570479), 243 integration milestones and 10 safety/statistics unit tests. All 75 migrations replayed; genuine Auth, actual log triggers, 18 meaningful direct mutation denials and both existing report RPC contracts passed. The retained admin/customer/photo/password-reset/expiry/measurement journeys passed. Sanitized evidence reports `completed=true`, `activityLogReports.completed=true` and `disposableStackRemoved=true`.

The first [run 38723205232](https://github.com/tbond24/special-adventure/actions/runs/38723205232), source `6e680c3`, replayed successfully but failed a test that expected an empty-object PATCH to be rejected. PostgREST treated it as a no-op. The corrected test uses nonempty valid changes against an existing synthetic row and compares the entire log fingerprint. No permission was broadened; cleanup succeeded on both runs.

GitHub artifact `11966769282`, `vacancy-disposable-integration`, records digest `sha256:b858fd40507cb5178511e3b137542a7529e35020ba51ba7e837457aaf72e93a1`. This is GitHub's artifact digest, not an independently recomputed ZIP hash. Evidence JSON and migration manifest were downloaded and inspected in ignored `work/evidence/activity-log-38723570479/`.

Normal fast-forward pushes preserved the original feature branch and draft PR #2. Restoring the missing migration brings source/live historical **names** to 69 shared names, with the six original candidate migrations source-only at this checkpoint. This resolves the evidenced clean-replay dependency gap; it does not establish byte-for-byte parity of all historical SQL or release readiness. Stage 3 adds its own separately reviewed candidate migration; see [display publication slice](./ADMIN_DISPLAY_DRAFT_SLICE_20261015.md). No production state changed.
