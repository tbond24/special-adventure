# Stage 55 — Mobile results and feedback

## Aim and acceptance

Use the full results width on narrow phones, keep the view control visibly away from the right wall, and keep notifications above the floating navigation. Acceptance requires runtime geometry checks at 320 px and the existing Stage 54 regression to remain green.

## Options and ranking

1. **Targeted responsive CSS** — highest value and lowest complexity; fixes the grid span, edge inset, and notification safe area without changing application behavior.
2. **Rebuild the results toolbar and notification component** — more control but unnecessary code and regression risk.
3. **Change the entire mobile results layout** — broadest change, highest risk, and outside this correction.

Option 1 is the smallest safe choice. The empty result spans both card-grid columns, list rows use the full results width, the view selector gains a stable edge inset, and notifications sit above the navigation plus the device safe area.

## Runtime proof

- Exact deployment: `dpl_HA19HKPrY2XJhnoKBWkcx1fTMnNf` (`vacancy-gmtlzmzdn-tbond24s-projects.vercel.app`).
- Preview: 4/4 narrow-screen geometry checks and 12/12 Stage 54 regression checks passed.
- Vercel inspection confirms `getvacancy.site` points to this exact Ready deployment.
- Live: 4/4 narrow-screen geometry checks and 12/12 Stage 54 regression checks passed.
- Previous production rollback remains `dpl_C4e1iJwQPZQa8pRbP1dmChsT3Dvc`.

## Follow-up

The additional right-side inset for the view selector was withdrawn after live review. It was restored to the prior compact right-aligned position while retaining a usable 6 px edge gap. Full-width results and notification clearance remain unchanged.
