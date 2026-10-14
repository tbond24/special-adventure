# Vacancy desktop admin — Stage 2 review checkpoint

**Status:** PARTIAL — implementation exists and isolated contracts pass; **not released**.  
**Date:** 2026-10-14  
**Development branch:** `feature/admin-desktop-editor-20261014`  
**Baseline production source:** `1a03a32592892a05ee0bdebbc33b75e409d7392e`  
**Tested source revision:** `0bb5dab0b0a6db97ea09aa5fa2ac628177f79e9c`  
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
