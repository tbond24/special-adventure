# Stage 36 — admin operations and mobile listing refinement

## Aim and acceptance

Build the agreed operational admin MVP and refine the mobile shell and listing detail without changing the production frontend. Acceptance requires secure server-side admin checks, reasoned and audited moderation, suspended-account enforcement on protected data, iPhone safe-area coverage, no horizontal movement, working account preferences, compact listing safety actions, and desktop/mobile runtime proof.

## Options and ranking

### Admin

1. Extend the existing admin/RLS model with overview, search, queues, reasoned actions and an audit log. Highest operational value with additive database changes.
2. Add a read-only metrics page. Lowest complexity, but cannot complete the moderation loop.
3. Build a full role/analytics/fraud platform. Highest future scope and highest cost; premature for current usage.

Rank: 1, 2, 3. Option 1 was chosen.

### Mobile shell

1. Extend the map behind the safe area using `viewport-fit=cover`, safe-area padding and a lighter glass header. Smallest standards-based change.
2. Keep the map below the status area and colour-match the page chrome. Safe but does not create the requested full-screen effect.
3. Require an installed native wrapper/PWA. More control, but unrelated complexity.

Rank: 1, 2, 3. Option 1 was chosen.

### Listing actions and property map

1. Put Save on the gallery, place Report/Block in a flag sheet, and group the map with property facts. Familiar and space-efficient.
2. Keep text actions in the detail panel. Lowest change, but preserves clutter.
3. Replace the detail page with a new modal architecture. High risk with no MVP advantage.

Rank: 1, 2, 3. Option 1 was chosen.

### Account settings

1. Use full-width line rows with persisted controls and permission-gated Admin visibility.
2. Retain informational preference cards. Visually safe but settings remain non-functional.
3. Create separate pages for every preference. More navigation and unnecessary complexity.

Rank: 1, 2, 3. Option 1 was chosen.

## Build

- Added iPhone safe-area coverage, lighter 7px glass blur, compact currency control, 18px navigation icons and 10px navigation labels.
- Added an image-overlay heart and bottom-right flag that opens an accessible Report/Block action sheet.
- Integrated the listing location preview into the property-facts group.
- Rebuilt You preferences as working line rows. Theme, notification and distance preferences persist; the Admin row remains hidden unless a server check succeeds.
- Added an admin operational overview, user/listing search, report queue, listing moderation, user restriction, conversion indicators and immutable moderation history.
- Added database-enforced active-account checks across protected marketplace tables. Admin functions verify `auth.uid()` against the existing private admin allowlist and require a reason.
- Added a 30-second inventory freshness guard to stop a redundant initial refresh from replacing cards while users interact.

The admin health strip reports client-observed errors. Direct provider health and email-delivery telemetry remain unavailable because those services do not currently write health events into Vacancy's database.

## Failure loop

Initial focused run failed 4/4 because the restricted local browser could not load remote inventory. Options were production data, a deterministic fixture, or a Supabase proxy. A deterministic fixture ranked first and the focused matrix passed 8/8.

The first network-enabled regression produced 115 passes, 4 intentional skips and 9 failures. Diagnosis:

- Two expectations described the old 6px/13px navigation sizing.
- Two safety actions lacked concise accessible names.
- Five failures exposed a duplicate initial inventory refresh that could detach listing controls during interaction.

Ranked fixes for the refresh defect were: freshness guard, DOM-diffed refresh, or disabling refresh. The 30-second freshness guard ranked first because it removes the redundant request while retaining later refresh behavior. Accessible labels and intentional size expectations were corrected. The failed subset then passed 12/12 with 2 desktop-only skips.

## Verification and score

- JavaScript syntax checks: passed.
- Supabase migration dry run: exactly one expected migration.
- Supabase remote history: 26/26 aligned.
- Supabase linked database lint: no schema errors.
- Focused desktop/mobile feature matrix: 8/8 passed.
- Failed-scenario rerun: 12 passed, 2 intentional skips, 0 failed.
- Relevant full desktop/mobile regression with real Supabase and map dependencies: 124 passed, 4 intentional skips, 0 failed.
- Local implementation score: 49/50. The final point requires hosted preview proof.

Production frontend remains on the Stage 35 artifact. The Stage 35 rollback commit and Vercel deployment remain available.

## Hosted acceptance

- Exact initial commit: `d265a5a`.
- Preview deployment: `dpl_3uNbq7YVnP88hTNV5QtETcC9mXPc`.
- Preview URL: `https://vacancy-kg88pyebv-tbond24s-projects.vercel.app`.
- Vercel state: READY.
- Hosted desktop/mobile regression: 124 passed, 4 intentional skips, 0 failed.
- Manual 390×844 visual review: header/map safe-area composition, controls, results and floating navigation rendered without sideways movement.

The first direct anonymous admin probe returned HTTP 200 with `{"error":"admin required"}`. The internal check prevented access, but the function was still callable by `anon`. Ranked fixes were explicit `anon` revocation, private-schema wrappers, or an Edge Function gateway. Explicit revocation was applied as the smallest safe fix in forward migration `20260908091000_revoke_anon_admin_functions.sql`. The repeated probe returned HTTP 401 with `permission denied for function admin_dashboard`; linked database lint remained clean.

Final Stage 36 score: **50/50**. Production frontend remains unchanged pending promotion of the exact hosted-green artifact.

## Per-feature acceptance redo

The grouped acceptance above was reopened at the user's request. Every feature and deferred idea now has its own aim, three options, ranking, smallest-safe choice, runtime test, score and failure loop in `docs/STAGE_36_PER_FEATURE_METHOD.md`.

The redo removed the non-functional notification preference, made display currency controllable in You without changing the selected country, connected distance units to the radius calculation, added a real blocked-account list/unblock path, and exposed secure password recovery plus global session sign-out.

- Independent Stage 36 desktop/mobile suite: 20/20 passed.
- Defined release regression: 134 passed, 4 intentional skips, 0 failed.
- An exploratory all-files run produced 138 passes, 28 skips, 10 failures: eight require a local isolated Supabase stack by design; two belong to an obsolete disposable-address SMTP probe. These were classified as environment/harness failures and were not counted as product acceptance.
- Production frontend remains unchanged while the revised preview is built and verified.

### Revised hosted acceptance

- Exact tested application commit: `5cfde30`.
- Deployment: `dpl_44cFWS31WZ2vGnx2X1asHVaHGwVx` (`READY`).
- Preview: `https://vacancy-hwduz2ggb-tbond24s-projects.vercel.app`.
- Hosted independent and release matrix: 134 passed, 4 intentional skips, 0 failed.
- Rollback/checkpoint branch: `checkpoint/stage36-admin-mobile-experience-pass` at exact tested commit `5cfde30`.
- Production frontend remained unchanged.
