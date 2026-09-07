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
