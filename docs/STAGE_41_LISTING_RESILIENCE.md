# Stage 41 — Listing draft and partial-publication recovery

## Aim and scope

Prevent a lister from losing ordinary form work after navigation, reload, or a partial multi-unit publication failure. Keep the change isolated to the listing composer. Do not store exact addresses, public coordinates, or photo files in browser storage, and do not change production in this stage.

## Acceptance criteria

- An authenticated user's unfinished shared property fields and unit fields recover on the same device.
- Drafts are separated by user and by new/existing property.
- Exact address, map pin, and photos are never persisted in the local draft.
- A user can discard the draft.
- After some units publish and a later unit fails, published units disappear from the form and only unfinished units remain.
- Retrying a partial publication adds units to the already-created property instead of creating another property.
- The relevant desktop and mobile regression remains green.

## Options considered

| Rank | Option | Value | Complexity | Main advantages | Main drawbacks |
|---|---|---:|---:|---|---|
| 1 | Device-local, account-scoped draft plus partial-unit recovery | High | Low | Free, reversible, fits the present architecture, immediate recovery | Draft does not follow the user to another device |
| 2 | Supabase-backed private drafts | High | Medium | Cross-device recovery and centralized lifecycle | Requires schema, policies, migration, cleanup rules, and more server traffic |
| 3 | Full multi-step server-backed wizard | High | High | Strongest guided workflow and cross-device continuity | Largest change and highest regression risk before real usage evidence |

Chosen: option 1, the smallest safe improvement. A server-issued idempotency key remains the correct later solution for the narrow case where the server commits a unit but the client loses the response.

## Build

- Added account- and property-scoped device drafts.
- Excluded exact address, map coordinates, and photo inputs from persistence.
- Added visible restored/saved state and a discard action.
- Preserved the created property ID across retries.
- Removed successfully published units after a partial failure, renumbered the remaining unit form, and saved only unfinished units.

## Runtime evidence

Targeted desktop and mobile scenarios: **6 passed, 0 failed**.

- Multi-unit publication under one property.
- Draft restoration and privacy exclusions.
- Partial multi-unit failure and safe retry under the existing property.

Relevant regression: **92 passed, 18 intentional skips, 0 failed** across map discovery, MVP hardening, Stage 36 experience, mobile map split, and mobile focus-zoom suites.

## Score

| Area | Score | Evidence |
|---|---:|---|
| Work preservation | 9/10 | Shared and per-unit fields restore after reload on the same device |
| Privacy | 10/10 | Exact address, coordinates, and files are absent from stored draft data |
| Partial failure recovery | 9/10 | Only unfinished units remain; retry reuses the created property |
| Cross-device recovery | 0/10 | Explicitly outside the selected local option |
| Regression safety | 10/10 | 92 relevant checks passed on desktop and mobile |

## Failure diagnosis and fixes

No product or test failure occurred. A trailing blank-line formatting check failed after the first edit.

Ranked fixes: (1) normalize the edited file ending, (2) configure a formatter for the repository, (3) suppress the check. Option 1 was applied because it directly corrected the defect without changing project tooling. `git diff --check` then passed.

## Remaining limitation

If a create request commits on the server and its response is lost, a browser cannot prove whether the operation succeeded. Solving that safely requires a server-side idempotency key and unique constraint; client-side guessing would risk hiding or duplicating a listing.
