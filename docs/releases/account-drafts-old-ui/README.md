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
