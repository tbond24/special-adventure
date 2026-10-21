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
