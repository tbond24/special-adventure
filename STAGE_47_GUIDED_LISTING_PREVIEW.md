# Stage 47 — guided listing preview

## Aim and scope

Reduce listing-creation effort without changing the established property → unit model. This stage covers atomic map publication, a progressive listing composer, clear action state, truthful freshness text, a light default for new visitors, and a footer that rests at the bottom of short pages. Admin analytics, custom owner services, bedroom filtering, and administrator TOTP remain separately scoped stages.

## Options and decisions

Each feature used the required three-option evaluation recorded in the preceding product review. The chosen smallest safe options were: accessible accordions instead of separate routes or a longer static form; map-first with manual geocoding instead of manual-only or search-only; inline action state instead of toast-only or full-screen loaders; an atomic database RPC instead of browser retry or publishing without a pin; real `updated_at` display instead of relabelling `confirmed_at`; light only for users without a saved theme instead of overwriting preferences; and a flex-based grounded footer instead of a fixed overlay.

## Build

- New-property flow progresses through Location → Property → Unit → Preview while allowing sections to reopen.
- Existing-property flow continues to skip duplicate location and property entry.
- Map and manual address modes share one location stage. Manual addresses are geocoded to a reviewable public pin.
- Stage indicators turn green only after required validation succeeds.
- Boolean property and unit choices use labelled toggles.
- Listing title and descriptions are optional; an empty title is generated from unit type and locality.
- Available-from defaults to today. Rent and deposit accept numeric keyboards and display thousands separators.
- Publish actions disable repeat input and expose a persistent busy label.
- `create_vacancy_listing_v4` validates and writes public coordinates in the same database transaction as the listing.
- Public cards use the actual vacancy `updated_at` timestamp.
- New browsers start in light mode; saved user choices are preserved.
- Draft persistence follows property/unit ownership after the accordion DOM reorganisation and continues excluding private address, coordinates and photos.

## Test, diagnose, fix loops

1. The first local regression targeted a legacy deployment because the suite uses `VACANCY_E2E_URL`; rerun with the correct variable.
2. The first preview was a ready 404 because the repository directory rather than `app/` was deployed; redeployed the actual application output.
3. Targeted tests initially contained strict-locator and market assumptions; narrowed assertions to the intended section and explicitly selected Kenya without weakening behavior checks.
4. The broad hardening test exposed a map-stub compatibility dependency; removed the unnecessary map zoom read.
5. The broad hardening test exposed omitted property fields in local drafts after DOM reorganisation; changed draft collection to semantic property-versus-unit ownership.
6. Older hardening setup attempted to use controls while their accordion was closed; the harness now opens the relevant stage and retains the original expected outcomes.

## Runtime evidence and score

- Preview: https://vacancy-6vh582pf4-tbond24s-projects.vercel.app
- Deployment: `dpl_F6GMnk9LJiq2QjwX1VdeDXXFaqQG`
- Existing public and map synchronization regression: 20/20.
- Targeted guided-listing regression: 8/8.
- Combined guided, hardening, adversarial, mobile, theme and legal regression: 80/80.
- Database inventory check: 3 active Kenya vacancies; 0 active vacancies missing public coordinates.
- Supabase migration applied successfully. Security advisor findings were unchanged existing warnings; the new RPC is security-invoker and role grants are restricted.

Scores: data integrity 10/10; guided flow 9/10; action feedback 8/10; mobile containment 10/10; accessibility 9/10; regression safety 10/10. Stage score: 9.3/10.

## Remaining isolated stages

- Add bedroom data and matching search controls.
- Add owner-scoped reusable custom services.
- Add TOTP enrollment/challenge and enforce AAL2 for administrators.
- Add admin graphs and counters in the later admin build requested by the owner.

Production remains on the Stage 46 artifact pending owner review of this preview.
