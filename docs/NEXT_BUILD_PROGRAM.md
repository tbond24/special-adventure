# Vacancy — Next Build Program

## Purpose

This program continues from the production-green G7 baseline. It deliberately prioritises dependencies and runtime proof over feature count.

Production baseline:
- Live: https://vacancy-nine.vercel.app
- Production release commit: `de6b9da8066f18ed7aa6d851a164df77d27115a1`
- Rollback branch: `rollback/vacancy-g7-production-green`
- Current production browser gate: 20/20 desktop/mobile checks

## Build method for every stage

```text
Define scope + acceptance criteria
-> list at least 3 implementation approaches
-> rank approaches by correctness, value, simplicity, reversibility, and fit
-> choose the smallest approach that meets the goal
-> implement only that stage
-> run stage tests
-> run regression tests
-> if failure: diagnose root cause
-> generate possible fixes
-> rank fixes
-> apply smallest safe fix
-> rerun
-> checkpoint
-> document decision + evidence
```

A source-code presence check never counts as runtime proof.

---

# Dependency-ranked order

## 1. Foundation: consolidate source + canonical database baseline

### Why first
Every later feature becomes harder and riskier while production behaviour is split across `app-1.js` through patch files and the complete live database migration history is not represented in Git. This is a prerequisite for safe laptop development, reliable rollback, and future schema changes.

### Scope
- Consolidate the current production frontend into coherent source modules without changing behaviour.
- Preserve the exact live release as a rollback artifact.
- Add a canonical SQL schema baseline that describes the current live Supabase public schema, relevant constraints, functions/RPC contracts, RLS/policies, and storage assumptions.
- Keep secrets out of Git.
- Add a repeatable build/release manifest.

### Aim
Make the repository understandable and reproducible while producing **zero intended product change**.

### Acceptance
- Existing 20/20 browser release gate still passes.
- Existing public/private security invariants still pass.
- New source has one canonical implementation for each behaviour instead of stacked function overrides.
- Schema baseline can be inspected from Git without guessing production shape.
- Production remains untouched until equivalence is proven.

### Options

#### Option A — Full framework rewrite
Move immediately to Next.js/React/TypeScript and recreate the app.

Pros:
- Clean modern structure.
- Better long-term component model.
- Easier future native/API integration.

Cons:
- Highest regression risk.
- Rebuilds working behaviour before product-market evidence requires it.
- Large testing surface and likely scope drift.

Value: high long term, poor immediate risk/value.

#### Option B — Consolidate existing static app into domain modules
Keep vanilla JS/CSS and split current behaviour into modules such as `market`, `explore`, `listings`, `messaging`, `auth`, `backend`, and `app`.

Pros:
- Smallest migration.
- Preserves proven runtime behaviour.
- Easy diff against current release.
- No framework tax.

Cons:
- Vanilla JS remains less structured than a typed framework.
- Some global-state cleanup remains for later.

Value: highest immediate safety and maintainability gain.

#### Option C — Leave production chunks and only add documentation
Pros:
- Nearly zero risk.
- Fast.

Cons:
- Does not remove the real technical debt.
- Every later feature continues to depend on overrides and script order.

Value: too little.

### Ranking
1. **Option B — chosen**
2. Option C
3. Option A

Reason: B solves the actual problem without rewriting a working MVP.

---

## 2. Full authenticated marketplace loop

### Why second
Before improving forms or adding trust/reviews, we need proof that two real accounts can complete the whole core transaction loop. Otherwise we risk polishing workflows that contain hidden runtime failures.

### Scope
Controlled test users and disposable test data prove:
- signup / signin
- lister creates property
- chooses approximate public map pin while exact address stays private
- uploads images
- publishes vacancy
- renter discovers it
- renter saves it
- renter enquires
- lister receives enquiry
- both exchange messages
- lister edits/reconfirms listing
- lister marks filled
- filled listing disappears publicly
- cleanup removes test records safely

### Aim
Prove the MVP works end-to-end between two independent actors without manual intervention.

### Options

#### Option A — Manual checklist only
Pros: closest to human use, cheap to start.
Cons: inconsistent, slow, hard to repeat, poor regression protection.

#### Option B — Playwright with dedicated test accounts and deterministic cleanup
Pros: repeatable; real browser behaviour; catches integration failures; becomes permanent release gate.
Cons: requires careful test-data isolation and account handling.

#### Option C — API-only integration tests
Pros: fast, deterministic, easy cleanup.
Cons: misses UI/auth/browser failures; insufficient as user proof.

### Ranking
1. **Option B — chosen**, with API cleanup helpers where safe
2. Option C as supporting tests
3. Option A as occasional exploratory QA

---

## 3. Listing creation and media workflow

### Why third
Marketplace supply is the next bottleneck. Discovery is ahead of listing UX. We should improve the lister path only after Stage 2 reveals the real friction/failures.

### Scope
- progressive listing flow
- property reuse
- unit-specific facts vs property facts
- approximate public pin selection
- exact private address explanation
- image upload / cover / reorder / remove
- draft/preview before publish
- completeness validation
- safe editing after publication

### Aim
A first-time landlord should be able to publish a trustworthy, complete listing without understanding the database model.

### Options

#### Option A — One long form with better grouping
Pros: simplest; minimal code.
Cons: still cognitively heavy; weak mobile experience; easy to miss fields.

#### Option B — Small staged wizard using current domain model
Suggested steps: Property -> Unit -> Rent/availability -> Photos -> Preview/publish.
Pros: clear; mobile friendly; maps directly to parent/child model; supports validation per step.
Cons: slightly more state handling.

#### Option C — Highly dynamic form builder driven by schema/attribute definitions
Pros: maximum configurability.
Cons: major overengineering now; harder testing; little current evidence of need.

### Ranking
1. **Option B — chosen**
2. Option A
3. Option C

---

## 4. Visible trust layer

### Why fourth
Trust is central to Vacancy's differentiation, but identity verification before the core listing workflow is proven would be premature. Trust should begin with evidence we already possess.

### Scope
Expose and strengthen:
- email verified
- phone verified when available
- member since
- listing confirmed/reconfirmed timestamp
- freshness state
- response indicator based on real conversation data
- report/block controls
- clear distinction between approximate public map location and private exact address

Do not yet build document/KYC verification unless evidence shows it is necessary.

### Aim
Help renters answer: “Is this listing current, is the person reachable, and are there safety signals?”

### Options

#### Option A — Full KYC / document verification system
Pros: strong identity evidence.
Cons: privacy, storage, moderation, legal and operational burden; too early.

#### Option B — Evidence-based trust badges from existing system signals
Pros: low complexity; immediately useful; hard to fake when derived server-side; aligns with freshness thesis.
Cons: not equivalent to identity verification.

#### Option C — Free-form landlord self-declared badges
Pros: easy.
Cons: weak trust, easily gamed, potentially misleading.

### Ranking
1. **Option B — chosen**
2. Option A later if required
3. Option C rejected for primary trust claims

---

## 5. Lead / enquiry management + lightweight notifications

### Why fifth
Messaging exists, but landlords need to manage renter demand. Trust metrics such as response rate also depend on this layer.

### Scope
Conversation/enquiry states:
- New
- Replied
- Viewing arranged
- Not suitable
- Filled/converted
- Archived

Also:
- unread count
- last-message timestamp
- simple inbox filters
- email notification only for important new enquiry/message events if available without adding a large notification platform

### Aim
Turn Inbox from raw chat into a workable landlord lead queue.

### Options

#### Option A — Add status fields to current conversations and a simple filtered inbox
Pros: minimal schema change; reuses messaging; directly useful.
Cons: limited automation.

#### Option B — Separate CRM/lead table with activity timeline, assignments, tasks, pipelines
Pros: powerful for agencies.
Cons: overbuilt for current stage; duplicates conversation state.

#### Option C — Keep chat only and use labels in frontend local state
Pros: no schema change.
Cons: unreliable across devices/accounts; unsuitable for real workflow.

### Ranking
1. **Option A — chosen**
2. Option B only if agent/team usage appears
3. Option C rejected

---

## 6. Reviews with eligibility and moderation

### Why sixth
Reviews without transaction/enquiry evidence are easy to abuse. Stage 5 provides the relationship/status signals needed to define who is eligible to review.

### Scope
- reviews table
- rating + text
- reviewer + listing/property/lister association
- eligibility based on a legitimate interaction state
- one review per eligible relationship
- moderation/report status
- owner response can be deferred

### Aim
Create useful reputation without enabling anonymous drive-by reviews.

### Options

#### Option A — Anyone signed in can review any listing
Pros: easiest growth of review count.
Cons: spam/abuse; poor trust quality.

#### Option B — Review allowed after qualified enquiry/viewing/filled interaction
Pros: much higher signal; aligns with existing workflow; manageable moderation.
Cons: slower review volume.

#### Option C — Reviews only after on-platform payment/lease
Pros: strongest verification.
Cons: Vacancy does not yet transact leases/payments; blocks reviews entirely.

### Ranking
1. **Option B — chosen**
2. Option C later if transactions are added
3. Option A rejected

---

## 7. Analytics + ranking primitives

### Why seventh
Monetisation and boosts require observable outcomes and a predictable baseline ranking. Charging for promotion before measuring impressions/clicks/enquiries would be irresponsible and hard to optimise.

### Scope
- provider-level listing views/saves/enquiries
- basic conversion funnel
- admin aggregate health metrics
- transparent organic ranking inputs: geographic relevance, availability/freshness, completeness, response behaviour
- no opaque AI ranking

### Aim
Make performance measurable and create a fair organic baseline before paid visibility.

### Options

#### Option A — Full analytics warehouse / BI stack
Pros: scalable analysis.
Cons: unnecessary cost/complexity now.

#### Option B — Extend current `analytics_events` into a small server-derived dashboard
Pros: existing plumbing; enough for decisions; low complexity.
Cons: less flexible for advanced cohorts.

#### Option C — Third-party product analytics only
Pros: quick dashboards.
Cons: dependency/privacy concerns; doesn't directly enforce ranking logic.

### Ranking
1. **Option B — chosen**
2. Option C may supplement later
3. Option A later at scale

---

## 8. Monetisation: boost/featured + simple agent plan

### Why eighth
Paid visibility only makes sense after listings work, trust exists, leads are manageable, reviews have rules, and we can measure organic/paid outcomes.

### Scope
Initial monetisation should be narrow:
- free standard listing
- time-limited boost
- featured placement with explicit label
- simple agent/landlord plan only if multi-property usage justifies it
- entitlement enforcement server-side

Payments provider implementation is a separate decision and should follow jurisdiction/compliance review.

### Aim
Test willingness to pay without turning the marketplace into pay-to-win search.

### Options

#### Option A — Complex subscription tiers and entitlement matrix immediately
Pros: flexible revenue model.
Cons: high complexity before demand evidence.

#### Option B — One-off boost/featured product plus one simple multi-property plan
Pros: easy to understand; easy to measure; minimal entitlement logic.
Cons: fewer pricing experiments initially.

#### Option C — Advertising model instead of landlord monetisation
Pros: no landlord payment friction.
Cons: harms renter UX and does not align incentives as well.

### Ranking
1. **Option B — chosen**
2. Option A after evidence
3. Option C not recommended for core monetisation

---

# Counter-check after ordering

The order above was reviewed for hidden prerequisites.

## Dependency checks

- Reviews require an interaction eligibility signal -> therefore lead states precede reviews.
- Trust response metrics require conversation behaviour -> authenticated loop precedes trust, and lead management strengthens it later.
- Listing UX should not be redesigned before the current authenticated loop is proven -> E2E precedes UX work.
- Monetisation requires measurable organic outcomes and ranking -> analytics/ranking precede monetisation.
- Any new schema work requires a canonical production baseline -> source/database foundation remains first.
- Notifications are useful but not a standalone platform requirement -> included narrowly inside lead management.
- Multi-provider business hierarchy from the original generic marketplace is not a prerequisite for the housing MVP -> defer until actual agent/team use appears.
- Temporary locations/service-duration/service catalogue features were part of the earlier generic marketplace concept but are no longer core to Vacancy's rental-market direction -> explicitly deferred.
- Full KYC/document verification is not a prerequisite for basic trust -> start with server-derived trust signals.
- Native mobile app is not a prerequisite -> continue responsive web until usage proves need.

## Final priority order

1. Source consolidation + DB baseline
2. Full authenticated marketplace E2E
3. Listing creation/media UX
4. Visible trust layer
5. Lead/enquiry management + lightweight notifications
6. Eligible reviews
7. Analytics + organic ranking primitives
8. Monetisation

No stage should be promoted merely because code was written. Each stage receives its own acceptance tests and checkpoint.