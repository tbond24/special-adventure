# Stage 92 — open-listing gallery arrows

## Decision

The listing detail gallery already supported swiping, thumbnails, keyboard navigation and a full-screen lightbox. Three options were considered: reuse that gallery's scroll position and add the same transparent controls as cards; rewrite the detail gallery as a new carousel; or rely on thumbnails and the lightbox. Reusing the existing state is the smallest and most consistent change, so no listing data, layout, map, messaging or lightbox behavior was altered.

## Acceptance

- Previous and next controls appear only when the open listing has at least two images.
- Controls have no background and sit at the vertical midpoint of the main image.
- Each press moves exactly one image and updates the existing thumbnail state.
- Controls stop at the first and last image and do not open the lightbox.
- Desktop and mobile browser checks pass before production promotion.

## Rollback

Checkpoint: `checkpoint/stage92-detail-gallery-arrows-pass`.