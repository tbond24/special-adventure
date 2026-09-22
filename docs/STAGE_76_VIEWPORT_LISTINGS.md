# Stage 76 — Viewport listings and visual discovery controls

## Aim and acceptance

Make the map the source of truth for the discovery results: only vacancies with coordinates inside the visible map bounds appear in the list and as markers. Add a compact property-type selector and a one-tap expanding search without consuming permanent map space. Improve listing cards and listing details without changing production until a preview passes runtime checks.

Acceptance requires: panning and zooming update cards, markers and count together; listings without coordinates do not appear as though they are inside the map; type filtering works for shops, rooms, one-bedroom, two-bedroom, houses and apartments; the search opens and focuses from one tap; card galleries remain swipeable; tile images use a stable ratio; listing cards have square corners and bold prices; detail thumbnails have less gap; the detail price is green; the map preview is compact and explains approximate location through an information control; and reporting appears as a bottom row.

## Options, ranking and decisions

### Map-to-list relationship

1. Filter from Leaflet's current geographic bounds after every completed move. **Rank 1** — exact match to what the user sees, low complexity, and no invented radius.
2. Convert zoom level into an automatic kilometre radius. **Rank 2** — compact, but a circle does not match the rectangular viewport and behaves differently across screen shapes.
3. Keep global results and only hide markers outside the map. **Rank 3** — cards and map would disagree.

Chosen: option 1. A 120 ms post-move debounce updates the results after the map settles. The existing distance radius control was removed because it duplicated and could contradict the viewport.

### Property-type control

1. A bottom-left compact selector that expands horizontally. **Rank 1** — map-adjacent, thumb reachable and keeps the main filter shorter.
2. Put types in the general filter panel. **Rank 2** — familiar but requires extra taps and hides the core map classification.
3. Keep a permanently visible row of type chips. **Rank 3** — consumes too much map width on mobile.

Chosen: option 1. It covers the requested types using the existing icon system and applies immediately.

### Search behavior

1. A round search action that expands the field left and focuses it on the same tap. **Rank 1** — smallest permanent footprint and one interaction before typing.
2. Keep a permanent search field. **Rank 2** — clearest, but consumes map space.
3. Open a separate search screen. **Rank 3** — more code and breaks map context.

Chosen: option 1. The location and tools actions retain their size and the search action remains circular as explicitly requested.

### Card media ratio

1. Use 4:3 with `object-fit: cover`. **Rank 1** — aligns with a common phone-camera capture ratio and gives property photos more vertical space than 16:9.
2. Use 3:2. **Rank 2** — a reasonable photographic ratio, but less common as a phone capture default.
3. Use 1:1. **Rank 3** — tidy grids but crops too much room context.

Chosen: option 1. Apple exposes 4:3 as an iPhone camera ratio, Android describes 4:3 as the most common image-sensor landscape ratio, and a fixed CSS aspect ratio prevents layout movement while `object-fit` preserves the tile box.

### Detail location and reporting

1. Reduce the map to 56 px, replace the explanatory sentence with an accessible information button, and move reporting to a full-width bottom row. **Rank 1** — preserves both functions with less visual competition.
2. Remove the map and show only text. **Rank 2** — saves space but loses spatial context.
3. Keep the large map and floating flag. **Rank 3** — conflicts with the requested hierarchy.

Chosen: option 1.

## Failure loops

### Loop 1 — test environment

The first regression attempt failed because no local application server was running. Options ranked: (1) start the repository with a built-in Node static server; (2) install another server dependency; (3) test a remote deployment before local proof. Option 1 was the smallest safe fix and avoided a dependency change.

### Loop 2 — expanding search

The first targeted run passed 6/10 checks. The legacy layout physically nested the search action inside a zero-width field, so another control intercepted mobile taps. Fixes ranked: (1) move the existing button into the map control row; (2) increase z-index while retaining the invalid layout; (3) replace the entire search panel. Option 1 preserved existing search logic and made the one-tap focus behavior work.

### Loop 3 — superseded test contracts

The broad run exposed old assertions that expected a global result list, the former category filter, and a fixture without coordinates. Options ranked: (1) update only assertions and fixtures that directly contradict the approved viewport contract; (2) make the product maintain both incompatible behaviors; (3) delete the old suites. Option 1 preserved regression coverage while testing the new behavior honestly.

### Loop 4 — missing visual search icon

Preview inspection showed that the search button existed and remained keyboard accessible, but an older polish layer had replaced its magnifying glass with a north-east arrow. When Stage 76 moved that button out of the collapsed input it retained the old symbol. Fixes ranked: (1) explicitly restore the common search symbol in the final Stage 76 enhancement; (2) alter the older shared enhancement; (3) create a second button. Option 1 is isolated and preserves the established search behavior. `Search this area` remains intentionally removed because results, count and markers now update automatically after every completed pan or zoom.

### Loop 5 — production custom-domain alias

Vercel reported a successful promotion, but the first live-domain gate failed 0/10 and proved that `getvacancy.site` still resolved to the prior production deployment. Fixes ranked: (1) inspect both deployment records and explicitly assign the custom-domain alias to the ready production artifact; (2) rebuild directly with `--prod`; (3) wait without evidence. Option 1 preserved the tested artifact and corrected only the stale alias. The repeated live gate then passed 10/10.

## Runtime proof and score

- Stage 76 focused checks: **10/10 passed** across desktop and mobile projects.
- Local relevant product regression: **110/110 passed**.
- Preview focused Stage 75 + 76 gate: **26/26 passed**.
- Preview relevant product regression: **110/110 passed**.
- Live-domain Stage 76 gate after alias correction: **10/10 passed**.
- JavaScript syntax checks: **passed**.
- Card gallery proof: scroll position advances by more than 80% of one image width.
- Map proof: the same fixture yields 2 cards/markers at zoom 14 and 3 at zoom 9.
- Search proof: one click expands the control and gives the input focus.

| Area | Score | Evidence |
| --- | ---: | --- |
| Viewport accuracy | 10/10 | Cards, count and markers derive from the same Leaflet bounds |
| Type discovery | 9.5/10 | Seven immediate map choices with accessible labels |
| Search efficiency | 9.5/10 | One-tap expansion and keyboard focus at mobile width |
| Card visual hierarchy | 9.5/10 | Square cards, 4:3 media, reduced body padding and bold price |
| Gallery interaction | 10/10 | Existing horizontal swipe behavior retained and runtime tested |
| Detail hierarchy | 9.5/10 | Green price, tighter thumbnails, 56 px map and bottom report row |
| Mobile stability | 9.5/10 | Controls remain within the map and relevant mobile regressions pass |
| Regression safety | 10/10 | 110/110 selected checks pass after contract updates |

Overall: **9.7/10 — acceptance met**.

## Release state

Commit `a1bf8b3` was deployed as preview `dpl_2TChk7bsKsFw5UKrd1FT6tqpxML5` at `https://vacancy-jb1r3sumy-tbond24s-projects.vercel.app`, passed its focused and broader gates, and was promoted to production deployment `dpl_6jVLmqf6xnHPBZ4AwgJ3RrGHrf93`. `https://getvacancy.site` is explicitly assigned to that deployment and passed the live 10/10 Stage 76 gate. The previous production deployment `dpl_7JXd59w2kPCLiRgEcieKhQVFDhFZ` remains the immediate rollback target.
