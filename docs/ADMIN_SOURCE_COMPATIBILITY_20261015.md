# Production/source compatibility — six-migration admin pilot
15 October 2026. Starting source: 4bf44b6116a5beb3cbdb6f87b5d6ffd40310bbd5. Production remains unchanged; release HOLD.

This continuation reads catalog metadata and recorded migration SQL only. It does not read customer rows or private account identities. Owner selection and the 12-month new change-audit retention target were already recorded in the handoff; neither authorizes a live role grant or purge job.

## Concrete source gap and development correction
Production records migration 20260930180151, listing_activity_log. The branch had no corresponding file, table creation or trigger attachment. Its later repair function existed, so prior successful source replay did not prove the activity table/triggers were present.

Recovered the exact recorded DDL into supabase/migrations/20260930180151_listing_activity_log.sql. This is restoration of already-recorded history, not a newly invented migration or a seventh production change. Its later existing repair migration still replaces the original trigger function before synthetic data is inserted. No production migration was applied or history repaired.

Changed test contracts: tests/full-stack/catalog.sql records metadata only; source-parity.mjs requires the recovered RLS table and enabled properties/rooms/vacancies triggers, checks attributed real status transitions, and calls both reporting RPCs plus the visible Marketing report. run-recovery.mjs inserts those checks without modifying the pinned original runner or its hash guard. No app, Auth provider, customer or public appearance change is included.

Acceptance: fresh replay of all 75 files, source/live metadata comparison, real activity trigger/report checks, existing 239-milestone customer/Auth/recovery/editor/rollback suite and cleanup. Status at preparation: PENDING new CI evidence. Existing passing results remain historical and are not relabelled for changed code.

Recovery: revert only this development recovery/test commit after checking later work. Do not drop the live activity table or edit production migration history.

## Catalog compatibility matrix

| Ordered candidate migration | Observed live prerequisite | Finding |
| --- | --- | --- |
| 20261014185000_admin_roles_audit_foundation.sql | profiles.id UUID PK, profiles.account_status text NOT NULL with active/suspended check; admin_users.user_id UUID PK/FK to profiles; private.is_admin and is_active_user definitions/security match source | New role/audit objects absent and additive. Existing helpers must be preserved. No Owner is automatically assigned. |
| 20261014201000_protect_last_admin_owner.sql | account_status exists; no user-defined profiles/admin_users trigger collision observed | Additive status trigger after role foundation. Must retain existing profile column grants and self-update policies. |
| 20261014211500_admin_appearance_editor.sql | Role/audit functions supplied by migration 1; new current/draft/revision objects and editor RPC names absent | Additive slice. Direct client table grants remain revoked; public endpoint returns only published allowlisted config. |
| 20261015001130_admin_appearance_conflicts_http409.sql | Save/publish signatures supplied by migration 3 | Ordered replacement essential for non-retryable application HTTP409 conflicts. Never install original editor functions without this correction. |
| 20261015100500_admin_moderation_reasoned_paths.sql | Both named vacancy UPDATE policies exist; existing legacy and reasoned RPCs exist; reasoned RPC is SECURITY DEFINER with empty search_path | Deliberate policy/function divergence: remove only permissive third-party admin UPDATE; retain owner UPDATE/restrictive account policies and reasoned RPC. Cached legacy calls gain truthful compatibility auditing. |
| 20261015102000_admin_initial_owner_bootstrap.sql | New audit/role tables supplied by migration 1; private helper name absent; existing membership/profile/Auth references present | Additive helper plus narrowly constrained null bootstrap actor. Preparing helper grants nobody. Separate privileged, explicit bootstrap approval required; Operator grant deferred until verified normal Auth/MFA. |

All five new tables and known helper/RPC names were absent in the read-only live catalog. All 28 existing public relations have RLS enabled. The two active-account/MFA helper definitions match source exactly. Of 92 existing public/private function bodies, 85 match exact normalized-line-ending hashes; the seven remaining differences reconcile by SQL token comparison preserving quoted literals, including the documented optional-availability guard transformation and TABLE output arguments. No security-definer or volatility differences were found in those baseline definitions. This is not a blanket certification of every table policy/column grant; the complete post-recovery metadata comparison remains pending.

Production migration history has 69 entries versus the handoff's 74 source files: 68 shared names, 28 historical timestamp differences, six candidate-only files and the missing live activity migration. Restoring that one historical file yields 75 source files and 69 shared names. Name/version alignment is not a content hash assertion. Never blanket db push or --include-all the historical source set into production.

## Ordered release prerequisites
1. Freeze the final reviewed feature SHA and passing complete source-schema evidence. Reconfirm live catalog, branch and alias immediately before any approved action.
2. Review only the six candidate migrations in the listed order. The recovered activity migration is already live. Preserve active-account/AAL2 helpers, owner edits, cached-client compatibility and append-only histories.
3. Identify and verify an approved backup/recovery checkpoint and privileged executor before live DDL. No backup/restore action or data download was authorized or performed here.
4. Obtain separate production SQL approval. Apply only that reviewed bundle in a controlled window; no role is granted by DDL alone.
5. Obtain separate first-Owner bootstrap approval with a real traceable reference; privately re-resolve the selected existing account. Do not publish identities or grant the unconfirmed/unregistered intended Operator.
6. Treat secure-password-reset Edge deployment, frontend release and project/domain-specific recovery as separate approvals. A lab provider rehearsal and source compatibility do not prove the real project's rollback was executed.
7. Verify the correct production domain, read-only public style response, protected denials and old cached paths after separately approved release. Restore styles by a new audited revision; do not delete additive data.

Remaining independent work: Stage 3 appearance integration and Stage 4 analytics remain unfinished. Native zoom, external inbox delivery and representative hosted candidate performance/cost remain distinct gates. The approved 12-month audit target still needs its legal/privacy/holds review and grants no deletion authority.
