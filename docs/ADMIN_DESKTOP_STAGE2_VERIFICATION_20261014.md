# Vacancy desktop admin — Stage 2 review checkpoint

**Status:** PARTIAL — implementation exists and isolated contracts pass; **not released**.  
**Date:** 2026-10-14  
**Development branch:** `feature/admin-desktop-editor-20261014`  
**Baseline production source:** `1a03a32592892a05ee0bdebbc33b75e409d7392e`  
**Latest extended browser-tested revision:** `83e3fc773d9632a134368ea9fa9bdef7926401de` (the Stage 2 pilot remains unreleased)  
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
