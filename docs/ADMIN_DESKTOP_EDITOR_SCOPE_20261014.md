# Vacancy desktop admin — Stage 0 scope and evidence

Status: **Stage 0 read-only baseline verified; implementation/testing pending**. Created 2026-10-14.

## Source of truth

- Repository: `tbond24/special-adventure`, branch `feature/admin-desktop-editor-20261014` based on deployed SHA `1a03a32592892a05ee0bdebbc33b75e409d7392e`.
- Vercel verified production project `prj_znush7fSZP7lxpaUCOviftpmUzG3`, custom domain `getvacancy.site`, and deployment `dpl_558VydjBz3tjnsNok5wgGQsoKZRz` at that SHA. The source branch compared **identical** to the deployed SHA during Stage 0.
- Supabase verified production project `xtutkwiivqkgkqjpkxvj` active; existing test project `raauicmfyjpcuhfzknak` inactive. Neither project was mutated.
- Current app is static under `app/`; the administered public app and its routes are not a new React/Next or CMS application.
- Image supplied in this chat: 1536×1024 PNG, SHA-256 `a594a6350181c9bc0229a0300e63093a31dfd4353f87f23f3912f4010429caf8`. The pasted brief cites a **different** screenshot SHA `f293c3610b71f1d64fb3b41f95e7091581f3c6f18ef612c34dbf4d7ccb1b8e8e`; do not claim byte-for-byte identity or infer hidden details. Use supplied visible mockup.

## Bounded scope table

| Capability | Classification / reuse | Proposed contracts/files | Non-targets | Acceptance and recovery |
|---|---|---|---|---|
| Desktop page/element browser and real preview | **Build/Adapt** within existing admin shell; reuse `stage100-auth-admin.js`, `admin-console.js`, and verified public renderers | A code-defined element registry, `app/src/admin-design-workspace.js`, `app/admin-design-workspace.css`, minimal `app/index.html` inclusion after wrapper chain; initial binding `listing-detail/save-button` to `.quiet-detail .quiet-save` | No public page redesign; no mobile-admin redesign | Synchronized tree/preview/inspector, keyboard support, no underlying business or telemetry writes; revert isolated frontend commit |
| Approved appearance controls | **Build** bounded properties; **Defer** arbitrary CSS | CSS-variable-only resolver for a registered page/element/viewport; whitelist and bounds in server settings validation; generated CSS read-only | No raw CSS/HTML/JS, selectors or unregistered controls | Invalid values denied server-side; inherited defaults unchanged until publish; restore prior revision |
| Draft, publish, history and restore | **Build** and reuse site-icon revision precedent | Additive `supabase/migrations/*_admin_appearance*.sql`, Supabase RPCs and app backend methods; immutable revisions, current state, optimistic locking and audit | No customer listing drafts/settings reuse; no production SQL | Save private draft, review diff/impact, publish after AAL2/capability checks, verify public propagation, restore via new version |
| Analytics and funnels | **Reuse/Adapt** `stage57-operations.js`, `admin-connected-report.js`, `admin-activity-favicon.js`; prospect renter events later | Existing versioned journey/event contracts, server-authoritative enquiry/reply linkage; bounded 30-second visible refresh | No session replay, exact-person counts, manufactured conversion rate, real-time warehouse | Clear units/freshness/unknowns; no duplicate polling; existing metrics preserved |
| Audit, authorization and recovery | **Build/Additive** on existing admin membership and MFA; preserve moderation logs | `admin_users`, `private.is_admin` baseline, proposed fixed role grants plus append-only audit and locked mutation RPCs | No self-granted roles, admin impersonation, global RLS refactor or deletion jobs | Denial tests by genuine actor/AAL, atomic audit plus changes, safe last-owner policy and source/database recovery |

## Evidence and dependencies

1. `app/src/stage77-admin-mfa.js` wraps `renderAdmin` with membership plus AAL2 gate; `private.is_admin(uuid)` also checks JWT AAL2 and membership (from `20260922014919_stage77_admin_mfa.sql`). The live `private.is_admin` definition ALSO checks `private.is_active_user`, beyond what the older Stage 77 migration shows. Existing `admin_users` has `user_id` only; no currently verified Owner/Operator assignment. **Do not infer an Owner or overwrite the current live helper from an older migration.**
2. `app/src/stage100-auth-admin.js` builds Overview, Activity, People & listings, Reports, System, Appearance groups. `admin-console.js` applies the desktop rail and metric-workspace mount; retain Reports/System when adapting headings.
3. `app/src/detail-quiet-experiment.js` uses the actual `.quiet-save` action. The screenshot's Language selector is **not** present on listing detail; `app/src/listing-languages.js` installs it only for creation/edit. Find/Home share a `#home` destination; do not invent a Search route.
4. `app/src/listing-display-options.js` immediately updates existing shared listing display settings; icon settings use separate immediate mutation RPCs with icon revision history. Stage 3 must remove inconsistent publication bypasses, after a tested Stage 2 slice.
5. Catalog read confirmed RLS on the admin, analytics, icon and listing tables; several grants (including analytics event INSERT) must be assessed together with applicable RLS/policies and RPC validation. **Raw table grants are not proof of a working bypass.**
6. `admin-activity-favicon.js` already has visible-section polling and a favicon editor; do not add another simultaneous poller or fake healthy status.
7. Existing browser tests include `tests/admin-render.spec.js`, `tests/admin-tools-shell.spec.js`, visual fixtures and hosted test paths. Production runtime authentication and real access denial are **UNVERIFIED** by the current read-only baseline.
8. Container networking cannot resolve GitHub, and isolated Supabase admin test project is inactive. Connector-based repository read/write is available; local checkout and hosted auth/database execution are not currently available. Never substitute static inspection for passing integration tests.

## Safety invariants

- Development-only branch; **no production SQL, Edge deployment, live auth/domain/settings changes, customer writes or Vercel release** in this scope.
- Treat the screenshot as **visual intent**, not evidence of components or real metrics. Current compiled public design is the default.
- Page selection must be consistent through the tree, preview and inspector; settings scope (shared/page/viewport) is distinct from Mobile/Desktop preview mode.
- First delivery slice targets existing Listing detail Save button only. After verified authorization and isolated tests: Create/Edit language, then other verified components.
- The preview must be public-safe and selection-only, with browser business actions and analytics disabled rather than triggering them.
- The site-status card must report measured/fresh status or Unknown, not a hardcoded green success.
- Keep existing workflows and media, authentication, map, listing, enquiry, report, health, icon and moderation behavior intact.

## Increment checkpoints

Stage 0: Evidence/scoping (this file) — **PASS for repository/deployment/SQL metadata; PARTIAL for runtime UI/access evidence**.
Stage 1: Fixed server-side roles and append-only audit — **PREPARED, UNVERIFIED** in `supabase/migrations/20261014185000_admin_roles_audit_foundation.sql`; no database execution. The migration creates two additive tables and guarded RPCs, but deliberately assigns no Owner. Actual SQL, policy and Auth tests require the permitted isolated environment.
Stage 2: Real target binding, preview, private draft, conflict-safe publish/restore — not started.
Stage 3: Existing appearance/icon/favicons unified — not started.
Stage 4: Truthful bounded analytics — not started.
Stage 5: Hosted and browser denial, regression, timing and recovery — blocked pending permitted isolated test environment.
Stage 6: Release review packet and explicit live approvals — not started.

Do not treat a prepared schema/branch/document as a working editor or deployment.
## Stage 1 migration preview checkpoint

- Prepared source commit `5777f365be69e0211b3fce01d5395b4fb26e89fc` (not applied). Role change and audit share a transaction in the new RPC; audit update/delete/truncate have explicit reject triggers.
- Proposed least-privilege role map: Operator can read analytics, moderate, and save drafts; Owner adds publish/restore and access management. **Proposed authorization policy; not yet exercised**.
- No existing admin or customer row is edited, no Owner is seeded, and the existing `private.is_admin` implementation is intentionally preserved.

## Verified follow-up security observations (read-only)

- `analytics_events` has INSERT policies `analytics_insert_anon` (`user_id IS NULL`) and `analytics_insert_auth` (`user_id=auth.uid()`); no non-internal INSERT triggers were found. The table constrains event names and route length, but the direct path may bypass application collector validations and abuse controls. Do not treat counts as fully trustworthy until this is closed and tested.
- `vacancies_admin_update` allows both USING and WITH CHECK via `private.is_admin(auth.uid())`; `authenticated` has UPDATE grants. Existing `listing_activity_vacancies` trigger records actor/old/new status in `listing_activity_log`, but it does **not** require or store a moderation reason. This is a plausible reasoned-moderation audit bypass; repair must preserve actual legitimate owner-update contracts, with isolated denial/regression tests.
- Live `private.is_admin` includes both `private.is_active_user(p_user)` and JWT AAL2. Leave this deployed protection alone; older migration text is incomplete as a current-state description.

## Isolated Stage 1 verification gate (not yet run)

1. Resume/use a separately permitted isolated Supabase test environment (the known test project is currently inactive); check migration compilation and state using synthetic accounts, not production rows.
2. Explicitly bootstrap a synthetic Owner through an authorized privileged test setup; make a synthetic Operator. Do not infer Owner from the existing production `admin_users` table.
3. Prove anonymous, signed-out, permanent nonadmin, suspended admin, AAL1 admin and assigned/unassigned AAL2 accounts cannot exceed their server-enforced capabilities, including direct table and RPC calls.
4. Test Owner grants/revocations, repeat request IDs, concurrent last-owner demotions, self-role changes, invalid reason/role, audit failure rollback and blocked UPDATE/DELETE/TRUNCATE of audit entries.
5. Run old admin moderation, listing owner, Reports, Icons and auth regression tests, and trace real client requests. A static source check is **not** a SQL migration or hosted authentication PASS.

Current blocker: no authorized active isolated database for migration/hosted Auth checks; no trusted local checkout/browser-test execution path. Do not advance to operational publication based solely on this prepared SQL.
