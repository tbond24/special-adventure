# Google tag replacement — 3 November 2026

Status: **NOT PUBLISHED**, awaiting staged verification during the authorized
publication task. Branch `codespaces/google-tag-replacement-20261103` starts from
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
Curated and hosted publication results will be appended after verification.

Rollback checkpoint: current live `dpl_AQGn9ZZipYzfPSMjLUwPXBubAnQk`,
https://vacancy-f8tkihlj4-tbond24s-projects.vercel.app, product source
`1e1becea8189b7d1b2b23066adaf7a1ed3b67e6b`. Previous manifest:
GOOGLE_TAG_RELEASE_MANIFEST_20261103.json. Reassign getvacancy.site to that
deployment for immediate frontend rollback, or revert only this replacement in
a subsequent curated release. No stored activity/history needs reversal.

No database/Auth/role/credential/environment/DNS/mail/property changes are
required. Google Tag Assistant/Realtime receipt and genuine signed-in Admin
acceptance remain UNVERIFIED; excluded verification browsers send no events.
