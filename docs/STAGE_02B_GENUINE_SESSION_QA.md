# Stage 2B — Genuine-session marketplace QA

## Goal
Prove the launch-critical Vacancy marketplace loop with two independent, genuine Supabase Auth/JWT browser sessions without writing QA data to production.

## Dependency decision
The preferred hosted Supabase development branch was unavailable because the current plan does not support branching. Production test accounts were also a poor primary option because production auth-email delivery is still rate-limited. The chosen fallback was therefore an isolated local Supabase stack in GitHub Actions.

## Options considered

1. **Production test users**
   - Pros: closest possible environment.
   - Cons: production pollution/cleanup risk; production confirmation email is currently unreliable.
   - Rank: 3.

2. **Hosted Supabase development branch**
   - Pros: closest isolated hosted environment.
   - Cons: unavailable on current plan.
   - Rank: 2 if plan later permits.

3. **Local Supabase in CI — chosen**
   - Pros: real Auth/JWT, Postgres, RLS and Storage; disposable; repeatable; no production writes; no extra Supabase plan cost.
   - Cons: QA contract must be kept aligned with production.
   - Rank: 1 under current constraints.

## Acceptance scope
The genuine-session gate proves:
- real local Auth users and sessions
- UI sign-in through Vacancy
- first property + unit publication
- real Leaflet public-pin selection
- real image upload into Storage + `media`
- anonymous/public discovery
- renter save
- structured enquiry
- landlord receives enquiry
- landlord reply automatically appears for renter
- landlord edit
- landlord reconfirm
- user block prevents subsequent message server-side
- landlord marks listing filled
- renter Find no longer shows filled listing
- second sibling unit can be added under the same property

## Iterative failures and fixes

### Failure 1 — map click did not populate public coordinates
**Evidence:** both scenarios failed before a listing write because the hidden public latitude remained empty.

**Diagnosis:** the test used a page-level physical mouse coordinate based on an element bounding box that could be outside the viewport. This was a test harness issue; the Leaflet picker listens correctly to a map click.

**Fix options:**
1. click Leaflet map element with locator-relative coordinates — chosen;
2. fire Leaflet's internal event programmatically — diagnostic only;
3. set hidden lat/lon directly — rejected because it bypasses the interaction.

**Result:** real map-pointer path passed and tests progressed.

### Failure 2 — renter Inbox remained stale after landlord reply
**Evidence:** real auth, publication, image upload, discovery, save, enquiry, landlord Inbox and landlord reply all passed; renter's already-open Inbox did not show the reply.

**Diagnosis:** `renderMessages()` fetched only when the route rendered. There was no polling, realtime subscription, focus refresh or refresh control. This was a real MVP freshness defect.

**Fix options:**
1. lightweight change-detection polling only while Inbox is open — chosen;
2. Supabase Realtime — valid later but unnecessary moving parts for current MVP;
3. manual Refresh only — rejected as normal chat would still feel broken.

**Implementation:** `app/src/messages-refresh.js` polls at a modest interval only while Inbox is active, compares message signatures, re-renders only on change, preserves typed drafts/focus and checks again on window focus.

**Regression:** standard hardening remained green.

### Failure 3 — filled listing remained visible in renter's Find view
**Evidence:** server-side fill succeeded, but the renter's browser rendered the stale in-memory `vacancies` array when returning to Find.

**Diagnosis:** database/RLS was correct; discovery inventory was not refreshed on route re-entry.

**Fix options:**
1. refresh active inventory when entering Find — chosen;
2. continuously poll discovery — rejected as unnecessary load;
3. require manual reload — rejected because stale filled inventory violates Vacancy's core promise.

**Implementation:** `app/src/inventory-refresh.js` refreshes active vacancies on Find entry and browser focus, keeps the last known inventory only if refresh temporarily fails, and avoids continuous polling.

## Final evidence
- Standard MVP hardening on latest candidate: **PASS** (syntax + production-equivalence + targeted hardening tests).
- Genuine-session CI run: `34080544606`.
- Genuine marketplace browser step: **PASS**.
- Tested with isolated local Supabase Auth/Postgres/RLS/Storage.
- Production database: untouched by this QA environment.

## Result
**Stage 2B: PASS.**

Remaining independent production gate: Stage 2A, reliable production signup/email confirmation using custom transactional email. Stage 2B does not claim that production email delivery is solved.
