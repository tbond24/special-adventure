# Stage 28 — Listing detail experience

## Aim and acceptance

Open every listing at its top and make location and photography understandable before deeper property facts. Add breadcrumbs, an edge-to-edge gallery, thumbnails about one-twelfth of the gallery width, and a square map preview beside the name/details using only the public approximate coordinates. Preserve enquiry, safety, sibling-unit, currency, and Saved behavior.

## Options and ranking

1. Add an isolated enhancement module around the proven detail renderer — small, reversible, and preserves working flows. **Rank 1.**
2. Rewrite the complete detail renderer — cleaner long-term markup but unnecessarily risks messaging and safety actions. **Rank 2.**
3. Add a gallery/map component package — extra dependency and cost without meaningful MVP value. **Rank 3.**

Option 1 is the smallest safe implementation.

## Build

- Breadcrumbs identify Find, area, and listing.
- All listing images appear in a full-width scroll-snap gallery.
- Thumbnail buttons select images and expose the current image.
- The existing detail panel remains intact beside a square non-interactive map of the published approximate coordinates.
- Detail rendering resets scroll position to the top.
- The map preview remains a labelled placeholder if Leaflet is unavailable.

## Failure loop

The first browser capture exposed “Near Near…” when stored landmark text already included the prefix, and Leaflet’s full attribution crowded the compact square map. Fixes considered were normalizing presentation, changing stored listing data, or enlarging the map. Presentation normalization plus a compact visible OpenStreetMap copyright link was the smallest safe fix and preserves both user data and required attribution.
