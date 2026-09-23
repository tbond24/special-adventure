# Stage 93 — isolated OpenFreeMap + MapLibre preview

## Aim and isolation

Evaluate OpenFreeMap vector tiles with MapLibre without changing the public Vacancy map. The normal URL continues to initialize the existing Leaflet map. The alternative activates only when the page has `?map=openfreemap`, so production and the review build can contain both engines without switching ordinary visitors.

## Decision

Three approaches were considered:

1. Add MapLibre as a query-gated adapter around the existing discovery behavior.
2. Replace Leaflet throughout the application.
3. Build a separate duplicate map page.

Option 1 was chosen. It reuses the current search, viewport filtering, type selector, listing cards and mobile controls while keeping one discovery interface. A full replacement would make rollback harder, while a duplicate page would allow the two experiences to drift.

OpenFreeMap's Positron and Dark styles are used without an API key. MapLibre 6.11.1 is vendored with its license and loaded only for the preview route. The older vulnerable package version was rejected; the installed dependency audit reports zero known vulnerabilities.

## Map presentation

- Retains Vacancy's existing header, search, tools, current-location and multi-type controls.
- Uses the same low-zoom regional listing totals and high-zoom category/price markers.
- Preserves marker-to-listing synchronization and viewport-driven results.
- Removes built-in zoom controls.
- Hides POI, amenity, transit, airport, rail, ferry, aeroway and house-number layers.
- Delays road labels until closer zoom levels and removes road shields/icons.
- Keeps OpenFreeMap, OpenMapTiles and OpenStreetMap attribution visible.
- Supports light/dark map styles without resetting the map centre or zoom.
- Shows a clear fallback link to the current map if the vector style cannot load.

## Runtime findings and correction

The first focused pass exposed an inherited card-association mismatch: a previous card styling stage inserted a category class, so the older exact-string replacement did not add `data-card-id`. Stage 93 repairs that association only while the OpenFreeMap preview is active. No current-map file was changed.

A full-page browser screenshot initially appeared blank because that capture mode omits a fixed WebGL canvas. Viewport captures, loaded-tile state and 436 rendered map features confirmed the actual map renders correctly.

## Verification

- Stage 93 focused desktop/mobile suite: **12/12 passed**.
- Existing maintained Vacancy desktop/mobile regression: **98/98 passed**.
- Mobile viewport: 390 × 844, no horizontal overflow and all map controls reachable.
- Desktop viewport: 1440 × 1000, vector map and controls visually reviewed.
- MapLibre dependency audit: **0 known vulnerabilities**.
- Current Leaflet route explicitly checked: one Leaflet map, zero MapLibre maps.
- Production was not changed.

## Rollback

- Pre-build checkpoint: `checkpoint/stage93-openfreemap-prebuild` at Stage 92.
- Post-test checkpoint: `checkpoint/stage93-openfreemap-preview-pass`.
- To remove the experiment, return to the pre-build checkpoint. Because activation is query-gated, removing `?map=openfreemap` immediately uses the unchanged current map even within the preview deployment.

## Practical limits

OpenFreeMap is an external tile service, so map availability and style changes remain provider dependencies. This stage does not add offline tiles, server-side clustering or a second geocoder. Those would add complexity without current evidence that Vacancy needs them.
## Hosted preview proof

- Preview: `https://vacancy-659eadtuc-tbond24s-projects.vercel.app/?map=openfreemap#home`
- Deployment: `dpl_ECJy3BkSPoebL9U6QcjRVeACYpnP`
- Tested application commit: `80780b7`
- Hosted Stage 93 suite: **12/12 passed** across desktop and mobile.
- Real hosted vector runtime: style loaded, **436 rendered base-map features**, zero horizontal overflow, zero browser errors and no fallback error state.
- Ordinary preview URL remains on Leaflet; production remains unchanged.
