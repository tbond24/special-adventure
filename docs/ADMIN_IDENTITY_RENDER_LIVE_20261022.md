# Browser identity and Overview stability — live release

User specifically authorized publication and checks of Overview initialization, login/logout identity continuity and admin exclusion.

Published curated source `3ae55941e86bbe9df977339e7e906ae3d30f8f88` to READY deployment `dpl_7528RE57NTRrzkZ5JXuw9HkaA7cr` (`vacancy-ogog2glhn-tbond24s-projects.vercel.app`) and https://getvacancy.site. Thirteen changed files within the preserved 121-file artifact; exact hashes in `ADMIN_IDENTITY_RENDER_RELEASE_MANIFEST_20261022.json`. Previous `dpl_AWnS1xJBLe65HFbjskuxJsvG6cKt` retained as rollback. No merge or force push; other draft branches preserved.

## Verification

- PASS: deployment READY, staged and live domain asset checks matched 18 changed non-HTML client files against the manifest. The unchanged API source is not exposed as a downloadable source asset.
- PASS: native live admin sign-in loaded with zero page errors and zero POSTs, without manually setting analytics opt-out. Entering admin itself establishes browser exclusion.
- PASS: controlled hosted browser on both deployment URL and live domain fetched actual published client assets. Only the verification browser intercepted HTML to inject the existing explicitly synthetic fixture; provider GETs were answered with empty synthetic data and production writes were blocked. No production frontend or endpoint was modified to enable verification.
- PASS in that controlled browser: one Overview initialization; loading overlay removed after all six initial card values and feed markup exist; one initial read per feed; presence retains node DOM identity, focus and open transition details; delayed currency success and failure do not invoke a second admin renderer; zero page errors.
- PASS: a separate controlled browser fetched the published backend, preferences, queue, journey and engagement scripts. Password login/logout calls used intercepted synthetic responses; all telemetry stayed in memory. Visitor/session IDs remained identical across anonymous activity, login, logout and same-tab reload. Entering admin then signing out and reloading produced no further recorded events. Zero unexpected requests and zero page errors.
- PASS: a transaction-local existing-admin/AAL2 SQL check on the unchanged production recording function accepted zero events and left the engagement-event count unchanged. The transaction was rolled back; no test analytics, users or customer records were retained.
- PASS: generated the bounded release receipt only after live asset verification, then recorded the real deployment and affected sections in the site-change ledger. Existing tracking remained enabled and its original coverage start stayed unchanged: 2026-10-22 01:17:56 Australia/Perth. No schema migration, Auth/environment change or new collection policy was required.

PARTIAL genuine-session acceptance: the hosted browser checks use controlled Auth/report responses, not the owner's real login/MFA session or real Google-provider navigation. They verify the actual published scripts and render lifecycle without impersonating an owner, reading customer records, exporting credentials or creating live activity. Do not describe them as a genuine owner-authenticated end-to-end session.

The underlying full isolated suite previously passed 86 browser checks / 22 intended skips, chart and HTTP isolation checks; both exact candidate-composition checks passed. No new product code was changed after that validation.

## Rollback

Reassign the public alias to `dpl_AWnS1xJBLe65HFbjskuxJsvG6cKt`. Retain the immutable release ledger and all analytics history. No schema or Auth rollback is necessary. Existing browser/session storage records remain backward compatible with that release.
