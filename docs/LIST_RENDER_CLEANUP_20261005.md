# List rendering cleanup — 5 October 2026

## Cause and scope
List first built old headings and a legacy chooser. Stage 64 replaced the chooser with six choices; Stage 101 later collapsed them to the current four. Stage 73 awaited another myVacancies call between those transformations and inserted an obsolete five-step heading. The transparent live loading overlay exposed these states. The previous preview made that overlay opaque but left the work underneath.

## Focused repair
- Base List renderer distinguishes the actual dashboard route from creation/editing. Dashboard loads owner rows without building the creator, forms or map picker.
- Start with current headings and initial create/dashboard visibility, rather than List a vacancy / Your vacancies.
- Build the four current category choices once. Attach the existing residential presets and custom-category behavior before inserting the chooser into the page.
- Delete obsolete four/six-choice intermediate markup, its later removal/conversion, and the obsolete Stage 73 five-step rendering wrapper and redundant listings read.
- Retain Stage 73's shared audience/identity handling and all other working code in those mixed-purpose modules. Whole-file removal would break unrelated functions.
- Ignore the base async response if its host has been detached by navigation.
- Version changed scripts to avoid old cached assets. No schema, write APIs, final visual design, dependency or production changes.

## Verified
44 local synthetic browser cases passed on desktop Chromium and Pixel 7 emulation: dashboard/create, editing through current journey, new/existing-property drafts, Change, pricing/date/language controls, photo append/reuse/failure handling, owner rows/actions, and nearby Find/inbox/admin controls.
Four new render regression cases passed locally and on the deployed preview. The loading overlay is deliberately disabled in these tests; a MutationObserver checks that obsolete headings/category buttons never appear. Dashboard has zero creation forms/choosers. Create and Change have four choices. One owner-listings read per render.
Node syntax checks and git diff --check passed. No real publishing, production uploads or account changes performed. Test data and external calls were mocked; this verifies rendering and regression behavior, not a new production transaction test.

Preview: https://vacancy-mo7ynpk9f-tbond24s-projects.vercel.app/#list
Evidence: ../list-render-cleanup-results/results.json and preview-results.json.
New permanent regression test: tests/list-render-regression.spec.js.
Production remains unchanged pending release approval; the live issue will remain until this release is deployed.

## Recovery
Rollback tag: rollback/before-list-render-cleanup-20261005 at 1c2e78f.
Revert this scoped cleanup commit to undo it without losing the preceding error-page and loading-mask repairs. No database recovery required.
