# Vacancy MVP QA Campaign

## Goal
Prove Vacancy is a reliable working rental marketplace for the critical MVP loop with minimum avoidable bugs. This campaign prioritises renter discovery, lister supply, privacy, messaging, lifecycle correctness, and failure recovery. It deliberately excludes reviews, monetisation, advanced KYC, and other post-MVP features.

## Evidence rule
Source-code presence is not runtime proof. A flow is PASS only when exercised through browser/API/runtime evidence at the appropriate layer.

## Personas / scenarios

### Anonymous renter
- app boots with no console/page errors
- can switch market
- can search by area/landmark
- filters work
- map/card sync works
- location permission accepted path
- location permission denied path
- radius excludes listings without public coordinates
- empty results offers safe radius expansion
- detail loads
- Save / Enquire redirect to authentication
- report/block require authentication
- no private exact address is exposed

### First-time renter
- public signup request works
- confirmation email arrives
- confirmation yields usable session
- sign out and password sign-in work
- save / unsave works
- enquiry can be sent
- conversation appears
- message can be sent and read
- account deletion succeeds

### First-time lister
- signup + confirmation + sign-in work
- new property cannot publish before approximate public pin is chosen
- exact address stays private
- valid property + unit can publish
- image validation occurs before listing creation
- uploaded photos are visible publicly
- listing appears in correct market/map/search
- edit succeeds within server constraints
- invalid client values are blocked before server call where practical
- availability reconfirm works only for active listing
- pause / reactivate works
- mark filled removes listing from public discovery

### Multi-unit landlord
- existing property can be reused
- inherited property facts are shown clearly
- second unit inherits public location/property facts
- unit overrides do not mutate siblings
- property grouping remains understandable

### Messaging users
- renter cannot enquire on own vacancy
- renter and lister both see the same conversation
- messages preserve sender ordering
- blocked users cannot continue messaging
- unread/read behavior to be assessed for later lead-management stage

### Failure/recovery
- boot/API failure presents retry UI
- missing public pin never creates listing
- map-pin save failure must not leave a publicly active unmappable listing
- selected invalid image count/type/size blocks before listing creation
- upload network/storage failure behavior is documented and recoverable
- duplicate/repeated actions do not create unintended duplicate data
- filled listing cannot be reactivated by the reconfirm action

### Non-admin user
- admin capability is not granted by UI visibility
- admin endpoints/RLS reject unauthorised access

### Admin
- overview is restricted to authorised admins
- can inspect reports/listings
- deactivation hides listing publicly

### Account/privacy
- anonymous exact-location query returns zero rows
- private exact locations remain owner-only
- inactive listing metadata/media remains hidden as intended
- account deletion removes associated user data according to cascade rules

## Current confirmed findings

1. Production Vercel runtime errors: none found in 7-day error clusters.
2. Historical `boot_load_failed`: 13 occurrences, all from 2026-09-06 before the latest production-green release; no later entries found during audit.
3. Fixed in MVP hardening candidate: new listing pin is validated before create RPC.
4. Fixed in MVP hardening candidate: image count/type/size is validated before create RPC.
5. Fixed in MVP hardening candidate: radius search excludes listings with unknown public coordinates.
6. Fixed in MVP hardening candidate: edit max occupants now matches DB limit 1–4.
7. Fixed in MVP hardening candidate: `Still available` / reconfirm is shown only for active listings, avoiding accidental reactivation of filled/paused listings.
8. Stage 2A blocker: production signup email delivery currently reaches Supabase email sending but has hit `over_email_send_rate_limit`; custom SMTP remains required for dependable public auth.

## Open core-MVP questions to prove with authenticated QA
- real confirmation-email delivery
- real lister publish + media upload
- storage failure/retry UX
- actual public listing visibility immediately after publish
- save/enquiry/message two-user loop
- block enforcement in live browser sessions
- edit/reconfirm/pause/reactivate/fill lifecycle
- cleanup/account deletion

## Stop/go rule
Do not call MVP fully functioning until:
- anonymous/current release gate is green,
- MVP hardening targeted tests are green,
- production auth email delivery is dependable,
- two-user authenticated marketplace loop is green,
- privacy/security invariants are rechecked after fixes.
