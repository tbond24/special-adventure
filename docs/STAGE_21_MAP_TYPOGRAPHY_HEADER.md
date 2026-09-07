# Stage 21 — Map typography and unified header

## Aim and acceptance

Use the attached Google Maps mobile screenshot as proportion and typography inspiration while preserving Vacancy's identity. Keep one uninterrupted mobile header, retain only the display-currency chooser, and keep the existing search, location, filters, theme, listing, and navigation flows working without horizontal movement.

## Reference measurements

The 739 × 1600 reference uses a search surface about 94% of the screen width and 5.6% of its height, with a radius close to half its height. Supporting pills are about two-thirds of the search height. Visible control type is approximately 16–20 CSS pixels with compact line height, medium weight, 12–16px gaps, and dark translucent surfaces over the map.

These ratios are treated as guidance rather than copied branding. Vacancy keeps its existing font stack, orange accent, controls, and bottom navigation.

## Options and ranking

1. Refine the current working mobile shell: one header row, currency only, a 56px search pill, and 42px supporting controls. High value, low complexity. **Rank 1.**
2. Replace results with a draggable map sheet. High value, high interaction and accessibility complexity. **Rank 2.**
3. Recreate the reference's navigation and map controls. Low product fit and unnecessary scope. **Rank 3.**

Option 1 is the smallest safe choice.

## Build

- Removed the separate header country chooser. Search location remains controlled by search, map position, and device location.
- Preserved the independent currency chooser, theme switch, and orange listing action in one mobile row.
- Increased the mobile search field to 56px high with an 18px label, 28px radius, restrained translucency, and map-readable shadow.
- Set supporting map actions to 42px high with 14px medium-weight labels and rounded pill geometry.
- Refined header spacing and fade while retaining the 80vh mobile map.

## Runtime proof

- Local targeted discovery suite: **18/18 pass**.
- Measured at 390 × 844: header 58px, search 366 × 56px, search radius 28px, map 675px, and document width 390px.
- Exact tested source: `a54a19e`.
- Vercel preview: `https://vacancy-nbagggxjd-tbond24s-projects.vercel.app`.
- Deployment: `dpl_D1Prq9nHc9QoXCDp3PXixFi3BTi3`.
- Hosted targeted suite: **18/18 pass**.
- Complete hosted regression: **86/86 pass** across desktop and mobile.
- The responsive audit covers every route at 390px and 320px; no horizontal page movement was found.
- Hosted screenshot: `outputs/vacancy-stage21-mobile-preview.png`.
- Production at `https://getvacancy.site` remains unchanged.

## Failure and fix loop

The first preview was deployed from the repository root and contained no app artifact, so it returned Vercel 404. Three fixes were ranked: deploy the existing `app` directory, add root routing configuration, or change the saved Vercel project root. Deploying `app` was the smallest reversible option. The corrected artifact was then tested from the beginning and passed all 86 checks.

## Score

- Reference-inspired typography and ratios: **9/10**
- Header clarity: **10/10**
- Mobile containment: **10/10**
- Existing-flow preservation: **10/10**
- Runtime evidence: **10/10**

Acceptance is met. A draggable results sheet remains a possible later improvement after observing real user behavior; it is not required for this focused refinement.
