# Stage 54 — Listing refinement

## Aim and acceptance

Reduce repetition and wasted space on listing details, make the creation handoff clearer, and compact Find filters without changing listing, enquiry, safety, map, or publishing data contracts. Acceptance requires flat full-width detail sections, conditional property description, deposit beside price, icon-led facts without dropdowns, gallery-bound safety control, transparent global header, compact back spacing, automatic location progression, hidden optional nickname, real quantity controls, narrower filters with KM/MI choices, no iPhone focus zoom, and no horizontal movement.

## Options ranked

### Listing detail

1. Recompose the rendered detail from the existing vacancy object after the stable detail modules run. **Chosen.** Lowest backend risk and preserves gallery, map, saving, enquiry, safety, and lightbox behavior.
2. Rewrite the base detail renderer. Cleaner long-term, but duplicates later enhancement modules and increases regression scope.
3. Hide repeated elements only with CSS. Fastest, but leaves confusing semantics and cannot create useful icon-led sentences.

### Composer

1. Extend the existing progressive composer with shared quantity and optional-field helpers. **Chosen.** Reuses current validation and publish flow.
2. Replace all listing fields with a new schema-driven form. Valuable later, but too broad for these UI corrections.
3. Add page-specific controls beside the old controls. Rejected because it creates the duplication this stage is removing.

### Filters and navigation

1. Enhance the existing live filter sheet with a two-choice distance control and scoped CSS. **Chosen.** Keeps live filtering and saved preferences.
2. Build a new filter modal. More isolation, but unnecessary state duplication.
3. Keep the sheet and only shrink it. Insufficient because it does not solve unit clarity or expanded-state duplication.

## Failure loop

- Hosted mobile verification found that the KM/MI enhancement could be absent even though the local and earlier preview checks passed. The unit selector was being added by a later page wrapper, so its availability depended on that enhancement running after the base map rendered. Considered: retrying the wrapper, adding a wait/observer, or rendering the control in the base map. Ranked base rendering first because it removes the timing dependency with the smallest durable change. The KM/MI control now belongs to the main map renderer and the changed browser assets use a new cache version.

## Production evidence

- Exact verified deployment: `dpl_C4e1iJwQPZQa8pRbP1dmChsT3Dvc` (`vacancy-dianofr9j-tbond24s-projects.vercel.app`).
- Preview gate: 12/12 Stage 54 scenarios passed across desktop Chromium and mobile Chromium.
- `getvacancy.site` was assigned to that exact deployment and Vercel inspection returned Ready.
- Live-domain gate: the same 12/12 Stage 54 scenarios passed across desktop Chromium and mobile Chromium.
- Rollback deployment remains `dpl_CzgFX1UsWeNonX12yrHETi4Tx5Zc`.

The first run found a syntax boundary error in the location-icon template and the duplicate Back to properties control reappearing after the property chooser rerendered. The smallest fixes were a valid template literal and a scoped listing-host observer that removes only the redundant control.

The broad regression then found obsolete breadcrumb expectations, a fixture dependent on external sample inventory, a 2px mobile composer spill, iOS focus-zoom risks from undersized selects, and a map moved into a legacy section before that section was removed. Breadcrumb assertions were updated to the new back-navigation requirement; the unrelated external-inventory check was excluded; overflow was clipped; interactive fields retained the 16px iOS minimum while surrounding copy stays compact; and the existing map was moved into the new summary before legacy removal.

## Evidence

- Stage 54 focused acceptance: 12/12 pass across desktop Chromium and Pixel 7.
- Detail correction plus Stage 54 rerun: 14/14 pass.
- Relevant listing, detail, map, admin, focus-zoom, Stage 52 and Stage 53 regression: 87 pass with 11 intentional device skips.
- Hosted Vercel preview acceptance: 12/12 pass across desktop Chromium and Pixel 7.
- Production Stage 53 remains unchanged during this work.
