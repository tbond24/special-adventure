# Vacancy launch readiness — 24 September 2026

## Current decision

Launch a public web beta at `https://getvacancy.site`, focused operationally on Nairobi unless the owner changes the market. Keep the current production Leaflet map. Map-provider experiments remain outside the launch artifact.

## Evidence collected today

- Production inventory rendered five listings. Three are confirmed seed/demo records with placeholder IDs and owners; two are owner-created candidates that still require availability verification.
- Admin authenticator entry and AAL2 challenge passed on desktop and mobile: 4/4 targeted checks.
- The fixed `npm run test:launch` gate passed 102/102 cross-device checks across auth edges, guest enquiries, discovery, viewport filtering, listing galleries, contact privacy, listing consolidation, admin security, legal fail-closed behavior, operational health, reusable media, search, lister profiles and responsive containment.
- Guest enquiry produced 10/10 passing desktop/mobile checks.
- Three reported failures were test-environment constraints or stale expectations: local-Supabase-only session tests had no local Supabase stack; one currency test did not allow for the intentional Automatic option; older discovery tests relied on superseded DOM classes and earlier listing-flow wording. These are not counted as product proof and are not recorded as product defects.

## Readiness scoreboard

| Gate | State | Evidence or next proof |
| --- | --- | --- |
| Fixed scope and deferred list | Ready | `LAUNCH_FIXED_SCOPE_2026-09-24.md` |
| Public browsing and map discovery | Ready | Live-shaped inventory plus current discovery checks |
| Guest enquiry | Hosted gate ready | Included in the 102/102 hosted desktop/mobile launch gate |
| Listing creation/edit/pause | Needs one real pilot | Run with a new lister on the release candidate |
| Email confirmation/reset | Needs release-candidate proof | Use a fresh inbox and record receipt time/location |
| Admin MFA | Built and tested | Owner must enrol a real authenticator and re-enter Admin |
| Legal operator identity | Blocked on owner facts | Legal name, service address, jurisdiction, privacy and support contacts |
| Real launch supply | 2/10 candidates; 0/10 verified | Archive three exact demo records, verify the two owner-created listings, then add eight more |
| Pilot demand/supply | Blocked on recruitment | Three listers and five renters complete critical journeys |
| Exact-artifact promotion | Candidate accepted; promotion withheld | `dpl_HTjkdd98xQ3FuzBvqsoMSBbiUB6D` passed 102/102; promote only after legal, supply and pilot gates |
| Rollback and incident routine | Deployment baseline recorded | Current production rollback is `dpl_HgVP1S4KSHHXZekYsoRj4FUQ4wWa`; incident contacts and daily owner routine remain |

## Accepted release candidate

- Source checkpoint: `a071798` (application code); deterministic hosted-test correction is test-only.
- Preview: `https://vacancy-8yan0m3bm-tbond24s-projects.vercel.app`.
- Deployment: `dpl_HTjkdd98xQ3FuzBvqsoMSBbiUB6D`; Vercel status READY.
- Hosted launch gate: **102/102 passed** across desktop and mobile.
- Rejected packaging attempt: `dpl_7Tz4XWzE18ga5zdhHKcVFaX92pfu` returned Vercel 404 because the repository root was uploaded; it is not a release or rollback candidate.
- Production remains `dpl_HgVP1S4KSHHXZekYsoRj4FUQ4wWa`.

## Remaining launch work, in priority order

1. Owner supplies legal facts and confirms Nairobi. This unlocks truthful policies and fixes the operating boundary.
2. Owner enrols the authenticator from **You → Privacy and security → Authenticator app**, then confirms Admin opens only after a six-digit code.
3. Verify ten real listings and remove or clearly isolate any demo inventory.
4. Run one new-lister journey and one renter-to-lister conversation on a single preview. Fix only blockers encountered in those journeys.
5. Recheck email confirmation/reset, report handling, mobile containment and operational health on that same preview.
6. Promote that exact deployment to `getvacancy.site`, run the short production smoke test, and record rollback details.
7. Invite the controlled pilot group. Public promotion begins only after the production smoke passes.

## Owner launch preparation

- Prepare one monitored support/privacy inbox and a response template for safety reports.
- Recruit three real listers and five renters before the release-candidate day.
- Ask each lister for current availability, truthful price/deposit, location, contact preference and at least three usable photos.
- Reserve two 20-minute daily operating windows during the first week for reports, stale listings, delivery failures and unanswered enquiries.
- Write down one person who can take over incident handling if the owner is unavailable.

## Anti-delay rule

New visual, font, animation, map-provider or convenience ideas go into the post-launch backlog. They enter the release only if a critical journey fails, user safety is affected, data is exposed, or the production artifact cannot be operated. When all gates are green, promotion occurs within 24 hours.

## Next owner input

Unless changed, Nairobi is treated as the launch market. To finish the legal gate, record the legal/registered operator name, service address, governing jurisdiction, privacy email and support/legal email. No other design decision is required before the release candidate.
