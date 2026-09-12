# Stage 72 — Global discovery repair

## Aim and acceptance

Make every active vacancy discoverable by its actual map location. A visitor's browser country may set useful formatting defaults, but it must not silently remove inventory from other countries. Acceptance requires an Australian market preference to render both Australian and Kenyan vacancies, and a Nairobi text search to return the Kenyan vacancy and its marker.

## Options considered

1. Remove the market-code predicate and keep location, category, price, date, amenity, and radius filters. Highest user value, lowest complexity, and consistent with the existing currency/location separation.
2. Change `marketCode` whenever geocoding returns another country. This fixes typed searches but still hides remote inventory before a search and adds state coupling.
3. Add a country selector. This is explicit but adds another control and still creates a country boundary that renters did not request.

Rank: 1, 2, 3. Option 1 is the smallest safe repair.

## Build and proof

The implicit `property.marketCode === browser marketCode` predicate was removed. Targeted browser tests now cover mixed-country inventory and cross-country text search at both desktop and mobile sizes. The marker count is asserted alongside card results so source-only proof cannot pass this stage.

The first run produced two harness failures because it expected retired wording (`current vacancies`) while the rendered product correctly used `vacancies found`; both search scenarios themselves passed. Fixes considered were reverting the product copy, using a loose numeric assertion, or updating the test to the current exact copy. The exact-copy correction ranked first because it retains a meaningful accessible-text check without changing working product behavior.

## Rollback

Return to the commit immediately before Stage 72 or restore the removed market-code predicate in `app/src/discovery.js`.
