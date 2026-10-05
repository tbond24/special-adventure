# Error-page repairs — 5 October 2026

Scope: the three issues from the error-page audit only. No database, email, authentication UI, listing form, map or admin changes.

## Changes
- Inventory and blocked-owner reads share a 12-second AbortSignal, allowing the existing boot error/Retry UI to recover from stalled data reads.
- Listing URL errors reuse a static branded recovery template: 404 for invalid, missing or expired listings; 502 with Retry for temporary lookup/render failures. HTTP status and no-store headers retained.
- New static 404.html lets Vercel serve a branded unknown-path page without changing routing or returning a misleading 200.
- Backend asset version advanced to avoid cached old code. Error-page styling is isolated; no dependencies added.

## Verification actually executed
- Node handler tests: 4 passed (invalid ID without database query; missing/expired 404; upstream failure 502 and recovery links; valid 200 with escaped description and canonical metadata).
- Desktop Chromium and Pixel 7 emulation: 8 passed. Unknown path, missing listing and temporary error recovery, plus a genuinely stalled local HTTP connection. Timeout error appeared after 12.219 seconds desktop / 12.202 seconds mobile; Retry reopened the Find map. No horizontal overflow on recovery pages or uncaught browser errors.
- Initial browser test incorrectly navigated to the current hash instead of reloading, so no fresh request occurred; corrected test rerun passed. No product change was needed for that harness failure.
- Preview deployment verified: unknown path, malformed listing ID and nonexistent UUID all HTTP 404 with branded recovery HTML.
- Preview browser inspected; mobile screenshot visually reviewed. JavaScript syntax and git diff whitespace checks passed.
- Browser fixture blocks all external requests with synthetic responses. No production data writes or email tests performed. Preview HTTP checks for missing UUID made read-only public listing lookups.

## Limits
- Temporary upstream failure simulated locally; production service was not interrupted.
- Timeout bounds inventory HTTP requests, not independent identity/token refresh operations. Auth refresh behavior was deliberately not changed.
- Vercel infrastructure-level outages are outside this application recovery page.
- Mobile uses emulation, not a physical phone.

## Preview and rollback
Preview: https://vacancy-r8lscoo8j-tbond24s-projects.vercel.app/missing-page
Production unchanged.
Pre-change source checkpoint: rollback/before-error-pages-20261005 (066c428).
Rollback: revert the scoped repair commit; this removes the new 404 template and restores listing handler, backend and asset version. No database recovery required. Existing production deployment remains untouched.
Screenshots and browser results: ../error-page-repairs-20261005/ relative to repository root.
