# Stage 75 — Listing discovery and guided listing repair

## Aim and acceptance

Restore reliable card galleries and stable map state, clarify renter-facing card information, and reduce listing creation to one visible step at a time. Production must remain unchanged until mobile runtime proof and the relevant regression suites pass.

Acceptance requires: horizontal card/list gallery movement with an updating counter; no document-level horizontal overflow; currency changes preserve map centre and zoom; price and period remain on one line; hearts remain legible over photos; category markers remain distinct; only positive, familiar feature icons appear; inherited property rules are not editable during unit creation; one visible review action; pause remains icon-only; and existing publish behavior remains intact.

## Options and decisions

### Discovery repair

1. Patch the late CSS and currency rerender while retaining the current renderer. **Rank 1** — highest value, lowest complexity, reversible.
2. Rebuild listing cards as new components. **Rank 2** — cleaner long term, but risks card/detail parity.
3. Replace Leaflet and discovery together. **Rank 3** — high cost and unrelated to the reported regressions.

Chosen: option 1. `contain: strict` caused the swipe regression, a late broad icon rule caused black hearts, and a full `render()` on currency change reset Leaflet. The repair targets those causes.

### Listing workflow

1. Present the existing validated fields as a centred, one-section-at-a-time wizard after type/property selection. **Rank 1** — preserves backend and validation while reducing overload.
2. Build a second composer and migrate gradually. **Rank 2** — good isolation but duplicates behavior.
3. Rewrite composer and persistence together. **Rank 3** — greatest regression and data risk.

Chosen: option 1. The initial choices collapse into a compact breadcrumb, the progress control moves to the top, the bottom fixed bar is removed, and the existing details sections remain the source of truth.

### Rules and feature hierarchy

1. Keep property rules optional and late; units inherit them without editable creation overrides. **Rank 1** — clear model and least work for listers.
2. Show overrides disabled until an explicit toggle. **Rank 2** — more flexible but adds decisions.
3. Show every property and unit rule immediately. **Rank 3** — highest mental load.

Chosen: option 1. Positive standout features can appear on renter cards; negative or unknown states do not become cryptic icons.

## Score target

Each area must score at least 9/10 after runtime verification: gallery, map stability, card hierarchy, category clarity, listing workflow, owner controls, mobile responsiveness, accessibility, regression safety, and performance.

## Failure loop 1

The first desktop/mobile targeted run passed 8/12 checks. The saved heart remained white because the theme can redefine the accent token, and the listing start remained visible because the enhancement marked the form as processed before the lister completed the two initial choices.

Heart fixes ranked: (1) use the established fixed Vacancy orange for the saved state; (2) add a new semantic favourite token; (3) change the whole accent system. Option 1 is the smallest safe fix.

Journey fixes ranked: (1) defer enhancement until the add-to choice and schedule it from that event; (2) observe every class mutation; (3) rewrite the initial selector. Option 1 is the narrowest and avoids a noisy observer.

The second run showed the saved-heart assertion was sampling during the existing colour transition; browser inspection confirmed the final computed rule was orange. Harness fixes ranked: (1) wait for the 200 ms visual transition; (2) disable animation in the product; (3) assert only the CSS rule text. Option 1 preserves the intended interaction and tests the settled runtime state.

The visual pass then showed global inventory fitting Kenya and Australia into one world-scale map. Map fixes ranked: (1) focus initial bounds on listings within 1,500 km of the detected market while retaining global results; (2) hide all listings outside the market; (3) require location permission before showing the map. Option 1 keeps discovery global, gives a useful initial map, and does not connect currency to location.

## Final verification and score

- Targeted desktop/mobile repair suite: **16/16 passed**.
- Global-discovery plus repair regression: **20/20 passed**.
- Final relevant desktop/mobile regression: **152/152 passed**.
- Runtime data proof at 390 × 844: **6 database listings, 6 markers, zoom 11, zero horizontal overflow**.
- Light and dark visual pass: **passed**; hearts remain visible over images and prices remain on one visual line.

| Area | Score | Evidence |
| --- | ---: | --- |
| Gallery swipe and counter | 10/10 | Internal scroll reaches the next image and changes `1/2` to `2/2` |
| Map stability and focus | 10/10 | Currency preserves centre/zoom; global outliers no longer force world view |
| Card price hierarchy | 9.5/10 | Larger amount plus smaller period remain on one visual line at 320 px |
| Save affordance | 9.5/10 | White outline on a dark photo control; orange saved state |
| Category clarity | 9.5/10 | Homes, apartments, shops and other retain distinct common icons/colours |
| Feature clarity | 9.5/10 | At most four positive, familiar features; unknown/negative rules omitted |
| Listing workflow | 9/10 | Initial choices collapse into breadcrumb; progress is top-sticky; one review action |
| Rule inheritance | 10/10 | Smoking/pet unit overrides stay empty and hidden during creation |
| Owner controls | 9.5/10 | Pause remains an icon-only action with accessible label |
| Regression safety | 10/10 | 152/152 relevant checks pass across desktop and mobile |

Overall: **9.6/10 — acceptance met**.
