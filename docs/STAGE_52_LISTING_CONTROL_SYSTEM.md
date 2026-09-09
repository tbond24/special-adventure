# Stage 52 — Listing control system

## Aim and acceptance

Make Create Property, Add Unit and Edit Listing use one compact and predictable form language. Rent, deposit and stay must fit on one line; inherited unit services must default visibly to the property; binary fields must not use dropdowns; optional occupant limits must be hidden under Advanced; listers must be able to save a local draft or publish; inventory groups must start closed; and listing photos must open in a keyboard and touch navigable viewer. Mobile pages must not move sideways and listing details must use the available width.

Production remains unchanged during this stage. Existing payload field names and database constraints remain authoritative.

## Decisions

### Shared controls

1. **Reusable progressive enhancement over existing fields** — low complexity, high value, preserves backend compatibility and rollback. **Rank 1.**
2. Replace every form with a new form framework — high consistency, high rewrite and regression risk. Rank 3.
3. Patch Create and Edit separately — low initial effort, but repeats the inconsistency that caused this stage. Rank 2.

Chosen: option 1. `upgradeListingControls` recognizes the existing field names and applies the same components in every journey.

### Service choices and inheritance

1. Inline segmented choices with icon, Yes, No and a blue From property state — compact, explicit and touch friendly. **Rank 1.**
2. Native dropdowns — accessible but slow to scan and hides inheritance. Rank 2.
3. Independent checkboxes — compact but cannot safely represent a three-state inherited value. Rank 3.

Chosen: option 1. Inherited services default to From property; property-level and non-inherited unit services expose Yes/No. The original select remains as the submitted value and is visually hidden.

### Rent, bond and stay

1. One-line semantic rows built from the existing inputs — smallest safe change and identical data. **Rank 1.**
2. A combined custom input that parses free text — compact but error prone across currencies and periods. Rank 3.
3. A modal editor per amount — saves space but adds taps and hides context. Rank 2.

Chosen: option 1. Rent orders currency, amount, then the full frequency word. Bond and minimum stay use the same row language.

### Optional quantities

1. Closed Advanced section with a bounded minus/value/plus control — clear, optional and honors the database maximum. **Rank 1.**
2. Keep the always-visible numeric input — simple but adds workload to the main path. Rank 2.
3. Remove the field — simplest but loses a useful safety and occupancy constraint. Rank 3.

Chosen: option 1. Maximum occupants is not required and remains bounded by the existing maximum of four.

### Draft and publish

1. Expose the existing device-local draft store beside Publish — minimal backend risk and reversible. **Rank 1.**
2. Add cloud drafts and a new status immediately — useful across devices but requires schema, policy and lifecycle work. Rank 2.
3. Continue auto-save without an explicit action — lowest effort but poor feedback and control. Rank 3.

Chosen: option 1. Save draft is a black outline action; Publish keeps the orange action. Both use square corners.

### Photo viewing

1. Native dialog lightbox with arrows, keyboard keys, backdrop close and touch swipe — small, dependency-free and accessible. **Rank 1.**
2. Add a gallery library — mature gestures but adds weight and a new dependency. Rank 2.
3. Open the raw image in another browser tab — trivial but loses listing context. Rank 3.

Chosen: option 1.

## Failure loop

The first focused run scored 1/5. Four failures were diagnosed: two controls were correctly hidden inside the guided Unit stage but the fixture did not open it; the inventory assertion included hidden compatibility controls; and the detail fixture used an invalid owner shape. After repairing the fixtures, the inventory alignment check revealed a 2.5 px top difference caused by different control heights even though their visual centers aligned. Three fixes were ranked: force equal heights (rank 2, unnecessary visual change), test visual center alignment (rank 1, matches the acceptance criterion), or loosen the assertion broadly (rank 3). The center-alignment assertion was chosen.

The mobile capture also showed that making the new submit row sticky covered the location workflow. Fixes considered were a collapsible sticky bar, extra bottom padding, or normal document flow. Normal flow ranked first because the user asked for visible choices rather than persistent controls, and it removes obstruction without extra behavior.

## Runtime proof

Focused runtime matrix: **10/10 passed** across desktop and mobile. Broader guided-listing, listing hardening, map discovery, mobile focus/zoom and Stage 36 experience regression: **97 passed, 11 device-inapplicable checks skipped, 0 product failures**. JavaScript syntax and diff validation passed.\n\nA Vercel preview was not created because the automated approval review blocked uploading this exact source payload without a fresh explicit destination approval. Production was not changed. Source-presence checks were not counted as acceptance.
