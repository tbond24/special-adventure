# Stage 3 — reviewed favicon (16 October 2026)

Status: prepared for genuine disposable verification; production HOLD. Starting branch checkpoint ce26389 has the verified 257-milestone listing-display slice.

Goal: complete the existing favicon control with private drafts, decoded previews, Owner review/publication, conflict handling, atomic audit and historical restore. Icon artwork/catalog and separate Create/Edit language controls remain unfinished.

Choice: extend the existing appearance RPCs under the distinct shared key site/favicon. A separate publication service would duplicate the real AAL2 capability, optimistic-version and request-ID protections. Public readers keep the existing site_favicon column contract.

Boundary:
- CLI-created migration 20261015191148_admin_favicon_reviewed_publication.sql is a new eighth candidate, prepared only.
- Current favicon becomes editor revision zero. Capture the actual legacy previous state only when legacy revision is positive; expose it as an explicitly labelled earlier state (-1), with no invented actor/publication time.
- Two private metadata columns retain the projected legacy revision and captured earlier config. Publication refuses an unexpected public revision/image rather than overwriting it.
- Existing 40,000-character PNG data URL, signature and 64×64 IHDR validation remain. Upload MIME/10 MB/40 MP limits and canvas conversion remain; the new editor also requires successful image decoding before review.
- Existing Owner/Operator active membership and genuine AAL2 checks govern all new writes. Operator drafts remain actor-private. Owner publishes/restores.
- Public PNG/previous PNG/legacy revision/timestamp, editor current/revision, immutable history, audit and draft consumption share one transaction. Expected versions and idempotent request IDs remain mandatory.
- Favicon audit diffs contain SHA-256 of decoded PNG bytes and byte counts. Full images remain in private drafts/revisions for restore. Other appearance audit payloads remain unchanged.
- Old immediate-save and restore RPC calls fail closed with HTTP409/reload guidance. Legacy public reads and protected admin reads remain available.
- Desktop editor only; mobile fallback stays read-only. Opening on mobile and widening to desktop must initialize genuine state and decoded preview without a write.
- The existing recent-activity implementation, icon library, public favicon renderer, customer forms and other admin sections remain outside this slice. No new dependencies, polling or hosted preview.

Verification: run the full existing disposable Supabase stack and its genuine Auth/TOTP, role, direct permission, listing-display, Save-style, moderation, activity, customer photo, Saved/enquiry, reset and expired-token regressions. New checks cover exact source seed at null/default zero, captured earlier/current PNGs, pinned old frontend denial, invalid inputs, separate drafts, audit failures, stale/unexpected versions, upload failures, large valid PNGs, hash summaries, lost-response retry, real public desktop/mobile tab icons, legacy/default/baseline restore, no-op rejection and mobile-first lifecycle. Official local security advisors and schema metadata comparison remain required.

Isolation: the disposable copy prepends a manifested synthetic valid PNG pair at legacy revision 2 to the unchanged new DDL. It copies no customer data and uses no hosted key. A rollback probe executes the exact seed SQL against default/null state. Existing manifested historical account omission and listing-display fixture remain. The pinned original full integration runner and its Git-blob guard remain unchanged.

Recovery: discard/revert unpublished development changes, or restore a captured/history favicon into a new reviewed draft and publication. Reverting frontend code leaves old favicon writes deliberately closed. Never remove immutable audit/history to simulate rollback. No production migration/deploy, merge, live role assignment, purge or charity pause is authorized here; approved backup/project-specific recovery and separate release authorization remain gates.

Initial read-only reconciliation: feature branch and remote match ce2638923f8df9fcf4152651aff9bfac4387eeb4. Production public/private catalog MD5 f6eb8aa60b5fb1c72004674939765b8c and 69 recorded migrations match the previous review. Public favicon is still revision 0 with null current/previous PNG. getvacancy.site stays READY at dpl_558VydjBz3tjnsNok5wgGQsoKZRz, source 1a03a32592892a05ee0bdebbc33b75e409d7392e. Production/Charity are ACTIVE_HEALTHY; hosted admin test is INACTIVE. All production operations are read-only.

Current official Supabase function/privilege guidance and the Postgres skill's RLS/short-transaction review are applied. The current changelog's hosted TLS cipher notice requires no configuration change for this loopback test. Previously recorded private Owner/Operator choices and the 12-month audit retention target remain recorded; no grant/purge is performed.
