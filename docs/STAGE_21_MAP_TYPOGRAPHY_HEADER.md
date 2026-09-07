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
