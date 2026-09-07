# Stage 1 — Foundation consolidation + database baseline

Status: **PASS**

## Goal
Remove patch-stack ambiguity and capture the live database contract without changing product behavior.

## Options considered
1. Full framework rewrite — rejected: high regression risk and unnecessary before stronger product evidence.
2. Consolidate the existing static app into domain modules — **chosen**.
3. Leave patch files and only document them — rejected: technical debt remains active.

## Implementation
Canonical frontend source now lives under `app/`:

- `app/index.html`
- `app/styles.css`
- `app/src/backend.js`
- `app/src/market-explore.js`
- `app/src/discovery.js`
- `app/src/detail-messaging.js`
- `app/src/listings.js`
- `app/src/auth-account-admin.js`

The production `release-v3/` artifact remains untouched as the rollback reference.

The former release patches for radius UI, map/card synchronization, marker accessibility, marker rebinding and fit-visible-pins were folded into the canonical `market-explore.js` behavior. Later features should modify the canonical source rather than add another override file.

## Database baseline
Added:
- `supabase/BASELINE.md`
- `supabase/verify_baseline.sql`

The production migration ledger contains 24 migrations, ending at:
`20260906184003_owner_set_public_map_pin`.

Backward-compatibility fields such as `weekly_rent`, `monthly_rent` and `bond` were deliberately retained. Stage 1 is not a cleanup migration.

## Evidence

### Schema contract
`verify_baseline.sql` was executed against production project `xtutkwiivqkgkqjpkxvj`.

Result: **14/14 contract checks true**.

Checks include:
- latest migration present
- global rent fields present
- legacy rent fields retained
- public coordinates present
- private location table present
- inheritance overrides present
- v2 create/update/add-unit RPCs present
- map-pin RPC present
- critical RLS policies present

### Frontend syntax
Every `app/src/*.js` file passed `node --check` in GitHub Actions.

### Browser equivalence
Preview:
`https://vacancy-6dimgqqc2-tbond24s-projects.vercel.app`

GitHub Actions run:
`34076662355`

Results:
- 18 general product/security tests passed
- 2 focused map pointer/keyboard synchronization tests passed
- Desktop Chromium + Pixel 7 profiles
- **20/20 total PASS**

## Diagnosis / fixes
No behavioral regression was found in the equivalence gate. The main issue Stage 1 solved was structural: production behavior previously depended on multiple later scripts overriding earlier functions. That risk is now removed from the canonical development source.

## Production impact
None. Production remained on the known-good G7 release throughout Stage 1.

## Exit condition
Stage 1 may be treated as the canonical development foundation for future stages. New work should branch/checkpoint from this state and should not extend `release-v3` with additional patch scripts.
