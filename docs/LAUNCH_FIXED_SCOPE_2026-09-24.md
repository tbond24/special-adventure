# Vacancy fixed launch scope — 24 September 2026

## Launch decision

Vacancy will launch as a public web beta at `https://getvacancy.site` using the current production Leaflet map. The operational launch market is Nairobi unless the owner explicitly changes it before the scope-freeze date. The website may remain accessible globally, but launch inventory, outreach, support and success measurements focus on one market.

OpenFreeMap, MapLibre and other basemap experiments remain separate research. They cannot delay the beta and will not enter production without a later evidence-based release.

## Product hypothesis

A renter can discover a genuinely available vacancy in the visible map area, understand its essential terms, and message the lister. A lister can create, publish, edit, pause and remove a listing, then receive and answer enquiries. The operator can inspect accounts, listings, messages and reports and intervene safely.

The beta exists to test that loop with real people. Ratings, agency systems, international completeness and further visual refinement are not part of this hypothesis.

## Definition of launched

All conditions below must be true at the same time:

1. One exact production artifact passes the launch gates and is served at `getvacancy.site`.
2. Legal pages contain truthful operator identity, jurisdiction and monitored contact details.
3. A new renter completes browse → detail → enquiry → reply on production.
4. A new lister completes account confirmation → listing draft → publish → edit/pause on production.
5. Confirmation and password-reset email are received through the real production path.
6. The operator can enter Admin, review a report and deactivate a test account.
7. At least 10 verified, currently available listings are present in the launch market, with no demo records presented as real inventory.
8. At least three listers and five renters have completed the critical journeys, or the owner records why an equivalent controlled pilot is valid.
9. A production rollback deployment, Git checkpoint and incident contacts are recorded.
10. No open severity-1 defect exists: data exposure, unauthorized write, broken signup, broken listing publication, broken enquiry, production boot failure or unrecoverable deletion.

## Work remaining before launch

### Owner decisions and facts

- Confirm Nairobi as the initial operating market or name one replacement market.
- Supply the legal/registered operator name, service address, governing jurisdiction, privacy email and legal/support email.
- Decide whether the beta is free. Default: no payments and no paid placement during beta.
- Recruit the minimum pilot group and verify the first 10 listings.

### Engineering and runtime proof

- Add and prove owner/admin authenticator enrollment and challenge, or document a time-limited beta exception with strong unique password and session review.
- Run one first-time lister journey against production-like data and remove only a blocker encountered in that journey.
- Run one renter-to-lister conversation in two isolated sessions.
- Re-prove signup confirmation, password reset, listing publication, enquiry/reply, report handling, mobile containment and production health on one preview.
- Promote that exact artifact and repeat the production smoke gate.
- Record the new rollback baseline and a short daily operational checklist.

## Explicitly deferred until after launch

- Replacing Leaflet with OpenFreeMap, MapLibre or another map.
- Further font, colour, animation, spacing or icon refinement unless it blocks a critical journey or accessibility.
- Google sign-in.
- Full international country, flag, currency and exchange-rate coverage.
- Ratings, agency banners, tiering and ranking.
- Parcel → building → unit expansion.
- Photos-first unassigned capture inbox and full reusable-media library.
- Phone/WhatsApp lead routing and CRM automation.
- Advanced analytics, automated moderation and unrestricted admin record editing.
- App Store or Play Store release.

Deferred work may be recorded but cannot be built before launch unless it becomes a severity-1 blocker supported by runtime evidence.

## Seven-day launch program

| Day | Outcome | Pass condition |
| --- | --- | --- |
| 1 | Scope and operator facts frozen | Market, legal facts, beta pricing and deferred list recorded |
| 2 | Supply prepared | 10 real listings verified; demo inventory clearly removed or isolated |
| 3 | Lister proof | New lister confirms email, drafts, publishes, edits and pauses one listing |
| 4 | Renter proof | New renter finds a listing, messages; lister receives and replies |
| 5 | Operations proof | Admin access, report handling, account action, recovery and rollback rehearsed |
| 6 | Release candidate | Exact preview passes desktop/mobile, auth, inventory, messaging, legal and security gates |
| 7 | Soft launch | Exact artifact promoted, production smoke passes and invitations begin |

A failed day pauses advancement and permits only the smallest safe root-cause fix plus relevant regression. It does not reopen design scope.

## Post-launch measurements — first 30 days

Track a small funnel rather than page views alone:

- verified active listings;
- unique renters who open a listing;
- enquiries started;
- enquiries receiving a lister reply;
- median time to first reply;
- listing publication completion rate;
- stale or inaccurate listings reported;
- signup, publication and enquiry errors;
- serious reports and response time.

Initial learning targets, not promises:

- 20 verified active listings by day 30;
- 10 genuine enquiries;
- at least 60% of enquiries receive a reply;
- median first reply under 24 hours;
- zero unresolved severity-1 incidents;
- fewer than 10% of verified listings reported stale.

If inventory remains below 10, work on lister acquisition rather than renter-facing polish. If enquiries are low despite adequate inventory, study discovery and trust. If enquiries occur but replies do not, improve lister operations and notifications.

## Change-control rule

A pre-launch change is allowed only when all four statements are true:

1. It blocks a launch definition item or fixes a severity-1 defect.
2. Runtime evidence demonstrates the problem.
3. The smallest safe fix is identified.
4. Relevant regression and rollback evidence can be completed inside the launch window.

Everything else enters the post-launch backlog with a hypothesis and measurement. Available free time is not evidence of launch necessity.

## Stop rule

Once all launch-definition items pass, Vacancy launches within 24 hours. No new visual comparison, competitor review, map experiment or convenience feature may postpone promotion.