# Publication-report query investigation — 5 October 2026

## Decision

Recommend a separate, focused migration replacing the repeated property-first-publication calculation with one grouped calculation joined to the report. This is a proposal supported by a local-only experiment, not an applied application migration. No application, UI, collection, hosted database or production deployment changes were made.

The previous ~23-second observation was real for the synthetic stress fixture, but it was not representative of normal listing distribution. It also used a minimal fixture missing two existing repository indexes. Neither fact makes the slow case acceptable: the repeated calculation remains expensive even with those indexes.

## Target and method

- Reused PostgreSQL 17.11 in `C:\Users\PC\Documents\Codex\vacancy-marketing-postgres-test-20261005`, database `vacancy_marketing_test`, listening only on `127.0.0.1:55432`.
- Guard checked host, port, database name and the synthetic-only database marker before each script.
- Synthetic data only; no production credentials, requests or data. No installation or paid resource.
- Each scenario ran in a transaction and rolled back, including fixture replacement, added indexes and candidate function replacement. Existing synthetic data and the original recovered function remain in place.
- Three sequential timings per variant, with `ANALYZE` after seeding/index changes. Report-function timing includes JSON construction, but excludes transport, browser work and even JSON serialization to the client. This is a local regression comparison, not production p95 or cold-cache benchmarking. Variant order was fixed; caches and planning can affect small differences.
- Scenarios are plausible scale examples, not measured Vacancy production distributions. Distributed scenarios have four history rows per listing (initial NULL→active, redundant active→active, pause and republication) and one attributed submission event per listing. The extreme fixture has one publication per listing and no analytics events. All scenario publication timestamps are distinct; equality checks include every output field and ignore only dynamic `generated_at`.
- The existing-index variant adds the repository's `rooms_property_idx` and `vacancies_room_idx`. This remains a minimal schema, not a clone of every hosted index/configuration. The original fixture already has activity `(entity_id,created_at)` and analytics `(vacancy_id,created_at)` indexes. Hosted plans still require separate validation.

## Measurements

Median milliseconds from three function calls; complete raw samples are retained.

| Synthetic scenario | History rows | Original minimal fixture | Original + existing FK indexes | Grouped candidate + same indexes |
|---|---:|---:|---:|---:|
| 20 listings / 10 properties | 80 | 3.5 | 3.6 | 3.1 |
| 200 listings / 40 properties | 800 | 28.3 | 28.7 | 13.9 |
| 1,000 listings / 200 properties | 4,000 | 294.9 | 199.4 | 64.0 |
| 5,000 listings / 1,000 properties | 20,000 | 5,171.0 | 476.0 | 289.5 |
| 5,001 listings / one property (stress) | 5,001 | 20,051.4 | 19,217.5 | 169.5 |
| Same 5,000-listing history, only 20 in the reporting window | 20,000 | 30.4 | 12.3 | 21.8 |

The stress comparison improves roughly 113× against the version with existing indexes. A narrow reporting window has a real trade-off: the grouped candidate scans/group-calculates all qualifying property history once, so this case is about 9.4 ms slower. That bounded local cost is preferable to the measured multi-second repeated work, but do not claim the candidate wins every workload. Much larger historical tables and hosted concurrency are not verified here.

Response content/size is unchanged by the optimization. The 5,000/5,000 distributed report is about 5.07 MB of uncompressed JSON text. This query improvement does not solve the separately accepted payload/transfer limitation; the earlier browser-only transfer tests excluded real SQL execution.

## Cause demonstrated by the plan

The correlated `MIN(log.created_at)` is evaluated separately for each returned publication. In the indexed stress plan, its aggregate executes **5,001 times**, each over **5,001 matching history rows**: about 25 million row visits just for that scan, plus repeated joins. Its aggregate reports about 4.833 ms per loop and 420,121 shared-buffer hits. The entire instrumented SELECT took 24,411 ms.

The candidate computes `MIN(created_at) GROUP BY property_id` once, with the same qualifying transitions and full-history scope, then joins those results to the listing publications. Its grouped aggregate executes **once** (7.514 ms), with 121 shared-buffer hits; the entire instrumented SELECT took 121.816 ms. EXPLAIN adds instrumentation overhead and uses the extracted inner SELECT, so these numbers are distinct from the function timing table.

Attribution lookup, per-listing earliest-history selection, date boundaries, sentinel limits, JSON fields and security checks remain unchanged. The optimization adds no tables, jobs, cache, dependency or new reporting architecture.

## Executed checks

- Six scenario output-equivalence assertions passed across original, indexed-original and grouped-candidate variants, excluding only generation timestamp.
- Candidate correctness suite: **15 assertions passed**, including anonymous/AAL1-admin/AAL2-nonadmin denial; authorized AAL2-admin report; UTC start-inclusive/end-exclusive boundaries; NULL old statuses; ignored redundant active records; earliest history excluding republication; advancing server timestamp; independent 5,000/5,001 event/publication limits; preserved owner/grants/search-path/security-definer configuration; and removal of candidate definition after rollback.
- The permission assertions use real PostgreSQL roles and controlled local claim settings. They do not validate signed tokens or a hosted login flow.
- Narrow-window test exposed the modest slowdown above; it is documented, not hidden as a universal performance win.
- No SQL assertion failed. An offline plan-output parsing attempt failed and was corrected without rerunning or changing database behavior. Earlier reports and artifacts remain retained.
- No public-site regression run was necessary for this investigation: only a QA runner, local generated SQL/evidence and this documentation changed. Application source/migrations were not edited by this investigation.

## Proposed migration and recovery

If approved, add **a new migration after `20261004231152_admin_marketing_generated_at.sql`**. Do not rewrite an already applied migration. Replace only the correlated property minimum with the tested grouped relation, retain the function signature, dynamic `generated_at`, authorization checks, grants, owner/security configuration and limits. No new indexes or schema changes are proposed: the two measured FK indexes already exist in repository migrations; their actual presence on the eventual target must be checked rather than assumed.

Before applying that future migration to any approved environment, save `pg_get_functiondef` and function owner/ACL/configuration. Its reverse migration must restore the **generated_at-capable pre-optimization definition**, not blindly use the older rollback file that removes `generated_at`. Verify definition/security equality and access tests after recovery. No such new migration has been added or applied now.

Current experimental rollback was automatic SQL `ROLLBACK` for every case. PostgreSQL was stopped afterwards, with zero listening connections on port 55432 and no `postmaster.pid`, recorded in `database-investigation/shutdown.json`. Source rollback checkpoint remains `rollback/before-admin-marketing-page-20261005` at `5dc40368614a03fd5447a7591c5a5b68eebf016a`; do not reset to it or discard unrelated uncommitted release work. To undo only this investigation's source additions, remove the new QA runner and this report; no application source restoration is needed.

## Remaining hosted authentication checks — NOT verified locally

On a separately approved hosted development/test project, with synthetic test accounts:

1. Exercise real login, configured OAuth/email redirects and callbacks, session refresh and logout. Local SQL claims do not verify credential handling, signed JWT issuance/validation, expiry or invalid-token rejection.
2. Enrol/challenge MFA and verify actual AAL1→AAL2 elevation; call the report through hosted RPC as admin AAL2, admin AAL1, anonymous and authenticated non-admin (including non-admin AAL2).
3. Verify the hosted RPC gateway, deployed helper/function definitions, role grants and security settings match the reviewed configuration. Test direct RPC access, not merely hidden admin controls.
4. Verify browser session expiry, token refresh and loss of authorization cannot display fresh sensitive timelines/error details; confirm the admin UI handles hosted permission failures safely.

No hosted test project/credentials were used in this investigation. Hosted service configuration, MFA delivery, token validation and complete login behavior remain unverified. Production remains unchanged.

## Retained evidence

Runner: `qa/marketing-db/investigate.cjs`.

Evidence folder: `C:\Users\PC\Documents\Codex\2026-09-07\referenced-chatgpt-conversation-this-is-an\work\marketing-checkpoint-artifacts\database-investigation`.

Includes generated SQL, local-only candidate SQL, stdout/assertion logs, `measurements.json`, `measurements-narrow-window.json`, extracted `plan-0.json` / `plan-1.json`, and `shutdown.json`. The narrow-window rerun repeated the correctness suite and replaced its identical-named evidence with the latest successful run. Runtime and all prior test files remain retained as requested. Local credential file stays restricted in the runtime folder and was not copied into evidence.
