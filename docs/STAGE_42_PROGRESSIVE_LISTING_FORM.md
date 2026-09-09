# Stage 42 — Progressive listing navigation

## Aim, scope, and acceptance

Make the existing listing form easier to understand and traverse on mobile without changing its proven data model or hiding validation context. The user must see the order Location → Property → Units → Preview, jump to each part, open a populated preview, and retain a page with no horizontal overflow.

## Options and ranking

| Rank | Option | Value | Complexity | Pros | Cons |
|---|---|---:|---:|---|---|
| 1 | Compact sticky step navigator over the existing grouped form | High | Low | Clear order, quick jumps, preserves native form validation and current architecture | Still one continuous page |
| 2 | Collapsible accordion sections | Medium | Medium | Shorter visible form | Can conceal invalid fields and completed context |
| 3 | Multi-page wizard | High | High | Strongest guided experience | More state, navigation, validation, and recovery complexity |

Chosen: option 1, the smallest safe improvement.

## Build and runtime proof

- Added Location, Property, Units, and Preview navigation with meaningful numbered controls.
- Each section has a scroll target; Preview uses the existing live listing preview.
- Initial targeted desktop/mobile run: **8 passed**.
- Browser inspection at 390 × 844 found the Preview label clipped by the bar's horizontal overflow.

## Failure diagnosis and ranked fixes

1. Reduce mobile-only spacing while retaining all labels — low risk and preserves meaning.
2. Shorten labels — low code cost but less clear.
3. Wrap to two rows — removes clipping but consumes more scarce vertical space.

Fix 1 was applied. Reinspection measured a 342 px visible bar and 342 px content width; the final control ended inside the bar, and document width equalled the 390 px viewport.

## Final score and regression

| Area | Score |
|---|---:|
| Clarity of order | 10/10 |
| Mobile reach and navigation | 9/10 |
| Validation continuity | 10/10 |
| Visual fit at 390 px | 10/10 |
| Change complexity | 10/10 |

Full relevant desktop/mobile regression after the fix: **94 passed, 18 intentional skips, 0 failed**.
