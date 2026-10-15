# Vacancy admin pilot — customer-flow acceptance

**Date:** 15 October 2026. **Outcome: scoped customer-flow acceptance PASS; production release remains on HOLD.**

This report updates the customer Create/Edit, photo and draft-recovery gate in [the pilot release-review packet](./ADMIN_DESKTOP_PILOT_RELEASE_REVIEW_20261015.md). It does not close unrelated launch requirements or claim the full admin specification is complete.

## Exact evidence

- Tested candidate commit: `b5d545b763461a3dd3b02bf9bda6bb0dcd218d68` on `feature/admin-desktop-editor-20261014`.
- [Successful full-stack CI run 38685517279](https://github.com/tbond24/special-adventure/actions/runs/38685517279), job `116259338096`.
- Downloaded artifact `11950126197`, `vacancy-disposable-integration`; SHA-256 `4f55217f6c77177f20d3040245dcf6684bab9bf09ea12b45fe68e1b67ab077b0`.
- Inspected `evidence.json`: **219 recorded PASS milestones**, `completed=true`, `disposableStackRemoved=true`, `migrationCount=74`, `customerJourneys.completed=true`, `customerJourneys.browserPhotoDecoding=true`. These are recorded acceptance milestones, not a claim of 219 independent test suites.
- Run began 2026-10-15 05:12:56 UTC and evidence completed 05:16:46 UTC. The workflow's unconditional cleanup also passed.
- All previously retained admin roles/MFA, audited bootstrap, protected API, private style drafts, publication, legacy moderation, old-frontend compatibility, restore and real expired-token checks remained green.

## Newly proven customer behavior

| Scenario | Result and evidence |
| --- | --- |
| Existing Studio listing form | A new non-admin synthetic publisher signs in through the real password form, enters Location → Listing details → Review and selects three valid PNG images. Real local GoTrue tokens are used; no backend replacement or fabricated user JWT. |
| Failed photo upload and retry | A deliberate network abort causes an actual private Storage upload to fail. The browser retains every selected filename, file size and SHA-256 byte hash. No public vacancy exists. Retrying uploads the images to the owner's private bucket; anonymous access to a private object is denied. |
| Save and exit / clean second browser | The account draft remains private. The first browser context is closed. A fresh browser signs in and restores the stored title, rent, all three exact image files and their order without any first-device local draft. No public vacancy is created by saving or reopening. |
| Explicit Publish | Visible Review → Publish creates exactly one owned active vacancy with three active media records. The real anonymous joined listing query returns the correct title and three local public Storage image URLs. |
| Existing customer Edit | The visible Edit flow changes title, description and rent. The same vacancy, room and property IDs remain; there is still exactly one publication and all three original photos are retained. Anonymous reload sees the edited title. |
| Actual image display | Chromium decodes all three uploaded images through the existing gallery controls. After mobile reload at 390×844, the first image is decoded and visible, and the page has no horizontal overflow. The final synthetic screenshot was visually inspected. |
| Recovery request and invalid link | The visible reset-request form reaches actual local GoTrue; the account's `recovery_sent_at` is set and the UI keeps its generic “If an account exists” response. An expired-link callback shows no password form and does not replace the normal browser session. |

## What the first screenshot caught

The first run, [38684593749](https://github.com/tbond24/special-adventure/actions/runs/38684593749), passed its 217 recorded checks but its screenshot showed a broken image. HTTP retrieval of an image alone did not establish browser display.

The isolated frontend server's test-only `img-src` policy allowed its own origin, data and blob URLs but omitted the separately validated local Storage origin. The test helper now permits images from **exactly the same approved isolated API origin**, with no wildcard and no production origin. A unit test verifies that restriction. Additional acceptance checks explicitly require `complete`, positive `naturalWidth`/`naturalHeight`, local image origins and functioning gallery navigation before accepting the screenshot.

**No production CSP, application image renderer, listing form or database code was changed to fix this test-harness mismatch.** The solid-colour images in the screenshot are intentionally generated synthetic PNGs, not missing property photography.

## Code changes in this verification pass

Only test/CI files changed before the documentation commit:

- `tests/full-stack/customer-journeys.mjs`
- `tests/full-stack/photo-rendering.mjs`
- `tests/full-stack/run-customer.mjs`
- `tests/hosted-admin/frontend-server.mjs`
- `tests/hosted-admin/frontend-server.test.mjs`
- `.github/workflows/admin-disposable-integration.yml`

The original complete integration runner remains unchanged and is checked against its exact Git blob hash before a temporary CI-only extended runner is generated. Its existing cleanup and isolation remain in force. No `app/` code, source migration, production role, live account or Vercel deployment was changed by this work.

## Isolation and limitations

The tests replayed the source migrations in a disposable Supabase stack on a GitHub runner. All accounts, listing content, addresses and images were synthetic. The only deliberate network fault was the failed-upload injection; successful requests used actual local Auth, PostgREST and Storage. External services and hosted production were not used. Credentials and authenticator material stayed out of screenshots and persisted evidence. The disposable stack and test data were destroyed.

**Still not proven by this run:**

- Final password change through `secure-password-reset`, its external breached-password safety service, and delivery to a real external inbox. Recovery request/invalid-link coverage must not be labelled a complete password-reset PASS.
- External geocoding: synthetic coordinates were entered using the existing map setter rather than contacting a location provider.
- Every property type, photo count, file format or very large upload. This slice uses one Studio and three small, valid PNGs.
- Native desktop browser zoom at 200%, representative hosted candidate latency/load, complete source/live historical schema parity and unrelated Stage 3/4 scope.
- A production release: database migrations, initial Owner activation and frontend deployment remain separate explicit approvals. The intended second Operator must complete its required account verification/MFA; no account setup is bypassed here.

**User input needed now:** none for further isolated development/testing. Do not request passwords, MFA codes or production credentials. Seek the named live approvals only when a bounded release action is ready; keep manual desktop acceptance and the remaining recovery-provider checks explicit.
