# Quiet listing-detail experiment

This is a reversible comparison, not a replacement for the current listing page.

## Open and compare

Open the preview with `?experiment=quiet#home`, select any published listing, and choose **Try the quiet listing layout** near the bottom of the current page. The experimental page has a **View current listing design** link. Direct routes are `#detail/<listing-id>` (current) and `#detail-quiet/<listing-id>` (experiment). Both read the same published vacancy data.

## Scope

- The current `#detail` renderer, backend, and data model are unchanged. An opt-in comparison link is appended only when `experiment=quiet` is present in the URL.
- The experimental route hides the global header and mobile navigation, begins with a large gallery, reuses the existing photo viewer and approximate map, and retains save, share, messaging, lister profile, report, and block actions.
- Long descriptions and feature lists use disclosure controls. Feature counts are derived from the listing. Sibling units are linked under the same property. Unavailable fields are omitted rather than invented.
- The persistent action area displays the listing's actual price and message action. Missing rent displays “Price on request”.
- Existing typography and Vacancy colours are retained. No external font, image, or UI dependency was added.

## Known limits

- Published media URLs do not expose a safe, guaranteed responsive rendition in this client. The first image loads eagerly, later gallery images load lazily, and fixed gallery dimensions prevent layout shift; this experiment does not change image storage or transform URLs.
- The backend currently exposes property features plus a limited set of room-level attributes. The page shows what exists and does not invent bed counts, verification badges, or individual room amenities that are not stored.
- The preview has no active-listing fallback when the live inventory is empty; the separate route only displays published listing IDs from the existing feed.

## Rollback

The last pre-experiment source commit is `600ecf9`. Reverting the experiment commit removes its route, stylesheet, and comparison link without touching listing data. The previous live production deployment before the approved listing-flow release was `vacancy-14xuapj5i-tbond24s-projects.vercel.app`; the approved live release is `vacancy-3llpki942-tbond24s-projects.vercel.app`. The experiment is deployed only to preview until explicitly approved for production.
