# Admin visual-review milestone — 5 October 2026

Development preview only. Production, production databases, notices and live collection were not changed. Pause here for visual review.

## Review

Local preview: http://127.0.0.1:8776/__admin-preview

This works on the development PC while its local server is running. It is not a deployed or remotely accessible preview. Every page is labelled DEVELOPMENT / SYNTHETIC DATA. No real customer data is loaded. The preview server binds only to 127.0.0.1; its CSP blocks external connections. Automated tests also intercepted external requests. The existing journey collector is omitted from this preview entry point.

Try the seven existing admin navigation sections, source filters, stage selection, accessible flow table, diagnostics and definitions. The top test-state selector demonstrates incomplete linkage, a complete recorded cohort, truncated coverage, empty results and refresh failure. On mobile, use the admin menu drawer; Escape restores focus to its opener.

## Actual changes

- `app/src/admin-console.js`: reusable admin presentation, existing navigation handlers retained, responsive drawer, central journey visual and supporting tables, safe text rendering, request ordering and unavailable/error states. The existing operations ratio is labelled message requests per 100 listings, not conversion; its calculation is unchanged.
- `app/admin-console.css`: admin-scoped visual hierarchy, light panels, blue accents, responsive layout and keyboard focus. Public chrome is hidden only while the admin console exists and restored on leaving it.
- `app/src/admin-lister-marketing.js`: dynamically loads and mounts the new shell after the existing admin gate and render. Existing Marketing reporting remains intact. The new connected journey renderer is only connected to the synthetic provider in this milestone.
- `tests/admin-visual-fixture.js`: development-only synthetic provider and test states. Synthetic admin context and blocked write actions exist here, not in application authentication code.
- `tests/marketing-dev-server.cjs`: isolated preview entry point and configurable loopback port.
- `tests/admin-visual.spec.js`: desktop/mobile navigation, flow interactions, coverage/error states, keyboard and return-to-public checks.
- `tests/marketing-report.spec.js`: existing mobile tests open the new drawer; optional artifact-directory environment setting prevents overwriting older screenshot evidence.

No dependency, new migration, publication behavior, public form, public styling or collection change was introduced in this milestone. Prior uncommitted report/SQL work was retained. Some existing top-level browser screenshots were refreshed by the regression run; earlier written database evidence and measurement reports remain intact. New visual evidence is in its own folder.

## Meaning and limitations

Arrival sessions are shown separately from creation journeys. The visual uses the actual Location → Listing details → Review screens, followed by submission and confirmed-publication milestones. Photos and pricing remain inside Listing details. Synthetic forward milestone transitions reconcile with the displayed last-observed branches; these branches are not labelled abandonment.

The fixture distinguishes 36 confirmed journeys from 40 published listings. Unknown linkage is separately visible. Errors can overlap publication. The default publication rate is unavailable because linkage coverage is incomplete. The complete-fixture rate uses mature recorded journeys and discloses that it does not cover all visitors. Seven days plus a 24-hour ingestion grace and 90-day retention are development definitions; no retention job runs. Real skipped/resumed/repeated paths and expired evidence still require server integration and correctness tests.

This is a visual milestone, not a claim that the new live collection, server aggregation, outcome linking or hosted login works. Existing operational controls are reused, but their production mutations are not exercised in the synthetic preview. Performance diagnostics honestly show unavailable timing rather than invented measurements.

## Executed verification

- Combined affected suite: **20 passed in 36.1 seconds**, desktop and mobile. Includes six new visual checks, existing Marketing completeness/UTC/deduplication/refresh/UI-gate checks and public Find/auth/List style, control and request-path regression comparisons.
- Final six visual checks after the last wording changes: **6 passed in 19.7 seconds**. These are reruns, not six additional unique checks. Overview wording, all seven navigation sections, flow/source interactions, synthetic states, mobile focus and public layout restoration passed.
- JavaScript syntax checks and `git diff --check` passed (line-ending warnings only).
- Ordinary viewport screenshots captured at top, flow/middle and bottom on desktop and mobile; overview and full-page captures also saved. Visual inspection covered desktop and mobile flow layouts.
- Local preview HTTP response: 200. Listener verified at 127.0.0.1:8776. No PostgreSQL listener on test port 55432; PostgreSQL was not started for this work.

Evidence directory: `../marketing-checkpoint-artifacts/visual-milestone/`. Combined log: `regression-run.txt`. Final result: `final-verification.txt`. Screenshots: `desktop-chromium-{top,flow,bottom,overview,full}.png` and corresponding `mobile-chromium-*` files.

## Still required after visual review

Implement and verify the approved bounded background tracking and server aggregation; real outcome linking and coverage/retention handling; representative integration/performance tests. Obtain a verified isolated hosted environment before real hosted authentication, MFA and RPC checks. Privacy, consent/public-notice decisions and activation approval remain release dependencies. No paid service or production substitute was used. Previous local database security tests do not verify the complete hosted login flow.

## Scoped rollback

Starting source revision: `5dc40368614a03fd5447a7591c5a5b68eebf016a`. Earlier tag `rollback/before-admin-marketing-page-20261005` is retained but predates uncommitted completed work: do not reset to it.

Pre-milestone snapshots are in `../marketing-checkpoint-artifacts/visual-milestone/source-before/`, with original relative paths and `revision.txt`.

1. Stop the local preview process if rolling back its server.
2. Restore ONLY `app/src/admin-lister-marketing.js` and `tests/marketing-dev-server.cjs` from their matching source-before snapshots, after checking for any subsequent edits.
3. Reverse ONLY the new mobile drawer-opening helper and optional artifact-path setting in `tests/marketing-report.spec.js`; preserve the existing report tests.
4. Remove the four newly introduced files `app/src/admin-console.js`, `app/admin-console.css`, `tests/admin-visual-fixture.js`, and `tests/admin-visual.spec.js` after verifying their paths are inside this checkout. Retain this report and screenshots as evidence.
5. Do not restore/reset `app/styles.css`, other prior changes, migrations or the whole checkout. No database recovery is necessary for this milestone because it made no database change. Earlier SQL recovery remains documented separately in the combined-migrations checkpoint.

The loopback preview server is left running for review. No deployment or tracking activation is authorized by this checkpoint.
