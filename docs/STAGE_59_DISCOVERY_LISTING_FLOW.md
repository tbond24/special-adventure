# Stage 59 — Discovery clarity and question-led listing flow

## Aim and acceptance

Make listing cards easier to scan and make the first listing decisions feel simple without changing the property → unit → vacancy database model. Acceptance requires a familiar location pin, concise tiles, richer lists, compact freshness/deposit treatments, no preset searches, listing-specific save feedback, a two-question listing start, image preview expansion, manual-address assistance and errors, and runtime proof on desktop and mobile. Production remains on the Stage 58 rollback point until the preview is approved.

## Formula decisions

| Feature | Options considered (ranked) | Value / complexity | Smallest safe choice |
| --- | --- | --- | --- |
| Freshness pill | 1. lighter compact pill; 2. plain text; 3. remove freshness | High scan value / very low complexity | Option 1. Keep useful freshness, remove bold weight, trim padding and add separation below it. |
| Deposit in narrow cards | 1. responsive `Dep.` plus amount; 2. amount only; 3. shrink all card text | High decision value / low complexity | Option 1. The amount remains clear and the full label remains on wider layouts. |
| Location symbol | 1. standard map pin; 2. current navigation arrow; 3. text only | High recognition / low complexity | Option 1. A local SVG uses the same visual language as common mapping products and avoids device-specific glyphs. |
| Amenity symbols | 1. existing familiar local symbols; 2. emoji; 3. new icon dependency | Good recognition / low complexity | Option 1. Parking, shield, Wi-Fi, water, electricity, furniture and shower symbols stay crisp and consistent. |
| Tile versus list density | 1. shared core with list-only facts; 2. identical layouts; 3. separate renderers | High usefulness / low-to-medium complexity | Option 1. Tiles show the first two notable amenities plus deposit; lists also show distance and all supported amenities. |
| Preset searches | 1. remove; 2. keep inventory-derived suggestions; 3. replace with fixed examples | Cleaner first view / very low complexity | Option 1, as requested. Reusable onboarding remains available separately. |
| Save feedback | 1. “Listing saved”; 2. “Room saved”; 3. icon-only feedback | Clear language / very low complexity | Option 1. It matches the object the user acted on. |
| Listing start | 1. type then existing/new property; 2. show the full form; 3. create a separate wizard/backend | High reduction in mental load / medium complexity | Option 1. It layers two questions over the proven composer and preserves the existing data model. |
| Listing type choices | 1. Room, Studio, Apartment, House; 2. every property subtype; 3. free text | Good coverage / low complexity | Option 1. The selected button stays highlighted and seeds existing property/unit controls. |
| Existing/new destination | 1. two explicit buttons; 2. combined dropdown; 3. infer automatically | High clarity / low complexity | Option 1. Existing reveals active account properties; new reveals the current property-name flow. |
| Image preview | 1. one large image plus three compact images and `+N`; 2. filename list; 3. full asset library | High confidence / medium complexity | Option 1. The first four stay compact, `+N` reveals the full set, and existing main/reorder/remove tools remain. |
| Location timing | 1. closed location stage after listing details; 2. open map first; 3. remove map | High task-flow value / low complexity | Option 1. The map is not the default first screen; the user opens Location when ready. |
| Manual address help | 1. debounced single suggestion from the existing free geocoder; 2. paid autocomplete; 3. no assistance | High error reduction / low complexity | Option 1. One result limits calls and cost; failures appear beside the field. |

## Build boundaries

- Kept the established property, room/unit and vacancy persistence paths unchanged.
- Added Stage 59 as an isolated presentation/controller module loaded after the prior stages.
- Used local SVG symbols and the existing free geocoding endpoint; no paid service or new package was added.
- Kept image compression, ordering, removal and upload security from Stage 58.
- Kept production untouched while the preview gate is running.

## Failure diagnosis and ranked fixes

1. The first combined run scored 42/48. Four older checks expected the property/photo controls before the new opening questions. Ranked fixes: (1) update the checks to follow the intentional two-question path, (2) expose hidden duplicate controls, (3) delete those checks. Chose option 1; the original behavior remains covered through the new user path.
2. The `+N` photo control was present but not clickable because it was nested in a clipped filename label. Ranked fixes: (1) make it a direct image overlay button, (2) force-click it in tests, (3) remove expansion. Chose option 1 because it fixes the user interaction. Desktop and mobile proof then passed.
3. The legacy `test:e2e` command first targeted an old Vercel URL and every navigation was blocked by network policy. After explicitly targeting the local artifact, its old fixture still required exactly three obsolete `.explore-card` records that the current backend does not provide. Ranked fixes: (1) rely on the maintained Stage 52/54/57/58/59 suites with controlled runtime data, (2) weaken the old fixture count, (3) seed production data. Chose option 1 and did not alter tests merely to force green or write fixture data to production.

## Runtime evidence

- Stage 59 photo overlay retest: 2/2 passed on desktop Chromium and Pixel 7.
- Relevant creation, guest enquiry, discovery, marketplace and Stage 59 regression: 48/48 passed on desktop Chromium and Pixel 7.
- The suite exercised clickable image expansion, address success and error responses, existing/new property selection, archived-property exclusion, card/list density, pin rendering, responsive deposit wording, save feedback and page overflow.
- Hosted preview and unmocked backend smoke evidence are required before this stage can be checkpointed or offered for production promotion.

## Score before hosted proof

| Section | Score | Evidence |
| --- | ---: | --- |
| Discovery clarity | 10/10 | Pin, compact tile facts, expanded list facts and preset removal passed on both devices. |
| Listing start | 10/10 | Type and destination decisions passed with selected state and correct underlying values. |
| Photo handling | 10/10 | Four-image compact grid, main image and clickable expansion passed after the real defect was fixed. |
| Address handling | 10/10 | Debounced selectable suggestion and visible error state passed on both devices. |
| Regression | 10/10 | 48/48 maintained relevant checks passed. |
| Release readiness | Pending | Requires hosted preview and unmocked smoke proof. |

