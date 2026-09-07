# Stage 2B — Core Marketplace QA

## Purpose
Prove the current Vacancy MVP core loop as deeply as possible without polluting production or weakening authentication.

## Isolated Supabase branch attempt
The user explicitly approved the quoted Supabase branch cost of $0.01344/hour. Supabase then rejected branch creation with `PaymentRequiredException: Branching is supported only on the Pro plan or above`.

Result: no QA branch was created and no branch cost was incurred.

## Chosen fallback
Use two complementary test layers:

1. Browser hardening tests against the canonical development frontend.
2. A single-transaction rollback-only RLS/RPC simulation against the real production schema using two existing fixture identities. The transaction ends with `ROLLBACK`; no QA rows remain.

This does not replace Stage 2A production email-confirmation proof. It proves the downstream marketplace/database loop independently of that external email-delivery dependency.

## Browser hardening result
Existing production-equivalence suite:
- 18 general product/security checks PASS
- 2 map pointer/keyboard checks PASS

New targeted MVP hardening suite:
- 10/10 PASS

Combined frontend/runtime result: **30/30 PASS**.

### Bugs found and fixed
1. New-property publish could create DB state before checking for a public map pin. Fixed: missing pin now stops before `createListing()`.
2. Radius filtering allowed listings with missing public coordinates. Fixed: once radius mode is active, coordinate-less listings are excluded.
3. Edit form allowed up to 8 occupants while the DB accepts 1–4. Fixed: UI max is 4.
4. `Still available` was shown for paused/filled inventory and `reconfirm_vacancy()` reactivates status. Fixed: only active vacancies expose reconfirm.
5. Unit photo upload inserted both `property_id` and `room_id`, violating the media exactly-one-parent constraint. Fixed: unit photos now attach by `room_id` only.
6. Blocked Stage 2 auth probe was running on every branch push. Fixed: probe is manual-only until auth email delivery is configured.

## Production-schema rollback simulation
A rollback-only transaction exercised the real production RLS/RPC behavior with two fixture identities.

Assertions:
- owner can create vacancy: PASS
- owner can read private exact address: PASS
- renter can discover active vacancy: PASS
- renter cannot read private exact address: PASS
- renter can save vacancy: PASS
- renter can start enquiry: PASS
- renter can send message: PASS
- owner can see conversation: PASS
- owner can reply: PASS
- blocking prevents further message: PASS (`conversation unavailable`)
- owner can mark vacancy filled: PASS
- filled vacancy disappears from public read: PASS

Result: **12/12 PASS**.

Post-test residue check:
- QA properties: 0
- QA rooms: 0
- QA messages: 0

## Remaining launch blocker
Stage 2A remains open: production Auth email delivery currently relies on Supabase's built-in sender and hit `429 over_email_send_rate_limit`. Public signup/email-confirmation cannot be called production-ready until custom SMTP or another reliable production email path is configured and tested.

## What is NOT being built yet
Reviews, monetisation, advanced KYC, business/team accounts, complex ranking, temporary locations, and other post-MVP systems remain deferred. They are not prerequisites for the current launch goal.
