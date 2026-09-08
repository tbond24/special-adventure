# Stage 31 — Compact glass navigation and reachable map search

## Decision

Three mobile navigation options were compared: full-width Shopify-style tabs, a compact floating four-tab island, and icon-only navigation. The floating island ranked first because it preserves labelled one-tap destinations while exposing more map. For search, a bottom-right equal-height cluster with local inventory suggestions ranked above paid geocoding autocomplete and a larger top search sheet.

## Implemented

- Half-size mobile nav icons and labels in a floating blurred island.
- More transparent glass map header with readable sticker-like logo.
- Bottom-right 42px map controls with matched icon weights.
- Short Search area placeholder, current-inventory suggestions, and explicit Search action.
- Search this area immediately above the control cluster.
- Dark theme displays a moon; light theme displays a sun.

## Failure loop

The first run had 27 passes, 4 skips and 3 failures. One search width exceeded the prior limit by 10px; two tests encoded superseded requirements (second-row tools and a long placeholder). Options were ranked and the smallest compliant fix tightened the cluster to 340px and updated only obsolete assertions. Product behavior was not weakened.

## Runtime evidence

Focused feature plus complete responsive audit: **30 passed, 4 intentional skips, 0 failed**.
Production remains on the previous known-good release.
