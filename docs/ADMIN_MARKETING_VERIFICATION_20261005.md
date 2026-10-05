# Marketing verification follow-up — 5 October 2026

Subsequent approved local database execution is documented in `ADMIN_MARKETING_DATABASE_RESULTS_20261005.md`. Its results supersede the database-access blocker below; hosted integration and production-like performance remain unverified.

Overall: **PARTIAL**. Browser verification completed; isolated database execution remains **UNVERIFIED**. No production migration, deployment, data cleanup, or paid provisioning occurred. This supplements the implementation checkpoint; current measurements below supersede its performance interpretation.

## Scope and changes this pass

Existing source rollback remains `rollback/before-admin-marketing-page-20261005` at `5dc40368614a03fd5447a7591c5a5b68eebf016a`. Implementation changes were already uncommitted. Their tracked diff was preserved before this pass at sibling `../marketing-checkpoint-artifacts/verification2/pre-verification.patch`.

Only application edit this pass: `app/styles.css`, one mobile rule scoped to `.admin-marketing` controls, adding `scroll-margin-block:24px 100px`. Ordinary Tab navigation had focused the definitions disclosure behind the fixed navigation. Scroll margin corrects the browser's focus-scroll destination without changing element dimensions, public navigation, public styles, or other admin sections.

Test/document edits:

- `tests/marketing-dev-server.cjs`: optional gzip response and deterministic UUID-like identifiers in synthetic fixtures, including publication IDs. Localhost binding and connection-blocking CSP retained.
- `tests/marketing-report.spec.js`: compressed-transfer measurements, combined dataset limit case, normal mobile viewport screenshots, ordinary keyboard traversal and control hit tests.
- `tests/lister-marketing.spec.js`: local-target guard and catch-all external mocks so existing collector tests can run without sending production requests.
- This verification report and a pointer in the previous checkpoint document.

No reporting JavaScript, migration SQL, backend/collector implementation, schema, dependency, or public navigation was changed in this pass.

## 1. Database target discovery — BLOCKED

Read-only Supabase project discovery returned one Vacancy project: `xtutkwiivqkgkqjpkxvj`. Its only branch is `main`, `is_default:true`, with the same project reference. `app/src/backend.js` names this reference as the app's backend. It is the production target and was rejected for these tests. Other returned projects belong to other applications; none was repurposed, resumed, or modified.

Local discovery found no Docker, Podman, psql or postgres executable, no matching running service and no listener on 5432/54321/54322. WSL reports that it is not installed. `qa/supabase/config.toml` describes a PostgreSQL 17 local environment on 54322 but is configuration, not a running database.

**Exact requirement to proceed:** either (a) a running local Docker-compatible engine with the existing Supabase CLI able to start the `qa/supabase` environment, then the repository schema/migrations and synthetic fixtures; or (b) access to an explicitly identified, isolated Vacancy development/test Supabase project with schema and permission to apply the candidate migration and restore the function. The second option must be independently verified as non-production, not inferred from a preview website URL. Do not provide credentials in chat; use the configured connector or local secret storage. No paid project or branch has been provisioned.

Before applying anything, record the target reference/host, database name/version, baseline function definition/owner/ACL/security settings and migration state, and confirm no production connection is involved.

| Database requirement | Status |
|---|---|
| Apply `20261004231152_admin_marketing_generated_at.sql` to isolated DB | UNVERIFIED — no target; not applied anywhere |
| Authorized admin/AAL2 call succeeds | UNVERIFIED in PostgreSQL; mocked browser gate passed |
| Anonymous, AAL1 admin, authenticated non-admin denied | UNVERIFIED in PostgreSQL; mocked browser gate passed |
| UTC start inclusive, end exclusive | UNVERIFIED in PostgreSQL; browser parameters and static predicate passed |
| Earliest publication before date filtering | UNVERIFIED in PostgreSQL |
| NULL previous status, duplicate active entries, republication | UNVERIFIED in PostgreSQL; NULL-safe predicate and full-history selection statically preserved |
| Dynamic server `generated_at` | UNVERIFIED in PostgreSQL; timestamp code preserved in candidate migration |
| Independent 5,000/5,001 analytics and publication limits | UNVERIFIED in PostgreSQL; independent UI behavior passed with fixtures |
| Execute recovery and confirm original definition/security/ACL | UNVERIFIED; recovery SQL matches baseline statically |

No proxy test or synthetic database simulation is represented as execution of these requirements. On an available isolated target, execute cases with earliest publication before the range followed by in-range reactivation, NULL-to-active at the start, active-to-active duplicates, and a transition exactly at the excluded end. Repeat calls for advancing server timestamps. Exercise each role using its actual database role/claims and test each response limit independently. Restore the saved original function and rerun access checks. These are remaining work, not passes.

## 2. Performance reconciliation

The previous report's 588 KB / 2.95 MB were **uncompressed JSON bytes from a simple fixture**. Its tens-of-milliseconds local measurements did not represent transfer over a mobile connection, database query time, or a production p95. Treating them as proof that a transfer/loading budget was met would be incorrect. No payload-budget pass is claimed here, and compression does not remove the raw payload/memory limitation.

This pass uses synthetic records with hashed UUID-like IDs, varied timestamps and campaign/error values so repeated `test-event-123` strings do not unrealistically improve compression. It remains a model, not a sample of private production analytics; longer fields or different repetition could change compression materially.

Conditions: Chromium network throttling at **1.6 Mbps download, 0.75 Mbps upload, 150 ms latency**, **4× CPU slowdown**, gzip, no-store responses. Three refreshes for each baseline/current, dataset and device case. Desktop and Pixel 7 viewport emulation run on the same PC, not physical mobile hardware.

Measurement boundary: changing the date control in an already-loaded admin page through fetch, decode, report rendering and two animation frames. This is an end-to-end **report refresh**, not cold site loading or login. The fixture server performs no PostgreSQL query; real DB processing, TLS, geographic latency and authentication are excluded.

`decodedBodySize` is uncompressed bytes; `encodedBodySize` is the gzip response body; browser Resource Timing `transferSize` is its reported transfer, including the browser's 300-byte header estimate in this run. It is not a packet capture and excludes lower-layer TLS/TCP overhead. All units below are decimal bytes/KB/MB.

| Current report | Events / publications | Uncompressed JSON bytes | Gzip body bytes, first sample | Browser transfer bytes, first sample | Mean refresh ms | Maximum refresh ms |
|---|---:|---:|---:|---:|---:|---:|
| Desktop | 1,000 / 8 | 671,051 | 49,887 | 50,187 | 597 | 608 |
| Desktop | 5,000 / 8 | 3,342,697 | 244,744 | 245,044 | 1,729 | 1,735 |
| Desktop | 5,000 / 5,000 | 5,249,641 | 485,144 | 485,444 | 3,071 | 3,153 |
| Mobile emulation | 1,000 / 8 | 671,051 | 49,877 | 50,177 | 602 | 609 |
| Mobile emulation | 5,000 / 8 | 3,342,697 | 244,734 | 245,034 | 1,746 | 1,752 |
| Mobile emulation | 5,000 / 5,000 | 5,249,641 | 485,203 | 485,503 | 3,054 | 3,076 |

The source baseline is the rollback-tag Marketing script/styles, loaded with the **same fixture endpoint and throttling**. Baseline mean refreshes were desktop 624/1,708/3,056 ms and mobile emulation 608/1,754/3,031 ms respectively. Current combined-limit changes are approximately +15 ms desktop and +23 ms mobile; this small sample does not establish a statistically meaningful regression or improvement. Runs were sequential, not randomized. Dynamic timestamps slightly change compressed byte counts. Both versions receive the same response shape; this comparison is of browser rendering, not pre/post SQL or database performance.

The existing unthrottled 20-load-per-case test also passed on rerun. That remains a limited regression check, not a dependable p95 estimate. Updated raw evidence is in `performance-*.json`; the earlier checkpoint's table is a historical first-run measurement.

**Recommendation for review, not silently accepted:** explicitly accept the current bounded admin-only payload limitation for the initial release, conditional on isolated database checks and verification of real response compression/query latency. The report is on demand, capped and can be narrowed by date. At both limits it still decodes ~5.25 MB, so this is a deliberate exception, not proof of meeting a smaller raw-payload budget. The present measurements are roughly 0.6/1.75/3.1 seconds, not the previous local-render numbers.

If this limitation is unacceptable, the smallest next candidate is an explicit field projection in the existing RPC to omit unused response fields while preserving its authorization, limits and semantics. That requires a separately reviewed query/migration change and retesting of all consumers. Do not reduce the cap silently, truncate while showing complete figures, introduce a new analytics platform, or build pagination/aggregation architecture without approval. No such optimization was implemented here.

## 3. Mobile verification — PASS after one fix

The configured Pixel 7 test viewport is **393×839 CSS pixels**; image files are higher-resolution due to device scale factor. They are ordinary viewport captures, not stitched full-page captures. A noninteractive test-only banner labels synthetic data.

- Top: heading, selectors and coverage notice.
- Middle: expanded timing/error diagnostics; semantic tables can scroll horizontally within their region.
- Keyboard: visible focus ring and Tab movement across controls.
- Bottom: expanded definitions and final text clear of navigation; final paragraph bottom ~647 CSS px, navigation top 773 px in the captured test.
- Session disclosure expands and the session picker changes timeline content.

**Observed failure:** without manually centering controls, natural Tab navigation could place the definitions summary behind the existing fixed nav. Evidence retained in `verification2/mobile-keyboard-before-fix.png` and `.json`.

**Fix and rerun:** Marketing-only mobile scroll margin. The same unassisted Tab sequence passed afterwards; all Marketing focus targets passed center hit-testing. The original checks that centered controls were insufficient to catch this, which is why the additional check matters.

The fixed navigation still overlays the bottom strip during ordinary scrolling. All tested content can scroll clear, final content is not trapped beneath it, and tested controls remain operable. No public navigation change was made. Physical iOS/Android browser, screen-reader and on-screen keyboard testing are not claimed; the captured keyboard interaction is Chromium keyboard emulation.

## 4. Initial smoke-test telemetry note

This chat's local execution record places the `agent-browser open http://127.0.0.1:8765` command at **2026-10-04 23:17:36 UTC** (5 October **07:17:36 Perth**), and the close command at **23:17:59 UTC** (07:17:59 Perth). This is an approximate exposure window: these are command timestamps, not captured network start/end times.

Confirmed: the local app used its existing hardcoded production backend configuration, and the initial snapshot displayed live public listing titles. The browser was then closed. No admin mutation, migration or deployment was requested or executed during that smoke.

Known code paths, **not a captured request log**:

- `GET /rest/v1/vacancies` with active status and related listing data is the existing marketplace loader, consistent with the observed live listings. Public room-media images and icon/config reads may also have loaded.
- `POST /rest/v1/rpc/record_lister_journey` can send `lister_session_started` and `lister_landing_viewed` about 500 ms after initialization, with browser/session IDs, attribution and route fields. The existing collector also flushes on page hide.
- `POST /rest/v1/rpc/track_event` may record `listing_impression` when visible cards meet its intersection threshold, unless that session's deduplication suppresses it.
- `POST /rest/v1/rpc/record_client_error` is an existing possible path if client errors occurred; occurrence is unknown.

Unknown: exact requests, counts, response statuses, browser/session IDs, whether the server accepted/stored events, whether existing session deduplication suppressed any event, and precise browser close time. No HAR or network capture was retained for that smoke. No production analytics or logs were queried to infer a convenient answer, and **no production analytics were deleted or modified to clean up**.

Subsequent browser tests use fresh Playwright contexts with catch-all interception: every non-local request is fulfilled locally. The fixture server's `connect-src 'self'` blocks production fetches even on a manual local visit. Public regression/collector tests remove that CSP only on intercepted local HTML so their mocked requests can be inspected; the catch-all external mocks remain. This pass's Supabase calls were read-only project/branch discovery. No production database queries were run.

## 5. Executed test results

| Result | Check |
|---|---|
| PASS: 17; SKIP: 1 | `npx playwright test tests/marketing-report.spec.js tests/marketing-public-regression.spec.js --workers=1` (1.8 min). The skip is the mobile-only case in the desktop project |
| PASS: 6 | `npx playwright test tests/lister-marketing.spec.js --workers=1`: existing attribution/session persistence, collection failure not blocking listing, and admin integration on both devices |
| FAIL then PASS | Natural keyboard-focus occlusion, corrected by scoped scroll margin and rerun |
| PASS | Static migration preservation, script syntax, diff whitespace checks |
| PASS with fixtures | Analytics/publication independent limits, invalid/missing datasets, UTC request boundaries, response publication-ID deduplication, safe rendering, refresh failure/retry and overlapping response order |
| PASS with mocks | UI admin/AAL2 access gates and anonymous/AAL1/non-admin denial; not database authorization evidence |
| PASS | Baseline/current Find, auth and List visible controls/styles/request-path comparison on desktop/mobile; collector source unchanged |
| UNVERIFIED | All isolated PostgreSQL execution/recovery requirements listed above, production compression/query timings, real-device and screen-reader testing |

No known failing browser assertion remains from this pass. This is not a claim that the full website or live database has been exhaustively tested.

## Artifacts and recovery

Sibling directory `../marketing-checkpoint-artifacts/` contains:

- `mobile-top.png`, `mobile-middle-diagnostics.png`, `mobile-bottom.png`, `mobile-keyboard-focus.png`.
- `mobile-natural-keyboard.json`, `mobile-control-observations.json`.
- `throttled-desktop-chromium.json`, `throttled-mobile-chromium.json` (conditions and raw samples).
- `performance-desktop-chromium.json`, `performance-mobile-chromium.json` (20-load local regression).
- `verification2/mobile-keyboard-before-fix.png`, `verification2/mobile-keyboard-before-fix.json`, and `verification2/pre-verification.patch`.

To undo only this pass's application fix, remove the one `@media(max-width:820px)` rule targeting `.admin-marketing :is(input,select,button,summary,[tabindex])` with `scroll-margin-block:24px 100px`. Leave all public nav rules unchanged. For full source rollback, follow `ADMIN_MARKETING_CHECKPOINT_20261005.md`; preserve unrelated edits and archive new files individually.

Database recovery remains separate: `docs/rollback/admin-marketing-report-function.sql` restores the original function and grants in a transaction. Its contents are statically matched to the baseline, but **execution has not been verified**, since no migration has been applied to a test target. A source tag does not restore function state or migration history.

Paused for review. Production deployment and production migration are not authorized.
