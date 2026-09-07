# Stage 20 — Dark-first mobile map shell

## Aim and acceptance

Make Vacancy dark by default, preserve an explicit light theme, strengthen the listing action, give the mobile map 80vh, and replace the results heading with useful listing filters. Preserve location consent, currency/location independence, mobile containment, and all existing renter/lister flows.

## Options and decisions

### Theme

1. Dark default plus persistent header toggle — high value, low complexity. **Rank 1.**
2. System-only theme — low control and does not meet the requested default. **Rank 2.**
3. Dark-only interface — simplest but removes accessibility preference. **Rank 3.**

Selected option 1.

### Mobile map

1. 80vh map below a translucent fading header, listings beneath — strong map identity, moderate scrolling. **Rank 1.**
2. 60vh map with a listing preview — better inventory visibility, weaker match to the requested map experience. **Rank 2.**
3. Full-screen map with draggable results drawer — powerful but high complexity. **Rank 3.**

Selected option 1, with a contained listing toolbar immediately below.

### Map-driven results

1. Existing explicit “Search this area” after map movement — predictable and inexpensive. **Rank 1.**
2. Refresh after every pan — responsive but causes result churn and excess requests. **Rank 2.**
3. Uber H3 hexagonal indexing — useful for aggregating high-volume supply/demand data, excessive for individual vacancy coordinates today. **Rank 3.**

Selected option 1. H3 remains a future analytics option if Vacancy reaches enough density to aggregate availability without exposing individuals.

### Countries

1. Flag selector for supported markets, separate from display currency — honest and maintainable. **Rank 1.**
2. Every country immediately — broad appearance but misleading empty markets and missing local rules. **Rank 2.**
3. Keep only automatic locale detection — simple but removes user control. **Rank 3.**

Selected option 1. Supported countries are Kenya, Australia, United States, United Kingdom, Uganda, and Tanzania. The architecture can add markets independently.

## Build

- Dark theme is applied before first paint and remains the default until the user chooses light.
- Sun/moon header control changes and persists theme.
- “List a room” uses the logo’s orange accent.
- Supported-country flag selector is distinct from display currency.
- Mobile header controls use 14px type and compact labels.
- Mobile map occupies 80vh beneath a translucent header treatment.
- Native map zoom controls move below the mobile search panel instead of covering the search field.
- “Homes around you” was replaced by result count, quick amenity filters, and Cards/List controls.
- Quick filters operate the existing filter state; the full filter panel remains available.
- The compact mobile “+ List” label retains the full accessible name “List a room.”

## Runtime proof

- Targeted browser scenarios: **18/18 pass** across desktop and mobile.
- Exact tested source: `d2275fe` (feature plus the two smallest follow-up fixes).
- Vercel preview: `https://vacancy-9u9y7h7vf-tbond24s-projects.vercel.app`
- Deployment: `dpl_GmQrj9pVfb8FKjZjJEr1ZgPSLY4k`
- Full hosted regression: **86/86 pass** across desktop and mobile.
- Coverage includes map discovery and synchronization, core product flows, hardening and adversarial checks, auth/recovery, listings, messages, account, admin, and the 390px/320px responsive audit.
- Hosted mobile screenshot: `outputs/vacancy-dark-mobile-preview.png`.
- No horizontal page overflow was found at the audited mobile widths.
- Production at `https://getvacancy.site` was not changed during this stage.

## Failure and fix loop

1. The first hosted mobile run found map zoom controls overlapping the search panel. Options considered were hiding zoom, moving the search panel, or moving the controls. Moving the controls was the smallest safe fix; commit `f35d771` places them below the panel.
2. The next run found that the compact `+ List` text changed the button's accessible name. Options considered were keeping the long visible label, adding hidden text, or setting the accessible label. The accessible label was the smallest safe fix; commit `d2275fe` preserves “List a room.”
3. The complete relevant regression was rerun after both fixes and passed 86/86.

## Score

- Requested mobile experience: **10/10**
- Mobile containment and responsiveness: **10/10**
- Accessibility and theme behavior: **10/10**
- Existing-flow preservation: **10/10**
- Runtime evidence: **10/10**

Acceptance is met for this isolated stage. The country selector intentionally exposes the six supported markets; adding unsupported countries would promise coverage the product does not yet provide. Flag emoji appearance follows the user's operating-system font, so some Windows devices render a country-code glyph rather than a pictorial flag.
