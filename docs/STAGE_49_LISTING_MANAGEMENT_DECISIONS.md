# Stage 49 — Listing management decisions

## Aim and scope

Make listing creation and management use less mobile space, reduce duplicate choices, add a reversible removal path, make a landlord's inventory easier to scan, and diagnose intermittent mobile zoom without restricting accessibility. Production remains unchanged during this decision stage.

## 1. Flat creation sections

Options considered:

1. Keep the existing progressive accordion but remove card backgrounds, outer borders and rounded containers; separate stages with spacing and a thin divider. High space value, low complexity, and preserves the working guided flow. **Rank 1.**
2. Remove all section structure and show one continuous form. Lowest visual weight, but restores the mental overload the progressive flow was built to prevent. **Rank 3.**
3. Keep cards and reduce their padding and border contrast. Lowest implementation effort, but recovers little usable area. **Rank 2.**

Decision: option 1. Keep Location, Property and Unit as collapsible stages. Remove their enclosing card treatment while retaining headings, completion state, validation and automatic progression.

## 2. Property and unit entry point

Options considered:

1. Put a centered `+ New property` tile first, followed by existing property rows with a right-aligned `+ Unit` action. One clear hierarchy and the shortest path for both tasks. **Rank 1.**
2. Show three top actions: Create new, Add to current and Duplicate. Easy to discover, but Add to current merely repeats the property list and Duplicate lacks a safe publishing model. **Rank 2.**
3. Ask a setup question every time the page opens. Clear to new users, but adds a repeated step for returning landlords. **Rank 3.**

Decision: option 1. Remove the redundant Create new property control, the New property explanatory block, `Add its location and shared details`, and `Location and property facilities are reused automatically`. The new-property tile appears before existing properties. Each existing property keeps its name and location, with a minimum 44 px `+ Unit` target at the right edge.

## 3. Duplicate

Options considered:

1. Defer Duplicate until usage shows a repeated-entry problem. No accidental duplicate inventory and no new draft model. **Rank 1 for this build.**
2. Duplicate one unit into an unpublished draft under the same property, copying structured attributes while excluding availability, status and photos. Useful and containable after drafts exist. **Rank 2.**
3. Duplicate a full property and all units as live records. Fast for large managers, but risks stale availability, copied photos and misleading duplicate results. **Rank 3.**

Decision: do not place Duplicate beside the primary actions. Reconsider a `Duplicate as draft` action in a unit overflow menu after real landlord usage and a durable draft state exist. A duplicate must never publish automatically.

## 4. Archive and permanent delete

Options considered:

1. A bin icon opens a confirmation sheet whose primary action is Archive. Archived items move to an Archived filter, offer Undo, and expose a separate permanent-delete action with a second explicit confirmation. The server verifies ownership and cleans dependent media/data safely. **Rank 1.**
2. Archive only. Safest and simplest, but does not satisfy a landlord who requires permanent removal. **Rank 2.**
3. Two consecutive confirmations followed by immediate deletion. Superficially simple, but can destroy conversation, saved-listing, moderation and support context. **Rank 3.**

Decision: option 1, implemented as two distinct states rather than two rapid modal clicks. The icon requires an accessible `Archive or delete listing` label. Before permanent deletion, the build must define retention for conversations, reports and media; records needed for safety or disputes should be tombstoned rather than blindly cascaded.

The existing vacancy status constraint has no `archived` value, so this requires a migration and an owner-scoped server operation. Reusing `paused` would blur temporary unavailability with deliberate archiving and is rejected.

## 5. Your vacancies inventory

Options considered:

1. Show `Your vacancies` with an emphasized vacancy count, compact live filters, and two views: Cards and List. List is compact by default on mobile; tapping a row reveals its details. High clarity with two distinct modes. **Rank 1.**
2. Provide Cards, List and Compact list as three modes. Meets the literal suggestion, but List and Compact list overlap and add a choice without a separate job. **Rank 2.**
3. Choose the layout automatically with no control. Lowest complexity, but removes a useful manager preference. **Rank 3.**

Decision: option 1. Filters initially cover status, property and text search. The count reads `5 vacancies across 2 properties` and filtered results read `2 of 5`. View preference may be stored locally. Management filters remain separate from renter discovery filters.

## 6. Property and listing references

Options considered:

1. Keep existing UUIDs as internal keys and add short, random, unique public reference codes for support, ads and human communication. Preserve relationships through the existing foreign keys. **Rank 1.**
2. Display shortened UUIDs. No migration, but awkward to read and easy to mistype. **Rank 2.**
3. Encode hierarchy or sequence in IDs, such as property number plus unit number. Easy to infer, but leaks inventory volume, becomes brittle when units move, and couples identity to presentation. **Rank 3.**

Decision: option 1. The existing data already follows property UUID → room/unit UUID → vacancy UUID. Add independently generated codes such as `VAC-P-7K2M9Q` and `VAC-L-4H8J2D` only when a feature needs to show or accept them. Codes must have a unique database constraint and must not replace UUIDs in authorization checks.

## 7. Intermittent mobile zoom

Options considered:

1. Preserve pinch zoom, audit every focusable field at real mobile widths, reproduce focus and keyboard transitions, test return from camera/photo picker, and separate page zoom from Leaflet map zoom. Apply only the measured trigger's fix. **Rank 1.**
2. Add `maximum-scale=1` or disable user scaling. It can hide symptoms but harms accessibility and is rejected. **Rank 3.**
3. Reset viewport scale with JavaScript on focus or navigation. Browser-dependent and likely to create visible layout jumps. **Rank 2.**

Decision: option 1. The existing viewport remains `width=device-width,initial-scale=1,viewport-fit=cover`. The focused automated gate passed all 7 applicable checks at 320, 375, 390 and 430 px: visible form controls compute to at least 16 px, normal controls use tap-safe behavior, and Leaflet retains map gestures. This narrows the unresolved issue to an intermittent Safari transition, an untested dynamic control, or intentional map gesture behavior. It is not yet accepted as fixed.

## Build order and acceptance

1. Flatten the guided creation sections and simplify the property chooser.
2. Add the vacancy count, status/property/search filters, and Cards/List switch.
3. Add archive storage, owner operation, interface, Undo and archived filtering.
4. Define and implement safe permanent deletion after dependency tests.
5. Add public reference codes only where the management interface uses them.
6. Run the Safari-focused zoom investigation and apply the smallest reproduced fix.
7. Run targeted tests, all relevant mobile widths/themes, listing creation/edit/publish, genuine owner isolation, database/RLS checks and the full existing regression. Record failures, rank three fixes, apply the smallest safe fix and repeat.

Production promotion requires every targeted and regression gate to pass, a preview review, a checkpoint branch, and an exact tested artifact. No production change was made in this decision stage.

## Implementation record

The selected flat composer, New Property-first chooser, right-aligned Unit action, vacancy count, status filter, Cards/List modes, archive/restore/delete flow and readable reference codes were implemented after approval.

The first targeted run produced 41 passes, 7 applicability skips and 6 failures. Four failures were stale selectors that assumed an existing property remained the first card; selectors were changed to identify the intended property by its name, preserving the approved New Property-first behavior. Two tests depended on hosted inventory while the isolated local server could not reach the network and are reserved for the hosted gate.

The first database migration attempt failed atomically because existing fixture UUIDs shared their first eight characters, creating duplicate reference codes. Ranked fixes were independent random codes, longer UUID fragments, and collision retry logic. Twelve-character independent random codes ranked first because they do not expose internal IDs and retain a unique constraint. The corrected migration passed its dry run, applied successfully, and local/remote migration histories now match.

The focused Stage 49 suite passed 8/8 on desktop and mobile. The broader local run confirmed the isolated interface suites but was stopped because genuine-session, hosted-inventory and network tests require their intended environments. These are not counted as product passes and must be rerun against the preview or isolated Supabase stack before promotion.
