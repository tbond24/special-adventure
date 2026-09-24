# Vacancy launch readiness — 24 September 2026

## Current decision

Launch a public web beta at `https://getvacancy.site`, focused operationally on Nairobi unless the owner changes the market. Keep the current production Leaflet map. Map-provider experiments remain outside the launch artifact.

## Evidence collected today

- Production-shaped inventory rendered five current listings in the browser.
- Admin authenticator entry and AAL2 challenge passed on desktop and mobile: 4/4 targeted checks.
- The current-generation feature set produced 104 passing cross-device checks across discovery, viewport filtering, listing galleries, messaging contact privacy, listing consolidation, admin security, legal fail-closed behavior, operational health, reusable media, search, lister profiles and responsive containment.
- Guest enquiry produced 10/10 passing desktop/mobile checks.
- Three reported failures were test-environment constraints or stale expectations: local-Supabase-only session tests had no local Supabase stack; one currency test did not allow for the intentional Automatic option; older discovery tests relied on superseded DOM classes and earlier listing-flow wording. These are not counted as product proof and are not recorded as product defects.

## Readiness scoreboard

| Gate | State | Evidence or next proof |
| --- | --- | --- |
| Fixed scope and deferred list | Ready | `LAUNCH_FIXED_SCOPE_2026-09-24.md` |
| Public browsing and map discovery | Ready | Live-shaped inventory plus current discovery checks |
| Guest enquiry | Ready in controlled checks | 10/10 cross-device checks; repeat on release candidate |
| Listing creation/edit/pause | Needs one real pilot | Run with a new lister on the release candidate |
| Email confirmation/reset | Needs release-candidate proof | Use a fresh inbox and record receipt time/location |
| Admin MFA | Built and tested | Owner must enrol a real authenticator and re-enter Admin |
| Legal operator identity | Blocked on owner facts | Legal name, service address, jurisdiction, privacy and support contacts |
| Real launch supply | Blocked on operations | Verify at least 10 genuinely available Nairobi listings |
| Pilot demand/supply | Blocked on recruitment | Three listers and five renters complete critical journeys |
| Exact-artifact promotion | Waiting on gates above | Deploy one candidate, pass it, promote that same artifact |
| Rollback and incident routine | Waiting on release candidate | Record deployment ID, checkpoint and daily owner checklist |

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
