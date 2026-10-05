# List transition repair — 5 October 2026

Confirmed cause: styles.css has an earlier `.loading-screen { background:transparent!important }` rule. It overrides the later `.listing-transition-loading` background, exposing the base List layout during asynchronous dashboard assembly. This is a rendering/CSS conflict, not evidence of an old deployment being fetched.

Smallest fix: make the existing List-only transition background win the cascade. Keep the logo background transparent, and preserve all final UI and data behavior. Increment stylesheet cache version 107.5 -> 107.6.

Verification: live page with synthetic owner/backend fixture reproduced a transparent overlay on desktop and Pixel 7 emulation. Before screenshots show List a vacancy / Your vacancies underneath the logo. Local patched page has an opaque theme background and shows only the logo/line until the current dashboard is ready. Dashboard -> Create new listing and simulated property-fetch failure -> Try again -> Dashboard passed on both viewports. No production writes; external browser requests mocked. This did not audit every legacy wrapper or claim their removal.

Evidence: ../list-transition-20261005/{before.json,after.json,*before.png,*after.png}.
Test: node tests/list-transition-browser.cjs (localhost server, synthetic data). TRANSITION_ORIGIN can reproduce baseline against a chosen host.
Rollback source checkpoint: rollback/before-list-transition-20261005 at e13258f. Revert this repair commit to restore the previous CSS and asset version. No database change. Previous error-page fixes remain intact. Production not updated.
