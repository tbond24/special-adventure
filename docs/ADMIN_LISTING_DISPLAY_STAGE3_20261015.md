# Stage 3 — reviewed listing display (development)

Status: implementation prepared; genuine disposable integration pending. Production remains HOLD.

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

Acceptance evidence will come from the existing full disposable CI stack, real GoTrue Owner/Operator/nonadmin/suspended sessions, visible password/TOTP flows and PostgREST. New checks include direct writes, malformed snapshots, independent drafts, stale versions, forced audit rejection, frontend failed-save recovery, committed-publication lost-response retry, pinned old-admin denial, exact initial restoration, anonymous public propagation, script-disabled previews and mobile fallback. Existing customer creation/edit/photos, Saved/enquiry, password recovery, moderation, reporting and Save-style pilot regressions run in the same workflow.

Recovery: unpublished development code can be reverted. A test publication is restored through a revision-zero/history private draft and a new reviewed publication; immutable history is retained. Any eventual release needs review of the seven candidate-only migrations, confirmed backup/recovery and separate production approval. The earlier six-migration compatibility result is historical evidence for source 1c78f11, not certification of this new seventh migration.

Security review uses current official [database function guidance](https://supabase.com/docs/guides/database/functions), the Supabase skill checklist, local security advisors and explicit grant/RLS/search-path catalog checks. The current TLS-cipher changelog affects older hosted HTTPS clients; this slice adds no TLS or hosted configuration and executes on loopback.
