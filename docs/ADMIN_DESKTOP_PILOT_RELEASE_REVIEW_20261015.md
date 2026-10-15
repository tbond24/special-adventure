# Vacancy desktop admin — pilot release-review packet

**Date:** 2026-10-15. **Release status: HOLD.** This packet covers the first verified editor slice, *Listing detail → Save listing*, not the entire admin screenshot or proposed Stage 3/4 expansion.

## Source and environment

- Live Vercel: project `prj_znush7fSZP7lxpaUCOviftpmUzG3`, production deployment `dpl_558VydjBz3tjnsNok5wgGQsoKZRz`, domain `getvacancy.site`, source SHA `1a03a32592892a05ee0bdebbc33b75e409d7392e`; **no feature-branch production deployment**.
- Live Supabase `xtutkwiivqkgkqjpkxvj` and Charity Student Fund Beta `sdhfefhaasvttvykgxbe`: last read-only status ACTIVE_HEALTHY; admin test `raauicmfyjpcuhfzknak` remains INACTIVE.
- Candidate source is `feature/admin-desktop-editor-20261014`; recheck exact HEAD, diff and associated passing tests at release decision. No Owner was assigned on production. Production has two `admin_users` memberships, but no fixed Owner/Operator role table.
- Do not copy customer data, assume the default GitHub `main` equals the production SHA, resume the paused test project without new approval, or apply production changes without separate explicit release permission.

## Live/source schema compatibility facts — read-only evidence

Verified live contracts present: `public.profiles(id,account_status)`, `public.admin_users(user_id,created_at)`, `public.admin_moderation_log(admin_id,action,target_type,target_id,reason,created_at)`, `private.is_admin(uuid)`, `private.is_active_user(uuid)`, `public.admin_set_vacancy_status(uuid,text,text)` and `public.admin_deactivate_vacancy(uuid)`. The proposed `admin_access_roles`, `admin_change_audit`, `admin_appearance_current` and new publishing RPC are **absent** from live production, as expected.

Read-only RLS confirmed:
- `vacancies_admin_update` is an existing **permissive** AAL2-admin direct third-party UPDATE path. The existing reasoned moderation RPC writes a separate moderation log. `listing_activity_vacancies` alone records status transitions without a human reason.
- `vacancies_owner_update` is a separate permissive ownership path, constrained by restrictive active-account and permanent-user rules. Its function must not be broken.
- `analytics_events` allows direct anon/auth INSERT. Telemetry RPCs `track_event`, `track_listing_open` and `record_lister_journey_v2` are SECURITY INVOKER and depend on those table grants; simply revoking direct INSERT would break tracking. Stage 4 must introduce its own validated architecture and tests, **not** bundle a broad change with pilot release.
- Live migrations and source history are not hash-identical by assertion. Prior disposable integration replayed 72 source migrations, with one documented historical test-only data assignment omitted. That is strong source-schema coverage, **not** proof of zero production drift.

## Migration order and code behavior — proposal, no approval to apply

1. `20261014185000_admin_roles_audit_foundation.sql` — fixed Owner/Operator capabilities and append-only audit; no Owner seeded automatically.
2. `20261014201000_protect_last_admin_owner.sql` — last-active-Owner safeguard.
3. `20261014211500_admin_appearance_editor.sql` — allowlisted element drafts, validated publish, revisions, immutable audit, restore and published-only public read.
4. `20261015001130_admin_appearance_conflicts_http409.sql` — essential `PT409` app conflict fix; PostgREST can retry `40001` until timeout.
5. `20261015100500_admin_moderation_reasoned_paths.sql` — candidate-only narrow moderation fix: remove direct admin third-party vacancy update while preserving the listing owner's UPDATE, old admin deactivation RPC and reasoned moderator RPC. **The fifth migration and updated button are pending the new disposable full-stack integration outcome.**

The legacy admin button now asks for a real reason and calls the already-existing reasoned RPC. The compatibility RPC still supports cached clients while recording that an individual reason wasn't supplied; it does not fabricate a user's explanation. Changes remain on the development branch.

## Evidence versus limitations

- [Earlier 201-check disposable full-stack acceptance](https://github.com/tbond24/special-adventure/actions/runs/38664260023): official local Supabase stack, real GoTrue password/TOTP, Owner/Operator permissions, UI drafts and publication, audit rollback/idempotency, genuine expiration, public style propagation, Saved, enquiry and legacy moderation; the local stack and synthetic data were destroyed. Not production or hosted-load evidence.
- [Earlier genuine hosted Auth and Stage 2 evidence](./ADMIN_DESKTOP_STAGE2_VERIFICATION_20261014.md): only the permitted isolated project was exercised and it is now paused.
- [Desktop/mobile regression suite](https://github.com/tbond24/special-adventure/actions/runs/38662660505) and [original-production-source baseline comparison](https://github.com/tbond24/special-adventure/actions/runs/38662660507) cover the earlier strict-fixture public failures without changing unrelated website UI.
- The 11ms local p95 for twenty style reads is **disposable-loopback timing only**, not representative production response-time, request count, sustained load or operating cost. Production p95/storage/migration safety remains unverified.

## Release HOLD gates

- **Human Owner:** user must explicitly identify an authorised production account as Owner and decide the other account's Operator role; never infer from membership count or email.
- **Audit retention:** user must approve an appropriate policy. Do not create purge jobs or erase protected history; a 90-day report range does not establish legal retention.
- **Live schema parity:** inspect exact live schema/functions/grants, capture an approved backup/recovery checkpoint and confirm old cached clients; never blanket-run historical migrations or assume migration rollback is safe.
- **Quality and cost:** representative hosted latency/load, bounded report polling and storage growth; broader Create/Edit, media/recovery, renter journeys and account-recovery/email-provider paths still need targeted tests. Stage 3 icon/display/favicons and Stage 4 funnel/analytics work are not implemented.
- **Proven rollback:** identify a verified production-target Vercel deploy/redeploy recovery route. Rolling back frontend JS does **not** undo DB migrations; published styles revert by a *new* audited revision. Don't drop audit tables/revisions.
- **Separate live approvals:** production SQL, Owner designation and frontend deployment are separate actions; verify exact artifact/domain and post-release read-only smoke before declaring production-ready.

## Proposed no-surprises release sequence (not yet approved)

(1) Freeze reviewed source SHA and test evidence. (2) Reconcile deployed SQL and migrations against live schema and owner/cache scenarios. (3) After **separate SQL approval**, apply only ordered reviewed migrations and verify compatibility with read-only queries. (4) Explicitly assign a named Owner via guarded capability RPC after Owner approval. (5) After **separate frontend approval**, deploy the exact reviewed static bundle and check the correct domain, actual published resolver, analytics/error status and old moderation routes. (6) On an issue, restore the verified previous frontend bundle without deleting additive DB data; recover styles with an audited new revision, and raise a separate reviewed SQL remediation only if truly necessary.

**Current verdict:** HOLD. The single-element editor has strong isolated proof, but production/source reconciliation, Owner and retention choices, broader production-like workload measurement, the new moderation hardening regression and separate live permissions are unfinished.
