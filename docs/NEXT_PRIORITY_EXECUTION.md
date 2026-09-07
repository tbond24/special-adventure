# Vacancy — Next Priority Execution Program

This program starts from `checkpoint/mvp-hardening-qa-pass` and uses the same iterative method for every stage:

`scope -> acceptance -> 3+ options -> rank -> choose -> build -> test -> diagnose -> rank fixes -> retry -> regression -> checkpoint -> document`

Source presence never counts as runtime proof.

## Priority 1 — Genuine-session core marketplace QA

### Aim
Prove two independent authenticated users can complete the core renter/lister marketplace loop using real Supabase sessions, RLS and Storage without touching production data.

### Scope
- real Auth signup in isolated QA environment
- UI sign-in
- new property + unit + approximate public pin
- real image upload
- public discovery
- save
- enquiry
- two-way messaging
- edit + reconfirm
- block enforcement
- mark filled + public disappearance
- second sibling unit under same property

### Options
1. Production test users against live Supabase.
   - Pros: closest to production.
   - Cons: production pollution, email delivery currently rate-limited, cleanup risk.
2. Supabase cloud development branch.
   - Pros: closest isolated hosted environment.
   - Cons: Pro-only on current account; unavailable.
3. Local Supabase stack in CI.
   - Pros: isolated, real Auth/JWT/RLS/Storage, repeatable, no production writes, no extra plan cost.
   - Cons: QA schema must be maintained against production contract.

### Ranking
1. Local Supabase CI — chosen.
2. Cloud branch — preferred later if plan permits.
3. Production test users — reserve only for final smoke test after email delivery is fixed.

### Acceptance
- two real JWT-backed browser contexts
- lister publishes with image and pin
- renter discovers/saves/enquires
- both message
- owner edits/reconfirms
- block stops messages
- fill hides listing publicly
- sibling unit creation works
- production untouched

## Priority 2 — Production signup/email delivery

### Aim
Make ordinary public account creation reliable in production.

### Scope
- confirmation email delivery
- email ownership verification
- sign-in after confirmation
- password safety path remains through `secure-signup`
- self-delete remains functional

### Options
1. Custom SMTP with Resend on a Vacancy-controlled domain/subdomain.
   - Pros: reliable transactional delivery, reusable for future enquiry notifications, good observability.
   - Cons: requires domain + provider connection.
2. Another reputable custom SMTP provider (SES/Postmark/SendGrid).
   - Pros: same architectural result.
   - Cons: still requires domain/provider setup; often more configuration.
3. Disable email confirmations/use built-in sender only.
   - Pros: fastest apparent path.
   - Cons: weaker identity signal or unreliable rate-limited delivery; rejected for public launch.

### Ranking
1. Resend/custom SMTP — chosen architecture.
2. Equivalent reputable SMTP provider.
3. Built-in sender / disabled confirmation — rejected as launch solution.

### Acceptance
- fresh real public signup requests confirmation successfully
- confirmation produces usable account/session path
- sign-out/sign-in works
- no service-role secret in browser/Git
- `secure-signup` HIBP behavior preserved

## Priority 3 — Hardened Vercel preview

### Aim
Deploy the exact hardened frontend candidate to an isolated preview without moving production.

### Options
1. Explicit immutable static artifact deployment.
   - Pros: deterministic; exact tested bytes; easy rollback.
   - Cons: manual release packaging.
2. Automatic Git integration build.
   - Pros: convenient.
   - Cons: can rebuild or infer wrong root/source; less deterministic for this static app.
3. Framework/rebuild migration before preview.
   - Pros: cleaner future tooling.
   - Cons: unnecessary regression surface; rejected now.

### Ranking
1. Explicit immutable artifact — chosen.
2. Git integration later after repository cleanup.
3. Framework rewrite — deferred.

### Acceptance
- preview serves exact candidate
- artifact markers/hashes verified
- production alias untouched

## Priority 4 — Adversarial persona QA on preview

### Aim
Act like different users and intentionally find edge cases before promotion.

### Scope/personas
- anonymous renter
- renter with denied location
- renter with no results / radius expansion
- cross-market renter
- authenticated renter
- first-time lister
- multi-unit landlord
- media failure/retry
- paused/active/filled lifecycle
- blocked conversation
- non-admin user trying admin
- mobile one-handed navigation
- malformed/invalid form inputs
- privacy: exact address never public

### Options
1. Manual exploratory QA only.
   - Pros: catches unexpected UX problems.
   - Cons: inconsistent and not repeatable.
2. Automated Playwright only.
   - Pros: repeatable and objective.
   - Cons: can miss visual/interaction friction.
3. Hybrid: automated core + targeted exploratory/visual inspection.
   - Pros: best bug coverage without building a giant QA platform.
   - Cons: slightly more work.

### Ranking
1. Hybrid — chosen.
2. Automation-only as permanent regression layer.
3. Manual-only rejected as release gate.

### Acceptance
- all automated gates green desktop/mobile
- no critical/high persona failures
- medium findings either fixed or explicitly documented/deferred with reason

## Priority 5 — Production promotion

### Aim
Move only the already-proven artifact to the public alias.

### Options
1. Promote/deploy the exact preview artifact/commit with no source change.
   - Pros: highest confidence.
   - Cons: requires disciplined release handling.
2. Rebuild from source at production time.
   - Pros: common workflow.
   - Cons: introduces artifact drift.
3. Auto-deploy latest branch head.
   - Pros: simple.
   - Cons: may include unrelated commits; rejected for this release.

### Ranking
1. Exact proven artifact — chosen.
2. Rebuild only after future CI/CD cleanup.
3. Latest-head auto deployment rejected for current release.

### Acceptance
- public alias serves exact release
- same browser/persona gate passes against production
- backend/privacy checks remain green

## Priority 6 — Known-good checkpoint + lightweight monitoring

### Aim
Make the release recoverable and detect regressions after launch.

### Options
1. Existing Vercel runtime errors + `client_errors` + Git rollback branch/checkpoint.
   - Pros: already available; low complexity; enough for MVP.
   - Cons: limited product observability.
2. Add full observability platform immediately.
   - Pros: richer telemetry.
   - Cons: unnecessary integration/cost now.
3. No post-release monitoring.
   - Pros: zero work.
   - Cons: unacceptable for a marketplace launch.

### Ranking
1. Existing lightweight monitoring — chosen.
2. Full observability later when traffic justifies it.
3. No monitoring rejected.

### Acceptance
- new rollback branch/checkpoint
- release commit/deployment/test run documented
- Vercel runtime errors checked
- Supabase client errors checked
- open blockers documented

# Counter-check

Before production promotion, verify all of the following are not forgotten:
- production signup/email delivery is green
- genuine-session core loop is green
- image upload is runtime-proven
- exact address privacy is runtime-proven
- stale/paused/filled listings are not publicly visible
- blocking is enforced server-side, not only hidden in UI
- mobile and desktop both pass
- production has a rollback point
- no QA/test data remains in production
- no new feature work is mixed into the release

Future features such as reviews, monetisation, KYC, advanced ranking and agent/team accounts remain explicitly out of scope until this launch-critical program passes.
