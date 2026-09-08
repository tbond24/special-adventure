# Stage 40 — You audit, fixed Find split and agency trust decisions

This stage applies the full Vacancy decision loop separately to each requested idea. Production remains the Stage 39 rollback baseline until the complete preview gate passes and publication is explicitly requested.

## F01 — audit and simplify every You setting

**Aim and scope.** Keep You as the shortest route to account activity, privacy and security. Remove controls already available in the persistent shell or at the point of use.

**Options.**

1. Remove duplicates and move contextual preferences to their feature.
2. Keep all rows but group duplicates under Preferences.
3. Replace You with one large settings sheet.

**Weigh and rank.** Option 1 removes two sources of truth and shortens the page without hiding account tasks; low complexity, high value. Option 2 preserves clutter; low value. Option 3 makes distinct tasks harder to scan; medium complexity. Rank: 1, 2, 3.

**Row-by-row decision.**

| Existing row | Decision | Reason / alternative |
|---|---|---|
| Theme | Remove | The permanent header sun/moon already changes and persists theme. |
| Display currency | Remove | The permanent header currency selector already changes display currency without moving the search. |
| Distance units | Move to Find tools | Units affect radius and distance labels, so the control now sits beside Search radius. |
| Properties and listings | Keep | This is the unique owner inventory-management route. |
| List a unit | Remove | The persistent + List action already opens the same property/unit flow. |
| Blocked accounts | Keep | Unique privacy task with real stored block management. |
| Password and sessions | Keep | Unique recovery and global-session controls. |
| Admin | Keep, permission-gated | Unique operational route; hidden until server authorization succeeds. |
| Sign out | Keep | Essential current-session action. |
| Delete account | Keep | Essential account/data control, retained in the danger group. |

**Build.** You now contains six purposeful rows. Distance unit selection moved into Find's radius tools and updates radius math, labels and result distances immediately.

**Targeted test and score.** Runtime checks require exactly six account rows, prove all four duplicate IDs are absent, preserve admin gating, blocked-account management and security actions, and prove the relocated unit control changes persisted units. Result: targeted account and distance checks passed. Score: **60/60**.

## F02 — fixed 60/40 mobile Find layout

**Aim and scope.** Replace the draggable listings layer with a predictable mobile page: map in the first 60% of the viewport and listings directly below in the remaining flow. Keep map search, tools, card/list views, pins, footer policies, themes and sideways containment.

**Options.**

1. Fixed 60/40 page split with ordinary vertical scrolling.
2. Fixed overlay at 40% without dragging.
3. Keep the existing three-position draggable sheet.

**Weigh and rank.** Option 1 is easiest to understand, keeps comparisons visible and restores normal page/footer behaviour; low interaction complexity. Option 2 preserves map edges but still layers content and can obscure controls. Option 3 offers flexibility but caused the interaction the owner asked to remove. Rank: 1, 2, 3.

**Build.** Mobile map height is 60dvh, bounded from 420px to 620px so very short and very tall devices remain usable. Results use normal document flow, retain two-card and list modes, and the search cluster stays at the lower map edge. The sheet handle, drag states, minimize control and map information workaround were removed. Public policy links return through the normal footer.

**Targeted test and score.** Runtime geometry checks map/result adjacency and width, control reachability, both result modes, zero inventory, live distance units, dark/light containment, no horizontal overflow and public footer navigation. Result: all seven focused runtime scenarios passed on mobile. Score: **70/70**.

## F03 — reliable map startup

**Aim and scope.** Ensure the real map initializes even when inventory returns immediately or is empty.

**Observed failure.** The first focused cycle passed 14/15. Empty inventory rendered the map element but the Leaflet object remained null because the browser depended on a third-party CDN at startup. A timing wait failed again, proving this was not merely a fast assertion.

**Fix options.**

1. Ship the free Leaflet 1.9.4 runtime with Vacancy.
2. Retry the CDN dynamically when it is unavailable.
3. Render a noninteractive fallback.

**Weigh and rank.** Option 1 removes the startup dependency and keeps the real map, with a modest static bundle cost. Option 2 still depends on the same external host and adds recovery state. Option 3 loses the core interaction. Rank: 1, 2, 3.

**Fix and retest.** Leaflet is now served from app/vendor/leaflet; OpenStreetMap tiles remain the free tile source. The formerly failing isolated empty-inventory scenario passed in 0.6 seconds. The formerly failing scenario passed, followed by the full relevant regression.

## F04 — public business/agency ratings

**Aim and scope.** Help renters judge professional listers without creating fake social proof, retaliatory reviews or a score that can be bought or gamed.

**Options.**

1. Verified-interaction rating after a documented completed rental, with moderation, agency response and a minimum review count.
2. Behavioural service metrics derived from Vacancy activity, such as response rate and confirmed availability.
3. Open ratings from any signed-in account.

**Weigh and rank.** Option 1 provides the strongest trust but requires a completed-rental state, reviewer eligibility, moderation, disputes and privacy rules; high value and high complexity. Option 2 is harder to fake and useful sooner, but needs enough real activity and careful definitions; medium complexity. Option 3 is cheap but enables brigading and false reviews; negative trust value. Rank: 1, 2, 3.

**Decision.** Do not publish ratings yet. Realestate.com.au limits reviews to people connected to completed transactions, verifies reviewers and moderates disputes. Vacancy does not yet have a reliable completed-rental event, so any public star score would be unearned. The acceptance trigger is a server-enforced completed-rental record plus one eligible review per side, moderation/reporting, an agency response, privacy-safe property reference and a minimum sample label. No ranking will use paid placement.

**Score.** Trust safety 10/10; current user value 0/10 because deliberately not built. Re-evaluate when the eligibility trigger exists.

## F05 — agency identity/banner

**Aim and scope.** Let a professional lister present a recognizable agency identity without implying verification that Vacancy has not performed.

**Options.**

1. Structured Agency profile with agency name, logo/brand band, contact details, active properties and explicit verification status.
2. Self-declared generated name banner on listing details.
3. Free-form uploaded banner on every listing.

**Weigh and rank.** Option 1 is a durable data model and supports future team membership, but needs profile schema, asset moderation and an admin verification workflow. Option 2 is smallest and avoids asset abuse, but offers little more than a label. Option 3 is visually immediate but duplicates data and introduces impersonation, copyright and moderation risks. Rank: 1, 2, 3.

**Decision.** Define an Agency profile before displaying banners. The first build should use one agency record shared by its listings, a generated brand band and Agency profile wording. Verified agency must only appear after an admin evidence workflow exists. Add logo uploads later through controlled storage. This stage does not add a decorative banner disconnected from database identity.

**Acceptance trigger.** Schema and row-level security for agency ownership/team membership; owner onboarding; admin verification state; listing-to-agency relationship; profile and listing display; impersonation/report flow; runtime proof for individual and agency accounts.

## Inspiration evidence

- REA Support, A guide to Agency Profiles, updated 21 January 2026: agency profiles combine brand, performance, team, properties, map, ratings and reviews, with performance sourced from advertised properties.
- REA Support, Understanding Agent Ratings & Reviews, updated 16 December 2025: ratings follow a completed transaction and include a response path.
- REA Support, How to request and respond to a review, updated 22 March 2026: reviewer validation and moderation are required; ratings are not yet available for property managers on that platform.

These patterns support separating agency identity from ratings and making trust claims data-backed.

## Advancement gate

F01–F03 passed their focused checks. The first relevant regression passed 86 with 18 intentional desktop applicability skips and exposed two obsolete assertions for the replaced full-screen map and removed You currency row. Ranked fixes were: update the precise superseded requirements; retain dead UI solely for tests; or weaken broad checks. The precise assertions were updated. The final relevant desktop/mobile regression passed **88 with 18 intentional applicability skips and 0 failures**. A hosted preview and checkpoint remain required; production must not change without explicit instruction.


## Hosted acceptance

- Exact application commit: b9f8f54.
- Correct preview deployment: dpl_7jyRxj93fYEmHKWq1g7QzAWadpez.
- Preview URL: https://vacancy-gdprz41z8-tbond24s-projects.vercel.app.
- Hosted relevant desktop/mobile regression: **88 passed, 18 intentional applicability skips, 0 failures**.
- The first root-directory preview returned Vercel 404 and was rejected; deploying the established app directory fixed packaging without changing product code.
- Production at https://getvacancy.site remains unchanged on the Stage 39 baseline.

