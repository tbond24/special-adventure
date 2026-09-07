# Stage 22 — Database-backed map markers

## Aim and acceptance

Make each visible map marker communicate useful vacancy data while keeping the interaction simple. Markers must derive from active database results, respect filters and display currency, preserve approximate public coordinates, synchronize with listing cards, support touch and keyboard input, and remain readable on mobile.

## Options and ranking

1. Price pill per vacancy with selected state and a compact detail tooltip — high immediate value, low complexity. **Rank 1.**
2. One property marker with minimum price and unit count — useful where many units share coordinates, but requires a unit-selection interaction. **Rank 2.**
3. Automatic clusters or hexagons — useful at high density, but premature and dependency-heavy. **Rank 3.**

Option 1 is the smallest safe choice. Property grouping can be added later if measured overlap becomes common.

## Interaction and logic

- Only active, currently filtered vacancies with public coordinates receive markers.
- The marker shows a compact rent value using the user's display currency.
- The selected listing marker turns orange and rises slightly.
- Tap, click, Enter, or Space selects the corresponding listing card and scrolls it into view.
- Hover or keyboard focus exposes the room name, area, full rent period, and availability date.
- Changing filters rebuilds markers from the filtered result set.
- Exact addresses remain private; markers continue using the approximate public coordinates stored for the property.

## Runtime proof

- Exact tested source: `77a2bc1`.
- Preview: `https://vacancy-qe83nbo9l-tbond24s-projects.vercel.app`.
- Deployment: `dpl_31ThPQvzUPuPsVTicTiSqCsUjPKh`.
- Targeted database-marker and map synchronization suite: **22/22 pass** across desktop and mobile.
- Complete hosted regression, including the new marker checks: **88/88 pass**.
- Real hosted database evidence displayed three separate approximate locations with `KSh12k`, `KSh18k`, and `KSh30k` price markers. Selection visibly changed the `KSh12k` marker to orange.
- Mobile screenshot: `outputs/vacancy-stage22-markers-preview.png`.
- Production was not changed during this stage.

## Failure diagnosis

The first local marker assertion found no Leaflet markers because the isolated static test server could not load Leaflet from its external CDN. Listing data and non-map tests continued to work, and no application error was emitted. The valid hosted rerun loaded Leaflet and passed every targeted marker check. The harness limitation was kept distinct from product behavior.

## Score

- Data usefulness: **10/10**
- Map readability: **9/10**
- Touch and keyboard interaction: **10/10**
- Privacy preservation: **10/10**
- Complexity control: **10/10**

Acceptance is met. Clustering and property-level grouping remain deferred until listing density provides evidence that overlapping markers are a recurring problem.
