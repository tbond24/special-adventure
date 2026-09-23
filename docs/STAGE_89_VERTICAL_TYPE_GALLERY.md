# Stage 89 — Vertical property types and listing-card swipe

## Aim and scope

Make the existing Find-map property selector easier to scan, make its selected state unmistakable, and ensure listing-card photos can be dragged or swiped directly. No listing data, filters, map viewport rules, card content, routes, authentication, or backend contracts change.

## Options considered and ranked

### Property selector

1. Keep the existing control and stack its options vertically, retaining single selection and adding a filled active state. **Rank 1:** smallest change, preserves current filter semantics, clear on mobile.
2. Convert it to a multi-select checklist. Rank 2: supports combined categories but changes filtering semantics the request did not explicitly require.
3. Replace it with a full-screen filter sheet. Rank 3: more room but adds navigation and duplicates the existing Filters surface.

### Listing images

1. Extend the existing native scroll-snap gallery with direct pointer dragging while preserving touch scrolling and the current counter. **Rank 1:** dependency-free and works in card and list layouts.
2. Add previous/next arrow buttons. Rank 2: accessible but adds visual controls the user did not request.
3. Add a carousel dependency. Rank 3: unnecessary weight and regression risk.

## Acceptance criteria

- Property options open in one vertical column.
- The current option is solidly filled and exposes `aria-pressed`.
- Selecting a type still filters the current map inventory.
- Dragging or swiping a list-card image advances its counter without opening the listing.
- The page does not gain horizontal overflow.
- Existing Stage 75, 76 and 88 Find/detail behavior remains green.

## Implementation

`stage89-type-gallery.js` enhances the existing rendered controls after the established Stage 76–88 modules. It adds selection state without changing the underlying category filter, and adds direct pointer dragging to the existing scroll-snap galleries. The CSS only changes the property-choice orientation, selection fill, and gallery interaction cursor/touch behavior.


## Test-loop diagnosis

The first focused run passed both gallery-drag scenarios but the selected-state assertion matched both the current control and its identically named menu option. Ranked fixes were: (1) scope the assertion to the menu, (2) choose the first match, or (3) add test-only identifiers. Option 1 was applied because it tests the intended element without changing the product.

The broader regression then caught a product-level compatibility issue: the first CSS pass replaced the established native horizontal-pan permission with vertical-only panning. Ranked fixes were: (1) restore native `pan-x pan-y` while retaining direct pointer dragging, (2) weaken the existing contract, or (3) split touch into a second implementation. Option 1 was applied because it preserves native mobile swiping and the new direct desktop drag with one declaration.

## Final verification and score

- Focused Stage 89 desktop/mobile acceptance: **4/4 pass**.
- Relevant Stage 75, 76, 88 and 89 regression: **44/44 pass**.
- Selector scanability and selected feedback: **10/10**.
- List-card swipe behavior: **10/10**.
- Mobile containment and regression safety: **10/10**.

Acceptance is met. The release remains limited to the selector orientation/feedback and listing-card gallery input behavior.
