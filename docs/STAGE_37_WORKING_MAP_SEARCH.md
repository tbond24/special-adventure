# Stage 37 — working map search

## Aim, scope and acceptance

Make the Find-page map search behave like a map control: a submitted town, suburb, address or postcode must move the map, establish a visible search centre, enable the radius filter and show nearby database listings. “Search this area” must do the same after a manual map move. Keep production unchanged until a hosted preview passes.

Acceptance requires desktop and mobile runtime proof for successful place search, Enter-key submission, provider failure, map movement, centre marker, radius activation, existing local suggestions, listing-price pins, pin/card synchronisation and no sideways movement.

## Options, value and ranking

1. Proxy explicit OpenStreetMap Nominatim searches through Vacancy, cache results, throttle provider calls and retain database-derived suggestions. Free and globally useful with medium-low complexity. Public Nominatim prohibits client-side autocomplete, so it is used only after Search or Enter.
2. Keep search limited to text already attached to Vacancy listings. Lowest complexity, but a place with no active listings cannot be found and the map does not move.
3. Add Google Maps or Mapbox geocoding/autocomplete. Best suggestion depth, but introduces billing, keys and a vendor dependency before current usage justifies it.

Rank: 1, 2, 3. Option 1 is the smallest safe implementation that completes the user journey.

## Build

- Added a same-origin `/api/geocode` endpoint with input limits, seven-second timeout, one-request-per-second provider guard, bounded memory cache and clear 404/temporary-failure responses.
- Search and Enter now resolve a place, move the map, show a labelled search-centre marker, activate the radius and filter database vacancies by distance.
- Matching known Vacancy locations resolve locally before the external provider.
- A resolved map query becomes a geographic search rather than also excluding nearby listings through an exact text match.
- “Search this area” now synchronises radius controls and the centre marker.
- Changing or clearing the query/location resets only the associated geographic search state.

## Failure and fix loop

The live-product inspection exposed two root defects before the build: Search only filtered existing listing text, and “Search this area” changed the internal centre without synchronising the radius controls or centre marker.

For place search, ranked fixes were: (1) explicit-submit Nominatim search, (2) broaden local listing-text matching, (3) paid autocomplete. Fix 1 was selected for the value and cost reasons above. For the area-search state defect, ranked fixes were: (1) call the established centre synchronisation functions, (2) rebuild map state around one event store, (3) remove radius activation from area search. Fix 1 was selected because it repairs the missing state transition without an architectural rewrite.

No implementation failure occurred in the focused or complete regression. Provider runtime proof returned Perth at `-31.9558967, 115.8605784` with HTTP 200 and the expected cache policy.

## Score

- Successful place search and map movement: 10/10.
- Enter-key and explicit Search behavior: 10/10.
- Search-centre marker and radius activation: 10/10.
- Provider failure recovery: 10/10.
- Existing database pins and pin/card synchronisation: 10/10.
- Free-provider restraint, caching and timeout behavior: 10/10.
- Focused desktop/mobile runtime: 38 passed, 4 intentional applicability skips, 0 failed.
- Full local release regression: 140 passed, 4 intentional applicability skips, 0 failed.

Local score: **60/60**. Hosted preview and production remain unchanged pending exact-artifact deployment and verification.
