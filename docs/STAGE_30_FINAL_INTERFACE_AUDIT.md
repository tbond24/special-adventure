# Stage 30 — Final interface audit and icon recommendations

## Aim and acceptance

Verify every functional page at desktop, common-phone and narrow-phone widths in both dark and light themes. Acceptance requires no document or child overflow, no invisible or effectively same-colour interactive controls, and successful full regression. Keep recommended property-feature symbols documented but unapplied.

## Options and ranking

1. Automated route/theme/viewport audit plus visual review — repeatable evidence with low product risk. **Rank 1.**
2. Screenshot-only review — visually useful but weak for hidden overflow and every route. **Rank 2.**
3. Rewrite into a new component system before auditing — high risk and unrelated to acceptance. **Rank 3.**

Option 1 is the smallest safe approach.

## Property symbol set — recommendation only

Use the same 2px rounded SVG language as navigation when these are introduced:

- Unit/bedroom: bed outline.
- Occupancy: two-person outline.
- Ensuite: shower head with droplets.
- Furnished: armchair.
- Parking: car front.
- Pets considered: paw.
- Water: droplet.
- Electricity: lightning bolt.
- Security: shield with check.
- Internet: Wi-Fi arcs.
- Available date: calendar with check.
- Bills included: receipt with check.
- Smoking rule: cigarette with a diagonal slash when prohibited.

Icons should always retain a short text label in detail and filter contexts. They are not applied in this stage, matching the product decision to validate the information hierarchy first.

## Admin organisation decision

The current MVP admin dashboard already covers the essential operational loop: user/message totals, active and expiring listings, reports, status filters, refresh, and confirmed deactivation. The next highest-value additions after real usage are email-delivery failures, unresolved-report age, and listing creation/enquiry conversion. Role complexity, automated scoring and advanced analytics remain deferred until evidence justifies them.

## Failure loop and fixes

The first matrix run found a genuine dark-theme defect: Account, Search and Search this area rendered white text on the near-white `--ink` background. The ranked fixes were:

1. Use the theme's `--paper` token for text on shared `--ink` buttons — one token-level correction with strong contrast in both themes. **Chosen.**
2. Add a dark-theme override — safe but duplicates the theme relationship.
3. Special-case the three controls — narrow but brittle as more primary controls are added.

The second run flagged three light-theme frosted controls. Runtime style inspection showed dark text on `color(srgb 1 1 1 / 0.94)`. The product was readable; the audit parsed normalized sRGB channels as 0–255 values. The ranked fixes were:

1. Teach the parser to convert `color(srgb …)` channels to 0–255 values — preserves the audit and matches the browser output. **Chosen.**
2. Read colours through a canvas normalization helper — broader but unnecessary browser machinery.
3. Exclude translucent controls from contrast checks — easiest but would discard useful coverage.

After both smallest fixes, the full interface matrix passed for 13 screens at 1280 px, 390 px and 320 px in dark and light themes, using both configured Chromium profiles. There was no document overflow, child overflow or horizontal scroll, and no visible control fell below the audit threshold.

## Regression, score and release state

- Exact source commit: `4d82fa1`.
- Full local regression: **110 passed, 4 intentional skips, 0 failed (114 total)**.
- Interface score: **49/50**. One point remains open because hosted runtime proof is still required.
- Production: unchanged.
- Preview and checkpoint: pending explicit authorization to upload this new commit to the Vacancy Vercel project. The checkpoint will only be created after the hosted suite is green.

The currency selector remains independent from location. It currently supports the six verified launch currencies (KES, AUD, USD, GBP, UGX and TZS); universal country/currency coverage is not claimed.

## Hosted acceptance completion

The first approved preview, `dpl_68dEksvk5e1Etv3vY6wCCbfYj2x4`, reported READY but returned Vercel's platform `404 NOT_FOUND`. Inspection showed an empty root build (`. [0ms]`), so the application had never loaded. Ranked fixes were: (1) redeploy the already-linked `app` directory, (2) change the Vercel project's root settings, or (3) add root routing/build files. Option 1 was the smallest safe fix and did not change product code.

Corrected preview: `https://vacancy-5b3kvqqnz-tbond24s-projects.vercel.app`
Corrected deployment: `dpl_B1Va91XNWSpjGCYz715AJw3eiGH4`
Core hosted proof: **10/10 passed**.
Full hosted regression: **110 passed, 4 intentional skips, 0 failed (114 total)**.
Final interface score: **50/50**.
Production remained unchanged.
