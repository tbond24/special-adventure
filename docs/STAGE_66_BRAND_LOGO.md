# Stage 66 — supplied Vacancy logo

## Aim and acceptance

Use the supplied orange-house and navy-wordmark artwork anywhere the interface presents the Vacancy logo. The header, sign-in page, footer, and loading screen must load the same transparent asset on desktop and mobile, remain legible in light and dark themes, retain accessible home links, and introduce no broken images or layout overflow.

## Options considered

1. **One cleaned transparent image asset** — highest consistency and lowest maintenance; preserves the supplied artwork exactly. A small light backing is required in dark mode for the navy wordmark.
2. **Rebuild the mark with HTML, CSS, and a nearby font** — flexible theme colouring, but would only imitate the supplied lettering and could vary by device.
3. **Use the supplied white-background screenshot directly** — fastest, but its large whitespace and opaque background would render poorly in compact headers.

Rank: 1, 2, 3. Option 1 is the smallest safe implementation.

## Build decision

The supplied artwork was cleaned into `app/assets/vacancy-logo.png` with a real transparent background. All four logo surfaces use that one file. Dark mode applies a compact translucent light backing so the navy lettering keeps its contrast. The old loading-screen text mark and its later override were removed.

## Test and score

Runtime checks cover the header and footer in both themes, the sign-in page, and the loading screen on desktop and mobile. Each check requires a visible, successfully decoded image with the expected wide aspect ratio; dark mode also requires a nontransparent contrast backing. Existing authentication layout checks remain in the regression set.

Acceptance score: **10/10**.

- Focused logo and adjacent-interface proof: **28/28 passed** across desktop Chromium and a Pixel 7 mobile viewport.
- Visual proof: sign-in and header inspected at 390×844 and 1440×900; the artwork is sharp, proportionate, and does not create horizontal overflow.
- Hosted preview proof: deployment `dpl_EymAAFgWhH9JB5peqtMpaMq8v6bY` reached `READY`. On its mobile sign-in route, all rendered logo images decoded successfully and document width matched the 390 px viewport exactly.
- The unrestricted historical test archive still contains assertions for screens superseded by later approved redesigns. Those harness-drift failures were separated from this stage rather than treated as product proof or changed merely to force a green result.
