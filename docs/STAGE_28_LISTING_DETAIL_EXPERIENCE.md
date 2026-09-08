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

## Hosted proof and score

- Source commit: `1c01383`.
- Preview: `https://vacancy-l8mis2jsv-tbond24s-projects.vercel.app`.
- Deployment: `dpl_4zZvnnt443QovdfFz2coSBxq9ALD`.
- Focused local regression after the visual fix: **50 passed, 4 intentional skips, 0 failed**.
- Complete hosted regression: **96 passed, 4 intentional skips, 0 failed** across 100 test instances.
- Local mobile visual: `outputs/vacancy-stage28-detail-local.png`.
- Production remains unchanged at `dpl_9s65Up2invnvcuYfFpcib6shSwQT`.

- Gallery and thumbnails: **10/10**
- Location context and privacy: **10/10**
- Information hierarchy: **9/10**
- Existing detail actions preserved: **10/10**
- Regression safety: **10/10**

Stage score: **49/50 — PASS**.

Rollback chain: production `dpl_9s65Up2invnvcuYfFpcib6shSwQT`, prior checkpoint `checkpoint/galleries-saved-pass`, and new checkpoint `checkpoint/listing-detail-experience-pass`.
