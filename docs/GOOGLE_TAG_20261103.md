# Google tag installation — 3 November 2026

Historical first-installation receipt. The owner subsequently replaced this ID
with G-H059DTQC6T and published it; current release and rollback details are in
[GOOGLE_TAG_REPLACEMENT_20261103.md](GOOGLE_TAG_REPLACEMENT_20261103.md).

Branch: `codespaces/google-tag-20261103`, from audited development
`codespaces/admin-card-audit-20261102` at `a3de206`. Existing branches, draft PRs
and release checkpoints are preserved. Status: **LIVE on getvacancy.site**,
published on 3 November 2026 following the owner's explicit instruction.

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
- PASS: staged, production and canonical live HTTP/browser verification below.
- UNVERIFIED: Google Tag Assistant/Realtime receipt. Custom SPA route events,
  conversions and Analytics property settings were not configured by this request.

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

Published curated source `1e1becea8189b7d1b2b23066adaf7a1ed3b67e6b`, including
the earlier audited card repairs and separate contrast correction `440bf6a`.
No database, Auth, role, credentials, environment, DNS, mail or Google-property
change; no PR merge or force-push. Only the existing canonical domain's deployment
assignment changed. Reverting the Google-tag commit in a subsequent curated release
restores the prior untagged templates, builder and preview transformation while
retaining the separate contrast fix. No analytics/customer history needs reversal.

## Publication receipt — 3 November 2026

The owner requested "deploy and publish". Rebuilt the tested curated candidate,
compared it with the previous live manifest, uploaded eleven changed files and
referenced the remaining preserved file hashes. All 124 source files matched
Vercel's staged and production source trees. The connector lacks a production
skip-domain option, so a separate preview was tested first; a production build
from the identical file manifest then passed before moving the canonical alias.
No preview variables were downloaded or assumed isolated.

- Staged: `dpl_9gppyzc3cvyD9xjuvm5MHZLc3WDy`,
  [staged URL](https://vacancy-aqkwoaqtv-tbond24s-projects.vercel.app).
- Production READY: `dpl_AQGn9ZZipYzfPSMjLUwPXBubAnQk`,
  [deployment URL](https://vacancy-f8tkihlj4-tbond24s-projects.vercel.app).
- LIVE: [getvacancy.site](https://getvacancy.site), independently confirmed
  pointing to that production deployment after assignment.
- PASS: all 116 public file hashes on stage, production and live. Only Vercel's
  exact appended feedback script is removed for HTML comparison; original and
  normalized hashes are retained in the evidence.
- PASS: root, recovery template and malformed-listing 404 each contain one tag
  inside the head, after preferences. Actual Chromium loads Google's real library
  with HTTP 200 once per document. Privacy/auth/admin hash navigation adds no
  second loader or config. Excluded test browsers keep the disable flag, attempt
  zero Google collection requests and have zero page errors. Other backend/API
  connections were blocked, so no synthetic production activity was written.
- PASS: fresh curated composition/stability checks and all four Google-tag tests.
  The existing exact-source full suite passed 160 browser cases / 22 intentional
  skips plus six Node and chart checks before publication.
- PARTIAL: post-release runtime inventory reports Node DEP0169 `url.parse()`
  deprecation warnings on `/api/listing-page`; the group predates this release
  and the handler's source hash is unchanged. Checked responses remain correct.
  Drain inventory is UNVERIFIED because the provider endpoint returned 404;
  monitoring configuration was not changed.
- UNVERIFIED: genuine signed-in Admin/MFA/provider/persistence acceptance and
  Google Tag Assistant/Realtime receipt. Listing success/lookup failures remain
  covered by local mocks; the live malformed ID check makes no database lookup.

Immediate rollback: reassign `getvacancy.site` to the preserved preceding
`dpl_GV7QcLskPJ7K4gkQJnAH9Rb9LhE7`
([previous deployment](https://vacancy-ce943bu82-tbond24s-projects.vercel.app),
source `c9d13b2aeb0152cc4201366bca19dae950860b87`). This restores the previous
frontend without touching any stored history. Rollback was retained, not executed.

Evidence: [live receipt](evidence/google-tag-live-20261103.json),
[exact release manifest](GOOGLE_TAG_RELEASE_MANIFEST_20261103.json),
previous [manifest](ADMIN_AXIS_FONT_RELEASE_MANIFEST_20261102.json).
Draft [PR58](https://github.com/tbond24/special-adventure/pull/58) and the earlier
card-audit PR remain unmerged. Pending identity/Call/Message/media work remains
outside this publication.
