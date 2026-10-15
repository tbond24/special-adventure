# Stage 3 - reviewed icon library (16 October 2026)

Status: PASS for the bounded icon artwork/catalog slice. Tested source 6ab57c32da891c397e083f9869522ae333c7264e passed 285 integration milestones and six independent unit tests. Production remains HOLD. The preparation boundary below is retained; this result supersedes pending wording.

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

Preparation refinement: source selection offers only registered compiled built-ins; four compiled-only sprite symbols are not silently registered. Run 38796793468 replayed the full schema, passed genuine role/atomicity/private-preview checks and cleaned up, then exposed stale snapshot validation preceding expected-version conflict. The icon-only save path now checks versions before full snapshot validation; other keys retain their existing order. Reload includes later published choices while retaining the actor artwork for explicit review/rebase. No failed run counts as PASS.

## Verified result

Run [38798472431](https://github.com/tbond24/special-adventure/actions/runs/38798472431) passed **285 integration milestones and six independent unit tests** at source **6ab57c32da891c397e083f9869522ae333c7264e**. All **78 migration files** replayed; the entire disposable stack/data were removed. Actual local GoTrue confirmed users, password sessions and real TOTP/AAL2 supplied the completion evidence. No fabricated user JWTs were used.

The icon slice proves 28 anonymous/AAL1 Owner/AAL2 nonadmin/suspended RPC denials, 54 direct writes denied across all three legacy public tables and six actors, 12 malformed/unsafe snapshot rejections, plus null/unregistered key rejection. Owner/Operator cannot use either cached immediate-write RPC. The actual pinned deployed admin receives HTTP409/reload guidance for artwork save and catalog addition without effects.

The source migration preserves current overrides, custom choices and legacy history in a revision-zero baseline. Disposable replay prepends a manifested synthetic Find override, existing custom utility and earlier artwork row to the unchanged source DDL. This is test-only baseline data, not a claim that its historical actor authenticated. Every new publication's legacy rows are attributed to the actual authenticated Owner.

Real Operator drafts remain private. Forced draft audit failure rolls back the saved draft. Forced publication audit failure rolls back the new public catalog choice, changed override/timestamp, legacy history, editor revision/history/audit and draft consumption. Unexpected public-state drift is refused; its trusted test fixture is restored exactly. Version conflict precedes full icon validation when a new choice made the older snapshot incomplete. Visible reload/save rebases the Operator's private artwork while incorporating new published choices; it still cannot publish.

The actual upload flow rejects script elements and oversized SVGs, converts supported safe primitives and saves a private path. Private previews and private new choices never alter the shared sprite or public catalog. Save survives a pre-commit network failure/retry. Explicit review shows each changed icon before/after, affected new choices, a reason and confirmation.

A real publication commits before its response is deliberately lost. Retry reuses the same request ID and yields exactly one editor publication/audit, one appended legacy revision for each of the two changed icons and one catalog slot. Reusing the ID with another payload is refused. Anonymous desktop/mobile readers receive the exact paths through the unchanged column contract.

Four reviewed publications prove original legacy artwork restore, compiled-original restore with actual override removal and exact built-in nodes in a fresh anonymous browser, and initial artwork restoration while preserving both preexisting and later-added custom choices. No-op publication is rejected without effects. History is retained. Mobile-first reload shows a read-only prompt and widening loads actual connected state without an icon write.

Actual customer Create and Edit forms read the published choice, select its label and stable icon ID, and retain the active listing/room exactly until a customer submits. These checks use genuine customer sessions and the existing form handlers. The synthetic edit screenshot includes the three previously uploaded/decoded photos.

The full prior disposable regression suite also passes: roles/bootstrap and access safeguards, genuine AAL1/AAL2/expired-token denials, Save-style private drafts/public propagation/restore, listing-display, favicon, legacy admin/public compatibility, reasoned moderation/activity/Marketing, customer Create/Edit/photos/private drafts, Saved/enquiry, local SMTP/Edge/GoTrue password recovery and bounded Save-style read measurements. Existing reset evidence still distinguishes actual server logout success from intentionally lost browser acknowledgement. No claim is made that every historical mocked launch spec was executed; old immediate-save expectations describe the superseded pre-review contract.

Official local security advisors at warning/error level returned zero findings. New helpers have empty search paths and no anon/PUBLIC execution; existing RLS and grants are preserved. The review applies [official function guidance](https://supabase.com/docs/guides/database/functions). This does not certify provider-managed internals, external inbox delivery or hosted library capacity.

Artifact **12002688869**, **1,311,131 bytes**, was independently downloaded and SHA-256 verified:
a7b8f0f0e7f37da3070831a778ed00a381c5686e88eef684932bdf4a0b092b4e.
All 78 source migration hashes match the tested Git source. The four explicit disposable replay exceptions are the historical account assignment omission, listing-display fixture, favicon fixture and icon baseline fixture. [Machine evidence](./evidence/admin-icon-library-20261016.json) retains those manifests, full sanitized acceptance and exact schema comparison. GitHub retention is seven days; local outputs retain the ZIP and selected screenshots.

Screenshot review confirms the two-change published/private icon diff and compact confirmation, the read-only mobile panel, public mobile Find icon and real customer Edit choice. The original header's compressed wrapping remains visible outside the panel and unresolved. Public map tiles are deliberately blocked by the loopback-only network harness; the marker/listing still render. The original no-photo public fixture is deliberate, with a separate customer screenshot proving decoded uploads.

Run 38796793468 exposed the stale-conflict ordering defect and cleaned up. Intermediate run 38797504184 passed 284 milestones; the final run adds compiled-original recovery and the screenshot-driven scoped checkbox fix. Superseded runs 38797398913 and 38798342322 were cancelled during preparation; their cleanup steps succeeded, and they are not counted as completed acceptance. Failed/partial evidence is retained.

## Ninth migration compatibility and release boundary

Comparison with the verified eight-candidate favicon catalog is completely classified:

| Metadata | Previous candidate | Current candidate | Change |
| --- | ---: | ---: | --- |
| Relations / RLS / table grants | 33 | 33 | Exact preservation |
| Columns / defaults / column grants | 289 | 289 | Exact preservation |
| Indexes | 80 | 80 | Exact preservation |
| Policies | 98 | 98 | Exact preservation |
| Constraints | 145 | 145 | Three pilot key checks extend to the library key |
| Noninternal triggers | 14 | 16 | Strict draft validation and atomic public projection |
| Functions | 113 | 116 | Three private helpers; six body-only changes with signatures/ACLs/configuration preserved |

No catalog item was removed. No existing relation, column, index, policy or trigger changed. Body changes are validate_appearance_config, admin_appearance_history, admin_appearance_restore_draft, admin_appearance_save_draft and the two intentionally closed legacy icon writes. The existing publisher and atomic audit functions are reused unchanged.

The nine candidate-only migrations, in order:

1. 20261014185000_admin_roles_audit_foundation.sql
2. 20261014201000_protect_last_admin_owner.sql
3. 20261014211500_admin_appearance_editor.sql
4. 20261015001130_admin_appearance_conflicts_http409.sql
5. 20261015100500_admin_moderation_reasoned_paths.sql
6. 20261015102000_admin_initial_owner_bootstrap.sql
7. 20261015135652_admin_listing_display_reviewed_publication.sql
8. 20261015191148_admin_favicon_reviewed_publication.sql
9. 20261015193950_admin_icon_library_reviewed_publication.sql

The recovered historical activity file is already recorded live, not a tenth release candidate. Never blanket db push or replay historical files in production. Earlier six/seven/eight-candidate reports remain evidence for their exact sources.

Final read-only reconciliation at **2026-10-15 20:07:13 UTC** confirms catalog MD5 f6eb8aa60b5fb1c72004674939765b8c; 69 recorded migrations; none of the nine candidates applied; 35 slots, zero custom choices, four overrides and 14 legacy revisions. Slot MD5 edad985d31b7a0e98ca09f0168ea7c57 and override MD5 a6acc4565224d4b765ff4b2151c65660 match the pre-change read.

getvacancy.site remains READY at dpl_558VydjBz3tjnsNok5wgGQsoKZRz / source 1a03a32592892a05ee0bdebbc33b75e409d7392e. Vercel's latest project deployment remains the previous lab deployment; these feature pushes created no hosted preview. Production and Charity remain ACTIVE_HEALTHY; hosted admin test remains INACTIVE. No production mutation, deploy, merge, role grant, purge or charity pause occurred.

Next independent development is separately bound Create/Edit language controls. Stage 4 analytics, shell/native-zoom visual acceptance, external inbox/hosted load, approved backup/project-specific recovery and separate production release/role approval remain gates. Private Owner/Operator choices and the 12-month audit retention target are already recorded; no grant or purge is implied.
