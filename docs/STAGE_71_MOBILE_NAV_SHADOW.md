# Stage 71 — borderless mobile navigation shadow

## Aim and acceptance

Remove the bottom navigation boundary and let its shadow spread evenly around the floating island without clipping, shifting controls or causing horizontal overflow.

## Options and decision

1. Remove only the bottom border.
2. Keep the border and move the navigation farther from the viewport edge.
3. Remove the complete outline, allow visible overflow and use a centered shadow with a small edge gap.

Ranking: 3, 1, 2. Option 3 creates the intended floating treatment consistently instead of leaving an incomplete outline or retaining the visual restriction.

## Build

- Removed the mobile navigation outline.
- Changed its shadow from downward-only to an even 26 px centered shadow.
- Allowed the shadow to render beyond the island bounds.
- Kept a 14 px minimum gap from the bottom edge while respecting device safe areas.
- Added a stronger centered shadow for dark mode.

## Runtime proof and regression

- Combined loading, logo and navigation regression: 16/16 passed across desktop and mobile Chromium.
- Light and dark computed border: zero.
- Light and dark computed overflow: visible.
- Light and dark computed shadow offsets: 0 px horizontal and 0 px vertical.
- Mobile bottom clearance: 14 px.
- Mobile horizontal overflow: zero.
- No captured page or console errors.
- Visual screenshots reviewed in both themes.

## Score and release state

Score: 100/100 against the Stage 71 acceptance criteria.

Verified preview: `https://vacancy-ori6z7s8j-tbond24s-projects.vercel.app` (`dpl_61FZR4JkqkJEspnfXsZntuDto3Dt`). The deployed mobile navigation reports zero border, visible overflow, a centered 26 px shadow, 14 px bottom clearance and zero page overflow.

Published to `getvacancy.site` as exact promoted deployment `dpl_UPA6GRoXtN7nJ6kRt552J1NXpKBh`. Live-domain runtime proof repeated the navigation border, shadow, clearance and overflow checks successfully. The preceding deployment `dpl_7dXSn9amFfqW9qhvs1Cn2TLVsXU4` remains the rollback target.
