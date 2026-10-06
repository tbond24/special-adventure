# Scoped map, listing and admin changes — 6 October 2026

Development implementation only. Production has not been changed or deployed.

## Scope and verified outcome

| Request | Implementation | Verification |
| --- | --- | --- |
| Remove map gear; align remaining controls right | Removed duplicate gear markup; reused existing Filters opener | Desktop/mobile browser and screenshot |
| Two-column, scrollable filters; sideways smaller toggles | Scoped filter grid; 40×24 visual switches become 30×18; labels retain existing fonts and clickable row | Desktop/mobile geometry, open/dismiss, screenshots |
| Deposit filter | Maximum amount in selected display currency. Zero supported. Unknown deposits and unavailable conversions excluded only when a maximum is set | Actual four-listing synthetic inventory: 100→two, 0→one, blank→four |
| Selected unit type visible and editable | Fixed nested compact-field grid squeezing the select to ~47px; retained the existing selection/data path | House→Studio selection, draft restore |
| Admin recent activity | Existing Activity section: recorded browser IDs in previous five minutes, current non-guest accounts created in preceding 24h, sources/session counts, actions, latest 20 events. Server aggregation; 30-second refresh only in visible Activity | Full existing shell, desktop/mobile navigation, safe text rendering, failed-refresh stale notice; database access tests |
| Save and exit | Grey button on Location/Listing details/Review; preserves form, pin, selected local/library photo files in browser IndexedDB; returns Dashboard. Edit drafts reopen the original listing and do not publish | Create, edit, restoration, photo isolation, storage failure, no update call on saving |
| Unique listing clicks | Distinct (listing, signed-in account or anonymous browser) across whole selected interval; self/admin clicks excluded. Unknown historical anonymous events excluded and disclosed | Database repeats across days/devices/listings, narrower period, inclusive start/exclusive end, RLS insert identity |
| Listing location scroll | Existing location text is an accessible button to the existing lower map | Desktop/mobile actual scroll, listing title unchanged |
| Saved title/count | Existing heading/count at top; heading 24px | Desktop/mobile computed style |
| Admin favicon media | Existing Appearance section; common raster formats decoded and fitted to 64×64 PNG; 64px/16px previews; save and previous-version restore; revision conflict protection | Browser conversion and restore; real generated PNG accepted and restored by SQL; unauthorized/unsafe input denied |

## Evidence

- Final browser suite: **34 passed, 0 failed, 0 skipped**, desktop/mobile Chromium, 28.3 seconds. Includes existing admin atomic-render/MFA-gate and Google callback regression suites.
- Local PostgreSQL: **21 executed PASS checks**, exact new migration inside a transaction on the existing guarded synthetic-only cluster at 127.0.0.1:55432. Transaction rolled back and server stopped.
- Authorization: anonymous, authenticated non-admin and AAL1 admin denied reporting/settings; AAL2 admin accepted. Existing private.is_admin membership/AAL2 check reused. Public favicon limited to current image/revision, no direct writes.
- Dynamic report timestamps, valid PNG, invalid format, stale revision, restoration, exact previous owner-metrics function recovery verified.
- Browser and SQL evidence: qa/scoped-edits/browser-results.json, database-results.txt, database.cjs and database.sql. Screenshots in qa/scoped-edits/screenshots; admin images explicitly label synthetic data.
- Initial test failures included assumptions about formatted amounts/coordinates and attempting to move the map before Find initialized. Those fixtures were corrected; no country-centering or inventory-refresh behavior changed. Visual review found and corrected hidden-checkbox layout space. Draft review added the unrelated-draft-photo isolation check.
- No dependencies added. No production data used, production migration applied, or deployment performed.

## Important limits

- Recent recorded activity is not a dependable count of people currently online. Existing data supplies referral/campaign sources, not verified visitor countries. No new heartbeat or geographical tracking was added.
- Click identity is account-based when signed in and browser-based otherwise. It cannot identify one anonymous person across devices; signing in after anonymous browsing can count separately. Older unidentified clicks cannot be reconstructed.
- Save and exit is device/browser-local, not account-synced. Clearing browser data loses local drafts/photos. New media is not uploaded until publishing. Existing server listing photos stay on their existing path.
- PNG/JPEG/WebP/GIF/AVIF/BMP/ICO accepted where the browser decodes them; animation becomes a still image. SVG/video are intentionally not accepted. Small source artwork cannot gain detail through resizing.
- SQL checks use a synthetic dependency schema and controlled auth claims, not a hosted Supabase login/MFA session or PostgREST schema-cache verification. Hosted migration/access checks and live analytics counts remain unverified. Safari/iOS real-device behavior remains unverified.
- If the new server migration is absent, click collection falls back to the existing endpoint and owner metrics explicitly say recorded opens rather than unique clicks. New admin panels show unavailable state. Do not claim the new backend features are live before migration/deployment verification.

## Rollback and release dependencies

Source checkpoint: rollback/before-map-listing-admin-edits-20261006 at fe72fac. Existing live deployment remains vacancy-72pvwifb6-tbond24s-projects.vercel.app.

New unapplied production migration: supabase/migrations/20261006135232_scoped_activity_unique_clicks_favicon.sql. Review/apply to an isolated hosted test target before any production release. Verify real admin/AAL2 and non-admin API access, then release only with production approval.

Source recovery: revert this scoped change commit, or restore only its listed files from the checkpoint after preserving subsequent work. Do not reset unrelated work.

Database recovery after a future application: first return clients to the previous source, then run docs/rollback/scoped-owner-metrics-20261006.sql to restore the exact earlier owner report. Leave additive favicon data and click endpoint intact to avoid losing settings or events from cached clients. New admin functions may remain unused; do not drop populated tables to roll back UI. In this test run the entire migration was transactionally rolled back, so no database recovery is outstanding.

Temporary PostgreSQL files remain in C:/Users/PC/Documents/Codex/vacancy-marketing-postgres-test-20261005; no service/system changes. Server was stopped after tests.
