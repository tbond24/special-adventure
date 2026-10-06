# Scoped release publication — 7 October 2026 (Australia/Perth)

- Application source: e35ddd9, feature/owner-requested-edits-20261001.
- Live: https://getvacancy.site → vacancy-7t0qwlnm4-tbond24s-projects.vercel.app.
- Verified deployment: dpl_3Lfzxakv1wbkkAdsXUZ8qGPpC6Vy. Vercel promotion also created FGJBAdnfonEre6hR8iaqMUJSobsR; the custom domain initially remained on the old build, so it was explicitly aliased to the verified deployment.
- Production migration: scoped_activity_unique_clicks_favicon, hosted version 20261006161630, exact SQL from source migration 20261006135232.
- No additional application edits during publication.

## Executed checks
- Previously completed: 34 browser checks and 21 local synthetic SQL checks (see scoped-map-listing-admin-20261006.md).
- Production preflight confirmed the expected earlier owner function, required analytics columns, existing insert RLS, and membership plus AAL2 admin guard.
- Hosted read-only SQL transactions: admin/AAL2 report and favicon reads succeed; admin/AAL1 and non-admin/AAL2 reads denied. Claims were supplied inside database transactions: these are database authorization checks, not an end-to-end hosted login/MFA test.
- Unique click capability enabled; activity report generated dynamically; favicon singleton revision zero.
- Anonymous admin RPCs return 401 over the real REST API. Public current favicon read returns 200. No anonymous execute grants on admin functions, no direct authenticated favicon update, no public previous-favicon read; RLS enabled.
- All 17 changed application files on the custom domain byte-match the committed release. Evidence: qa/scoped-edits/live-release-checks.json.
- Live browser: Find rendered an existing listing; Filters opened; Maximum deposit present; duplicate map gear absent. Browser closed afterwards.

## Limits
- Hosted isolated test project vacancy-admin-test is paused; Charity and other projects were not changed. No new end-to-end authenticated login/MFA or production favicon write test was performed in this publication turn.
- Browser smoke at approximately 2026-10-06 16:20 UTC used normal Find behavior and may have recorded a visitor session/impression. No listings/accounts were created, no messages sent, and no production analytics were removed. Exact telemetry generated was not separately enumerated.
- Activity is recorded activity, not proof of live people online. Geographic visitor data remains unavailable. Draft media remains local to the browser/device; prior report documents these limits.

## Rollback
- Source checkpoint: rollback/before-map-listing-admin-edits-20261006 at fe72fac.
- Restore live frontend by aliasing getvacancy.site to vacancy-72pvwifb6-tbond24s-projects.vercel.app using the existing Vercel project/configuration.
- If reverting owner metric semantics, apply docs/rollback/scoped-owner-metrics-20261006.sql as a new recovery migration. Its definition matched production before this release.
- Keep additive tracking endpoint and favicon table/data intact for cached clients and data preservation. Do not drop populated data as a frontend rollback.
