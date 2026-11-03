# Google tag replacement — 3 November 2026

Status: **LIVE on getvacancy.site**, published on 3 November 2026 after the owner's
explicit replacement/publication instruction. Branch
`codespaces/google-tag-replacement-20261103` starts from
audited latest development `codespaces/google-tag-20261103` at `5a9e4d8` (PR58).
Remote tips and open PRs were reviewed first; existing branches/drafts remain intact.

The owner supplied G-H059DTQC6T and explicitly requested replacement and
publication. Previously live shared app/recovery heads configured G-SL2NP26QHM.
The chosen solution is the requested direct replacement, once in each existing
head, plus the corresponding ga-disable flag in the existing analytics preferences.
No additional tag is installed. Shared listing success/error templates inherit
the replacement. Existing Admin/browser opt-out, denied-storage behavior and
DNT/GPC exclusions are retained. The preferences asset and curated release use
version `20261103-google-tag-h059dtqc6t` so cached pages fetch the matching flag.

PASS: Node 24.21.0, committed-lock `npm ci --ignore-scripts`; six focused local
checks (four Google-tag plus two HTTP/isolation tests), including explicit
old-ID absence, one loader/config, preference ordering, exclusions/membership,
mocked listing success/missing/expired/failed/invalid responses, and fail-closed
preview sanitization. The private preview was restored with its lifecycle hook.
The previous full browser suite is historical evidence, not a new full run.
Curated and hosted publication results follow below.

Rollback checkpoint: current live `dpl_AQGn9ZZipYzfPSMjLUwPXBubAnQk`,
https://vacancy-f8tkihlj4-tbond24s-projects.vercel.app, product source
`1e1becea8189b7d1b2b23066adaf7a1ed3b67e6b`. Previous manifest:
GOOGLE_TAG_RELEASE_MANIFEST_20261103.json. Reassign getvacancy.site to that
deployment for immediate frontend rollback, or revert only this replacement in
a subsequent curated release. No stored activity/history needs reversal.

No database/Auth/role/credential/environment/DNS/mail/property changes are
required. Google Tag Assistant/Realtime receipt and genuine signed-in Admin
acceptance remain UNVERIFIED; excluded verification browsers send no events.

## Publication and verification

Published product source `bbc582a2a1470d95661db5de778d0e8e3bdeb2d1`, version
`20261103-google-tag-h059dtqc6t`. Six product files differ from the immediately
preceding live manifest: both heads, analytics preferences, and three generated
cache-version references. All other product hashes match. The old ID is absent
from every curated file; no unrelated Admin or metric implementation changed.

- PASS: actual curated composition and refresh-stability checks, followed by all
  four Google-tag checks against that artifact. Existing test assertions remain
  intact, with replacement-specific old-ID absence checks added.
- PASS: all 124 source hashes match both staged and production source trees.
  All 116 public files match on stage, production and canonical live. Only the
  exact Vercel appended feedback script is normalized for HTML comparisons.
- PASS: root, recovery head and live malformed-listing 404 contain one new tag
  inside the head, after preferences, with no former ID. Successful/missing/
  expired/failed listing responses are covered by local mocks without hosted data.
- PASS: actual Chromium loads the new Google library with HTTP 200 once per
  document, one new config and zero old configs. Privacy/auth/admin hash changes
  add no loader/config. Existing stored opt-out remains effective; excluded test
  browsers attempt zero collection requests and have zero page errors. Other
  backend/API connections were blocked to avoid synthetic production writes.
- PARTIAL: the initial staged verification session lost temporary files and
  produced no completed receipt. Recreated the byte-identical artifact under
  ignored workspace files, rechecked its staged source hashes and captured the
  successful hosted checks. No product behavior or assertion was weakened.
- PARTIAL: provider runtime inventory still reports the pre-existing DEP0169
  url.parse deprecation group on the unchanged listing handler. Checked responses
  pass. Google Tag Assistant/Realtime and genuine signed-in Admin transactions
  remain UNVERIFIED; these tests do not claim those outcomes.

Staged deployment: `dpl_GBmktjpFqacSMyCoMJaaZYxV8EhW`,
https://vacancy-9gutkwnxg-tbond24s-projects.vercel.app.
Production READY: `dpl_9p7ERYZZx1beVEhrLPMEZwNSNVg7`,
https://vacancy-8sef8eosc-tbond24s-projects.vercel.app.
The same manifest was built with production settings after staging; production
checks passed before assigning the existing canonical alias. Independent
post-assignment checks confirm https://getvacancy.site serves that deployment.
The connector lacks a production skip-domain option; no preview credentials were
downloaded or assumed isolated. No database/Auth/role/credential/environment/DNS/
mail/Google-property changes, merge or force-push were made. Both branch auto-
deployment guards and the private preview protections remain intact.

Immediate rollback remains the preserved preceding deployment
`dpl_AQGn9ZZipYzfPSMjLUwPXBubAnQk` above. Rollback retained, not executed;
all activity/customer history and historical manifests remain intact.
Exact manifest: [GOOGLE_TAG_REPLACEMENT_RELEASE_MANIFEST_20261103.json](GOOGLE_TAG_REPLACEMENT_RELEASE_MANIFEST_20261103.json).
Evidence: [google-tag-replacement-live-20261103.json](evidence/google-tag-replacement-live-20261103.json).
Draft [PR59](https://github.com/tbond24/special-adventure/pull/59) targets the
audited development branch and remains unmerged.
