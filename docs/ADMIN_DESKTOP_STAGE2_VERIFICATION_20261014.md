# Vacancy desktop admin — Stage 2 review checkpoint

**Status:** PARTIAL — implementation exists and isolated contracts pass; **not released**.  
**2026-10-15 update:** genuine hosted Auth/MFA and a complete source-schema, real frontend integration now pass. The final disposable run passed **201 checks**, including visible password/TOTP, full admin routing, real listing queries, publication/rollback, moderation, Saved, enquiry and genuine expired tokens. The older UNVERIFIED statements describe historical checkpoints; the final continuation sections record current evidence and release limits.

**Date:** 2026-10-14  
**Development branch:** `feature/admin-desktop-editor-20261014`  
**Baseline production source:** `1a03a32592892a05ee0bdebbc33b75e409d7392e`  
**Latest complete isolated integration code:** `6af2178371721734b335db205eb01e37102df721` (the Stage 2 pilot remains unreleased). Earlier extended synthetic verification used `83e3fc773d9632a134368ea9fa9bdef7926401de`.
**Production Vercel:** `dpl_558VydjBz3tjnsNok5wgGQsoKZRz` (unchanged by this work).

## Delivered: one real, bounded page/element slice

| Reference behavior | Delivery | Evidence |
|---|---|---|
| Desktop dark rail and existing operational destinations | Adapted existing admin shell; Overview, Activity, People/listings, Reports, System, Appearance and Marketing remain reachable | Existing admin shell browser regressions |
| Page tree, component search, selected page/element ID | Code registry lists **Listing detail → existing Save listing** only, bound to `.quiet-detail .quiet-save` | Browser suite |
| Public Mobile/Desktop preview | Script-disabled iframe renders HTML from the **existing** detail renderer, with real public-safe listing DTOs; preview mode never changes edit scope | Synthetic fixture, no business action/telemetry |
| Appearance inspector | Registered width, height, radius, colours, opacity, border, shadow, margins; unsupported Content and Visibility read-only; generated CSS read-only | Browser + SQL validation |
| Save, review, publish | Per-actor private draft, expected revision/version comparisons, server Owner+MFA gate, idempotent publication, immutable revision and application audit in one transaction | Disposable PG17 SQL suite and synthetic browser |
| History and restore | Earlier version becomes a private draft and needs an explicit new review/publication; later history retained | SQL + browser suite |
| Failure handling | Invalid field blocks save/publish, disabled controls, conflicts retain editor state, navigation Save draft / Discard / Stay, native beforeunload warning | Browser tests |
| Public CSS | Small published-only resolver applies to allowlisted listing Save selector, not cards or other templates; lookup doesn't block public listing render | Browser + source review |
| Site status | **Unknown · no recent check** without real health data; actual View site link, no invented green state | Browser test |

The reference image places a Language selector on Listing detail, but verified code places the selector on Create/Edit listing. No nonexistent Listing-detail language control or demo listing has been added to public pages. Phone chrome is intentionally optional; preview correctness takes priority.

## Isolated evidence

- [PostgreSQL 17 migration and authorization QA](https://github.com/tbond24/special-adventure/actions/runs/38584928858) — PASS. Tests ran sequentially against a disposable local PostgreSQL container, **not** production or the paused Supabase test project. Covered publish/draft privacy, validation, AAL1 denial, Owner/Operator permissions, idempotency including request mismatch, revision conflict, audit trigger rollback, restore and last-owner protection.
- [Desktop browser, existing admin regression, responsive QA](https://github.com/tbond24/special-adventure/actions/runs/38588262148) — **16/16 PASS**. Localhost synthetic server with external requests blocked. Includes genuine public renderer markup branch, zero preview product actions/telemetry, draft/publish/restore, bad input, navigation, header search, existing Reports/Appearance and MFA denial, 1280/1440/1536/1920 widths, and 768 CSS-pixel compact viewport.
- Visual comparison evidence: the above browser workflow includes a short-lived artifact `vacancy-admin-design-1536`. It contains **synthetic test data**, no real customer records. Phone visual spacing differs from the concept due to using the real renderer, not a fictional listing UI.
- An earlier browser check falsely interpreted the text of a `<style>` element as empty; direct CSS `textContent` inspection proved correct stylesheet propagation. The erroneous rendered-text assertion was replaced and rerun successfully.
- Prior [Stage 1 isolated hosted SQL/permission evidence](./ADMIN_DESKTOP_STAGE1_VERIFICATION_20261014.md) is distinct from this disposable database exercise.

## Extended isolated regression and reference review

- [Extended run 38590720844](https://github.com/tbond24/special-adventure/actions/runs/38590720844) on the development branch: **18/18 desktop admin/editor**, **3/3 desktop admin visual**, **7/7 existing mobile admin fallback/MFA**, and **4/4 selected Pixel 7 public listing-detail tests** passed. The broad original public-detail suite was **15/18**; its three failures are documented and remain uncorrected.
- [Baseline diagnostic 38590217858](https://github.com/tbond24/special-adventure/actions/runs/38590217858) reran exactly those three failed public tests against the original deployed source `1a03a32592892a05ee0bdebbc33b75e409d7392e` using the **same** isolated loopback server, CSP and current test cases: **all three failed identically**. This is evidence that the new editor branch did not introduce those failures under this harness, **not** a claim that the underlying public experiences are bug-free.
- Matched original failure types: authenticated block-list lookup invokes a remote API intentionally blocked by the isolated CSP; another test cannot find a visible Blocked Accounts control; the Inbox test expects a hidden desktop topbar but sees it visible. Do **not** change unrelated public UI or weaken network isolation to manufacture a green test suite.
- A source lifecycle fix in `app/src/admin-design-workspace.js` detaches click, resize and unload listeners after unmount or account change, preventing stale unsaved-editor warnings on unrelated routes; this has a passing synthetic browser regression.
- Visual review compared the source image (1536×1024) with a screenshot from [run 38590720844](https://github.com/tbond24/special-adventure/actions/runs/38590720844) artifact `vacancy-admin-design-1536`. Candidate keeps the dark rail, three-panel hierarchy, orange selection, bounded inspector and truthful Unknown health. Design & Style header height was reduced **only while that section is active**. Known intentional discrepancies: synthetic fixture banner is not production UI, the real Listing-detail Save action replaces the mockup's nonexistent language control, and the synthetic listing lacks imagery/phone chrome.
- A separate safe baseline run explicitly failed for the identical historical exceptions. The extended browser workflow therefore remains overall **FAIL**, even though the scoped admin/mobile steps are green; do not label the complete public regression gate PASS.

## Release blockers — still UNVERIFIED

1. **True hosted Auth/MFA:** signed-out, ordinary user, suspended admin, AAL1, AAL2 Operator/Owner, changed membership and expired sessions through genuine Supabase Auth and direct REST/RPC calls. Local JWT simulation does **not** replace these.
2. **Production-shaped integration:** reconcile latest live schema/RLS/grants with SQL migration dependencies. The existing `vacancy-admin-test` project is currently inactive; its stored schema was partial. No production migrations authorized or executed.
3. **Source and public regressions:** affected real listing route after publication, Saved/share/enquiry, Find/listing-card separation, desktop/mobile, authentication/recovery and performance at representative load. Tests above are synthetic; do not call them a site-wide PASS.
4. **Release and permissions:** designate a real Owner explicitly (no inferred ownership), decide retention for appearance/access audit, prove safe propagation, verify authorized Vercel rollback artifact, and approve production SQL and frontend release as **separate actions**.
5. **Edge navigation:** click-driven internal navigation guard and browser unload are tested; programmatic hash changes and genuine 200% browser zoom still need proof. A 768 CSS-pixel test is only a layout proxy.
6. **Stage 3:** icon, favicon and listing-display immediate-save paths are still separate; integrating them into publication/audit/conflict rules must not silently break existing controls. Language selector styling on verified Create/Edit pages is not added yet.
7. **Stage 4 analytics:** current reporting remains intact, but new renter funnel and ingestion validation are not implemented or verified.

## Safety, cost and recovery

- Branch changes are additive or confined to admin and the existing public listing renderer's optional **nonblocking** published-style hook; no arbitrary HTML/CSS/JS editor, new framework, dependencies, generic CMS, tracking expansion, or customer data writes.
- Server setting tables have no direct client table grants; public RPC returns **published** allowlisted config only. Draft save and publish create audit records transactionally; immutable revision history must not be deleted during a rollback.
- Cost: one bounded published-style read on first listing-detail use, private writes on deliberate Save, no new polling/Realtime. **Operating cost/p95 are unmeasured**, not claimed.
- Rollback: never delete migrations/data blindly; source can return to known deployed SHA after compatibility review. Once published, restore styles by creating a new approved revision, not erasing history.
- Production Vacancy and Charity Student Fund Beta were last verified `ACTIVE_HEALTHY`; the test project `INACTIVE`. All live actions remain excluded until separately authorized.

## Next bounded increment

Use a separately permitted isolated **full Supabase Auth/schema** environment for real hosted acceptance/denial and public propagation, then repair evidenced failures. After that, start Stage 3 by extending the registry to the **real Create/Edit listing language selector**, with strict per-page styling separation. Do not use the image to invent a Listing-detail language picker.

## 2026-10-14 hosted PostgREST follow-up — test project only

- Approval was explicitly given to temporarily pause `charity-student-fund-beta` and restore the **existing** `vacancy-admin-test` project. Production was not mutated.
- The test project `raauicmfyjpcuhfzknak` reached `ACTIVE_HEALTHY`. Read-only inspection confirmed its **partial** synthetic schema and Stage 1 roles/audit. The exact, verified Stage 2 migration `20261014211500_admin_appearance_editor.sql` was applied to that test project only; the server reported success, and the new private-draft, revision and publish RPCs were present.
- A true GoTrue Auth attempt encountered three **external blockers**, not verified access-control failures: Supabase rejected a reserved `example.com` address (400); raw GoTrue signup returned a different envelope than the client wrapper expected (corrected in the test-only script); then the test project reached GoTrue's email signup rate limit (429). **No real AAL2 token was obtained. Do not claim genuine hosted Owner/Operator MFA passing.**
- One newly registered, unconfirmed synthetic QA account was created in the test Auth service. It was explicitly matched by its stage/run metadata and removed from the test project only. No real identities, passwords or secrets were copied to the repository. Automatic hosted Auth signup attempts were disabled.
- Hosted API smoke tests used only a test-project publishable key and real HTTPS PostgREST, not a service-role credential. [Run 38596167259](https://github.com/tbond24/special-adventure/actions/runs/38596167259) passed with no public revisions and denied anonymous protected RPCs/table reads.
- A **synthetic database transaction** with a simulated AAL2 Owner claim created a private draft and published revision 1 with `all.radius=17`. This is **NOT** genuine GoTrue authentication. [Run 38596308384](https://github.com/tbond24/special-adventure/actions/runs/38596308384) confirmed the true anonymous HTTP endpoint returned this committed published style, and denied anonymous admin/draft/audit access.
- A second audited synthetic publication returned the published configuration to `{}` (revision 2, compiled defaults). [Run 38596447153](https://github.com/tbond24/special-adventure/actions/runs/38596447153) confirmed the real anonymous HTTP endpoint observed the restored defaults.
- Prior to pausing the test project, a read-only SQL check confirmed: published revision **2**, config **{}**, immutable published revision rows **2**, private draft rows **0**, application audit rows **4**, and one isolated unconfirmed Auth signup subsequently deleted.
- For safety, `.github/workflows/admin-hosted-auth-smoke.yml` is now **manual-only** and references a user-configured test publishable-key secret instead of persisting the key in its current source. Older GitHub run history may contain the originally public test-only publishable key; it was not a service-role key.
- Following verification, Supabase accepted both operations; the test project was subsequently checked **INACTIVE** and Charity Student Fund Beta was separately checked **ACTIVE_HEALTHY**. Vacancy production was also checked **ACTIVE_HEALTHY** and the Vercel production deployment remained `dpl_558VydjBz3tjnsNok5wgGQsoKZRz` / READY. No live Vacancy deployment or SQL change occurred.

### What this proves and does not prove

**Proven:** Stage 2 SQL applied to isolated Supabase; test project public HTTP endpoint exposes only published allowlisted styles; anonymous protected admin RPCs and tables deny; published radius propagated to the hosted HTTP response; next audited release returned config to defaults.

**Not proven:** genuine Supabase Auth AAL2 authorization with actual Owner/Operator tokens; real hosted frontend routing/build integration; live production styling or its latency; full public-site regression pass. The last category still contains the three documented baseline failures reproduced on original production code in the strict isolated harness.

**Next release gate:** after Auth rate limits and supported synthetic identity provisioning are resolved, exercise *real* AAL1/AAL2 tokens, capability denial/allowance, Operator draft versus Owner publish, and end-to-end published styles on a connected isolated frontend. Do not elevate a production user or touch the live database during this gate.

## 2026-10-15 genuine Auth and connected frontend release review

**Bounded outcome:** genuine hosted Auth/authorization, publication contracts and the connected frontend **module/public-style slice PASS across the recorded attempts**. **Production release remains HOLD.** This is not a site-wide regression pass or proof of full production-schema integration.

### Scope and safe checkpoint

- Began at exact remote head `33d7270f3812beba14f83fb8f13bfbd9ccfda0bd`. Read-only checks resolved `getvacancy.site` to Vercel `prj_znush7fSZP7lxpaUCOviftpmUzG3`, deployment `dpl_558VydjBz3tjnsNok5wgGQsoKZRz`, production source `1a03a32592892a05ee0bdebbc33b75e409d7392e` / READY.
- Production Supabase `xtutkwiivqkgkqjpkxvj` was inspected read-only. Its active-profile/admin helpers match the isolated fixture's authorization logic. No production SQL, deployment, settings, real identities or ownership assignments were changed.
- The user explicitly approved **this new** temporary charity pause/testing/restore window. Only then was charity paused and existing test `raauicmfyjpcuhfzknak` restored. Initial healthy test state: current revision **2**, config **{}**, revisions **2**, audit **4**, drafts **0**, roles **3**, existing Auth users **2**.
- Vercel Git-context inspection listed no link to this repository, and the feature branch had no deployments. Feature commits were pushed without creating a production-connected preview; final deployment reconciliation is recorded in the evidence packet.

### Supported identity provisioning and actual permission evidence

The test-only temporary Edge bootstrap used its built-in runtime service credential to call Auth Admin with `email_confirm:true`. No signup email, fabricated JWT, production identity or extracted service key was used. A random local 256-bit nonce authenticated the bootstrap; the deployed source contained only its digest and a two-hour expiry. Requests with an Origin, wrong nonce, wrong project or expired window were rejected in local security tests. Only fixed, app-metadata-tagged synthetic actors could be created or deleted.

The runner obtained password sessions, enrolled TOTP, challenged and verified real authenticator codes, then validated the returned AAL2 sessions through `/auth/v1/user`. Passwords, tokens, TOTP secrets and the runtime anonymous key stayed in memory; no genuine browser traces, HAR, storage exports or secret-bearing artifacts were recorded. The local nonce was deleted after retirement.

| Requirement | Result / evidence |
|---|---|
| Real Owner / Operator / nonadmin / suspended Auth and TOTP | PASS — GoTrue issued and validated actual AAL2 sessions for all four categories |
| AAL1 protected surface | PASS — all four actors denied across nine protected access/audit/appearance RPCs |
| Anonymous, AAL2 nonadmin and suspended protected surface | PASS — each denied across the same nine RPCs; **63 protected RPC denials** in the full matrix |
| Direct table access | PASS — GET/POST/PATCH/DELETE against five role/audit/appearance tables denied for AAL2 Owner, Operator, nonadmin, suspended, AAL1 Owner and anonymous; **120 checks** |
| Owner / Operator capability split | PASS — real server capabilities; Operator can save only its own draft and cannot publish, restore or manage access |
| Draft privacy and validation | PASS — Owner sees no Operator draft; unpublished changes do not affect public response; arbitrary CSS field rejected |
| Conflict behavior | PASS after corrective migration — stale draft, published base, Owner publication and restore return HTTP 409 / `PT409`, preserving newer state |
| Atomic audit | PASS — a scoped rejecting audit trigger makes the real publication RPC fail; SQL before/after remains revision 2, config {}, revisions 2, audit 11, drafts 2; RPC snapshots also confirm no partial state |
| Owner publish and replay | PASS — same request replays without a second revision/audit; mismatched request reuse is rejected with `23505` / HTTP 409 |
| Access change and freshness | PASS — Operator denied; Owner revokes synthetic Operator via the real role RPC, replay is idempotent with exactly one audit, and the existing AAL2 session immediately loses editor access |
| Restore and rollback | PASS — restore remains a private draft, stale retry conflicts safely, explicit publication restores exact pre-run config while retaining history |
| Anonymous published response | PASS — real HTTP publication observed; final anonymous PostgREST probe returns HTTP 200, revision **9**, compiled defaults **true** |

### Confirmed issue repaired: PostgREST conflict retry loop

The original appearance RPCs used SQLSTATE `40001` for optimistic application conflicts. Hosted testing reproduced a request that timed out while PostgREST 14 kept retrying. A stale request from an abandoned attempt later recreated a synthetic draft after cleanup. No public configuration changed in that attempt. The identified looping test backend was stopped, and that exact orphan draft was removed before continuing; final checks show no looping requests or residual drafts.

This matches [Supabase's documented PostgREST 14 behavior](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b). Corrective migration `20261015001130_admin_appearance_conflicts_http409.sql`, generated by Supabase CLI **2.121.0**, replaces only the two function definitions' four application-conflict error codes with `PT409`. Existing authorization, empty search paths, locking, grants, audit and publication logic remain. It was applied **only to the test project**. Both catalog inspection and genuine HTTP tests confirm the new codes. [Disposable PostgreSQL SQL regression run 38660158526](https://github.com/tbond24/special-adventure/actions/runs/38660158526) passes with the corrective migration.

Do not roll this fix back to `40001` while using affected PostgREST versions. If source is rolled back, keep the safe conflict semantics until a separately reviewed database migration is authorized.

### Connected frontend and visual evidence boundary

- Loopback-only server rewrote served backend/recovery constants to the **test** project; app source was unchanged. CSP and Playwright independently restricted connections to loopback and the test Supabase origin. No Vercel preview or production-backed frontend was created.
- Browser used genuine AAL2 sessions and unmodified backend current-user, membership, capability, draft, publish and public resolver methods. The real editor module saved, reviewed and published through actual PostgREST. A separate anonymous browser loaded the real listing-detail renderer and the actual published resolver: desktop border radius became **19px**, while a 390px viewport retained the compiled mobile radius and had no horizontal overflow. Server Operator capabilities remained publish-disabled.
- The hosted DB is still a **partial synthetic schema** (`profiles` has only id/account_status; listing tables have minimal dependency columns). The connected module receives an explicitly synthetic public listing DTO. It is mounted in an isolated container rather than exercising the entire legacy admin route. This proves the connected editor-to-Auth/RPC-to-public-style slice, **not** full real listing queries, listing creation, Saved persistence, enquiries, moderation, recovery, visible-form login/TOTP UI, or complete production-schema parity.
- Screenshots were inspected. The connected module screenshot reflects the constrained test container and scrolled inspector, not a full-shell visual acceptance claim. The separate 1536px synthetic full-admin screenshot verifies the existing rail/three-pane layout; connected public desktop/mobile screenshots verify the real rendered style and mobile separation. Missing photos are intentional synthetic data, not copied customer media.

### Regressions and separate failures

| Local isolated suite | Outcome |
|---|---|
| Desktop editor + existing admin render/tools | **18/18 PASS** |
| Existing desktop admin visual navigation | **3/3 PASS** |
| Mobile admin visual/render/tools plus Stage 77 MFA | **11/12**; the additional MFA factor-lookup test fails when CSP blocks its remote mocked request |
| Selected affected public listing-detail, Pixel 7 | **4/4 PASS** |
| Broad desktop public listing-detail | **15/18**; same three historical failures |
| Deployed-source baseline at `1a03a32` | All three historical public failures reproduced; the extra MFA factor-lookup failure reproduced on desktop **and mobile** |
| Bootstrap security, loopback isolation and RFC 6238 TOTP tests | **5/5 PASS** locally and [preflight run 38660621239](https://github.com/tbond24/special-adventure/actions/runs/38660621239) |

The three public failure types remain: remote block-list lookup blocked by the isolation CSP, hidden Blocked Accounts control, visible desktop Inbox topbar. The additional MFA fixture failure is also baseline behavior under this strict harness. No unrelated UI or network-isolation weakening was made to force green results. Parallel local baseline diagnostics briefly collided in the default trace-output directory; subsequent targeted evidence used distinct output directories. This did not turn any failed assertion into PASS.

The separate [manual public-API workflow 38660266005](https://github.com/tbond24/special-adventure/actions/runs/38660266005) **failed before HTTP execution** because `VACANCY_ADMIN_TEST_PUBLISHABLE_KEY` is not configured. It is a CI configuration blocker, not an endpoint denial failure. An alternative temporary **public-read-only** test Edge probe used the runtime anonymous key without returning it, called the real anonymous PostgREST endpoint and confirmed revision 9/defaults. The probe was then replaced with HTTP 410 again. Do not label the failed workflow successful.

Security advisors were reviewed after the corrective DDL. They are **not a clean scan**: closed RPC-only tables intentionally have [RLS without direct policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), and guarded RPCs intentionally trigger the [authenticated SECURITY DEFINER warning](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). The published-only reader intentionally triggers the [anonymous SECURITY DEFINER warning](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable). The genuine permission matrix verifies the intended boundary; these warnings were not silenced by opening table access. The test project's [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) is disabled and remains a configuration finding; generated test passwords were random.

### Attempts, cleanup and release decision

Sanitized evidence records separate attempts: initial/repeated retry-loop reproduction; corrected SQL with an erroneous harness expectation of `22023` instead of the actual `23505`; publication retest with a missing lazy module import in the harness; then a successful targeted frontend/restore/access retest. The harness assertions and lazy loading were corrected, and publication/frontend modes avoided repeating completed broad checks. This is combined evidence across attempts, not a claim that one full hosted run was green from start to finish.

Final healthy test SQL before pause: **revision 9, config {}, revisions 9, audit 26, drafts 0, roles 3, Auth users 2, window users 0, rejecting triggers 0, active draft requests 0**. All 20 newly provisioned synthetic Auth users across attempts were removed; the original two Auth accounts and three role assignments remain. Audit/revisions were deliberately preserved. The temporary Edge function remains as inert **version 4**, confirmed HTTP **410**; no provisioning capability remains. No local nonce remains.

Test pause and charity restore were accepted. Follow-up at **2026-10-15 00:36 UTC / 08:36 Perth** confirmed charity **ACTIVE_HEALTHY**; test is **INACTIVE**, production Supabase **ACTIVE_HEALTHY**, and Vercel still resolves `getvacancy.site` to the unchanged READY production deployment. No feature-branch deployments exist. Final project/deployment checks are recorded in `docs/evidence/admin-desktop-20261015.json`; ACTIVE_HEALTHY was observed, not inferred from restore acceptance.

**Release HOLD:** full production-shaped user journeys/schema, actual expired JWT behavior, representative performance/p95, the baseline public regressions, the missing manual-workflow secret, real Owner designation, audit retention and separate production SQL/frontend approvals remain. Existing Stage 3/4 work is outside this bounded verification increment. No merge, live Owner assignment, production migration or deployment was performed.

## 2026-10-15 continuation: regression harness repaired

The four failure types in the earlier checkpoint above are now resolved **in the isolated tests**, with no application UI changes. The fixture server rewrites served backend/recovery origins to its own loopback origin and replaces the served key with an inert fixture string. The strict self-only CSP remains. Mocked REST/Auth requests can now be intercepted by the browser, and unmocked requests cannot escape to production. The Blocked Accounts test opens the existing Security & privacy entry before clicking its child control. The Inbox check now expects its navigation to remain visible; only an open conversation has `message-thread-active` navigation hiding.

- Candidate local desktop regression: **44/44 PASS** (18 public detail, five MFA, 18 editor/render/tools, three admin visual).
- Candidate mobile: **7/7** admin render/tools/visual and **9/9** selected public detail plus all five MFA checks PASS.
- [Synthetic CI 38662660505](https://github.com/tbond24/special-adventure/actions/runs/38662660505): PASS, including broad public-detail regression.
- [Original deployed-source comparison 38662660507](https://github.com/tbond24/special-adventure/actions/runs/38662660507): all four corrected checks PASS against `1a03a32592892a05ee0bdebbc33b75e409d7392e`.

These supersede the prior harness-failure blocker; they do not alter the recorded historical failed runs. Commit `6f57ab7` contains the narrow fixture/test corrections. Strict network isolation was preserved. The desktop application remains unchanged from the user's starting head `33d7270f3812beba14f83fb8f13bfbd9ccfda0bd` during this verification continuation.

## 2026-10-15 complete isolated frontend integration — PASS

**Requested bounded outcome completed:** genuine hosted Auth/MFA evidence above is now complemented by a complete source-schema Supabase stack and the actual frontend journeys. [Final run 38664260023](https://github.com/tbond24/special-adventure/actions/runs/38664260023), source `6af2178`, passed **201 checks** and removed its disposable stack/data. [Preceding run 38664058270](https://github.com/tbond24/special-adventure/actions/runs/38664058270) also passed 201 checks; the final run strengthened exact desktop restore/default rendering and reset the inspector scroll for its screenshot. Production release remains **HOLD** for the decisions below.

### Environment and evidence provenance

- Official Supabase CLI **2.121.0** starts PostgreSQL 17, GoTrue, PostgREST, gateway and Storage on a fresh Linux GitHub runner. There is no hosted project link, hosted credential, customer-data copy, Vercel preview, project capacity swap or hosted write. App and API bind to loopback. CSP and Playwright independently constrain browser traffic to those two local origins.
- All **72 source migrations** replay successfully. The disposable copy omits exactly one historical hard-coded test-operator **data assignment** in `20260906132736_operations_analytics_and_expiry.sql`; its referenced Auth/profile UUID does not exist in a fresh database. No schema, policy, grant or function is filtered. The original migration remains unchanged. SHA-256 original/replay hashes for every file are retained in the evidence manifest. This proves source-schema integration, not absence of production schema drift.
- GoTrue Admin creates four confirmed synthetic accounts without email delivery. Owner and Operator enter actual visible password forms, see the AAL1 admin gate, enroll real authenticator factors, enter genuine TOTP codes and receive GoTrue-validated AAL2 sessions through the visible security dialog. Nonadmin/suspended actors also use real password/TOTP APIs. No user JWTs are fabricated and no browser sessions are injected.
- A synthetic public listing and report are seeded into the full database through SQL. The browser uses the unmodified real backend and joined listing query; no listing DTO, Auth, membership, admin or REST method is replaced. This does not test listing creation through the Create form.
- Startup output, credentials, TOTP material, sessions, traces, HAR and storage exports are not retained. Only explicitly sanitized JSON and three screenshots are uploaded. Screenshots were inspected: real 1536px admin shell/inspector, anonymous desktop and 390px mobile detail. Missing photos are deliberate synthetic data. The inspector screenshot is reset to its top; release controls are exercised separately lower in its scroll area.

### Verified flow and contracts

| Requirement | Final disposable result |
|---|---|
| AAL1/anonymous/nonadmin/suspended RPC boundary | **56 protected RPC denials PASS**; complements the earlier hosted 63-check access-inclusive matrix |
| Direct role/audit/appearance table access | **120 denials PASS** across GET/POST/PATCH/DELETE and six actor/assurance categories |
| Genuine visible Owner/Operator MFA | PASS — password sign-in → AAL1 gate → real enrollment/QR → actual TOTP → full admin route |
| Owner/Operator capabilities and drafts | PASS — distinct private drafts, Owner cannot see Operator draft, Operator cannot publish; actual Operator UI publish control disabled |
| Conflict and atomicity | PASS — stale draft returns HTTP409/PT409 promptly; rejecting audit trigger rolls current/history/draft/audit back together |
| Idempotent publish | PASS — retry returns `alreadyApplied`, no second revision/audit |
| Connected editor | PASS — actual full admin shell → real database listing preview → visible save/review/publish |
| Public propagation | PASS — independent anonymous joined listing renders 19px desktop style; mobile retains compiled style and no horizontal overflow |
| Existing admin | PASS — Overview/People/Reports/Appearance/System reachable; visible search, pause/reactivate and report resolve persist state and **three legacy moderation audit rows**; paused listing disappears from anonymous inventory |
| Saved/public enquiry | PASS — visible Save persists across reload; Unsave deletes row; visible enquiry creates conversation/message and opens inbox |
| Frontend nonadmin denial | PASS — actual admin route shows unauthorized account and no dashboard |
| Restore and rollback | PASS — historical restore publishes as a new revision; stale retry conflicts; anonymous **desktop** renders restored 17px, then exactly **50%** compiled default after a new defaults publication |
| Genuine expired JWT | PASS — unchanged GoTrue-issued token receives **HTTP401/PGRST303, “JWT expired”**, 31 seconds after its real `exp` |
| Local timing | 20 successful anonymous style reads; **11ms p95** in this disposable run only; no production performance/cost inference |

Before deletion, the final disposable database had published revision **4**, config **{}**, four appearance revisions and nine immutable change-audit rows. The Operator's independent private draft remained intentionally present in that final snapshot; deleting the disposable stack and volumes then removed **all** synthetic identities, drafts, tables and temporary audit-trigger fixtures. `disposableStackRemoved:true` and the workflow's additional cleanup step both passed. No hosted test data was changed.

### Harness corrections and final release boundary

The first three disposable runs remain recorded failures: local password provider disabled; browser navigation raced sign-in's final identity/favourites reconciliation; expiry checked inside PostgREST's clock allowance. The provider was enabled while global signup stayed disabled, the browser waited for completed sign-in navigation, and expiry now waits beyond [PostgREST's documented 30-second allowance](https://docs.postgrest.org/en/stable/references/auth.html#time-based-claims-validation). These were harness/configuration corrections, not relaxed authorization assertions. Both subsequent runs are green; the last proves exact restored/default desktop rendering as well.

Sanitized result, attempt summaries, migration hashes, regression links and read-only preserved-state observations are in `docs/evidence/admin-disposable-integration-20261015.json`. [Harness preflight 38663013831](https://github.com/tbond24/special-adventure/actions/runs/38663013831) passes all six bootstrap/isolation/TOTP unit checks. Earlier hosted evidence remains separately preserved in `admin-desktop-20261015.json`.

No additional charity pause was performed. Production Supabase and charity remain **ACTIVE_HEALTHY**; the hosted Vacancy admin test remains **INACTIVE**. `getvacancy.site` remains on READY `dpl_558VydjBz3tjnsNok5wgGQsoKZRz`, production source `1a03a32592892a05ee0bdebbc33b75e409d7392e`; feature-branch deployments remain zero. There were **zero hosted mutations** in this continuation, no production Owner assignment, no merge, migration or deployment. Branch commits after the tested source contain documentation/evidence only.

**Remaining release decisions/limits:** explicitly designate the live Owner, decide audit retention, review live schema/migration parity and representative hosted performance/cost, then obtain separate production SQL and frontend release approval. Create/Edit/photo-upload and recovery/email-provider journeys are outside this increment; the synthetic SQL-seeded listing does not prove those flows. The optional earlier hosted public-API workflow remains failed for its missing key and is not counted as green; the real hosted public HTTP probe and complete disposable suite provide independent evidence. Stage 3/4 work remains outside this bounded Auth/editor verification scope. The earlier actual-expiry, full-admin integration and four harness-failure blockers are now closed.
