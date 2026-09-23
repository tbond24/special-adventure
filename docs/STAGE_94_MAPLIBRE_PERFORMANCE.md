# Stage 94 — MapLibre performance and visual-density pass

## Scope

This pass changes only the query-gated OpenFreeMap + MapLibre preview (`?map=openfreemap`). The production/default Leaflet route remains unchanged.

Rollback start: `checkpoint/stage94-maplibre-preopt` at `8df8b6e`.

## Evidence and diagnosis

Cold hosted measurements before this pass:

| Engine | Ready time (3 runs) | Transferred |
| --- | --- | --- |
| Leaflet | 660–844 ms | 420,302 bytes |
| MapLibre preview | 1,601–1,707 ms | 745,764 bytes |

The avoidable causes were sequential resource loading, fetching and parsing the full provider style before first render, rendering 55 provider layers and leaving attribution expanded over the app controls. MapLibre also has an unavoidable baseline cost from WebGL, vector-tile parsing and its larger runtime.

## Options considered

1. Optimize the isolated MapLibre preview: chosen. It preserves the visual direction while keeping the test reversible.
2. Replace the live map immediately: rejected because the preview is still materially heavier than Leaflet.
3. Rewrite the existing map boot path to avoid Leaflet initialization in preview mode: deferred because it couples the experiment to mature app boot code and is disproportionate to this test.

## Changes

- Load preview CSS, MapLibre and the style in parallel.
- Ship compact light/dark style definitions with the app, removing an external style-definition round trip and provider-style drift.
- Retain only essential geography, water, parks, buildings, administrative boundaries, cities/towns/countries and major road names at close zoom.
- Remove points of interest, rail, airport, minor locality and minor road-label clutter.
- Use one map worker, cap high-DPI rendering at 1.5, disable cross-source collision work and label fades.
- Collapse required attribution into MapLibre's compact information control after load, with the legal credit links still accessible.
- Move that control above the Vacancy actions so it does not overlap them.

## Results

Fresh local mobile sessions after optimization:

| Engine | Ready time (3 runs) | Transferred |
| --- | --- | --- |
| Leaflet | 316–334 ms | 412,679 bytes |
| Optimized MapLibre | 866–914 ms | 731,432 bytes |

The earlier cold local MapLibre run was 2,651 ms. Local style hosting removed that first-load spike in this test. MapLibre remains about 2.7x slower than Leaflet locally and transfers about 319 KB more, so Leaflet remains the production choice pending user review and real-device evidence.

## Verification

- Stage 93 focused OpenFreeMap suite: 12/12 passed across desktop and mobile.
- Stage 91 map/search/gallery regression on the default Leaflet route: 16/16 passed.
- Fresh mobile runtime check: no browser errors, no page-level horizontal overflow, 32 total style layers including Vacancy overlays.
- The older `npm run test:e2e` suite could not exercise its assertions because its common setup expects at least two live `.explore-card` records and the current local environment returned zero. All 18 cases failed at that same fixture gate; this is recorded as a harness/data precondition failure rather than a product pass.

## Release decision

Deploy only as a Vercel preview. Do not promote to `getvacancy.site`. Compare the optimized preview with the unchanged Leaflet route before choosing an engine.

## Hosted preview verification

Exact Vercel artifact: `dpl_99M1pVpv3mHv4HsNQZWYKGXmZmEj`.

Fresh hosted mobile sessions after optimization:

| Engine | Ready time (3 runs) | Transferred |
| --- | --- | --- |
| Leaflet | 700–1,088 ms | 421,308 bytes |
| Optimized MapLibre | 1,456–3,567 ms | 749,075 bytes |

The hosted MapLibre preview passed its complete 12-check desktop/mobile suite. A resource trace showed roughly 306 KB across MapLibre's main/shared modules before vector rendering; OpenFreeMap's source/font requests were fast in that trace. This confirms the remaining difference is mainly engine weight and runtime work rather than a removable style request. The production recommendation therefore remains Leaflet until MapLibre's visual benefits justify its measured cost or the app architecture can load the vector engine only after explicit user intent.
