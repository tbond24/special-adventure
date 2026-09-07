# Stage 16 — listing and admin iteration checkpoint

## Exact artifact

- Source branch: `dev/pre-domain-auth`
- Source after checkpoint documentation: see Git commit containing this file
- Isolated Vercel preview: `https://vacancy-pmxkfkpti-tbond24s-projects.vercel.app`
- Deployment ID: `dpl_Fi1C3jiv1eryq9YHfo6BGyRJPJd9`
- Production: `https://getvacancy.site` — unchanged

The deployed application code matches the combined Stage 12–15 product code. Later local changes in this checkpoint update test expectations and test startup isolation only.

## Accepted scope

1. Map-led address suggestion with editable review, privacy-rounded public pins and manual fallback.
2. Display-currency conversion that leaves country, inventory, map and distance context unchanged.
3. One-unit default plus independently editable sibling units under one property.
4. Launch-focused admin attention queue, status filters, reports, refresh and confirmed deactivation.

No reviews, monetisation, advanced identity verification, ranking system or paid provider was added.

## Runtime evidence

- Free geocoder evaluation: 6/6 representative cities returned usable structured location data.
- Deployed reverse-geocode endpoint: real structured Perth response.
- Real Leaflet map flow: London map click → review → populated editable fields; public pin rounded to `51.507,-0.127`.
- Free rate evaluation: all six supported base currencies returned all six required quotes.
- Real currency flow: 3 Kenya listings remained 3; KSh 12,000/18,000/30,000 became approximately $93/$139/$232; Kenya hint/map/km context remained; USD 100 filter correctly returned one listing.
- Real multi-unit UI: one editor by default, two after plus; independent labels and field names.
- New-feature browser suite: 10/10 across desktop and mobile.
- Standard browser regression: 18/18.
- Map synchronization regression: 2/2.
- Full hardening and adversarial gate: 44/44.
- Syntax and diff validation: pass.

## Failures and fixes

- Local static setup initially waited for Supabase discovery before reaching isolated listing tests. Listing setup was isolated without weakening product assertions.
- A broad currency test expected the removed country value `KE`. It now expects display currency `KES` while retaining separate Kenya inventory/map checks.
- The Windows Vercel development server became unstable under concurrent hot reload. Provider behavior was proven in the Vercel runtime; the full browser gate used a stable static runtime against the same application files.
- Isolated tests initially began while application startup was still completing, allowing startup/focus refresh to replace their DOM. Tests now wait for `booting === false` before isolating background refresh.
- The currency fixture removed Leaflet but retained its old map object. The fixture now clears both impossible-state globals.

Every failure stopped advancement, was diagnosed, and was rerun through its relevant gate.

## Provider thresholds and rollback

- Nominatim is acceptable only for current low-volume, user-triggered reverse lookups. Move to Geoapify's free tier before meaningful traffic, autocomplete, or if policy/rate/accuracy evidence worsens.
- Frankfurter rates are indicative daily display conversions. Listing amounts remain authoritative in their stored currencies. On rate failure, the app shows original currencies.
- Roll back all four stages to `bac7e28`.
- Roll back individual stages to the prior checkpoint named in each Stage 12–15 document.

## Remaining release step

Production promotion and production QA remain intentionally pending. Promote only the exact tested artifact, then verify home inventory, currency conversion, authenticated map address entry, two-unit creation, admin access and provider endpoints before establishing a new production rollback baseline.
