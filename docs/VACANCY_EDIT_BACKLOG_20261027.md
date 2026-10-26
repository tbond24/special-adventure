# Vacancy edits to follow the storage/listings cards

Recorded from the owner's request on 27 October 2026 (Perth). Status: QUEUED, not implemented or published by recording this document. Complete the current metric-card work and its publication decision before taking on these edits. Use Vacancy methods: one bounded change, preserve rollback, verify the affected flow and mobile layout, record before/after and actual live status.

The categories below describe the request, not a diagnosis. Reported glitches and motion require reproduction on the current live artifact. Complexity is an initial estimate, not a measured delivery time. The priority order follows the owner's instruction: easiest first, rather than ordering solely by customer impact.

## Current issues

- **I1 — Admin journey-map motion on reload.** Refreshing/reloading the journey map keeps creating motion on the page. Observe whether the cause is animation, node rebuilding, layout movement or a combination. Goal: stable positions and page scroll while data updates; retain the intended useful live indication. Root cause is not yet established.
- **I2 — Map press-and-hold / unexpected zoom.** Clicking and holding the map causes glitches and apparently random zooming. Reproduce relevant pointer/touch gestures on desktop and mobile, then repair the specific behavior without changing normal pan, zoom or pin selection.
- **I3 — Listing navigation loading time.** Improve the path Find → listing details → back to Find → another listing. Measure the current delays and repeated work; preserve Find's map position, filters, results and useful scroll state. No particular caching or routing implementation is approved by this backlog entry.

## New features

- **F1 — Second “Show number” action on listings.** Add a second button to show the number. Working interpretation: reveal the listing contact's phone number. Final placement and relationship to the existing contact actions remain to decide. Preserve existing contact visibility/permission rules.
- **F2 — Shared grid system for live public pages.** Give the site's pages common responsive rules for columns, content width, spacing, alignment and viewport boundaries, so later changes remain predictable. This is a site-wide foundation, delivered and checked page by page; it does not authorize a wholesale redesign or changing every layout at once.

## Tweaks

- **T1 — Remove the You sign-in explanation.** Remove the text saying “sign in to manage…” on You. Preserve the relevant actions and functioning signed-in/signed-out flows.
- **T2 — Remove the save/unsave text pill.** Clicking the listing like/save button currently displays saved/removed-from-saved text. Remove that confirmation pill in both cases; the like button must still show its state and saving must work. This request concerns confirmation copy, not suppressing genuine save failures.
- **T3 — Match like-button transparency.** The listing like button should use the same transparency treatment as the top Share and Back controls, with readable active and inactive states. Reuse those existing control styles.
- **T4 — Remove browser-specific public copy.** Remove “Saved in this browser” and other user-facing “this browser / that browser” wording across public flows. Inventory the actual strings first. This is copy cleanup; browser/device save behavior is not being changed by this request.
- **T5 — Rework map icon presentation.** Review all three surfaces named by the owner: property/type selection icons, the actual map pins, and the text on the pins. Specific icon shapes, colors and label choices remain open. Agree on a consistent treatment before applying the change.
- **T6 — Group related information.** Arrange and group information so its relationships are clear. Identify the affected screen/blocks and agree on the grouping before moving content; do not assume this means adding more information.
- **T7 — Simplify message UI.** Improve the existing messaging interface so it is easy to understand and use. Review conversation navigation, message reading and composing/sending together. No specific broken messaging behavior or replacement design was supplied in this request; preserve existing draft, duplicate-send and navigation protections.

## Priority by estimated implementation complexity

| Order | ID / group | Edit | Complexity | What must be settled or checked |
| --- | --- | --- | --- | --- |
| 1 | T1 · Tweak | Remove You's “sign in to manage…” text | Low | Confirm the exact displayed copy and retain actions. |
| 2 | T2 · Tweak | Remove saved/removed confirmation pill | Low | Cover save and unsave; retain visible state and genuine errors. |
| 3 | T3 · Tweak | Match like-button transparency to Share/Back | Low | Reuse the existing treatment and verify both save states. |
| 4 | T4 · Tweak | Remove browser-specific copy across public pages | Low–medium | Inventory strings and check signed-in/out screens. |
| 5 | F1 · New feature | Add second Show number button | Low–medium | Confirm contact-action placement; reuse the existing permission/reveal flow if suitable. |
| 6 | T5 · Tweak | Change type icons, map pins and pin text | Medium | Select the visual treatment across all three surfaces. |
| 7 | I1 · Current issue | Stop repeated journey-map motion in Admin | Medium | Reproduce refresh behavior and distinguish animation from layout movement. |
| 8 | T6 · Tweak | Group information to show relationships | Medium | Identify the screen and meaningful groups; constrain the first layout slice. |
| 9 | I2 · Current issue | Fix map holding/gesture glitches and random zoom | Medium–high | Reproduce the triggering desktop/touch gestures. |
| 10 | T7 · Tweak | Make the message UI easier to use | Medium–high | Agree on a small first slice and preserve message-state protections. |
| 11 | I3 · Current issue | Speed up listing → Find → next listing | High | Measure the delay and verify retained browsing state across the complete loop. |
| 12 | F2 · New feature | Introduce shared responsive grid rules across the live site | High / broad scope | Define rules first, then migrate one public page at a time with responsive checks. |

Ordering can change if reproduction reveals a simple cause or a blocking defect. Before implementing related information-grouping work, define the intended grid rules so the two efforts agree; this dependency does not require doing the entire site-wide migration first.

## Continuation

Current metric-card candidate: [ADMIN_STORAGE_LISTINGS_CARDS_20261027.md](ADMIN_STORAGE_LISTINGS_CARDS_20261027.md), draft PR46. Keep this backlog separate from that feature's production approval: recording the ideas does not publish them or authorize unrelated edits. On starting each item, update its status and link its own change/test/release record here.
