# Browser identity and Overview render stability

Status: PASS in isolated browser checks and curated production composition; publication and genuine hosted login/logout acceptance UNVERIFIED. No hosted database, Auth, collection setting or deployment changes in this task.

## Identity findings and correction

Existing login/logout code removes Auth credentials only: it did not delete the connected visitor or session keys. The actual gap was that Contact/Text maintained its own `vacancy-engagement-session`, separate from page/listing journeys.

The shared analytics controls now own the existing `vacancy-connected-visitor` and `vacancy-connected-session` records. Connected journeys and Contact/Text use the same IDs across anonymous browsing, password login, OAuth callback, logout and same-tab reload. Existing valid connected records are reused without resetting counters or backfilling history. The old engagement-only session key is no longer used. Presence uses only the browser ID, so passive heartbeats do not extend a visit's session.

A session rotates after 30 minutes without measured activity; an account change or campaign parameter alone does not create another visit. Acquisition remains attached to the session. Browser IDs retain the existing 90-day lifetime. This is browser-profile identity, not physical-device identification: private browsing, cleared storage, different profiles/browsers and separate tabs' session storage have their normal limitations. No fingerprinting or account-based visitor-ID replacement.

Existing actor-bound telemetry queues, backend membership guards, early admin-browser exclusion and persistent browser opt-out remain. Entering admin still excludes subsequent public navigation, logout and reload. Server-side exclusion is unchanged; historical anonymous records are not retroactively reassigned.

## Rendering findings and correction

The first shell previously became visible before its deferred Overview was mounted. Its loading screen now waits for the first card snapshot and feed composition. Data waits remain bounded by existing reader deadlines; failed reads retain their unavailable states.

The map previously rebuilt the graph on historical data, before the presence read, and after that read. Presence now updates existing node classes and count hints, retaining DOM nodes, focus and open transition details. A graph rebuild remains necessary when the actual node topology changes. Freshness expiry remains independent of slow presence responses; expired presence cannot keep a pulse active.

The feeds previously loaded at mount and again when their intersection observer fired. They now start on visibility, share an in-flight automatic read and cancel when off-screen. Filters, manual refresh, pause/resume and authentication-loss cleanup are preserved.

Reused only the reviewed currency-display fix from draft PR #35 / `2ee9bc7`; that independent branch and its other form/gallery changes remain untouched. Delayed exchange-rate success/failure now updates Find/header currency presentation without invoking the entire admin renderer. The curated release builder carries this file and versions its URL, including the baseline's previously unversioned script.

## Verification

- PASS: full `npm test` on Node 24 — 86 browser passes, 22 intended skips, chart checks and HTTP/isolation checks. No dependency/lockfile changes.
- PASS: focused identity/engagement/presence/map/feed checks — 25 passed, three desktop-only skips.
- PASS: new identity browser tests exercise the actual Auth adapter with intercepted synthetic password login, OAuth return and logout, then inspect IDs on collected journey and Contact events. Reload preserves both IDs; inactivity changes only session ID. Admin-browser tests confirm zero recorded activity after logout/navigation/reload.
- PASS: `tests/admin-stability-candidate.check.mjs` serves the actual curated composition with explicit synthetic responses and external connections denied. The loading overlay leaves only after six card values and feed markup exist; presence retains graph node identity/focus/open details; one initial read per feed; delayed currency success/failure retain one admin renderer invocation; zero page errors.
- PASS: existing `tests/admin-production-candidate.check.mjs` still checks six cards, the map row/entry drilldown, absence of unrelated editors and zero errors.
- Initial verification caught a non-async listener mistakenly changed to `await`; corrected before final passing checks. No affected code was published.

Reproduce the candidate checks after `node scripts/build-admin-production-candidate.mjs > /tmp/vacancy-admin-candidate.json`. Run each candidate check directly. Default workspace tests continue using `playwright.workspace.config.cjs`; no legacy/live Playwright configuration was used. The private preview was restored with its existing lock/readiness script.

No production records, accounts, listings, contacts or messages were created. Real Google navigation/provider behavior and genuine owner-browser login remain unverified; synthetic callback coverage does not claim hosted authentication acceptance. Draft review only, no merge.
