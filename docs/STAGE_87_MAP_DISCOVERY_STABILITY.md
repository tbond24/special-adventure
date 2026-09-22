# Stage 87 — Map discovery stability

## Aim and scope
Keep map-led filtering while stopping listing-gallery flicker, simplify the result count, and separate the compact search and tools controls. Scope is limited to the Find page viewport renderer and its focused regression tests.

## Options considered

### Result count
1. Remove the count: least text, but hides whether a map move changed the result set.
2. Keep the current map-area sentence: clear but repetitive.
3. Keep a shorter count: preserves feedback with less visual noise.

**Choice:** option 3 — `<number> vacancies found`.

### Gallery flicker
1. Rebuild every card on each map `moveend`: current behavior; resets galleries and can flicker.
2. Debounce longer: reduces frequency but does not remove destructive rebuilds.
3. Compare visible listing IDs and preserve the existing cards when the result set is unchanged.

**Choice:** option 3 — smallest safe state-preserving fix.

### Search and tools controls
1. Restore the tools control class in the active Stage 76 layer, swap visual order, and use the northeast arrow while expanded.
2. Add ID-specific CSS overrides over the incorrect shared class.
3. Rewrite the older Stage 50 polish layer.

**Choice:** option 1 — isolated, explicit, and lowest regression risk.

## Build
- Result label shortened to `vacancy/vacancies found`.
- Viewport results now use a stable listing-ID key. Unchanged result sets keep their existing DOM, gallery scroll position, loaded images, and event handlers.
- Search now sits before the gear control.
- Expanding search focuses the field and changes its action to the northeast arrow.
- The gear remains an independent tools button.
- Stage 76 asset version advanced to `76.2`.

## Test and diagnosis loop
The first desktop/mobile run produced 10 passes and 2 failures: the search and gear controls shared the same position. Root cause was the older Stage 50 layer replacing the gear's `tools-action` class with `search-action`.

Fixes were ranked as class restoration, CSS override, or rewriting Stage 50. The smallest safe class restoration was applied.

The complete focused regression passed **12/12** across desktop and mobile. The broader Stage 75–76 Find-page regression then passed **28/28**. The new gallery test moves the map while keeping the same visible listings and proves the original gallery node and its scroll position survive. A final mobile browser interaction rendered five live listings, kept the gear independent, exposed the northeast search arrow, and reported no browser or console errors.

## Acceptance score
- Result feedback clarity: 10/10
- Gallery stability: 10/10
- Search/tools separation: 10/10
- Focused desktop/mobile regression: 12/12 pass
- Broader Find-page regression: 28/28 pass
- Mobile runtime interaction: PASS, no browser errors

Production remains unchanged until preview verification and explicit promotion.
