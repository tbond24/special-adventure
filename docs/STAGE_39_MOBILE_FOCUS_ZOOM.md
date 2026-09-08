# Stage 39 — mobile focus zoom prevention

## Aim, scope and acceptance

Stop unintended page enlargement when users focus search, authentication, recovery, filters, account settings or listing fields on iPhones and other narrow devices. Preserve intentional browser pinch zoom and Leaflet map pinch/double-tap gestures.

Acceptance requires every visible text input, date/number input, select and textarea to compute to at least 16px at 320, 375, 390 and 430px widths; viewport scaling must remain accessible; normal tap controls must avoid double-tap page zoom; Leaflet must retain its own gesture behavior; mobile containment and the complete release regression must remain green.

## Options, value, complexity and ranking

1. Enforce a 16px mobile minimum on focusable form controls and use `touch-action: manipulation` only on ordinary buttons, links and summaries. Standards-based, small and preserves intentional zoom.
2. Add `maximum-scale=1` or disable user scaling. Very small, but blocks accessibility zoom and treats the symptom globally.
3. Reset viewport scale through focus/blur JavaScript. High fragility, visible layout jumps and browser-dependent behavior.

Rank: 1, 2, 3. Option 1 is the smallest safe and accessible fix.

## Build

- Mobile text-entry controls, selects and textareas now compute to at least 16px.
- Checkbox, radio and range controls keep their purpose-specific geometry.
- The compact currency selector gains only the width needed to contain 16px currency codes.
- Buttons, links and summaries use `touch-action: manipulation` to prevent accidental page double-tap zoom.
- No scale restriction was added to the viewport metadata.
- The Leaflet map is excluded so its pan and pinch gestures remain intact.

## Failure loop and score

Initial audit: 10 passed, 14 desktop applicability skips and 6 mobile failures. Every failure identified the same control: the currency selector remained 12px because its earlier class-specific `!important` declaration outranked the general 16px rule.

Ranked fixes were: (1) explicitly set `.market-switch` to 16px in the final safeguard, (2) replace the native select with a custom non-form popover, (3) exclude it and accept focus zoom. Fix 1 preserves native accessibility and requires only four additional pixels of width. Applied; focused rerun pending.

The focused rerun passed 16 with 14 applicability skips. The first full regression then returned 151 passes, 18 applicability skips and 3 failures: two retained the previous 60px currency cap, while one explicitly required the unsafe 13px search text. For currency, ranked fixes were retain 64px and update the test, fit 16px codes inside 60px with tighter padding, or replace the native selector; the 60px fit ranked first. For search, ranked fixes were require 16px, exempt it, or disable viewport scaling; the 16px requirement ranked first. Both corrections preserve the feature's accessibility aim.

The corrected regression subset passed 3 with one intentional desktop skip. The final complete local release gate passed **154 with 18 intentional applicability skips and 0 failures**.

## Score

- Find and filter controls at four mobile widths: 10/10.
- Authentication and recovery controls: 10/10.
- Account currency setting and header selector: 10/10.
- Listing composer text, number, date, select and textarea fields: 10/10.
- Intentional pinch zoom and Leaflet gesture preservation: 10/10.
- Mobile containment and complete regression: 10/10.

Local score: **60/60**. Hosted preview and production runtime proof remain required before completion.
