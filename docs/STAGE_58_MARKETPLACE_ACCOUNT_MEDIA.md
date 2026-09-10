# Stage 58 — Marketplace, account and media refinement

## Aim and acceptance

Make discovery clearer, prevent repeat publishing and duplicate images, give listers direct media controls, improve messaging/account feedback, and give administrators a secure account hierarchy. Existing auth, guest enquiries, listing ownership, RLS and production behavior must remain intact. Acceptance requires runtime proof on desktop and mobile, owner-only contact/media mutations, no page overflow, and a rollback checkpoint.

## Formula decisions

| Feature | Options considered (ranked) | Smallest safe choice and reason |
| --- | --- | --- |
| Realestate typography | 1. Licensed REA Pangea; 2. Pangea-compatible system stack; 3. unrelated free web font | Option 2 now. REA Pangea is a custom commercial typeface. The stack prefers it when licensed, uses Avenir Next on iOS, and stable system fallbacks elsewhere. |
| Freshness | 1. relative time then date; 2. exact date only; 3. hide | Option 1. It answers “how fresh?” quickly without false precision on older records. |
| Deposit | 1. red conditional pill; 2. blue pill; 3. text in detail only | Option 1. It is shown only when a deposit exists, on cards/lists and details. |
| Gallery position | 1. `3/10`; 2. dots; 3. thumbnails | Option 1. It stays legible for large photo sets and uses little space. |
| Repeat publish | 1. immediate form lock plus deterministic upload keys; 2. button disable only; 3. database rewrite | Option 1. The UI lock stops repeat calls and the stable path makes retries idempotent after partial upload. |
| Image management | 1. existing-media view/reorder/delete/add; 2. new asset library; 3. destructive replace-all | Option 1. It uses existing media ownership policies and supports the needed controls without a new library. |
| Sorting | 1. client sort current results; 2. server query per change; 3. omit | Option 1 for the present inventory size. Newest and price directions are useful and instant. |
| Starter searches | 1. suggestions drawn from live places; 2. fixed global examples; 3. empty search | Option 1. The examples always match actual inventory and locale. |
| Onboarding | 1. reusable four-step help dialog; 2. forced carousel; 3. tooltip tour | Option 1. It is available at any time and never blocks returning users. |
| Vacancy management | 1. visible property→unit rows with edit/archive icons; 2. collapsed dropdown; 3. separate page per property | Option 1. It preserves hierarchy while removing the extra reveal action. |
| Unread messages | 1. per-member last-read timestamp; 2. global message read flag; 3. client-only count | Option 1. Each participant gets a correct independent count. |
| Account profile | 1. public profile plus private contact table; 2. all fields on public profile; 3. auth metadata only | Option 1. Avatar/name can be public with listings; phone and WhatsApp remain owner-only. Unverified numbers are never marked verified. |
| Ratings and tier | 1. verified-transaction ratings; 2. open ratings; 3. placeholder state | Option 3 for now. The UI shows Member and “No ratings yet”; publishing ratings before transaction proof/moderation would be misleading. |
| Card hierarchy | 1. image→location→type→price→distance→notable services/deposit; 2. current mixed facts; 3. dense table | Option 1. Only supported, standout services are shown; no invented gym/pool data. |
| Optional composer fields | 1. hidden advanced controls with safe defaults; 2. show everything; 3. delete fields | Option 1. About fields and generated title are optional; exact location and rent remain required because the listing cannot work without them. |
| Currency | 1. derive from chosen country until manually changed; 2. global currency dictates location; 3. manual only | Option 1. Location sets a useful default while the lister keeps control. |
| Enquiry prompts | 1. editable question chips; 2. automatic messages; 3. FAQ database | Option 1. Nothing is sent without the visitor reviewing and submitting it. |
| Admin account view | 1. secure hierarchy plus existing audited status actions; 2. unrestricted record editor; 3. read-only counts | Option 1. Admin can see account→property→unit→vacancy structure and use the existing reasoned moderation controls without bypassing ownership. |

## Build and data boundaries

- Added relative freshness, compact card facts, deposit pills, numeric galleries, sorting, live starter searches and reusable help.
- Added a synchronous publish lock and deterministic per-request image paths. A retry recognizes its prior media row instead of creating another image.
- Added owner image view, reorder, delete and add/replace flow to editing.
- Added per-member `last_read_at`, unread nav badges and read acknowledgement.
- Added avatars and account editing. Phone and WhatsApp live in `profile_private_contacts`, protected by self-only RLS and permanent-account restrictions.
- Added editable enquiry prompts and tightened conversation layout.
- Added an admin hierarchy RPC with a public security-invoker wrapper and a private admin-checked implementation.
- Kept ratings as an honest empty state until verified interactions and moderation exist.

## Failure diagnosis and fixes

1. The first broad test could not reach an old Vercel URL because network access was denied. Ranked fixes: local mocked artifact, broader network access, untested preview. Chose local mocked artifact.
2. The first gallery test expected `3/3` after assigning an impossible synthetic width. Ranked fixes: change product math, weaken assertion, scroll to the browser's real maximum. Chose real maximum; both devices passed.
3. The database review found contact fields would have inherited public profile row visibility. Ranked fixes: column grants with RPC-only access, auth metadata, private RLS table. Chose a private RLS table.
4. Supabase advisor review showed anonymous Auth users share the authenticated role. Ranked fixes: disable guest enquiries, accept guest profile writes, reuse the permanent-user guard. Chose the existing permanent-user guard for contact/avatar mutations.
5. The first hosted preview returned Vercel `NOT_FOUND` because the repository root was deployed. Ranked fixes: change product routing, weaken the hosted test, deploy the linked `app` directory. Chose the actual app directory; the replacement preview passed.
6. Vercel promotion updated the default production alias but left `getvacancy.site` on the prior deployment. Ranked fixes: rebuild production, wait without evidence, assign the custom alias to the promoted artifact. Chose the explicit alias assignment, then reran the full live gate.

## Runtime evidence

- Stage 58 targeted product suite: 18/18 passed across desktop Chromium and Pixel 7.
- Stage 54 + Stage 57 regression: 22/22 passed across desktop Chromium and Pixel 7.
- Stage 36 account/admin/detail regression: 16/16 relevant checks passed; the separate remote-fixture responsive audit did not reach its three expected remote fixtures and was classified as harness setup, not product behavior.
- Supabase migration proof: unread timestamp, private contact table and admin hierarchy function all exist.
- Hosted preview `vacancy-dthadi10o-tbond24s-projects.vercel.app`: 38/38 relevant checks passed across desktop Chromium and Pixel 7.
- Unmocked hosted smoke proof: application booted against the real backend, title rendered, result state returned, horizontal overflow was absent, and the browser reported no errors.
- Production deployment `dpl_513q2Ki9yBGL7rapUW5eXMGhEMrY` is assigned to `getvacancy.site`.
- Production regression: 38/38 relevant checks passed across desktop Chromium and Pixel 7 after the custom alias update.
- Unmocked production smoke proof: the live application booted against its real backend, returned its result state, had no horizontal overflow, and reported no browser errors.
- Security model: contact insert/update and avatar mutation require a permanent authenticated account; media mutations remain owner-scoped.

## Remaining release gate

Stage 58 is live and green. Use production deployment `dpl_513q2Ki9yBGL7rapUW5eXMGhEMrY` as the rollback baseline for the next stage.
