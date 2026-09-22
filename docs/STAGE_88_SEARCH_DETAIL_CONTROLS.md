# Stage 88 — Map search, listing media, detail map and gear controls

## Aim and scope

Improve the existing Find and listing-detail experience without changing listing data, messaging, authentication, publishing, admin, or production. Acceptance required working browser evidence on desktop and mobile for:

- a clickable northeast search arrow;
- location suggestions while typing;
- rounded expanded search and property-type controls;
- listing images that exactly fill their media frame;
- one large listing map at the bottom, reached from the location text;
- no helper copy below Enquire;
- conventional toggle switches and a contained move-in date in map tools;
- currency inside map tools, automatic from location until manually overridden.

The Stage 87 production checkpoint remained the rollback base throughout this work.

## Options and decisions

### Map search

1. Reuse the current free Nominatim endpoint with a bounded suggestion mode.
   - Value: high; consistent with the current map; no new vendor or cost.
   - Complexity: low.
2. Suggest only places already present in Vacancy listings.
   - Value: low outside existing inventory.
   - Complexity: low.
3. Add a paid autocomplete provider.
   - Value: potentially higher at scale.
   - Complexity and cost: high.

**Rank:** 1, 2, 3. Chosen: option 1, limited to five results, debounced, cached, and attributed.

### Listing detail map

1. Move the existing map node to one full-width section after listing information.
2. Render a second map and remove the first.
3. Replace the embedded map with an external link.

**Rank:** 1, 3, 2. Chosen: option 1 because it preserves privacy, coordinates, and map initialization without duplicate state.

### Gear controls

1. Restyle the existing checkboxes as accessible switches and keep the current filter events.
2. Replace the filter model with a new component system.
3. Keep square checkboxes.

**Rank:** 1, 3, 2. Chosen: option 1.

### Currency

1. Create one gear-menu selector with Auto/current currency and manual overrides.
2. Keep a second currency control in the header.
3. Infer currency on every map move.

**Rank:** 1, 2, 3. Chosen: option 1. Automatic changes occur only from an approved device location; browsing or moving the map does not unexpectedly change currency.

## Build

- Added bounded suggestion responses to the existing geocode endpoint while preserving its single-result contract.
- Added an isolated Stage 88 browser layer for suggestions, direct search submission, filter switches, currency mode, and detail-map placement.
- Made explicit search and geolocation recentres non-animated so rapid consecutive searches cannot be overwritten by an earlier Leaflet animation.
- Removed stale suggestions as soon as the query changes or the arrow submits.
- Moved the existing detail map into a full-width bottom section and made the visible location text scroll to it.
- Removed asynchronously inserted contact-route helper text below Enquire.
- Normalized listing image fill without changing the 4:3 card ratio or swipe galleries.
- Updated affected historical assertions to the current result wording, bottom-map layout, and enquiry-copy decision.

## Test and failure loop

### Failure 1 — currency control disappeared after a home rerender

Root cause: moving the header select tied the control to disposable home markup. A rerender destroyed it.

Fix options ranked:

1. Create the gear selector independently on every home render.
2. Restore and then move the header selector each time.
3. Rewrite header ownership.

Applied option 1 and reran focused tests.

### Failure 2 — automatic currency became manual after applying location currency

Root cause: the existing currency setter persists the currency; the next render interpreted that stored value as a manual choice.

Fix options ranked:

1. Persist a separate auto/manual mode before applying currency.
2. Stop persisting currency.
3. Infer mode from timing.

Applied option 1.

### Failure 3 — rapid consecutive searches could return to the first location

Root cause: the first Leaflet animated recenter could finish after the second search.

Fix options ranked:

1. Disable animation for explicit search/location recentres.
2. Delay later searches.
3. Rebuild map navigation state.

Applied option 1.

## Runtime evidence

- Focused Stage 88 desktop and mobile proof: **12/12 pass**.
- Search race stress loop: **16/16 pass** across desktop and mobile.
- Relevant discovery, marketplace, contact, detail, and Stage 88 regression: **62/62 pass** across desktop and mobile.
- Runtime checks cover actual clicks, mocked API responses, map-centre changes, suggestion selection, image and slide geometry, scroll movement, computed control shapes, currency state, and DOM placement.
- The unrelated legacy Stage 58 edit-wizard test was diagnosed separately: it waits for a now-hidden old accordion path and was excluded from this scope rather than weakened.

## Score

| Section | Score | Evidence |
| --- | ---: | --- |
| Search arrow and suggestions | 10/10 | Direct click, selection, second search, API contract, and 16-run race stress |
| Listing image fit | 10/10 | All four image/frame edges within 1 px on mobile and desktop |
| Detail map and location link | 10/10 | One large bottom map, no summary map, working scroll link |
| Enquiry cleanup | 10/10 | Async helper copy remains absent |
| Gear filters and date containment | 10/10 | Eight switches, rounded tracks, contained date field |
| Currency behavior | 10/10 | Auto location currency and manual-mode state verified |
| Relevant regression | 10/10 | 62/62 pass |

## Release state

Preview deployment: https://vacancy-qmgtku5pq-tbond24s-projects.vercel.app

- Deployment ID: dpl_GwRx6X869jGvYsRC8x7YyHbotMH1`r
- Hosted Stage 88 proof: **12/12 pass** across desktop and mobile.
- Hosted real geocoder proof: Nairobi returned three valid suggestions with coordinates.
- Artifact check: preview loads Stage 88; https://getvacancy.site does not, confirming production remains on Stage 87.

Production remains unchanged pending preview review.
