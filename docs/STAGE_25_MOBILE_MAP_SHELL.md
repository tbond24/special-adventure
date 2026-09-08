# Stage 25 — Mobile map shell and controls

## Aim and acceptance

Make Find feel like a focused mobile map: the map occupies about two-thirds of the viewport from the top edge, the existing header floats above it with a frosted fade, and map controls use less space. Keep database markers, location permission, live search, radius filtering, themes, and desktop behavior working. Acceptance requires genuine browser evidence at mobile and desktop sizes, no zoom buttons, no sideways movement, usable 44px controls, and full relevant regression.

## Options and ranking

1. Refine the existing Leaflet shell with a responsive overlay — high value, low-to-medium complexity, and preserves proven marker and filtering logic. **Rank 1.**
2. Add a draggable results sheet over a full-screen map — familiar but substantially more gesture, focus, and accessibility work. **Rank 2.**
3. Replace Leaflet with a commercial map SDK — potentially richer styling, but adds cost, migration risk, and no present MVP need. **Rank 3.**

Option 1 is the smallest safe implementation.

## Build

- Mobile map height is 67dvh with a safe minimum for short screens.
- The header overlays the map with a translucent fade and blur.
- Search is compact; the location arrow sits to its left.
- A round tools button sits below and opens the existing filters and radius control.
- “Search this area” uses the orange action colour with dark text.
- Explore-map zoom buttons are removed while pinch, scroll, and drag navigation remain.
- Local SVG symbols keep controls crisp and device-independent.

## Failure loop

The first restricted local run reported missing live inventory and Leaflet markers while every new shell assertion passed. Three responses were ranked: rerun the unchanged build with the required service access, add deterministic fixtures to unrelated tests, or weaken the assertions. The network-enabled rerun was selected and passed 25 tests with 3 intentional skips, confirming an environment failure rather than a product defect.

The first visual capture then showed that the initial tools symbol resembled the nearby sun control. Fixes considered were a true gear silhouette, sliders, or a text label. The true gear was the smallest match for the requested interaction and replaced the ambiguous symbol. The header tint was also reduced so the map remains perceptible through the frosted overlay.
