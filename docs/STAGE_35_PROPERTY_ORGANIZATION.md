# Stage 35 — property organization and calm map styling

## Aim and acceptance

Finish the listing workflow without expanding beyond the existing MVP: choose an existing property and add a unit, create a new property from the same chooser, keep a manager nickname private, preview before publishing, and make the free OpenStreetMap presentation calmer. Production remains unchanged until the additive migration and hosted candidate pass.

## Options considered

1. Extend the existing property/unit model and Leaflet/OpenStreetMap UI. Lowest cost and complexity; preserves current security and rollback points.
2. Build a new wizard and duplicate listing schema. Clearer separation, but higher migration and regression risk.
3. Move to a paid map/style provider and rebuild listing management. Most visual control, but adds cost, keys, vendor dependency, and unnecessary MVP scope.

Rank: 1, 2, 3. Option 1 was chosen.

For the private nickname, direct table updates, browser-only storage, and an owner-checked database function were compared. The database function ranked first because it persists across devices while enforcing ownership at the database boundary.

## Build

- Existing properties appear as cards with a clear `+ Unit` action.
- A dotted `+ New property` card returns to map-first property creation.
- New properties accept a public property name and an optional 80-character private manager nickname.
- The nickname is read only through the owner's private-location row and is never included in public vacancy data.
- An owner-checked function changes the nickname; anonymous execution is revoked.
- The existing pre-publication listing preview and multi-unit publishing remain intact.
- Light and dark maps use restrained filters and smaller map labels while retaining required attribution.

## Test and diagnosis

Initial full run: 106 passed, 4 skipped, 6 failed. The six failures were stale expectations: two expected radius to be usable without a selected point, and one per viewport expected a removed rent label. Tests now establish a real map point and verify the new rent-period selector.

A focused run exposed a real issue: the property cards were nested inside the hidden form they were intended to reveal. Options were to keep the form visible, position the chooser with CSS, or move the chooser before the form. Moving it before the form ranked first and fixed the interaction with the least code.

Deterministic local result: 50 passed, 4 skipped, 2 infrastructure failures. Both failures require the externally hosted Leaflet script, which the restricted local runner could not download; listing results still rendered and the failures were recorded as harness/environment failures. The complete owner/property composer suite passed 11/11 in desktop Chromium, and the targeted chooser scenario passed after the fix. JavaScript syntax checks passed.

## Remaining release gate

Before this stage can be promoted: validate and apply the additive Supabase migration, deploy an isolated Vercel preview, rerun the full desktop/mobile suite with external map assets and Supabase access, exercise the authenticated owner flow, then checkpoint the exact passing artifact. Production must remain unchanged until those checks are green.

## Hosted preview evidence

Preview `dpl_5N3szkyHVk8kv9cgb33Ttev7RFrS` (`https://vacancy-jigr5r28s-tbond24s-projects.vercel.app`) reached READY without changing production.

- Supabase migration history: 25 local/remote versions aligned.
- Anonymous nickname RPC call: HTTP 401.
- Anonymous private nickname rows: 0.
- Hosted non-mutating gate: 116 passed, 4 skipped; the two initial radius harness failures were corrected and then passed on both desktop and mobile, yielding 118/118 executed checks.
- Persona/genuine-session run: 24 skipped because isolated lister/renter credentials are absent. Skips are not counted as evidence.

Authenticated owner proof passed in 11.5 seconds using a dedicated confirmed account: sign-in, map-first property creation, private nickname persistence, listing preview, publication, reopening, account deletion, stale-session removal, and protected-route recovery all succeeded. The account and listing were removed during cleanup.

Stage 35 is accepted for promotion. The exact release artifact is Vercel deployment `dpl_5N3szkyHVk8kv9cgb33Ttev7RFrS`.

## Production

The accepted artifact was promoted to production deployment `dpl_7Up1BNBwXWMxnxvmTXSGQzGpXY29`. Vercel reports `Ready`, with `https://getvacancy.site` assigned as an alias. The post-promotion desktop/mobile smoke gate passed 9 checks with 1 intentional viewport skip.
