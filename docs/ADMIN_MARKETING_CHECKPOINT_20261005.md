# Marketing implementation checkpoint — 5 October 2026

Follow-up verification, corrected transfer measurements, the mobile keyboard fix, database-access requirements and telemetry detail are recorded in `ADMIN_MARKETING_VERIFICATION_20261005.md`. The results below are the historical first checkpoint.

Status: development/test implementation only; paused for review. No deployment, push, or database migration has been performed. Changes remain uncommitted.

## Baseline and scope

Revision: `5dc40368614a03fd5447a7591c5a5b68eebf016a` on `feature/owner-requested-edits-20261001`.
Source rollback tag: `rollback/before-admin-marketing-page-20261005`.
The baseline working tree was clean. No unrelated edits were present to preserve. The tag preserves source, not database state.

Keep/change/remove decisions implemented:

| Existing functionality | Decision |
|---|---|
| Admin shell, navigation and verification gate | Keep unchanged; reuse existing rendering and RPC |
| Date, source, campaign and device controls | Keep; UTC dates, explicit completeness and failure handling |
| Session timelines | Keep existing inspection, recorded events only; labels replace displayed raw session IDs; no additional drill-down |
| Performance information | Keep measured medians and sample counts for readiness, upload and active-step durations |
| Error information | Keep grouped error category/step/device counts and first/last recorded times; safely escape values |
| Marketing sub-tabs | Replace with one report and expandable diagnostics, session events and definitions |
| Funnel, conversion/drop-off implications and inferred publication journeys | Remove misleading interpretation; present recorded stage counts and independent publication count |
| Unsupported Live/Active now, people totals and source conversion | Do not add |

## Files and concise diff

- `app/src/admin-lister-marketing.js`: bounded Marketing renderer, coverage, tables, filters, diagnostics, freshness and safe failure states. No collector or public routing changes.
- `app/styles.css`: rules scoped to `.admin-marketing`; light surfaces, blue accents, system font, responsive controls, scrollable semantic tables. Existing admin shell styling unchanged.
- `supabase/migrations/20261004231152_admin_marketing_generated_at.sql`: new migration; only function-result change is dynamic server `generated_at` from `clock_timestamp()`. Signature, security-definer setting, empty search path, membership/AAL2 predicate, grants, queries and both limits retained. Not applied.
- `tests/marketing-dev-server.cjs`: localhost-only synthetic fixture server; external connections blocked by test-server CSP.
- `tests/marketing-report.spec.js`: data-limit, safety, UTC, refresh, UI-access, keyboard, screenshot and performance verification.
- `tests/marketing-public-regression.spec.js`: baseline/current public style, control and request-path comparisons.
- `tests/marketing-migration.test.cjs`: exact additive SQL preservation checks, not database execution.
- `tests/lister-marketing.spec.js`: existing admin test updated for accurate report labels and valid fixture records; collector tests unchanged.
- This document and `docs/rollback/admin-marketing-report-function.sql`: checkpoint and separate database-function recovery.

## Data rules

Analytics and publications each use their own raw dataset validity and 5,001-row sentinel before local filters. At most 5,000 rows is a complete response. Missing, malformed or truncated analytics suppress counts, sources, stages, timing/error details and timelines; filter options are not derived from that dataset. Complete, valid publications remain available independently, and vice versa.

First recorded publications count distinct listing IDs. The unchanged SQL selects the earliest qualifying transition to active across available history, using `old_status IS DISTINCT FROM 'active'` (including NULL), then applies the reporting range. Earlier missing history means this cannot prove first-ever publication. Publications receive only date filtering; they are not attributed to the filtered browser journey.

Event totals count records. Browser IDs are not verified people. Session/source tables use stored session IDs and recorded attribution. There is no fabricated completion window, exit classification, percentage or observed-path claim. Details, Photos and Pricing completion share an existing trigger; they are not independent screens. Stage rows and source rows must not be summed into a conversion funnel.

Custom ranges include UTC start midnight and exclude midnight after the chosen final date. Rolling ranges end at request time. Report generation and latest matching event are separate timestamps. Failed refresh clears results and provides Retry; an older request cannot overwrite a newer selection. No automatic polling was added.

Session/error content uses escaping or textContent; no raw payload viewer or additional identifiers are exposed. Server-side authorization remains required even though UI gates are tested separately.

## Evidence actually run

- `npx playwright test tests/marketing-report.spec.js tests/marketing-public-regression.spec.js --workers=1`: **14 passed**, desktop and mobile Chromium (39.2 seconds).
- Existing admin integration test (`tests/lister-marketing.spec.js`, filtered to Marketing results): **2 passed**.
- After adding missing-array handling, targeted invalid-dataset/race/keyboard test rerun: **2 passed**. This is a rerun of existing cases, not two extra unique cases.
- `node tests/marketing-migration.test.cjs`: **passed**, static SQL comparison.
- JavaScript syntax and `git diff --check`: passed.

| Requested check | Evidence and limit |
|---|---|
| Authorized/admin/AAL2; anonymous, AAL1, non-admin denial | Mocked browser authorization gates passed and prevented reporting calls. Static SQL confirms existing backend predicate/grants unchanged. Actual database-role execution blocked; NOT claimed verified |
| Completeness | 5,000 accepted; 5,001 suppresses affected dataset; independent publication limit; missing/invalid arrays; local filtering cannot recover truncated data: passed |
| UTC boundaries | Browser in Perth sends custom 4–5 October as `[2026-10-04T00:00Z, 2026-10-06T00:00Z)`; SQL half-open predicate preserved. Actual PostgreSQL boundary fixtures not executed |
| Publication deduplication | Duplicate returned listing IDs count once: passed. Earliest full-history and NULL old_status semantics checked statically, not executed in PostgreSQL |
| Refresh failure | Stale counts cleared; Retry succeeds; late old response cannot replace newer report: passed |
| Sensitive data | Malicious strings render as text, no injected image/SVG/script nodes; no raw session IDs shown: passed |
| Accessibility | Native controls, labelled scroll regions, semantic tables and keyboard disclosure checked; no full screen-reader audit claimed |
| Public regression | Find, auth and List visible controls/computed styles and unique request paths compared against rollback source on desktop/mobile: passed; no Marketing RPC or panel on public routes |

No test covers every public workflow or every other admin section. Collection source, backend adapter, package files, routing and public templates were not edited. Two pre-existing collector-specific tests were not rerun. The comparisons do not establish production availability or performance.

Initial localhost browser smoke used the existing public backend configuration before fixture isolation was tightened; existing passive telemetry may have been emitted. Subsequent automated checks intercepted external traffic, and the test server now blocks external connections. No production admin mutation, migration or deployment was performed.

## Screenshots and performance artifacts

Artifacts are in sibling directory `../marketing-checkpoint-artifacts/` (outside the app bundle):

- `desktop-chromium.png`
- `mobile-chromium.png`
- `performance-desktop-chromium.json`
- `performance-mobile-chromium.json`

Screenshots visibly identify DEVELOPMENT / SYNTHETIC TEST DATA. Desktop and mobile screenshots were visually inspected. Mobile tables scroll horizontally within their panel; the existing fixed navigation stays unchanged and appears at the captured viewport position in the full-page screenshot.

20 loads per size/version/device; synthetic local HTTP fixture, unthrottled host, mobile emulation (not physical mobile hardware). Response sizes are JSON bytes, not compressed network transfer. Request timing includes fetching/decoding the local fixture; render timing is receipt to two animation frames; filter timing includes synchronous layout. This is a limited regression check, not a dependable production p95 or database benchmark.

| Current version | Events | JSON bytes | Mean request ms | Mean render ms | Mean filter ms | Maximum filter ms |
|---|---:|---:|---:|---:|---:|---:|
| Desktop | 1,000 | 588,475 | 14.90 | 43.66 | 1.77 | 2.10 |
| Desktop | 5,000 | 2,947,806 | 44.74 | 62.08 | 3.52 | 4.50 |
| Mobile emulation | 1,000 | 588,475 | 16.29 | 44.96 | 2.05 | 2.80 |
| Mobile emulation | 5,000 | 2,947,806 | 53.67 | 72.58 | 4.33 | 6.10 |

Baseline 5,000-event mean request/render/filter: desktop 43.09/60.72/3.36 ms; mobile emulation 50.05/65.84/4.42 ms. No meaningful speed improvement is claimed. Near-limit payload is substantial (~2.95 MB); production latency remains unmeasured. This release adds no pagination or data architecture work outside scope.

## Blocked verification

No available local PostgreSQL/Docker test runtime was found. The migration has not been applied even in development. Executed database authorization (all four roles), timestamp generation, real history deduplication and SQL response timing remain required before production approval. Browser mocks and exact SQL-preservation tests do not substitute for those checks. Do not use production to close this gap without separate authorization.

## Exact rollback

Before rollback, preserve this review diff if needed. From the repository root restore only existing modified source/test files:

```powershell
git restore --source=rollback/before-admin-marketing-page-20261005 -- app/src/admin-lister-marketing.js app/styles.css tests/lister-marketing.spec.js
```

The following are new files, so source restore does not remove them. Archive individually outside the repository if abandoning this release: the new migration, four `tests/marketing-*` files, this document, and `docs/rollback/admin-marketing-report-function.sql`. Do not run a blanket clean/reset or alter unrelated work. Screenshots/measurements can remain as review evidence outside the app.

Database rollback is separate. None is needed now because no migration was applied. If the new migration is later applied to a development/test database:

1. Verify the target is development/test, and capture the installed function definition, owner and ACLs before applying the forward migration.
2. To recover the baseline function, execute `docs/rollback/admin-marketing-report-function.sql` against that same verified development/test target. It uses a transaction and restores the previous function plus explicit grants without changing business data.
3. Compare the recovered definition, owner, security configuration and grants to the saved baseline; rerun authorized and denied role checks.
4. Record the recovery in development migration history using the team's migration-repair procedure; restoring SQL does not itself reverse the migration ledger. Do not blindly reapply it or manipulate production history.

The source tag alone cannot perform any of these database recovery steps. Production deployment and migrations require separate approval after review.
