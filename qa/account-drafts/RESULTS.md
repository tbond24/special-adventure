# Browser QA result: original listing UI + account drafts

Run started 2026-10-11 00:14:22 UTC and finished 2026-10-11 00:15:47 UTC.

- **62 passed**, 0 failed, 0 skipped, 0 flaky (31 scenarios × desktop/mobile Chromium)
- Duration: 84.7 seconds
- Command: `npx playwright test --config qa/account-drafts/playwright.config.cjs`
- Branch at verification: `release/account-drafts-old-ui-20261011`
- Base commit: `91907683985ca937c4fd3c7f4f713030afc58422` plus the working-tree account-draft changes
- Separately retested the previously failing original `stage101-listing-journey.spec.js:141` private-name/new-unit regression: **2/2 passed** using the safe repair runner
- JavaScript syntax checks and `git diff --check` passed
- After the final run, the QA config was made portable: an explicit browser override wins, the known local browser is used only if present, otherwise Playwright uses its installed default. The config syntax and resolved local launch options were checked; application files were unchanged.

## Verified

The real app bootstrap and original Location → Listing details → Review interface were exercised on desktop and mobile. Screenshots were inspected; the proposed listing accordion is absent, the original controls remain, and the listing-details page has no horizontal overflow.

Guest composition never signs up an anonymous listing account or writes cloud draft content. Password, signup, and OAuth callback flows retain exact fields, unit request IDs, photo names, file metadata, and bytes; account transfer waits for full private cloud acknowledgment and returns to Review before a second explicit Publish. Every publication mutation uses the draft gateway and public photo uploads happen only after that explicit click. A forced failure after the first public photo link triggers a retry of all files without duplicate objects or active media: four attempts leave exactly three unique, byte-identical photos.

Published-listing edits preserve their three original photos, restore two added private files and edited fields on a clean device, and save via the edit gateway without recreating the listing. A two-unit partial publication keeps the successful first unit and restores only the unfinished second unit on a clean device; retry completes with exactly two listings and six photos.

Account autosave, photo-only changes/reordering, Save and exit, dashboard resume on a clean second browser context, stale-revision conflicts, separate-copy UUID isolation, account switching, local-storage failures, upload/commit/download corruption, authentication failure, cancel/reload, and late-save/sign-out photo retention all pass. Ordinary sign-in and guest enquiries remain separate and pass.

The decorative account navigation photo preserves the You label and navigation. Missing profiles, failed profile/image loads, guests, logout, and delayed previous-account responses all pass with appropriate icon fallback and owner isolation.

## Evidence

- Detailed machine report: `test-results/account-draft-results.json`
- Screenshot directories: `test-results/account-drafts/account-draft-flow-guest-k-a6a79-ytes-without-account-writes-{desktop-chromium,mobile-chromium}/`
- Each screenshot directory has `old-ui-location.png`, `old-ui-listing-details.png`, and `old-ui-review.png`

SHA-256 checks before and after the final run confirmed these application modules were unchanged during verification:

```
468d49f94ff8d4c7be26220b188f4e80b998d5288e3633df2c167b7e485c15a7  app/src/listing-account-ui.js
75eab09868887880bafc50f510bfa887aaab710503d65c896ab97cbaf8242a16  app/src/listing-account-draft.js
e018e6fdc0734ff4292f36f0d6ec0b9674ea7f0a8a86780a4da8154f8a8d1013  app/src/listing-composer.js
05443525f5db87cb8d2b738b7cac358d9ea8e30aa87afd9c2027bce023a5d5bd  app/src/listing-guest-entry.js
00af130408c0e74d49abd28cac2c4f1c81917348dc733ccb8699e5ccb983ce0c  app/src/account-nav-avatar.js
df85ba50dfa89eb8dae29a7fa0f1550777f746cdc307e0d8b898df20f4a3213c  app/src/backend.js
276b92667c5fc3cc0112f1c8b314d94d91197b7f20573a5b68adba0a552c35bc  app/src/listings.js
220d630d541131410991dbda2b46d9909bce7189b1cb428e9a556b9fe9a078c3  app/src/edit-current-journey.js
897c0ec7ce91c2cf103d9d05eb01d80a8722905bede1210a147a77ae16344bde  app/src/listing-draft-media.js
1533f202e7c7005490e94e7f5915b15b3d95df9ea91f3d2b8cc48f624a019331  app/src/stage101-listing-journey.js
8f595b77a6507c4687b7b1a827df3dc989916e79614369bebc348403d3e38728  app/index.html
```

## Boundaries

All external requests, including auth, REST, Storage, tiles, and unknown hosts, are intercepted. WebSockets are closed and service workers blocked. There were no hosted accounts or hosted writes.

This result validates client/browser behavior against an in-memory contract model. It does not certify production PostgreSQL/RLS, the actual Storage service, production migrations, or deployment. Use the separate isolated SQL suite for schema/security evidence. Production remains outside this QA run.
