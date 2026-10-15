# Stage 3 — reviewed favicon (16 October 2026)

Status: PASS for the bounded favicon slice. Source e6ea37477ecd5c3014a67d175333b1ea110e84db passed 269 genuine integration milestones and six independent unit tests. Production remains HOLD. The preparation boundary below is retained; the verified result supersedes its pending language.

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

## Verified result

Run [38794030079](https://github.com/tbond24/special-adventure/actions/runs/38794030079) passed **269 integration milestones and six independent unit tests** at source **e6ea37477ecd5c3014a67d175333b1ea110e84db**. All **77 migration files** replayed. The disposable stack and its data were destroyed; no synthetic user JWTs were fabricated for completion evidence.

The 12 new milestones cover the exact default/null seed with full rollback; pinned old-admin save/restore denial; real AAL1/AAL2 permission boundaries; legacy state preservation and invalid input; separate Operator drafts and forced draft audit failure; browser conversion, upload/save failures and private previews; hash-only audit and full publication rollback; explicit review with a committed response lost and stable-ID retry; real anonymous desktop/mobile tab links; earlier favicon restore; default/no-op/baseline restore; and mobile-first initialization without writes. Favicon probes include 24 denied RPCs, 18 denied direct table writes and six denied private-column reads.

The browser converted and decoded a valid synthetic noisy PNG into 14,286 bytes, exceeding the old 4 KB style-config bound while remaining within the existing favicon bound. Four reviewed publications incremented editor revision 0 to 4 and legacy revision 2 to 6 exactly once each. Earlier (-1) and initial (0) states remained available. Default publication removed the actual public tab link. The final reviewed baseline restore returned the exact original synthetic PNG. All ten favicon audit entries contain bounded hashes/byte counts and no image bodies.

Forced publication audit rejection rolls back PNG, previous PNG, public timestamp, legacy/editor revisions, history, audit and draft consumption. A deliberately out-of-band legacy revision is refused and the test fixture is restored exactly. Cached production-source save/restore cannot mutate public state. Existing public readers remain compatible.

The full prior suite remains in the same run: genuine password/TOTP Owner and Operator; nonadmin, suspended, AAL1 and expired-token denials; direct private-table/RPC protection; bootstrap/access safeguards; Save-style private drafts, review, propagation/restore and read measurements; listing-display; reasoned moderation, activity/Marketing; old admin/public paths; customer Create/Edit/private drafts, three real photo uploads/decoding, Saved/enquiry and local SMTP/Edge/GoTrue password reset. The existing injected reset acknowledgement distinction remains: real server logout succeeded; only the browser acknowledgement was lost.

Security advisors at warning/error level returned zero findings. The involved tables retain RLS. New private helpers expose no anon/PUBLIC execution and use empty search paths. This scope does not certify provider-managed Auth/Storage internals or hosted production capacity.

Artifact **12000933053**, 1,056,762 bytes, was independently downloaded and SHA-256 verified against GitHub:
0461a24cde9fcac0f6ebe3767e71bbba9045db805dc53ba320344f27abcd1368.
[Machine evidence](./evidence/admin-favicon-20261016.json) records the original runner results, replay manifest and schema comparison. No failed favicon run was counted as PASS; the first complete favicon run passed. GitHub retention is seven days; the output packet retains the ZIP and selected screenshots locally.

Screenshot inspection confirms separate 64/16px published/private previews, reachable reason/confirmation/publication controls, the read-only mobile favicon panel, existing full desktop Design & Style, public mobile and decoded customer photos. The existing non-Design Appearance shell header shows compressed wrapping at the top of desktop/mobile captures; its header code/styles are unchanged by this slice and wider shell/native-zoom visual acceptance remains unresolved. This is not a claim of flawless overall admin layout. The original no-photo public listing is deliberate; a separate customer screenshot confirms the decoded uploaded photo.

## Eighth migration compatibility and release boundary

The metadata-only comparison against the verified seven-candidate catalog is fully classified:

| Metadata | Previous candidate | Current candidate | Change |
| --- | ---: | ---: | --- |
| Relations / RLS / table grants | 33 | 33 | Exact preservation |
| Columns / defaults / column grants | 287 | 289 | Two private favicon metadata columns |
| Indexes | 80 | 80 | Exact preservation |
| Policies | 98 | 98 | Exact preservation |
| Constraints | 144 | 145 | One nonnegative legacy revision check; three pilot key checks extended |
| Noninternal triggers | 12 | 14 | Strict draft validation and atomic public projection |
| Functions | 110 | 113 | Three private helpers; six body-only changes, signatures/ACLs/configuration preserved |

No existing relation, column, index, policy or trigger changed. No catalog entry was removed. The six body changes are private.validate_appearance_config, private.audit_admin_appearance_draft, public.admin_appearance_history, public.admin_appearance_restore_draft, public.admin_appearance_publish and public.admin_set_favicon. The final one intentionally closes the old immediate write path.

The candidate-only migration bundle, in order, is:

1. 20261014185000_admin_roles_audit_foundation.sql
2. 20261014201000_protect_last_admin_owner.sql
3. 20261014211500_admin_appearance_editor.sql
4. 20261015001130_admin_appearance_conflicts_http409.sql
5. 20261015100500_admin_moderation_reasoned_paths.sql
6. 20261015102000_admin_initial_owner_bootstrap.sql
7. 20261015135652_admin_listing_display_reviewed_publication.sql
8. 20261015191148_admin_favicon_reviewed_publication.sql

The recovered historical activity migration is already recorded live; it is not a ninth release candidate. Never blanket db push or replay historical migrations in production. Earlier six/seven-candidate compatibility reports remain historical evidence for their exact sources.

Final read-only reconciliation at **2026-10-15 19:34:02 UTC**: production public/private catalog MD5 remains f6eb8aa60b5fb1c72004674939765b8c; 69 recorded migrations and zero of the eight candidates applied. Public favicon remains legacy revision 0, current/previous PNG null. getvacancy.site is READY at dpl_558VydjBz3tjnsNok5wgGQsoKZRz, source 1a03a32592892a05ee0bdebbc33b75e409d7392e. Production and Charity remain ACTIVE_HEALTHY; hosted admin test remains INACTIVE. Vercel's latest project deployment is still the previous lab deployment, so the feature push created no hosted preview. No production mutation, role grant, deploy, merge, purge or charity pause occurred.

Next independent development: reviewed icon artwork/catalog integration, then separately bound Create/Edit language controls; Stage 4 analytics remains unfinished. External inbox/hosted load, native zoom and shell layout, approved backup/project-specific recovery and separate production release/Owner grant approvals remain gates. The already recorded private Owner/Operator selections and 12-month audit retention target remain intact; no new choice, grant or purge is implied.
