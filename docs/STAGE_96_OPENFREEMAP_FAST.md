# Stage 96: Optimized OpenFreeMap experiment

## Decision

Keep the preferred OpenFreeMap/MapLibre visual direction and optimize its rendering architecture in a separate route. Production, the default Leaflet route, and the existing `?map=openfreemap` preview remain unchanged.

Preview query: `?map=openfreemap-fast`.

## Changes

- Replaced per-listing HTML markers with one clustered GeoJSON source and four MapLibre canvas layers.
- Added category colours, price labels, cluster counts, click-to-select behavior, listing-rail synchronization, and feature-state selection.
- Reduced the complete rendered style from 32 layers in the existing preview to 26 in the optimized preview.
- Preserved viewport-based filtering, search, radius, user location, property-type filtering, attribution and existing map controls.
- Replaced full vector-style reloads on theme changes with in-place colour updates, retaining the camera and listing source.
- Reset readiness for every new map instance to prevent stale lifecycle state.

## Verification

- Optimized-map focused suite: 12/12 passed across desktop and mobile.
- Existing Leaflet and OpenFreeMap suite: 27/28 passed on the combined run; the single mobile OpenFreeMap attribution lookup passed immediately when rerun unchanged. The failing assertion depends on remote provider attribution timing and is outside the new query route.
- Browser runtime: ready, 26 layers, zero HTML map markers, no map error and no horizontal overflow.

## Performance evidence

Five fresh iPhone 13 browser sessions per route on the same local server:

| Route | Median ready | Median long-task time | Layers |
| --- | ---: | ---: | ---: |
| Existing OpenFreeMap | 1,105 ms | 894 ms | 32 |
| Optimized OpenFreeMap | 1,031 ms | 630 ms | 26 |

A separate five-run 500-listing update isolated marker work from camera-driven viewport filtering:

| Route | Median update call | HTML markers |
| --- | ---: | ---: |
| Existing OpenFreeMap | 43.4 ms | 500 |
| Optimized OpenFreeMap | 3.1 ms | 0 |

The optimized update submits one GeoJSON source to MapLibre, so the 3.1 ms figure measures the application update call rather than completion of every GPU frame. It still demonstrates removal of the synchronous DOM-marker bottleneck. Hosted evidence is required before any production recommendation.

## Rollback

- Pre-build: `checkpoint/stage96-openfreemap-fast-prebuild`
- Preview pass: `checkpoint/stage96-openfreemap-fast-preview-pass`

Removing the Stage 96 module tag from `app/index.html` disconnects the experiment.
## Final hosted preview evidence

The final query-only preload preview passed 12/12 focused checks on Vercel. Five fresh iPhone 13 sessions per route on the same deployment produced:

| Route | Median ready | Transfer | Long-task time | Base layers | Errors | Overflow |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Existing OpenFreeMap | 2,181 ms | 759,981 B | 843 ms | 32 | 0 | 0 px |
| Optimized OpenFreeMap | 1,771 ms | 759,981 B | 709 ms | 22 | 0 | 0 px |

The preload reduced the measured ready time by 410 ms in this sample without increasing transfer. Absolute timing varied between hosted runs because both routes depend on the remote tile service, so this supports continued preview evaluation rather than a guaranteed production latency figure. The 500-listing application update remained the clearer architectural gain: 43.4 ms with 500 HTML markers versus 3.1 ms using one canvas source.