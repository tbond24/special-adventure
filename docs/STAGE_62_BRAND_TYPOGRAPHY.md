# Stage 62 — brand typography restoration

## Aim

Restore the original Vacancy logo and loading-screen typography while keeping the Stage 61 regular-weight interface everywhere else.

## Options and ranking

1. Add scoped weight exceptions for the header logo, footer logo, loading mark and loading wordmark. Highest value and lowest regression risk.
2. Remove the Stage 61 global regular-weight rule and manually reduce every non-brand component. Large regression surface and easy to miss dynamically rendered controls.
3. Add a separate brand font asset. Adds download cost and changes the established identity without evidence that a new typeface is needed.

Option 1 was selected. It restores the existing brand settings rather than introducing a redesign.

## Acceptance

- Header logo weight is at least 750 in light and dark themes.
- Footer logo weight is 850 in light and dark themes.
- Loading mark weight is 850 and loading wordmark weight is 800.
- Brand letter spacing and font family remain intact.
- Desktop and mobile runtime checks pass, followed by the relevant full regression.

## Local runtime evidence

- Focused Stage 61 and Stage 62 checks: 28/28 passed on desktop and mobile.
- Full relevant Stage 52–62 regression: 104/104 passed on desktop and mobile.
- One older Stage 52 locator was updated to follow the current unit-section structure; no product behavior was weakened or removed.
