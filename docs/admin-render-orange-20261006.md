# Admin render and orange accents — 6 October 2026

Scope: admin assembly/loading and blue-to-orange accents only. Public styles, authentication, database and reporting/counting logic unchanged.

Cause: sequential renderAdmin wrappers expose the stage36 operations layout before asynchronous ratings/icon/display reads, section grouping, lazy console import and CSS loading finish.

Fix: await the admin stylesheet and assemble existing wrappers under a scoped loading state; reveal the completed shell together. Repeated render calls share the active render. Always clear loading on completion/failure; stylesheet failure provides Retry. Existing MFA/member checks stay inside the chain. Keep existing data-producing layers because later admin sections still depend on them.

Verification: local synthetic desktop/mobile tests cover slow assembly/frame sampling, refresh, orange button style, one sidebar, no overflow, public view restoration, AAL1/non-admin gates without dashboard requests, failed stylesheet and retry. Existing visual tests cover section navigation, keyboard, report states and source filtering. Synthetic fixture now suppresses concurrent connected-report mounting. No production data used. Hosted authenticated admin session has not been exercised.

Rollback: source tag rollback/before-admin-render-orange-20261006 (b1ccb38). Previous live deployment vacancy-1b06xo7nz-tbond24s-projects.vercel.app. No migrations or data changes; no database rollback needed. This release is preview-only until approved.
