# Remaining display, icons and favicon continuation

Starting checkpoint `87b92f3`, clean continuation branch, 15 October 2026. User explicitly requested the remaining display controls, then icons and favicon. Development and disposable verification only; production HOLD. Existing commits, customer workflows, Save-button pilot and card-service acceptance remain.

## Slice 1: remaining nine display controls

Reuse existing `listing_display_options` rows, detail renderer and appearance draft/revision/audit RPCs. Extend the fixed registry to the nine existing optional detail groups; adopt each existing value at revision 0 without publication. One selected setting per display editor, exact shared boolean schema, target-aware impact/review and real detail preview with actions disabled. Preserve card-services separately. Selecting another setting must offer Save/Discard/Stay for unsaved changes. Reject all old immediate display RPC writes after replacement. Required price/contact/security/consent/validation surfaces are not registered.

Files: additive CLI-generated migration; `admin-display-draft.js` small shared-controller extension; `listing-display-options.js` target selector; existing backend public reader; browser/real disposable display checks. Public renderer logic and customer records remain unchanged.

## Slice 2: icon artwork and catalogue

Reuse actual SVG sprite, built-in source semantics, existing SVG-to-path parser, 24x24/20KB input and 3–1200 character path validator. Per-slot private drafts, Owner review/publication, atomic existing overrides plus legacy icon revision plus new appearance audit/revision, anonymous confirmation and restore-as-new-draft. Existing historical revisions stay readable and restorable through a newly reviewed draft. Add a listing feature/utility through a stable private proposed catalogue key; only publication creates the public catalogue/override. Keep catalogue labels/kinds bounded and public choices unchanged until publish. Close both old immediate mutation RPCs. No arbitrary SVG/XML/HTML storage, deletion, customer field change or fabricated icon.

Files: next additive migration; reuse controller with typed adapters; `site-icon-library.js`, backend anonymous reads/cache versions; browser and genuine disposable permissions/atomicity/legacy history/rendering checks.

## Slice 3: favicon

Reuse current accepted image types, 10MB/40MP limits, still-frame square fit and 64x64 PNG normalization. Reuse existing server PNG signature/IHDR/40KB validation. Adopt current favicon, preserve legacy `previous_png` and revision behavior; add immutable reviewed appearance history and atomic audit/projection. Private preview never changes browser favicon. Owner publication verifies anonymous config plus actual public projection before applying current-tab favicon. Legacy previous value becomes a private draft, never immediate restore. Reject old immediate setter.

Files: next additive migration; favicon adapter and existing admin mount/backend public reader/cache versions; meaningful browser decoding/failure tests plus genuine disposable publish/conflict/retry/restore/denial/rollback tests.

## Common acceptance and recovery

Retain membership+real AAL2, Owner/Operator split, last-Owner safeguard, immutable history/audit, HTTP PT409 conflicts, request-id retry and private draft isolation. Shared controller must retain card-service tests, allow simultaneous editors without clearing another editor's state, guard navigation and clear stale account responses. Anonymous confirmation never sends admin credentials. Genuine tests run only on exact opted-in disposable Linux loopback, retain pinned original runner and existing customer/Auth/recovery regressions, destroy stack and retain sanitized evidence only. Record failures and source SHA honestly. Original image/private chats/companion attachments remain inaccessible; no mockup comparison claimed.

Recovery is a scoped development revert after reviewing later commits; disposable SQL/data is destroyed. Any future applied state is restored through new audited publications, preserving all history. These migrations enlarge the candidate bundle and require a fresh whole-bundle compatibility/recovery review before separate production SQL/role/Edge/frontend approvals. No production SQL/DML, bootstrap/grants, Auth settings, deployment/promotion/domain, project restoration, purchase, retention deletion or merge is authorized or performed.
