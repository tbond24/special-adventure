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
- “Homes around you” was replaced by result count, quick amenity filters, and Cards/List controls.
- Quick filters operate the existing filter state; the full filter panel remains available.

## Initial proof

- Targeted browser scenarios: **18/18 pass** across desktop and mobile.
- Full hosted mobile, visual, and regression evidence will be recorded after preview deployment.
