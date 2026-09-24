# Stage 95: Vacancy Lite map experiment

## Scope

This is an isolated preview available only with `?map=vacancy-lite`. The production map, the default Leaflet route, and the earlier `?map=openfreemap` experiment are unchanged.

The experiment uses two map levels:

- Below zoom 9, it draws local Natural Earth country outlines and the existing regional vacancy counts. It does not request street tiles.
- At zoom 9 and above, it switches to the existing OpenStreetMap tile layer and shows individual vacancy markers.

The aim is a quieter, purpose-built overview without carrying the rendering and transfer cost of MapLibre at every zoom level.

## Data and attribution

The low-zoom boundary file is `world-atlas@2.0.2`, derived from Natural Earth 1:110m data. The package license is stored beside the data in `app/vendor/world-atlas/LICENSE`. Natural Earth attribution appears on the low-zoom map; OpenStreetMap attribution appears when street tiles are active.

## Rollback

- Pre-build checkpoint: `checkpoint/stage95-vacancy-lite-prebuild`
- Preview-pass checkpoint: `checkpoint/stage95-vacancy-lite-preview-pass`

Removing the Stage 95 stylesheet and script tags from `app/index.html` fully disconnects the experiment.

## Verification

- Stage 95 focused checks: 10/10 passed across desktop and mobile.
- Existing Leaflet and OpenFreeMap regressions: 28/28 passed across desktop and mobile.
- Verified isolation, low-zoom no-tile behavior, zoom transition, regional count drill-down, attribution, mobile controls, and horizontal overflow.

## Local performance evidence

Five fresh mobile sessions were measured for each route using the same local static server:

| Map | Median ready | Transfer | Heap | Long-task time |
| --- | ---: | ---: | ---: | ---: |
| Current Leaflet | 589 ms | 415,939 B | 10.0 MB | 67 ms |
| Vacancy Lite | 622 ms | 455,065 B | 10.0 MB | 57 ms |
| OpenFreeMap | 1,317 ms | 734,692 B | 12.7 MB | 561 ms |

Vacancy Lite was close to the current Leaflet map and substantially lighter than OpenFreeMap. The local server did not compress the 108 KB boundary file, so a hosted Vercel measurement is required before making a final speed claim. The intentional low-zoom overview also differs from the default map's street-level starting view, so the result measures each design's real startup rather than identical visual detail.
## Hosted preview evidence

Three fresh mobile browser sessions were measured per route on the same Vercel preview:

| Map | Median ready | Transfer | Heap | Long-task time | Browser errors | Overflow |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Current Leaflet | 815 ms | 424,959 B | 10.0 MB | 61 ms | 0 | 0 px |
| Vacancy Lite | 752 ms | 464,888 B | 10.0 MB | 53 ms | 0 | 0 px |
| OpenFreeMap | 1,542 ms | 753,026 B | 18.2 MB | 687 ms | 0 | 0 px |

On this sample, Vacancy Lite reached its useful regional view 63 ms sooner than the current Leaflet startup and used 8 ms less long-task time. It transferred about 40 KB more because it includes the local boundary dataset. It was about twice as fast to ready as OpenFreeMap, transferred about 288 KB less, and avoided most of OpenFreeMap's main-thread work. This is a small controlled sample, so it supports preview testing rather than a production replacement decision.

Hosted functional checks: 10/10 passed across desktop and mobile.