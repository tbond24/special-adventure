# Stage 67 — auth logo alignment

## Aim and acceptance

Centre the Vacancy logo precisely on the sign-in/account-creation page and remove the redundant visible mode heading beneath it without weakening accessibility or changing authentication behaviour.

## Options and ranking

1. Remove both visible mode headings while retaining screen-reader text — least visual noise and keeps accessible context.
2. Remove only “Sign in” — creates inconsistent vertical spacing when switching modes.
3. Replace the heading with helper copy — adds text the form labels and actions already communicate.

Rank: 1, 2, 3. Option 1 is the smallest safe change.

## Build and proof

The logo link now spans the form width and centres its image against the viewport. The existing heading remains available to assistive technology but is visually hidden in both modes. Authentication fields, mode switching, and submit actions are unchanged. Runtime acceptance requires subpixel centre alignment, hidden headings in both modes, and a working account-creation switch.

## Result and score

The first test run scored 28/30 because the harness considered the intentional 1×1 screen-reader heading “visible.” Three fixes were ranked: delete the heading, use `display:none`, or assert the visually-hidden geometry correctly. The third option preserved accessibility and was applied. The repeated desktop/mobile regression passed **30/30**. Mobile visual proof measured **0 px** logo centre error, no visible mode heading, and a 390 px document within a 390 px viewport. Acceptance score: **10/10**.
