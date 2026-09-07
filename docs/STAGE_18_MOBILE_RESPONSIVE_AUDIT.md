# Stage 18 — Mobile responsiveness audit

## Aim and acceptance

Verify every distinct Vacancy screen at 390px and 320px. Acceptance requires document and body widths to stay within the viewport, no visible ordinary element to extend sideways, and `scrollX` to remain zero after an attempted horizontal scroll. Horizontal card rails and internal map layers are tested as contained components rather than page overflow.

## Screens covered

Map home in Cards and List views, vacancy detail, sign in/create account, password request, invalid reset, saved vacancies, enquiry, messages, new listing, edit listing, account, and admin. The audit renders both normal and representative authenticated states using isolated backend fixtures while loading the deployed application artifact.

## Failure loop

1. At 320px, List-view photos exceeded their listing rows. Options: stack the photo, shrink the side column, or hide photos. Stacking below 360px was the smallest clear fix.
2. A one-pixel narrower body failed an equality assertion despite zero overflow. The harness was corrected to require widths at or below the viewport.
3. Desktop Chromium squeezed to 320px exposed horizontal movement from a long account email. Options: wrap, truncate, or hide it. Wrapping was chosen to preserve the full value and improve long-text resilience.

## Evidence

- Product commits: `8d26c2a`, `3244931`
- Audit test commit: `38ff9f2`
- Exact preview: `https://vacancy-oal6m3z1f-tbond24s-projects.vercel.app`
- Vercel deployment: `dpl_18PBPodrtGQMYLuqCfrZsDmWqYvc`
- Dedicated full-page audit: **2/2 pass**, covering **26 screen-width combinations**
- Broader regression: **78/78 pass** across desktop and mobile
- Production remains unchanged.
