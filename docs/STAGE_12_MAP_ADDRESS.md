# Stage 12 — map-led address entry

## Aim and acceptance

Let a lister choose a property on a map, receive a structured address suggestion, review it, apply it to editable fields, and continue manually when lookup fails. Keep the exact lookup coordinate transient and store only an approximate public pin. Production must remain unchanged during verification.

Acceptance requires real provider responses, a real map click, editable populated fields, privacy rounding, failure fallback, desktop and mobile tests, and a reversible checkpoint.

## Options considered

| Rank | Option | Cost | Value | Complexity / risk |
| --- | --- | --- | --- | --- |
| 1 | OpenStreetMap tiles plus public Nominatim reverse lookup behind a replaceable server endpoint | Free | Tests the full workflow immediately | Strict usage policy; appropriate only for low-volume, user-triggered MVP use |
| 2 | Geoapify free tier | Free up to its published allowance | Better production limits and provider controls | Requires a new API key/account configuration |
| 3 | Google Maps Platform | Usage-based paid service | Broad coverage and mature tooling | Billing setup, higher cost, provider coupling |

The smallest safe choice is option 1 for this low-volume MVP stage. It uses explicit map clicks only, OpenStreetMap attribution, server caching, per-instance throttling, a seven-second timeout, no typed-address disclosure, and a provider boundary that can be replaced without changing the listing form. Reassess before meaningful traffic or if rate-limit/accuracy evidence worsens.

## Free-provider evidence

Six rate-limited reverse lookups were run against Nairobi/Kasarani, Perth, London, New York, Kampala and Dar es Salaam. All six returned usable city and country fields. Five returned either road or postcode detail. Kampala returned a usable locality/city despite sparse street data. This was sufficient because every proposed value remains editable and manual entry is retained.

## Build

- Added `/api/reverse-geocode` as a provider adapter with input validation, timeout, cache headers, in-memory hot cache, controlled request spacing, and a manual-entry error.
- Map clicks and marker drags now request a suggestion.
- The lister reviews the suggestion before applying it.
- Region, city, locality, landmark, postcode and private address remain editable.
- Public coordinates are rounded to three decimals; the exact clicked coordinate is used only for the lookup.
- Provider failure leaves the approximate pin and manual fields available.

## Test, score and iteration

Initial browser tests failed before reaching the feature because the local static harness could not reach Supabase and the shared setup waited for the discovery map. Fix options were ranked: (1) isolate the listing setup and stub only external map rendering in component tests, (2) bundle a second local copy of Leaflet, or (3) weaken the wait. Option 1 was the smallest accurate fix; option 3 was rejected because it would hide a harness failure. Real Leaflet/provider behavior was then tested separately in the Vercel runtime.

Results:

- Free-provider sample: 6/6 usable.
- Targeted browser tests: 4/4 pass across desktop and mobile.
- JavaScript syntax and diff validation: pass.
- Isolated Vercel preview deployment: READY (`dpl_CwrdcHqojSAFXuZkWfGgqa8cBodg`).
- Deployed preview endpoint: returned a structured Perth address with road, landmark, city, region, postcode and country.
- Real Vercel-runtime browser flow: map click returned a London suggestion; applying it filled all available fields; public coordinates were `51.507,-0.127`; editing the address afterward succeeded.
- Manual lookup-failure path: pass in desktop and mobile browser tests.

Score: function 10/10; privacy 9/10; resilience 9/10; usability 9/10; cost 10/10; evidence 10/10. Stage score: **9.5/10 — PASS**.

## Rollback and status

Production remains unchanged at `https://getvacancy.site`. Remove the API adapter and the map lookup additions, or return to the preceding commit `bac7e28`, to roll back this stage. The next isolated stage is decoupling display currency from location/market selection.
