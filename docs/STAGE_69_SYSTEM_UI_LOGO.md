# Stage 69 — system UI typography and transparent larger logo

## Aim and acceptance

Trial native system UI typography across the whole interface and enlarge the approved Vacancy logo without a rectangular background or responsive overflow.

Acceptance criteria:

- The rendered site uses `system-ui` first for page text, controls and Leaflet interface text.
- Header, footer, authentication and loading logos are larger than the previous sizes.
- The existing 2163×727 approved raster remains unchanged, transparent and sharp.
- Light and dark themes add no rectangular logo background or padding.
- Header and authentication layouts have no horizontal overflow from 320 px through 430 px.

## Options and decision

### Logo

1. Remove the CSS backing and enlarge the existing transparent asset.
2. Maintain separate light and dark logo files.
3. Redraw the supplied artwork as SVG.

Ranking: 1, 2, 3. Option 1 preserves the approved artwork and is the smallest reversible change. A soft dark-theme drop shadow keeps the black wordmark legible without drawing a box.

### Typography

1. Native `system-ui` stack.
2. Explicit platform fonts such as San Francisco and Segoe UI.
3. A downloaded custom family.

Ranking: 1, 2, 3. Option 1 is the fastest and most familiar device-native trial, with no font download or licensing dependency.

## Build

- Set `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` across the document, controls and Leaflet UI.
- Increased logo heights to 32 px in the desktop header, 28 px in the mobile header, 27/25 px in footers and 72/64 px on authentication pages.
- Increased the loading logo maximum width from 260 px to 300 px.
- Removed the dark-theme white background, corner radius and padding from every logo.

## Test, failure and repair loop

The first targeted run passed 12/14. Both failures came from the old requirement that the authentication logo retain more than 12 source pixels per rendered pixel. The deliberately enlarged logo measured 10.1× on desktop and 11.4× on mobile.

Fixes considered:

1. Use an at-least 8× high-resolution threshold appropriate to the new display size.
2. Shrink the logo and contradict the requested change.
3. Upscale the raster without creating real detail.

Ranking: 1, 2, 3. The threshold was updated; the asset itself was not resampled.

Final focused regression:

- 36/36 passed across desktop and mobile Chromium.
- Native font stack: passed.
- Transparent logo surfaces in light and dark themes: passed.
- High-resolution source and black wordmark pixels: passed.
- Authentication alignment and category/header behavior: passed.
- 320, 375, 390 and 430 px overflow checks: passed.
- Browser visual check: page loaded, meaningful content rendered, no captured console errors and zero mobile overflow.

A historical discovery audit produced 47 passes, 4 skips and 13 failures for previously retired interface expectations such as gallery dots, the Search centre label and location recommendations. Those failures predate and are unrelated to this isolated visual stage; they were not used to reintroduce removed features.

## Score and release state

Score: 100/100 against the Stage 69 acceptance criteria.

The approved preview `vacancy-pzux3n890-tbond24s-projects.vercel.app` was promoted as the exact tested artifact. Vercel production deployment `dpl_7dXSn9amFfqW9qhvs1Cn2TLVsXU4` is Ready and `getvacancy.site` resolves to it.

Live-domain runtime proof at 390×844:

- Native `system-ui` stack active.
- Authentication logo rendered at 64 px high with transparent background and zero padding.
- Zero horizontal overflow.
- No captured page or console errors.

The preceding production deployment remains available in Vercel as the rollback target.
