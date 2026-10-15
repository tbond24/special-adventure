# Stage 3 - reviewed icon library (16 October 2026)

Status: prepared for genuine disposable verification; production HOLD. Starting checkpoint ece1b1c has the verified 269-milestone favicon slice.

Goal: bring existing shared icon artwork and additive listing-choice creation into private drafts, visual review, deliberate Owner publication, audit, conflicts and historical recovery.

Choice: reuse the existing guarded appearance RPCs under site/icon-library. One complete library snapshot gives additions and artwork one atomic review boundary; separate new publication services or per-slot dynamic registration would duplicate existing protections.

Boundary:
- A ninth CLI-created candidate migration; never apply hosted SQL here.
- Preserve all current slot names/categories, overrides and untouched legacy history. Capture the initial full library at editor revision zero.
- Published names/categories and slot membership are immutable. Addition of amenity/utility choices is allowed; deletion is excluded to preserve customer references. Historical restore keeps choices added after that version.
- Preserve the existing 24x24 SVG converter, supported primitives, 20 KB upload and 1,200-character path bounds. Raw markup, scripts, external URLs and arbitrary selectors never persist. Source choices use compiled built-ins; custom choices need artwork.
- One exact snapshot, up to 128 slots and 200,000 serialized characters. Explain a limit failure; do not truncate. Current production has 35 slots, zero custom choices and four overrides.
- Reuse per-actor drafts, active membership/genuine AAL2 capabilities, optimistic versions, idempotent request IDs and atomic audit. Owner publishes/restores; Operator drafts.
- Changed artwork/additions append actual legacy revisions in the same publication transaction. Unchanged slots do not churn. Out-of-band public drift conflicts.
- Cached immediate artwork and add-choice RPCs close with HTTP409/reload guidance. Public column contracts and legacy protected history reads remain.
- New editor is desktop-only, with read-only mobile fallback and mobile-first widening initialization. Private previews never change the shared sprite or customer choices.
- Public reader/converter behavior, favicon, listing-display, existing customer flows and analytics remain outside this slice. No dependencies or new polling.

Acceptance: extend the full disposable genuine Auth/TOTP suite. Cover cached old admin denial, direct tables/RPCs, malformed SVG/snapshots, per-user drafts, additions staying private, explicit reason/confirmation, public sprite and Create/Edit choice propagation, forced draft/publication audit rollback, conflicts, lost committed response retry, baseline/historical/legacy artwork restore and mobile behavior. Retain original runner guard, run advisors, compare catalog metadata, inspect screenshots and confirm complete cleanup.

Recovery: revert unpublished development source or prepare a historical snapshot as a new reviewed draft/publication. Restoring artwork does not delete later-added choices or rewrite legacy history. Production release, project-specific backup/recovery and live role grants remain separate approvals.

Initial read-only reconciliation: local/remote branch ece1b1c24c8ef335c6987a64064ac271f7e0c1fa; production catalog MD5 f6eb8aa60b5fb1c72004674939765b8c with 69 migrations, 35 slots, four overrides and 14 legacy revisions. Public slot/override hashes are recorded in machine evidence; no production identities/history rows were read. getvacancy.site remains READY at dpl_558VydjBz3tjnsNok5wgGQsoKZRz / source 1a03a32592892a05ee0bdebbc33b75e409d7392e. Production/Charity ACTIVE_HEALTHY; hosted admin test INACTIVE. No hosted preview or charity pause is used.

Current official database-function guidance and Supabase/Postgres security/short-transaction guidance are applied. The current changelog's hosted TLS notice adds no loopback configuration requirement.
