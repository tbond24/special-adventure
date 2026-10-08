# October 8 scoped data repair ledger

Baseline: `edb5b8a30af985d4d392e3fbb5913ab45d701370`. Local candidate only; no live migration, permission change, account mutation, push or deployment performed by this work.

## Feature decisions and evidence

| Feature | Aim and ranked options | Chosen repair | Targeted evidence and failure/fix loop |
|---|---|---|---|
| Conversation membership | Prevent membership reassignment; column privilege allowlist, trigger, UI-only guard | Grant clients UPDATE(last_read_at) only; retain self RLS | Real authenticated-role SQL allows own read marker, denies conversation_id/user_id/joined_at changes and foreign history |
| Media ownership | Bind metadata to owned parent and object; actual object ownership, restrictive filename convention, client checks | Private checked helper + INSERT/UPDATE policies; owns exactly one room/property and room-media object; existing paths remain valid | SQL allows owned legacy room/property paths and reorder/hide; denies foreign parent/object and absent object/owner |
| Profile trusted flags | Prevent self-verification/self-unsuspension; actual caller allowlist, generic editable list, UI-only hiding | UPDATE(display_name,avatar_path) only | Audited all frontend writes: profile edit, Google initialization, avatar upload. SQL denies phone_verified/account_status/id/timestamps and undeclared bio writes. No current bio writer exists |
| Messaging bypass | Require checked send path; revoke direct INSERT, copy RPC checks into RLS, frontend checks | Remove direct INSERT; preserve authenticated EXECUTE on private helpers required by public INVOKER wrappers | SQL direct forged-message/media-path insert denied; valid RPC works; foreign member, bilateral block, suspended/missing profile denied; guest hourly limit preserved |
| New enquiry availability | Reject new enquiries on unavailable inventory without destroying conversations | Check active status, expiry and active owner only before new conversation creation; existing conversations use normal send checks | SQL expired/paused new enquiries fail, null-expiry active and active guests work; existing paused/expired conversations continue |
| Privileged account guards | Keep suspension effective through existing definers | Add active check in is_admin, conversation_peer_summary, set_contact_preferences, set_property_manager_nickname; retain AAL2/membership/permanent-account checks | SQL ordinary/AAL2/suspended admin matrix, owner/foreign nickname, guest contact, suspended helper cases |
| Private-name clear | Explicit blank removes optional label, omitted preserves | Owner DELETE policy + active/permanent write guard; client DELETE on explicit blank | SQL/JS blank clear, omitted preservation, owner/foreign access; empty string is never inserted into NOT NULL/nonblank table |
| Atomic database edit | Avoid partial field edits; existing-RPC transaction wrapper, compensating frontend writes, new framework | Single SECURITY INVOKER update_listing_atomic wraps existing property/unit/vacancy/override/details/label/map writes | SQL success and late-map-error rollback; exact large money; zero coordinates; shared property change remains shared, sibling unit details/private name unchanged |
| Photo retry | Avoid duplicate photos after partial upload, reselection/reorder or lost response | Stable edit namespace, per-file SHA256 identity, authoritative media rereads, successful-file reconciliation, partial unique active room/path index | JS six-existing+A/B partial failure, reorder/reselect, changed bytes, lost insert response, failed immediate confirmation then successful final read. Browser verifies seven persisted tiles and only B pending after A succeeds |
| Existing-listing duplicate | Preserve structured options and private name without copying photos | Dispatch existing bubbling options event; synthesize legacy true amenities when structured keys absent, preserve false/unknown scalars | Desktop/mobile full-module duplicate tests cover structured and legacy fixtures. Initial direct call to a nested helper failed browser/reviewer scope check; replaced with existing event |
| Logout truthfulness | Surface server logout errors while always removing local session | Parse HTTP response; shared UI handlers cover all Account callbacks; recovery awaits/catches and shows local-only warning | JS HTTP503 and204 cases; combined UI regressions cover actual HTTP503/network errors |
| Account deletion | Prevent destructive partial deletion before an approved retention/cleanup contract | Separate fail-closed endpoint candidate, not included pending user decision | Candidate-only three tests prove authenticated request returns503 before service-role/storage access, unauthenticated401, method405/CORS200. Full deletion completion is not repaired/claimed |

## Local verification

- All 65 checked-in migrations replayed, then 20 SQL subtests plus parent test passed (21 total), using PostgreSQL18.3 in pinned PGlite0.5.8.
- Supabase auth/storage platform tables/functions and default grants are explicit test fixtures. All application functions, policies, grants and migrations are real. Only the pgcrypto extension installation is omitted because gen_random_uuid is built into the engine. Historical migration's documented synthetic admin is seeded to satisfy its FK.
- Live server metadata reports PostgreSQL17.6. This version difference is a qualification; provider/Auth/Storage network behavior is not established by PGlite.
- Live read-only metadata: no inherited roles for anon/authenticated; target column ACLs null with broad table grants; changed helpers owned by postgres. Existing wrapper/helper grants match replay assumptions.
- Read-only aggregate preflight: 69 room-media objects; zero owner-only legacy objects and zero missing-both-owner objects; zero duplicate active room/path groups; zero rooms above8. No object paths or user records were read.
- Caller tests: `node --test tests/oct08-data-callers.test.cjs` (10 passed).
- SQL tests: `npm ci --prefix qa/data-repairs && npm test --prefix qa/data-repairs`. An externally installed module can instead be selected using PGLITE_MODULE.
- Browser: `tests/oct08-data-journey.spec.js` (10 passed, five cases on desktop/mobile), using the actual app modules and synthetic backend responses; no live writes.
- Syntax checks passed for all changed JS. Combined release regression/hosted gates belong to integration and must rerun after merging.

## Exact live change packet

Apply only after per-action approval and independent review:
`supabase/migrations/20261008183244_scoped_data_ownership_and_atomic_edit.sql`.

The packet revokes broad membership/profile UPDATE and message INSERT, grants only the audited columns, replaces media write policies, adds the ownership helper, updates the six existing account/messaging helpers, grants owner private-name deletion with permanent/active restrictions, adds the INVOKER atomic edit RPC, and creates a partial unique index on active room/path links. No existing data is rewritten and the already-present money precision migration is not duplicated.

Repeat the duplicate active room/path aggregate immediately before apply. If conflicts appear, fail safely; do not remove/deduplicate user records automatically. Vercel frontend deployment does not apply this migration or deploy a Supabase Edge Function. Migration must precede the frontend that calls update_listing_atomic. Old compatible callers remain available.

## Explicit limits

- Database fields are atomic; Storage and Auth are separate services and are not claimed to roll back atomically.
- The eight-photo check uses current server count for this edit/upload flow. A strict concurrent multi-tab eight-photo cap is not added/proven. The unique active-link constraint does protect same-object retry races.
- Existing shared-property edit semantics are preserved. Editing property/location defaults may affect sibling units; their own unit details, overrides and private labels remain local.
- No changes to moderation audit retention/FKs, irreversible account deletion strategy, OAuth/session architecture, or unrelated public UI.
- The deletion guard remains a separate candidate until the user's release choice is confirmed.
