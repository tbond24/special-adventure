# Stage 53 — Quick listing composer

## Aim and acceptance

Make the mobile listing flow start at the top, show less explanatory copy, keep small fields on one line, make optional detail genuinely optional, and preserve the existing secure publish path. Acceptance requires working current-location capture, no map zoom controls or rounded map shell, automatic/manual listing titles, progressive section completion, accessible optional-field reveals, a single clear service state, no unused inventory view switch, no mobile focus zoom or horizontal overflow, and a transparent north-east Find search action.

## Options and decisions

### Form structure

1. Enhance the existing composer with reusable compact and progressive controls. **Rank 1 / chosen** — smallest reversible change, preserves validation and backend contracts.
2. Replace the composer with a new wizard. Rank 2 — clearer separation, but duplicates stable publishing logic and raises regression risk.
3. Build a separate camera-first draft inbox. Rank 3 — valuable later, but needs new media ownership, cleanup, and assignment data.

### Small fields and services

1. One-line label/control rows plus one cycling service-state control. **Rank 1 / chosen** — smallest footprint with one visible answer.
2. Two-button Yes/No segments. Rank 2 — explicit, but consumes more horizontal space.
3. Native selects. Rank 3 — reliable, but slower and visually repetitive for binary choices.

### Optional details

1. Keep optional fields inside Advanced settings and reveal each with an eye control. **Rank 1 / chosen** — reduces initial load while keeping every field available.
2. Show all optional fields immediately. Rank 2 — discoverable, but recreates the reported overload.
3. Remove optional fields. Rank 3 — simplest screen, but loses useful listing detail.

### Location

1. Add a real current-location action to the existing Leaflet picker and retain manual fallback. **Rank 1 / chosen** — free, reversible, and resilient to permission denial.
2. Require map tapping. Rank 2 — simple, but slower when standing at the property.
3. Add a paid address/location SDK. Rank 3 — unnecessary for this stage.

## Build

- Moved the listing workspace to the top and removed nonessential map copy.
- Added a real `Use current location` action with editable manual fallback.
- Removed listing-map zoom controls and square-cut the map.
- Added compact one-line fields and single-state service controls with inherited, yes, and no colour states.
- Added automatic titles by default with a manual-title switch.
- Put property notes, available date, minimum stay, and unit description behind optional eye controls in Advanced settings.
- Added dynamic “Tap to open” / “Tap to close” section guidance while retaining automatic stage progression and completion checks.
- Removed the unused Your Vacancies layout switch.
- Changed the Find submit icon to a transparent north-east arrow.

## Test, diagnosis, and fixes

The first focused run exposed four issues: an older high-specificity layout rule overrode hidden optional fields; the automatic-title button inherited an overly broad accessible name; compact-field styling exposed manual location fields; and older tests assumed all sections and optional inputs were always open. Ranked fixes were: (1) narrow CSS/accessible-state corrections and exercise the visible controls, (2) restructure all legacy CSS, (3) weaken or remove assertions. Option 1 was applied.

The next regression found one old test typing directly into the intentionally hidden title input and another expecting the superseded right arrow. Both harnesses were updated to use and verify the visible product controls. Product behavior was not relaxed.

## Runtime score

- Focused Stage 52 + 53 behavior: 22/22 pass on desktop and mobile.
- Extended map, zoom, listing control, recovery-path and Stage 53 run: 66 passed with 11 deliberate device skips; the one stale arrow expectation was corrected and its affected desktop/mobile scenarios passed on rerun.
- Hosted Vercel preview acceptance: 12/12 pass across desktop Chromium and Pixel 7.
- Production was not changed during implementation or local verification.
