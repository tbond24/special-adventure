# Stage 70 — transparent loading treatment

## Aim and acceptance

Remove the visible background and rectangular boundary from the branded loading treatment while preserving the approved logo, useful loading feedback and reduced-motion support.

Acceptance requires the loading screen and logo to have transparent backgrounds, no border, outline or rectangular shadow in light and dark modes, with no mobile horizontal overflow or runtime errors.

## Options and decision

1. Remove the rectangular animation shadow while retaining the gentle vertical logo motion.
2. Remove all logo motion and use a completely static loader.
3. Replace the loader with a new full-screen design.

Ranking: 1, 2, 3. Runtime inspection proved the screen and PNG were already transparent; the `loading-breathe` keyframe added a rectangular `box-shadow` around the image element. Option 1 fixes the actual cause with the smallest reversible change.

## Build

- Removed the animated rectangular `box-shadow`.
- Explicitly fixed the loading screen and logo to transparent backgrounds with no border, outline or box shadow.
- Preserved the subtle movement, progress line, accessible status role and reduced-motion behavior.

## Runtime proof and regression

- Focused loading and brand test: 8/8 passed on desktop and mobile Chromium.
- Combined Stage 62 and Stage 69 brand regression: 14/14 passed.
- Light mode computed screen and logo surfaces: transparent background, zero border, no shadow.
- Dark mode computed screen and logo surfaces: transparent background, zero border, no shadow.
- Mobile 390×844: zero horizontal overflow.
- No captured page or console errors.
- Visual screenshots reviewed in both themes.

## Score and release state

Score: 100/100 against the Stage 70 acceptance criteria.

Verified preview: `https://vacancy-ori6z7s8j-tbond24s-projects.vercel.app` (`dpl_61FZR4JkqkJEspnfXsZntuDto3Dt`). The deployed loading screen and logo both report transparent backgrounds, zero borders and no box shadow, with no captured runtime errors. Production remains unchanged pending preview review.
