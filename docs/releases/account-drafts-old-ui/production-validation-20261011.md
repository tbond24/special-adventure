# Production release validation, 2026-10-11

The owner approved releasing the completed beta essentials and the two final integrity fixes. The source branch is `release/account-drafts-old-ui-20261011`. No accordion, house presets, cap increase, You-page rearrangement, branding change, or Auth callback/security setting change is included.

## Final fixes found during release testing

1. The existing edit journey briefly constructed a new-property form before switching to edit scope. That could import another draft's source, unit and account-draft identities. Edit scope is now established before restoration, and prefilling/restore finishes before editing or autosave is enabled. Drafts retain independent details and photo bytes.
2. A delayed edit response could paint over newer navigation. Edit initialization now checks its generation, exact route, account and connected form after asynchronous boundaries; stale results and errors are ignored. The account check also compares the current stored session subject, covering another tab switching accounts before any form exists.
3. After removing a middle photo from eight, the old upload client legitimately appends at a position above seven. The new draft gateway previously rejected that position. The edit-only validation now accepts nonnegative positions within the existing `integer` column while keeping new-listing slots 0–7 and the eight-active-photo check. A room lock serializes participating edit-draft link operations before their count/insert. Existing direct-media clients remain outside this lock protocol; no universal historical direct-write cap is claimed.

## Applied compatibility migration

- `20261011043314_listing_draft_edit_photo_order_compatibility`
- SQL SHA-256: `9fbe521a0c9a9b8b3f65c7ca75b0865d712d05294e51f7fba449687719d2a9fb`
- Verified live function-body MD5: `f87f8fef35da1745c746cd310acdf281`
- Replaces only `public.listing_draft_publish_action` with the reviewed validator and edit-room lock.
- Read-only postchecks confirm authenticated-only execution, SECURITY INVOKER, empty search path, unchanged ACL, owner-private tables with RLS and no anonymous reads/direct client writes, unchanged private photo bucket and enabled final-upload guard.
- Live metadata confirms READ COMMITTED. The local PostgreSQL test runtime is single-connection: actual two-connection lock contention is not claimed as exercised.

The earlier private draft migration remains `20261011000329_private_account_listing_drafts`. No users, listings, photos or private drafts were created for hosted QA.

## Verification

Passed on the final application source:

- 282 broad old-UI/auth/map browser cases, zero failures/skips/flaky
- 28 photo-layout/browser cases at 320/390/430/1280px
- 148 Node tests
- 62 account-draft browser cases, desktop/mobile
- 14 dedicated interrupted-edit/account-switch browser cases, desktop/mobile
- 64 draft SQL checks (including 16 edit compatibility/catalog tests)
- 21 original database-security checks with migration replay

The final broad run completed with frozen app and fixture hashes. The 16 formerly failing legacy cases are included in the broad 282, not an extra count. The earlier scoped 86-case run overlaps this broad suite and is not an extra count. All destructive/publication tests run against isolated synthetic services or local PostgreSQL, never the production database.

The legacy test fixtures were aligned with the current verified-account contract: valid synthetic UUIDs, sessions and intercepted Auth/REST/Storage. Production verification checks were not bypassed. The original error/retry/persistence assertions remain, with stronger independent draft/head/byte checks.

## Rollback

Restore deployment `dpl_7TN3YwefKaN78LPohxL56JN5UDob`, from exact commit `fe928e9077e4a1c9f3809ea75287c7a5ca148b2a` on `rollback/pre-listing-accordion-20261011`. Its immutable URL is https://vacancy-6thaksbn8-tbond24s-projects.vercel.app .

Retain both additive draft migrations, existing draft records, manifests, private media and all upload fences. The compatible function can remain with the old frontend. Reverting its ordering rule would reintroduce the edit failure; dropping draft data or disabling guards is not an ordinary frontend rollback.

## Limits

No real authenticated account, OAuth/email delivery, cross-device hosted Storage upload/restore, final public Publish, or simultaneous hosted Storage timing was exercised. Synthetic browser tests validate client behavior and request contracts; local SQL validates actual function/RLS logic. Neither proves every deployed service interaction. Production checks are read-only boot, route, asset and API checks. A fresh production-target build uses the existing production environment settings; a preview build is not simply reassigned to the live domain. The deployment receipt is appended after verification.
