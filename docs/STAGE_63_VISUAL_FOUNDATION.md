# Stage 63 — research-led visual foundation

## Aim and scope

Apply the strongest validated findings from the Vacancy visual-identity research without changing discovery layout, workflows, backend behaviour, map provider or production.

## Options and ranking

1. Token-led foundation plus typography and state corrections. High accessibility and consistency value with a contained, reversible surface.
2. Font-only pilot. Lowest complexity, but it leaves demonstrated contrast, hierarchy and state-semantics defects.
3. Full visual and discovery redesign. Potentially high value, but combines unproven layout hypotheses with a large regression surface.

Option 1 was selected. List-first discovery and broader layout changes remain experiments requiring participant evidence.

## Changes adopted

- Locally hosted Source Sans 3 with Latin and Latin Extended subsets and its OFL licence.
- Semantic light and dark colour tokens from the research package.
- Accessible orange action/on-action pairs and visible focus treatment.
- Deliberate body, control, metadata, heading, listing-title and price hierarchy.
- The recently approved Vacancy wordmark and loading weights remain the brand exception to the research's 700-weight starting point.
- Neutral deposit presentation; red is reserved for errors and destructive states.
- Theme-safe listing icons, semantic notice states, 48px control targets and subtle borders.

## Acceptance

- The local font loads in a real browser and the system fallback remains usable when blocked.
- Intended light and dark action/text pairs meet WCAG AA contrast.
- Deposits remain readable and neutral in both themes.
- Important controls expose at least a 48px target without horizontal page overflow.
- Existing functional regression remains green after intentional visual assertions are updated.
- Production remains untouched until hosted preview review and approval.

## Test, score and diagnosis

- Focused font, brand, colour, hierarchy, state and target suite: 12/12 passed on desktop and mobile.
- Full Stage 52–63 regression: 112/112 passed on desktop and mobile when run in isolated serial sessions.
- Visual review: light/dark mobile at 390px and light desktop at 1440px passed for hierarchy, clipping and horizontal overflow.
- Research contrast audit: 46/46 specified opaque pairs passed; the implementation tests independently recalculate the two primary action pairs.

Initial failures and smallest safe fixes:

1. Local server unavailable: restart the isolated server; source-presence checks were rejected as insufficient evidence.
2. Hidden desktop mobile-nav children were counted as rendered targets: filter test measurements by non-zero layout rectangles.
3. Mobile List action measured 38px: raise only that action to the 48px comfort target.
4. Older tests required red deposits, universal regular weight and hard-coded black icons: replace those assertions with neutral state, deliberate hierarchy and theme-safe icon checks.
5. Sort-removal assertions intermittently failed under six-way resource contention: repeat in isolated sessions (12/12 passed) and run the full suite serially.

## Review limits

This stage does not establish user preference, conversion improvement or physical-device readability. Real iOS/Android, assistive-technology and participant testing remain required before claiming those outcomes. List-first discovery remains unadopted because the research classified it as a hypothesis.
