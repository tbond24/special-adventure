# Stage 3 — reviewed listing display (development)

Status: PASS for this listing-display slice. Tested source 77b143ff3b98b5e771281824cd62e37232d8157f passed 257 integration milestones plus six independent unit tests. Production remains HOLD.

Goal: replace all ten immediate listing-display switches with actor-private drafts, a real public-renderer preview, Owner review/publication and recoverable history. This is one complete existing-control slice; icon artwork, favicon, separate Create/Edit language controls and Stage 4 remain unfinished.

Choice: reuse the Stage 2 guarded appearance RPCs and audit transaction under the distinct shared key `site/listing-display`. A separate permission/publication service would duplicate working conflict and audit rules. The public ten-row table stays the renderer contract, so existing public clients read the same values.

Boundary:
- One CLI-created new migration, `20261015135652_admin_listing_display_reviewed_publication.sql`, prepared only.
- Current public switch values are captured at revision zero, without an invented actor/publication. The initial snapshot remains available for reviewed recovery.
- All ten switches must be present and boolean. Unknown controls, CSS, selectors, actor claims and viewport-specific settings are rejected.
- Owner/Operator draft privileges use the existing active-membership and genuine AAL2 checks. Only Owner may publish/restore. Drafts remain per actor.
- Current, existing public rows, immutable revision, audit and draft consumption commit together. Existing expected-version and request-ID rules apply.
- Cached immediate-save clients receive HTTP409 and a clear reload instruction. They cannot bypass review. Their public rendering and read-only admin paths remain compatible.
- Desktop editor only; mobile displays a read-only prompt. Shared published settings intentionally retain their existing all-screen meaning.
- Public listing facts, rent, Save, Message, moderation, icon artwork, favicon, and the existing customer previous-price editor remain outside this slice.
- No new dependencies, polling, hosted preview, production migration/deploy, real-account grant, or charity pause.

Acceptance evidence comes from the existing full disposable CI stack, real GoTrue Owner/Operator/nonadmin/suspended sessions, visible password/TOTP flows and PostgREST. New checks include direct writes, malformed snapshots, independent drafts, stale versions, forced audit rejection, frontend failed-save recovery, committed-publication lost-response retry, pinned old-admin denial, exact initial restoration, anonymous public propagation, script-disabled previews and mobile fallback. Existing customer creation/edit/photos, Saved/enquiry, password recovery, moderation, reporting and Save-style pilot regressions run in the same workflow.

Recovery: unpublished development code can be reverted. A test publication is restored through a revision-zero/history private draft and a new reviewed publication; immutable history is retained. Any eventual release needs review of the seven candidate-only migrations, confirmed backup/recovery and separate production approval. The earlier six-migration compatibility result is historical evidence for source 1c78f11, not certification of this new seventh migration.

Security review uses current official [database function guidance](https://supabase.com/docs/guides/database/functions), the Supabase skill checklist, local security advisors and explicit grant/RLS/search-path catalog checks. The current TLS-cipher changelog affects older hosted HTTPS clients; this slice adds no TLS or hosted configuration and executes on loopback.

Preparation refinement: a read-only public-settings query found Water and Electricity currently hidden. The disposable copy prepends a clearly manifested synthetic two-switch fixture before the unchanged new DDL, proving non-default preservation and baseline restoration. The source migration itself contains no production-specific values. The prior single historical test-account omission remains unchanged. The first corrected-source run replayed 76 migrations and cleaned up, but stopped before identities because legacy CLI -o json did not select the machine output format. The collector now uses the pinned official --output-format json contract; no failed check is counted as PASS.

## Verified result

Run [38753121601](https://github.com/tbond24/special-adventure/actions/runs/38753121601) passed all 257 integration milestones and six independent safety/statistics unit tests. All 76 migration files replayed. Cleanup confirmed destruction of the disposable stack and data. No test result uses fabricated user JWTs.

New connected checks proved 24 RPC denials (anonymous, real AAL1 Owner, real AAL2 nonadmin/suspended) and 18 direct table-write denials; eight malformed snapshots were rejected. Actual Owner/Operator password and TOTP flows, closed private tables and the rest of the original regression suite remained in the same run. Operator can retain/rebase a private draft and read published history; publication/restore stay Owner-only.

Visible Owner save survives an injected network failure. Forced audit rejection rolls back public values and timestamps, current snapshot, revision, audit and draft consumption. A deliberately lost response after a real committed publication retries the same request ID and produces exactly one publication/audit. Stale draft/published versions conflict. Reusing an ID with another reason is rejected.

Actual public card/detail previews are script-disabled and produce no Saved, enquiry or analytics writes. Anonymous table readers and desktop/mobile public renderers see exactly the published switches. Visible revision-zero restoration stays private until review, then creates revision two and restores the exact baseline including hidden Water/Electricity. Mobile-first admin reload expands into the connected desktop editor without a write. The customer previous-price editor and public display reader are byte-equivalent to the previous checkpoint after line-ending normalization.

Existing regressions passed: Save-button styling with mobile isolation; bootstrap/role grants; moderation and activity/Marketing reports; cached production-source public/admin MFA flows; customer private drafts, real three-photo uploads and publication; Saved/enquiry; local SMTP/real reset Edge/GoTrue recovery; expired JWT denial; bounded Save-style read measurements. The known reset acknowledgement distinction remains: actual GoTrue logout succeeded; the browser acknowledgement was intentionally lost. The findings do not demonstrate a real GoTrue logout failure.

Local security advisors at warning/error level returned zero findings. Four involved tables retain RLS; new helpers have empty search paths and no anon execution. This does not certify all provider-managed Auth/Storage internals or production security.

Artifact 11982945952 is independently SHA-256 verified: 23ce7775fa9f479a8d8aaa86a296c98f96d8093c0cf2db00b3c042871e09ae2c. [Machine evidence](./evidence/admin-listing-display-20261015.json) retains the acceptance details and explicitly manifested disposable replay adjustments. GitHub artifact retention is seven days; the review outputs retain selected screenshots and JSON locally.

Preparation failures were fixed and are not counted as passes: the advisor legacy output flag (run 38749034908), screenshot viewport side effect (38749799254), and missing discovery fixture map pin (38750704208). Each failed complete run cleaned up. Two earlier setup runs and the intermediate lifecycle setup were superseded; no verification claim depends on them. Screenshot capture now uses the viewport during review and the fixture has a genuine database pin in synthetic Perth.

Inspected screenshots: desktop publication review, read-only mobile admin, public mobile, full admin desktop and real customer-photo mobile. The original no-photo listing is deliberate; the customer artifact separately confirms decoded uploaded photos. No credentials, TOTP, sessions, traces or HAR are retained.

## Seventh migration compatibility and release boundary

The fresh production public/private catalog MD5 matches the earlier read-only review: f6eb8aa60b5fb1c72004674939765b8c. Production still records 69 migrations and none of the seven candidate migration names. Source now contains 76 files, including the recovered historical activity file and this new seventh candidate migration.

| Metadata | Six-migration candidate | Current candidate | Explained change |
| --- | ---: | ---: | --- |
| Relations / RLS / table grants | 33 | 33 | Exact preservation |
| Columns / defaults / column grants | 286 | 287 | Initial snapshot column only |
| Indexes | 80 | 80 | Exact preservation |
| Policies | 98 | 98 | Exact preservation |
| Constraints | 144 | 144 | Three existing pilot key checks extend to this shared key |
| Noninternal triggers | 10 | 12 | Snapshot validation and atomic public projection |
| Functions | 108 | 110 | Two private helpers; four body-only updates, ACLs/signatures preserved |

Relative to live, the earlier reasoned-moderation change remains, and the display immediate-save function now intentionally rejects writes with HTTP409. The other three previously documented historical formatting-only function differences remain. No unrelated relation, index, grant, policy or existing constraint change was found. Catalog scope excludes provider-managed internals; do not use blanket db push or replay historical migrations in production.

Final read-only provider observation: 2026-10-15 14:45:38 UTC. getvacancy.site remains READY at dpl_558VydjBz3tjnsNok5wgGQsoKZRz, source 1a03a32592892a05ee0bdebbc33b75e409d7392e. Production and Charity are ACTIVE_HEALTHY; hosted admin test remains INACTIVE. Published display values are unchanged. No production mutations, grants, deploys, merges or charity pause occurred.

Remaining work: icon artwork/revisions and favicon need equivalent reviewed publication without bypasses; Create/Edit language controls need separate verified bindings; Stage 4 telemetry/analytics remains independent. External inbox/hosted load, native zoom, approved backup/project-specific recovery and separate release authorization remain gates. Previously recorded private Owner/Operator choices and 12-month audit retention target are preserved; no live grant or purge is authorized.
