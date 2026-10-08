# Scoped rent, rendering, map and owner/admin controls — 8 October 2026

## Requested changes and result

| Request | Development result |
|---|---|
| Huge rent rejected as non-positive | Confirmed comma-formatted edit rent became NaN and JSON null. Create/edit API parsing now accepts positive decimal strings without converting them to floating-point first. Blur formatting preserves digits. Invalid and negative amounts remain rejected. |
| Any amount | No arbitrary input maximum. New migration widens only legacy weekly_rent and bond numeric(10,2) mirrors to numeric; rent_amount/monthly_rent/deposit already use unrestricted numeric. Practical database/JavaScript limits still exist; this is not a promise of infinite numeric range or unlimited exact precision in all display calculations. |
| Notification pills | Equal vertical and horizontal padding, consistent line height, restrained rounded corners. Detail-page notification gets an explicit bottom placement instead of simultaneous top/bottom sizing. |
| Initial map includes country and nearest listings | Deferred as requested. Existing first-open country and saved-viewport behavior retained. Proposed future approach: fit a country anchor plus nearest valid listing, with marker padding and a world-view fallback; do not request GPS merely to initialize it. A country estimate is not a precise visitor location. |
| Static gold ring | Removed selected-card gold border. Click focus uses a thin 2px category-colored outline; selected map marker retains its category background with one thin outer selection outline. |
| Find / You / Inbox second render | Find refresh updates the existing map/cards instead of rebuilding Home. Account data is loaded before account markup and reused for contact controls. Inbox data is fetched once on initial render and reused by polling. Requested pages are revealed after their current renderer chain completes, with the existing loader during preparation; stale account/message results cannot replace a different route. Existing base code reused rather than deleting code still used by enhancements. |
| Pencil edit missing | Restored a separate pencil in each owner unit's action row. Unit-name edit remains available. |
| Bin appears not to work | Archive row was retained in the default All statuses view. Default is now accurately labelled Current listings and excludes archived/removed, with counts matching visible rows. Archived filter retains restore and delete. Status API requires the server to return the changed row before reporting success. Confirmation remains required. No permanent deletion of production data was performed. |
| Listing map reset | Back to listing button at map bottom recenters the listing pin and original zoom; reduced motion respected. |
| Configurable admin workspace | Existing sidebar/workspace retained. Existing Overview cards can be reordered by desktop drag or accessible Move earlier/later controls; small/wide sizes snap to a grid; per-admin layout saved on that browser. No new tracking, graphs, artificial counters, dashboard backend or dependencies. |

## Admin metric ideas

Use different labels for distinct accounts, browser IDs and sessions; none is interchangeable with unique people. Existing Activity offers accounts/listings added and other daily series with graph/table controls. Existing recent activity reports browser IDs observed in five minutes; absence of an event does not prove someone left. For a later custom-time graph, choose a bucket size and disclose refresh interval. Distinguish current paused listings from pause transitions; distinguish created records from published listings. These definitions are release requirements for additional metric cards, not fabricated values in this build.

## Verification actually executed

- Full affected/regression browser run: 42 passes, desktop and mobile Chromium; no failures/skips/flaky results. Includes prior create/edit draft/media, filter, map, listing and admin rendering tests.
- After inventory label/count changes and an additional Find refresh test: 18 affected passes. Confirms the existing map object/node is retained without another layout call.
- Final decimal edge cases and actual desktop drag/mobile movement: 4 passes.
- Local PostgreSQL: 4 checks passed against the exact migration in a guarded synthetic transaction: old amounts preserved, high-decimal amounts stored exactly, legacy cap removed, complete rollback. PostgreSQL stopped afterwards.
- Script syntax checks passed; diff whitespace check passed.
- Full admin screenshots use clearly labelled DEVELOPMENT / SYNTHETIC DATA. Desktop/mobile have no horizontal overflow; eight existing cards available. Screenshots in qa/scoped-edits/oct08-screenshots.
- Initial failed run included four tests pointed at an inactive port, ambiguous admin refresh selectors, a closed My account form incorrectly expected to be open, and a trailing-zero formatting difference. Corrected test targets/selectors and preserved old formatting before final runs. No failing test was treated as a pass.

## Limits and release status

- Production unchanged. New database migration not applied to production; no live listing deleted, archived or edited during these tests.
- Hosted login/MFA and authenticated production writes not exercised here. API request and UI action tests used synthetic data/mocks; database migration used the existing local synthetic test cluster.
- Very large amount publishing on a preview that uses the live database remains subject to the old legacy mirror precision until its new migration is approved/applied.
- Metric layout preferences are browser-local. Existing metrics retain existing counting rules. Arbitrary free-floating pixel sizes and a new configurable analytics engine were deliberately avoided.

## Rollback

Source checkpoint: rollback/before-rent-render-controls-20261008 at ceab2b6. Revert only this scoped change if other work has since landed; do not reset unrelated changes.
The new numeric widening migration is backward-compatible. If it is later applied, frontend rollback does not require narrowing the database columns. Do not narrow them after high values exist; that may fail or lose information. No database migration was applied outside the local rolled-back synthetic test.
