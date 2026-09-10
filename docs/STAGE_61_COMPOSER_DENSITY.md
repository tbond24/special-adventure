# Stage 61 — composer density and shared property media

## Aim and scope

Make Find controls quieter and restore their earlier order, reduce visual weight sitewide, and simplify listing creation without changing the live production deployment. The listing model remains property → units. Property photos become a reusable pool and each unit can choose shared photos or add its own. Custom property features are stored safely and can appear on cards.

Acceptance requires desktop and mobile runtime proof for every requested behavior, the relevant earlier regression suites, an isolated preview, and no production promotion before review.

## Decisions

Each item used the same sequence: define the need, compare at least three options, rank by user value and implementation risk, then choose the smallest safe option.

| Area | Options considered, best first | Decision and reason |
|---|---|---|
| Filter/view order | 1. Result count + Filter + View; 2. floating controls; 3. separate toolbar | Restore the familiar single row and remove Sort. It uses the least space and preserves earlier behavior. |
| Filter density | 1. reduce font/gaps/padding; 2. redesign every input; 3. modal-only filters | Compact the existing fields. It improves usable area without changing filter logic. |
| Typography | 1. one global regular-weight rule; 2. edit every component; 3. replace the font | Use the global rule because the request covers the whole site and it prevents missed components. |
| Listing icons | 1. transparent black icons; 2. neutral pills; 3. colored badges | Use transparent black icons for the least visual noise. Deposit remains a distinct decision cue. |
| Time/deposit pills | 1. tune line-height, padding and alpha; 2. rebuild badges; 3. plain text | Tune the current elements so their meaning and layout remain stable. |
| Property media | 1. in-form shared file pool; 2. immediate cloud media library; 3. duplicate uploads per unit | Use a shared in-form pool. Units can select shared photos and append private photos, with no new storage service or destructive schema rewrite. |
| Progress | 1. vertical left rail; 2. keep horizontal; 3. remove progress | Use the vertical rail with no panel background. It preserves orientation while freeing horizontal content space. |
| Automatic title | 1. selectable Unit type/Location formula; 2. free-form template syntax; 3. fixed formula | Use two clear selectable parts in Advanced settings. It is editable without exposing a fragile template language. |
| Optional fields | 1. one closed Advanced panel; 2. several small panels; 3. keep fields visible | Merge available date, minimum stay, maximum occupants, notes and title formula into one closed panel at the bottom. |
| Rules/features | 1. grouped rules plus validated feature rows; 2. arbitrary icon uploads; 3. fixed global taxonomy only | Group smoking/pets and allow up to 12 short custom labels using a common icon allowlist. This gives flexibility while keeping data safe and consistent. |
| Header behavior | 1. hide during downward scroll and restore after 180 ms/scroll end/top; 2. permanently sticky; 3. direction-only hide/show | Use active-scroll hiding with `requestAnimationFrame`, `scrollend` where available, and a timer fallback. It restores controls when the user stops. |
| Back/continue controls | 1. transparent back and square actions with added lower margin; 2. restyle the whole navigation; 3. leave unchanged | Apply the requested local geometry without changing route behavior. |

The header implementation follows browser-native scrolling guidance: keep scroll work light, use animation frames for visual updates, and treat `scrollend` as an enhancement with a fallback because support can vary.

## Build

- Added `stage61-composer-density.js` as an isolated, reversible enhancement loaded after Stage 60.
- Added a shared property photo pool with removable previews. Shared photos default to selected for each unit; unit-only photos merge independently.
- Added a configurable automatic title formula and consolidated optional listing fields.
- Grouped property rules and added validated custom property features.
- Added an additive `properties.custom_features` JSONB column and an owner-scoped, security-invoker RPC. Public and anonymous execution are revoked.
- Restored Find controls, removed Sort, compacted filters, simplified icon treatments, added vertical progress, scroll-aware header behavior, and transparent back controls.

## Test, score, diagnose, repeat

Initial Stage 61 result: **16/22**. The photo pool could not find the original input after an earlier composer layer moved it, and one title test opened the wrong closed section. The smallest fixes moved the original input back under the first unit while hiding its legacy label, and corrected the runtime path in the test.

Second targeted result: **22/22**. A broader run then exposed an update loop caused by observing every form mutation. Ranked fixes were: 1. synchronize only after Add unit, 2. debounce and filter mutations, 3. rebuild the multi-unit composer. Option 1 was applied because it directly matches the trigger and has the smallest failure surface.

The next run showed newly added property photos were not selected after an empty selection had initialized. Ranked fixes were: 1. add new shared files to each current unit selection, 2. recreate all selection state, 3. defer all selection until publish. Option 1 preserved deliberate deselections and unit-only files.

Final local relevant regression: **90/90 passed** across desktop and mobile Chromium. It covers Find controls, typography, icon and pill styling, vertical progress, selected Add-to state, property and unit photo behavior, hidden Advanced fields, custom features and protected RPC payload, preview images, header scroll behavior, address lookup, publishing lock, existing-property filtering, listing detail, inbox, profile, footer, and horizontal overflow.

## Database and rollback

Migration `20260910031000_add_property_custom_features.sql` was applied to Supabase project `xtutkwiivqkgkqjpkxvj` and verified as `jsonb NOT NULL DEFAULT []`. The write function is security-invoker and owner-scoped. Stage 60 production code ignores the additive column, so the current live site remains compatible.

Before promotion, retain the Stage 60 production deployment `dpl_4EQZL1tv6nNoH81u3HD2duucGXjJ` and checkpoint `checkpoint/stage60-production-pass` as the rollback baseline. Stage 61 must first pass the same browser checks on its unique preview URL.
