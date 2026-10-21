# Admin Overview publication

Owner explicitly authorized publishing the redesigned admin panel to the live site.
Rollback checkpoint: `dpl_558VydjBz3tjnsNok5wgGQsoKZRz`, public source
`1a03a32592892a05ee0bdebbc33b75e409d7392e`, `https://getvacancy.site`.
Do not delete that deployment or merge development history as part of publication.

`scripts/build-admin-production-candidate.mjs` reconstructs the preserved public
app then overlays the Overview modules. It excludes unrelated draft design editor,
public rendering, listing, messaging, recovery and appearance changes. Existing API
handlers and public styles/assets remain byte-identical to the rollback source.
The generated source manifest records every file hash, the baseline and source ref.
This is a scoped artifact, never a raw workspace deployment.

The genuine connected report had a separate mounting path from the synthetic
preview. Add journey-map mounting there too. Actual production composition is
verified by `tests/admin-production-candidate.check.mjs`: source route and real
modules, with explicitly synthetic local backend responses and no external calls.
Checks six stats cards, map placement, creation entry exploration, no unrelated
editor and zero browser errors. The candidate preserves native sign-in/MFA and uses
the four already-installed production report functions. No database changes needed.

Only installed traffic/service metrics are offered. Optional contact/text collection
remains disabled. The browser analytics switch uses the existing live collector's
start guard and telemetry write guards; enabled collection semantics are unchanged.
New public SPA navigation instrumentation remains outside this publication.

Publication sequence: content-addressed artifact upload, preview build, verify
hosted bytes/routing and preserved domain mapping, then promote to production under
the owner's explicit authorization. Preserve the original source deployment for
rollback. No privileged environment values are downloaded. Genuine admin browser
acceptance requires the owner's existing session; no production test account or
customer credentials are used by automation.

## Published result

Production build `dpl_BKoctvt9tPJRxMrDPeCp2AZW4Kkh` is READY. The live domain
`getvacancy.site` was explicitly assigned from the rollback deployment to this
build after verification. The standard project production alias also points to
the new build; the older `vacancy-nine.vercel.app` alias was not reassigned by
this operation. Rollback deployment remains preserved.

Staged candidate `dpl_D5YegjVRudLN21KHxQeecutEJNvW` passed hosted file/routing
checks. Direct promotion returned HTTP 422; no force/check bypass was used.
A normal production build was created from the identical verified file hashes,
then the custom live alias was assigned after READY. Vercel appended its preview
feedback toolbar to staged HTML; only that exact suffix was excluded from the
staged byte comparison. Production HTML matches the unmodified artifact bytes.

PASS: genuine admin composition with isolated synthetic responses; hosted checks
for index/backend/admin modules and unchanged public stylesheet; listing-page
invalid-ID HTTP 404 and webhook GET 405; live sign-in boundary with no unauthorized
report requests, telemetry writes or browser errors. No production test account,
real-user credentials, emails, collector activation or database migration was used
for this frontend publication. Genuine signed-in browser acceptance remains with
the owner; existing native Auth/MFA is unchanged from the preserved source.

The live stats/map call the already-installed production aggregate reports. Raw
historical source coverage remains partial; no historical journeys are invented.
Exact bytes and scoped changes are pinned by
`ADMIN_OVERVIEW_RELEASE_MANIFEST_20261021.json` (source `d0dabf5`, 115 files,
13 changes/additions). Keep this record when preparing subsequent releases.

Frontend rollback: assign `getvacancy.site` and the primary project production
alias back to `dpl_558VydjBz3tjnsNok5wgGQsoKZRz`. Do not remove reporting functions
or alter user data when reverting only this frontend publication.
