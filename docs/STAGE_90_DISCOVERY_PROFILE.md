# Stage 90 — discovery controls, gallery stability and lister profiles

## Aim and acceptance

Improve discovery and listing trust without changing unrelated listing creation, account, admin, or production data. Acceptance requires multi-select property types that stay open until tap-away, white outline icons in the folded control, compact one-line search suggestions, stable touch swiping, Message wording, an interactive detail map, and a public lister page showing only name, photo/initial, rating availability and that lister's published vacancies.

## Options and ranking

### Property types

1. **Set-backed choices in the existing selector** — highest value, low complexity. Keeps the current control and filters by the union of selected types.
2. Checkbox form inside the selector — clear but adds visual and form complexity.
3. A new filter drawer — duplicates the gear menu and expands scope.

Chosen: option 1.

### Search labels

1. **Format Nominatim address details as locality, region, country and postcode** — short, deterministic and uses fields already returned.
2. Truncate the provider display name — visually short but can remove the useful country or postcode.
3. Add another geocoding provider — new cost, policy and availability risk.

Chosen: option 1, with a four-part fallback when structured address fields are absent.

### Gallery gesture repair

1. **Use native touch scrolling; keep manual drag for mouse and pen** — removes the competing touch handlers and preserves desktop drag.
2. Build a custom touch carousel — higher complexity and accessibility risk.
3. Remove card swiping — contradicts the product requirement.

Chosen: option 1.

### Listing map

1. **Enable Leaflet pan, pinch zoom, double-click, keyboard and native zoom controls** — supported by the installed Leaflet 1.9.4 runtime and easy to verify.
2. Custom map controls — duplicate native behavior.
3. Link to an external map — loses the in-page experience.

Chosen: option 1. Wheel zoom stays off so scrolling the listing page is not trapped.

### Lister profile

1. **Build the page from the identity already attached to published vacancies** — no new endpoint or migration, exposes no private contact data, and lists only already-public vacancies.
2. Add a public profiles endpoint/table policy — useful later, but expands RLS and migration scope.
3. Show a modal only — smaller, but does not provide the profile destination requested.

Chosen: option 1. Uploaded avatar paths are included in the existing published-vacancy query. Missing/broken photos fall back to the lister's initial. Ratings are labelled “Not available yet”; no score is fabricated.

## Security and data boundary

No table, policy, RPC, auth or private-contact change is included. The page reuses the existing public vacancy join and displays only display name, avatar and active listings. Supabase's current RLS guidance says public access should be limited to data intentionally readable by the anonymous role; this stage does not broaden access or add a bypass.

## Verification record

Targeted Stage 90 runtime proof covers selection persistence and tap-away closure, union filtering, icon colour, one-line suggestions, compact geocoder output, native touch gallery behavior, Message wording, active Leaflet handlers and zoom, lister navigation and listing ownership, rating honesty, and mobile overflow. Relevant Stage 54, 56, 76, 79, 88 and 89 suites are rerun after the targeted suite.


## Failure loop

The first combined regression command omitted the local runtime URL required by older Stage 54 and 56 harnesses, so those pages never loaded and `booting` was undefined. This was a harness invocation failure.

After rerunning against the correct local URL, six assertions failed:

- Two Stage 89 assertions still assumed a type choice auto-closed the menu.
- Two Stage 54 safety assertions expected the old floating gallery flag, superseded by the existing Stage 76 bottom report row.
- Two Stage 54 distance assertions expected KM/MI radius controls, superseded by the existing Stage 76 live viewport model.

Ranked fixes:

1. Correct the runtime target and update only assertions superseded by later accepted behavior.
2. Skip the older suites.
3. Revert the newer product behavior to satisfy old tests.

Option 1 was applied. It preserves product requirements and keeps regression coverage meaningful.

## Runtime results

- Focused Stage 90 acceptance: **12/12 passed** across desktop and mobile.
- Corrected current-behavior subset: **16/16 passed** across desktop and mobile.
- Full relevant Stage 54/56/76/79/88/89/90 regression: **66/66 passed** across desktop and mobile.
- Real Supabase listing-load proof: **5 active vacancies loaded**, the owner payload contained the avatar field, the Find page rendered, and the browser reported **0 errors**.
- JavaScript syntax validation: all application scripts and focused tests passed.

## Score

| Section | Score | Evidence |
| --- | ---: | --- |
| Multi-type selector | 10/10 | Union filtering, persistent menu, tap-away closure, selected-state and folded icons proved in-browser |
| Search suggestions | 10/10 | Structured compact API labels and one-line UI proved |
| Listing gallery | 10/10 | Native touch path and desktop drag path proved without opening the listing |
| Message wording | 10/10 | Detail and send flow use Message while stable internal routes remain unchanged |
| Interactive location map | 10/10 | Pan, touch zoom, double-click, keyboard and zoom control handlers enabled and exercised |
| Lister profile | 9/10 | Real name/photo fallback, owner-only active listings and profile navigation proved; rating collection remains intentionally deferred |
| Security/data scope | 10/10 | No private contacts, service role, policy, migration or new public endpoint added |
| Mobile layout | 10/10 | Detail and lister profile overflow stayed at 0–1 px tolerance |

## Remaining profile work

Ratings are intentionally shown as unavailable. A later ratings stage should define eligibility, anti-retaliation rules, moderation, aggregation and RLS before a score is displayed.
