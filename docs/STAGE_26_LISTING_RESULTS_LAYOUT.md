# Stage 26 — Listing results layout

## Aim and acceptance

Reduce competing listing controls and make browsing orderly on mobile. Use one Filters entry, one view toggle, two equal cards per row with consistent gaps, and full-width list rows with a 50/50 image/details split. Remove the redundant View button and make the complete listing surface keyboard- and pointer-operable. Preserve map synchronization, Saved behavior, and desktop browsing.

## Options and ranking

1. Refine the existing renderer and CSS modes — preserves proven data and map behavior with low-to-medium complexity. **Rank 1.**
2. Replace results with a virtualized feed — useful only at much larger inventory and adds focus/scroll complexity. **Rank 2.**
3. Add a grid/carousel package — unnecessary dependency and bundle cost for layout behavior CSS already handles. **Rank 3.**

Option 1 is the smallest safe implementation.

## Build

- Removed the exposed quick-filter row; all amenities remain in the existing filter panel.
- Added a listing-level Filters button that returns to and opens that panel.
- Replaced separate Cards/List buttons with one round SVG toggle.
- Mobile card view uses two equal columns and 10px gaps.
- Mobile list view uses full-width rows with equal image and detail columns.
- Result cards have square outer corners and fixed image proportions.
- Removed the View button; the complete card opens its listing, with Enter and Space support.

## Failure loop

The first focused run failed broadly because the home renderer still transformed the exact old `<article class="card">` string. Once the shared card gained its new class, no result received the `.explore-card` identity used by the map and test harness. Fixes ranked were: update the single transformation, parameterize the shared renderer, or duplicate a home renderer. Updating the transformation is the smallest safe fix and preserves the established architecture. The complete relevant suite must pass again before this stage can advance.

After that fix, 24 checks passed and four timed out because they still looked for the removed Pets shortcut or interacted with the hidden Pets checkbox. Options were to update the tests to open the real grouped filter flow, restore the duplicate shortcut, or force hidden inputs. The tests now exercise Filters → More filters → Pets, preserving the requested consolidation and real runtime evidence.
