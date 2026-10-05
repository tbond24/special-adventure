# Connected admin release verification — 2026-10-05

## Scope and authorization
The owner approved completing and publishing the existing admin redesign and explicitly approved live first-party journey tracking. No advertising integration, messages, address content, production seeding, automatic retention deletion, or public appearance change is included.

Starting source: 5dc40368614a03fd5447a7591c5a5b68eebf016a on feature/owner-requested-edits-20261001. Earlier uncommitted admin work is preserved in this release. Scoped source backups are outside app/ in ../marketing-checkpoint-artifacts/visual-milestone/source-before and connected-release/source-before.

## Implementation
- Existing seven admin sections retained; responsive light shell, navigation drawer, system typography and blue accents. Existing operational actions retained.
- Marketing uses server aggregates and explicit observed milestone edges: Location, Listing details (including media/pricing), Review, Submission. Accessible tables and 50-record pagination accompany the visual.
- Arrival sessions, creation journeys and distinct published listings remain separate counting units. Sources/campaign/device filters execute on the server.
- Unknown linkage is not failure. No recorded confirmation is not abandonment. Conversion percentage is deliberately unavailable because best-effort collection cannot establish complete coverage.
- Seven-day observation plus 24-hour maturity grace; 90-day reporting window; no deletion job. Server received times determine cohort boundaries. Delayed/missing events can remain unlinked and are disclosed.
- Collector is bounded (100 queued events; batches <=20 and 32KB; three retries), non-blocking and excludes ordinary edit flows. Draft metadata preserves journey identity. Publication association requires existing client request ID plus matching authenticated property owner; conflicting associations are excluded.
- Existing legacy report remains behind an expandable panel, retaining timelines, errors, performance and independent 5001-row completeness guards.
- Only public code changes are the collector script, two backend methods, draft metadata and an optional step hook. No public form field, styling, navigation or publish behavior changed.

## Executed checks
- Hosted project raauicmfyjpcuhfzknak only: real password login, TOTP enrollment/challenge/verification, AAL2, token refresh and logout. Anonymous/invalid token/AAL1/non-admin report requests denied; admin/AAL2 allowed. Separate HTTP test recorded 25 passes for each report.
- Browser real hosted Auth/MFA/report on desktop and mobile passed. Other admin operational APIs used labelled synthetic responses because the isolated project deliberately contains only the report dependencies.
- New report: null old status; earliest qualifying publication across full available history; active-active duplicate; republication; retry deduplication; two distinct listings in one property; unknown associations; UTC half-open cohort bounds; invalid/expired window; explicit direct-entry gaps; source filtering.
- Legacy report final hosted SQL: independent 5000/5001 analytics and publication limits, dates, deduplication, dynamic generated_at and role denials all completed without assertion exceptions.
- Database recovery: restored previous report, removed/recreated new RPCs, reapplied combined migrations and checked report equality excluding generation time. Passed. First rehearsal included nested transaction markers and failed authorization after the inner COMMIT; second had a harness string replacement error. Corrected transactional harness passed; synthetic test only.
- Browser regression batch: 20 passed, one desktop-only skip, one obsolete navigation assertion failed. It assumed a visible public navbar inside admin. Corrected to use viewport bottom when hidden; mobile rerun passed.
- Actual listing Location->Details->Location exercised on desktop/mobile, records actual edges and excludes address content: two passes.
- Collector tests: three passes including denied storage, original publish errors unchanged, legacy drafts, queue/batch bounds.
- Hosted refresh failure clears previous counts and Retry recovers. Safe text rendering, source filters, pagination and no horizontal overflow tested.
- Mobile ordinary viewport screenshots: top, flow, expanded diagnostics, bottom. Public navigation is hidden only within admin. Stage keyboard focus survives refresh.
- Static migration preservation tests and git diff whitespace checks passed.

## Performance
1000 events: grouped aggregate 145.447ms SQL, 10762 JSON bytes in one measured run.
100000 events: original plan timed out even with a 20-second limit. EXPLAIN showed underestimated CTE rows and repeated nested loops. Grouped facts plus report-function-only enable_nestloop=off and jit=off: 1136.985ms SQL, 10912 JSON bytes. This misses the aspirational one-second SQL target slightly; it is not represented as a pass against that target.
Hosted 1000-event browser samples at 1.6Mbps down/0.75Mbps up, 150ms latency, 4x CPU: desktop 323–341ms; mobile 313–612ms in initial three-sample runs. JSON ~11.3KB. Server used gzip; local gzip-equivalent ~763 bytes is not a measured wire size. Final browser evidence also records Playwright transfer sizes. These are limited regression measurements, not production p95.
The previously accepted legacy raw-report loading limitation remains. The primary new report uses aggregation; historical diagnostics load only when opened.

## Limits
No production email delivery test or real-user publication was performed. Isolated schema is not a full production replica. Production compatibility was inspected read-only (columns, event constraint, insert RLS, request IDs, admin/AAL2 predicate). Hosted synthetic verification proves those tested hosted paths, not every production account/provider configuration.
No existing historic rows are reclassified into invented connected paths. New data starts after activation. Bots, blocked scripts, lost queues, shared devices and missing earlier publication history limit measurement.
Security advisor reports expected authenticated SECURITY DEFINER warnings for protected reports, and deny-all synthetic dependency tables. Existing Free-project leaked-password-protection warning remains; no security gate was weakened.

## Rollback
Previous production deployment: vacancy-mg6iw821v-tbond24s-projects.vercel.app (dpl_3byJSaGBSz7THxPrcwZuSkEvCLxV).
Restore that deployment to revert app presentation and collection. Then apply docs/rollback/connected-admin-release.sql and docs/rollback/admin-marketing-report-function.sql to restore the previous reporting endpoint and revoke new collection. Keep additive columns/indexes and all recorded evidence. This is source/function recovery, not recovery of deleted data; no data deletion is part of the release.
The verified test rehearsal is qa/marketing-db/hosted-final-recovery.sql. Never run synthetic fixtures on production.

Temporary hosted project is free. Charity was paused with owner approval to free its slot; after verification pause the test project and restore charity. Keep synthetic evidence/credentials outside the deployed app. No Windows service, WSL/Podman or paid resource was created.


## Published result
Release source commit: b7f8d96. All five named release migrations applied successfully to Vacancy production on 2026-10-05. No synthetic migration or fixture was applied. Deployment dpl_5FfU88kiYH1Up2bzTfjG13n7WReZ, https://vacancy-mnjx5h8t9-tbond24s-projects.vercel.app. The explicit getvacancy.site alias was updated after discovering deploy --prod only advanced the default project alias. Live custom-domain smoke passed at 07:30:58 UTC: three new assets HTTP 200, collection HTTP 200, anonymous report denied, sign-in rendered, no browser script errors.

Read-only production report verification returned 116 legacy events and 8 first recorded publications in the preceding 30 days, before smoke telemetry; new connected counts started at zero as expected. No historic paths were fabricated. The release-verification/admin-20261005 live visit recorded exactly one version-2 session-start and one landing event. The earlier custom-domain check at approximately 07:28–07:30 UTC used the previous deployment and may have added legacy landing/session telemetry; it was not deleted. All synthetic correctness/auth/performance datasets remained on the isolated test project.

Final hosted throttled samples: desktop 353–445ms, mobile 340–353ms, 11294 decoded JSON bytes; Playwright reported compressed response-body sizes 1593–1597 bytes (response-header size unavailable/0), gzip encoding. Local gzip-equivalent values are separate and are not wire measurements. Three samples per device, not p95. Final hosted desktop/mobile browser rerun: two passes.

Charity restoration requested after pausing vacancy-admin-test. No local PostgreSQL process remained. Final project status is recorded in the completion note.
