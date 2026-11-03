# Google tag installation — 3 November 2026

Branch: `codespaces/google-tag-20261103`, from audited development
`codespaces/admin-card-audit-20261102` at `a3de206`. Existing branches, draft PRs
and release checkpoints are preserved. Status: **NOT PUBLISHED**.

The owner supplied Google tag **G-SL2NP26QHM** and requested one installation high
in each page's head. No Google tag previously existed. Added the supplied async
loader and unchanged `js`/`config` calls after charset and the existing analytics
preference bootstrap in both `app/index.html` and `app/404.html`. The shared app
document covers its routes; listing success uses index.html and listing 404/502
recovery uses 404.html. No route renderer installs another tag.

The curated builder imports the same head block and recovery template rather
than losing the installation when composing the older release baseline. Asset
version: `20261103-google-tag`. No historical release directory is changed.

The existing opt-out and Admin browser exclusion set Google's documented
`ga-disable-G-SL2NP26QHM` flag before tag configuration. The flag follows Admin
navigation, recognised membership, explicit exclusion, storage changes and
existing DNT/GPC privacy signals. It remains excluded after leaving Admin.
The external loader itself remains in production HTML as requested; the flag
controls Google Analytics collection, not whether its library downloads.

The isolated preview removes the complete tag block **in memory** and rejects a
loader remaining outside that bounded block. Existing CSP and API restrictions
remain unchanged. Neither local browser verification nor the listing-handler
tests send Google events or query hosted listing data.

## Verification

- PASS: four focused Node checks on both application source and the actual
  curated candidate: one async loader/config in each head, queued config ID,
  bootstrap ordering, exclusions including recognised Admin in the same tab and
  denied storage, preview sanitization/fail-closed loader, and mocked listing
  success/missing/expired/invalid/lookup-failure responses.
- PASS: existing curated production composition and refresh-stability browser
  checks with external connections denied.
- PASS: Chromium head-only verification for both templates, public/Admin/opt-out
  states: one intercepted library load and config per document, exclusions set
  before library execution, no reinstallation on hash navigation. Google was
  replaced with a local stub; no Google requests or events were sent.
- PASS: `npm test` — six Node checks, chart renderer checks, 160 browser passes
  and 22 intentional skips. Node 24.21.0 and `npm ci --ignore-scripts`;
  no dependency/lock changes. Isolated preview restarted with its lifecycle hook.
- UNVERIFIED: Google Tag Assistant/Realtime receipt and live installation. No
  publication or real traffic was generated. Custom SPA route events, conversions
  and Analytics property settings were not configured by this snippet request.

The initial full regression run had 158 browser passes / 22 intended skips and
two existing card contrast failures. A later CSS rule in the preceding audit
still overrode its new light fallback with `#737b89` (4.27:1). Corrected that one
fallback to `#637087` (about 5.0:1), leaving the assertions unchanged. All six
focused card cases then passed, followed by the final 160-pass full suite.
The prior audit report now explicitly corrects
its earlier light-axis contrast claim. No other card styling is changed here.

Placement and exclusion follow Google's primary documentation:
[install the Google tag](https://developers.google.com/tag-platform/gtagjs) and
[disable Google Analytics collection](https://developers.google.com/tag-platform/security/guides/privacy#turn_off_google_analytics).

## Scope and rollback

Source changes only; no deployment, migration, Auth/provider/domain/environment
change or merge. The inherited contrast repair is separate commit `440bf6a`. Revert
only this branch's Google-tag commit to restore the
prior untagged templates, builder and preview transformation. It changes no
existing analytics records or customer history. Previously published production
and its rollback checkpoints remain intact.
