# Beta essentials, existing listing design

Status: preview candidate. Do not promote the frontend until the owner reviews the preview and approves release. Actual hosted authentication, upload/restore, and concurrent Storage timing are not yet exercised.

## Version map and rollback

| Version | Branch / source | Appearance and behavior |
|---|---|---|
| Current live baseline | `rollback/pre-listing-accordion-20261011`, exact commit `fe928e9077e4a1c9f3809ea75287c7a5ca148b2a` | Original three-step listing UI, sign-in at entry, device-local drafts |
| This candidate | `release/account-drafts-old-ui-20261011` | Same Location → Listing details → Review design; account prompt at Publish, private account drafts, session fixes, You avatar |
| Separate design experiment | `test/listing-accordion-20261010`, remote commit `6eb66c5b044da14a15a1837fd732a391606d5fed` | Accordion design experiment; not part of this release |

Baseline application tree: `abdb874689c333c8229252f4f584082a2d92a712`.
Baseline deployment: `dpl_7TN3YwefKaN78LPohxL56JN5UDob`, immutable URL https://vacancy-6thaksbn8-tbond24s-projects.vercel.app .
The live `getvacancy.site` frontend still uses that baseline while this candidate is reviewed. Main is an older ancestor and was not merged or overwritten.

To roll back a later authorized frontend release, restore that exact baseline deployment/branch. Retain the additive private draft tables, manifests, photo bucket and tagged-upload guards so saved work is not lost and open draft clients remain fenced. Do not drop tables, delete media, reset publication IDs, or disable guards as routine rollback. See [preserve-data rollback](../../../qa/account-drafts/sql/ROLLBACK.md).

## Exact visible changes

1. Guests can choose a new property and enter details/photos before signing in. Existing-property management still requires its owner account. An early note says an account is required to publish.
2. Guest Publish durably checkpoints text and Files first, prompts for an account, privately transfers the draft after account verification, and returns to Review. It never publishes automatically after authentication.
3. Signed-in drafts autosave to the account with private photos. The existing dashboard shows account drafts and unsynced device copies. Conflicts preserve both versions and offer the account version or a genuinely separate new draft. A signed-in publishing-account label and save/recovery status are visible.
4. The existing You navigation target shows the account's existing profile photo when available. The label, selection, focus and guest/error fallback icon remain.
5. Preview-only notice explains that this deployment uses live accounts/database and that Publish creates a real listing. Google/email callbacks may return to the live origin; existing password sign-in remains same-origin.

The You page layout, Find, messaging, map design, amenities/description fields and existing listing chooser were not redesigned.

## Background changes

- Guest text and photo bytes use a temporary device draft ID. Signed-in cloud ownership is assigned only after verifying a permanent account; no anonymous listing accounts or anonymous draft writes.
- Account saves stage immutable snapshots/photo manifests and advance the complete head only after verified upload/readback. Interrupted transfer retains local work and the previous complete account version.
- Owner-only revision checks, unique unit IDs and publication progress prevent stale overwrites and duplicate units. New tagged public-photo uploads check the current publishing attempt in both permission and final-insert guards. Existing untagged uploads are unaffected.
- Session refresh is coalesced and cannot restore a signed-out session or overwrite a newer account. Existing persistence/refresh behavior and server revocation/expiry remain; no Auth setting was relaxed.

## Applied backend record

Approved additive migration `20261011000329_private_account_listing_drafts` was applied to the existing Vacancy Supabase project on 2026-10-11 UTC. It adds two owner-private draft tables, the private `listing-draft-media` bucket (JPEG/PNG/WebP, 10 MiB/object), draft RPCs, and the narrow tagged-public-upload policy/trigger. No second database, subscription, auth configuration, cleanup job, or user-data copy.

Read-only postchecks verified table RLS, no anonymous table reads/direct client writes, owner predicates, private bucket, authenticated-only invoker RPC wrappers, fixed helper search paths, and enabled tagged guard. The advisor flags the authenticated-role read policies because it does not resolve their permanent-user helper; that live helper explicitly rejects anonymous users, also covered by the SQL tests. Pre-existing advisory warnings were not changed merely to silence them.

## Verification and limits

- 148 Node tests pass across the checked-in `.test.cjs` suites.
- 62 desktop/mobile browser cases pass against synthetic intercepted Auth/REST/Storage, including exact byte restoration on a clean second device and photo-upload retry without duplicate media.
- 48 real PostgreSQL/PGlite tests pass for owner isolation, immutable snapshots, CAS, publication/recovery, and tagged final-insert protection.
- Broad old-UI/auth/map regression suite: 86/86 pass after the draft-name restoration fix. The original database-security suite also passes 21/21 with the new migration included.
- No real test accounts, listings, or photos were created. Hosted Storage HTTP behavior, cross-device real account tests, email delivery/OAuth callback configuration, and network concurrency are still unverified. Local tests are not proof of the deployed Storage service's pipeline or timing.

The preview shares production Supabase. Signed-in testing saves real private account drafts; pressing final Publish creates a real listing. A separate hostname does not isolate its database.

## Visual records

All screenshots use synthetic data and test images, not private user information.

- [Live-baseline location](baseline-mobile-location.png)
- [Live-baseline listing details](baseline-mobile-details.png)
- [Candidate location](mobile-location.png)
- [Candidate listing details](mobile-details.png)
- [Candidate review](mobile-review.png)

## Photo-row correction, 2026-10-11

Preview feedback found that a fourth image entered the wide main-photo column on mobile and inflated the equal-height rows. The scoped CSS correction keeps the first-three composition, then places additional photos in equal small square rows (three across on mobile, four on desktop). Controls wrap within small tiles; the existing +N expansion uses a bottom strip so it remains clickable. Image ordering, main-photo choice, crop behavior, upload handlers, models and APIs are unchanged.

- Only application changes: scoped photo-grid CSS and its stylesheet cache version.
- Synthetic layout suite: 18 checks covering 3, 4, 5 and 8 photos at 320, 390, 430 and 1280px, plus main selection, reorder, removal and existing-photo edit layouts. No horizontal overflow or clipped controls; no real uploads.
- [Corrected mobile photo rows](photo-rows-mobile.png) · [Corrected desktop photo rows](photo-rows-desktop.png). Numbered colored shapes are synthetic fixtures.
- Before this correction: commit `afe4ead1845241a43308c053eadd6878b4150157`, deployment `dpl_5BY1aRTV7M31LxofBQhuSPUzK21D`, https://vacancy-cz0ncle4w-tbond24s-projects.vercel.app/ . It remains available for comparison/preview rollback.
- Production is still held for owner review. This correction adds no database, auth configuration, room-model or upload API changes.

## Show every selected photo, 2026-10-11

The picker now displays all selected images immediately, with no +N collapse/expand step. It keeps the same first-three composition and equal smaller rows. Main-photo selection, reorder, removal, image bytes, the eight-image cap, upload contracts and private account sync are unchanged. Only the picker renderer and its script cache version changed.

The updated synthetic photo suite passes 28 checks: empty/1/3/4/5/8 photos at 320/390/430/1280px, editing existing photos, main/reorder/removal, ninth-file rejection without data loss, and all eight images visible after durable guest draft restore. The current mobile eight-photo screenshot matches the previously recorded expanded screenshot byte-for-byte; no expansion click is now needed to reach it.

Preview rollback before this change: commit `5d73b72c44a7121e3dc8687c8b037dfaa60d4d2f`, deployment `dpl_DkwwYtStpwDBgmJ2sWeF2avRMYgH`, https://vacancy-gxg77goch-tbond24s-projects.vercel.app/ . The production baseline is still the separate rollback branch above; no production promotion is included.

Eight is an inherited app limit, not a bucket object-count limit. Early UI commit `465d1de` and canonical upload commit `f130e08` already use eight; neither records why that exact number was chosen. The current picker, create/edit/upload validators, device/account draft validators and applied draft SQL all encode it (including order 0–7). Bucket configuration instead limits each file's size/type. Raising the cap later needs coordinated validators, a new migration and old-client/restore tests; it was deliberately not raised in this display-only change.
