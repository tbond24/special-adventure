# Development checkpoint: focused publication query fix

Status: **ready in development source; local verification passed; hosted authentication remains unverified. No deployment or production migration.**

## Changes and checkpoint

Base revision: `5dc40368614a03fd5447a7591c5a5b68eebf016a`. Existing source rollback tag: `rollback/before-admin-marketing-page-20261005`. Unrelated uncommitted work was preserved; pre-edit status is saved in `../marketing-checkpoint-artifacts/combined-migrations/source-checkpoint.txt`.

New migration `supabase/migrations/20261005003252_admin_marketing_property_first_once.sql` was created with the installed Supabase CLI migration command. It follows the unchanged `20261004231152_admin_marketing_generated_at.sql` migration. It replaces only the correlated property minimum with a grouped calculation joined by property ID. No table/index changes, dependencies, public requests, UI changes or collection changes.

Other scoped additions/edits:

- `docs/rollback/admin-marketing-property-first-once.sql`: restores the exact pre-optimization function **with generated_at retained**.
- `qa/marketing-db/combined.cjs`: executes final migration files together, reverses and reapplies the optimization, then restores the initial local function.
- `qa/marketing-db/publication-identity.sql`: synthetic multi-listing/property history fixture.
- `tests/marketing-migration.test.cjs`: checks that only the focused calculation changes and reverse SQL exactly restores the previous definition.
- `tests/marketing-report.spec.js`: adds the shared-property/independent-listing display assertion.
- This checkpoint report. No existing migration was rewritten.

## Properties are not publications

The report's First recorded publications measure still counts distinct `vacancy_id` values, not properties and not only records flagged `is_first_property_publication`.

The new grouping computes a property-level timestamp used only for that existing boolean field. Per-listing earliest qualifying transitions are still chosen across available history before applying the UTC reporting range. NULL previous statuses qualify; active→active entries do not; later republication is not a new first recorded publication.

Explicit executed fixture expectations:

| Case | Verified result |
|---|---|
| Three listings in the same property | Three publications, not one |
| Two listings with simultaneous earliest property timestamps | Both listings retained and both existing flags true |
| Two newly published listings in a property first published before the range | Both count; property-first flags false |
| Older listing reactivated during range | Excluded as a new first recorded publication |
| Duplicate active status entries | No duplicate listing count |
| Exact end boundary, never-active record, redundant-active-only record | Excluded |
| Complete fixture | Six distinct listings across three properties |
| Browser receives six distinct listings plus a duplicate row and mixed flags | Displays six, independent of property IDs and flags |

This remains **first recorded** publication: missing earlier history cannot prove first-ever publication.

## Executed results

**42 PostgreSQL assertions passed**, zero assertion failures. The runner used the exact generated_at migration followed by the exact new optimization migration, not an independently generated approximation. It tested:

- The counting cases above and complete JSON-equivalence against the pre-optimization report, including attribution/property flags. Comparison ignores only dynamic generated_at and array order for timestamp ties; returned fields/values are preserved.
- Actual local PostgreSQL role denial for anonymous, AAL1 admin and AAL2 non-admin; authorized AAL2 admin succeeds. Repeated after reversing the optimization and after reapplying it.
- Owner, ACLs, authenticated execute grant, anonymous denial, SECURITY DEFINER and empty search_path preservation.
- UTC start-inclusive/end-exclusive boundaries, NULL/invalid/reversed/overlong ranges, null previous statuses, publication deduplication and full-history selection.
- Dynamic generated_at, including advancement within one transaction.
- Independent analytics/publication 5,000 versus 5,001 limits, including each dataset remaining usable when only the other reaches its sentinel.
- Explicit reverse SQL restores the exact generated_at-capable function, report contents and security configuration. Reapplication passes the correctness suite. Final outer transaction rollback restores the exact initially installed function and security configuration.

**Static preservation tests passed.** They verify the generated_at-only migration separately, then reverse the focused text transformation and compare it to that exact definition. The reverse file also matches the exact pre-optimization definition.

**Eight Playwright tests passed (35.2 seconds)** across desktop and mobile: independent limits; UTC requests/deduplication/refresh failure; shared-property listing counts; existing UI authorization gate. These use the local synthetic server and intercept all non-local browser requests. UI gate tests are not evidence of hosted authorization.

Final migrated function at the 5,001-publication synthetic sentinel: **118.539, 111.373, 113.592 ms**. These three local function timings include report construction but exclude network/browser work; not production p95. The prior investigation's ~19.2-second indexed baseline and broader before/after measurements remain separately documented. No payload reduction is claimed.

No application UI files changed in this turn. Broader prior public regression results were not rerun or relabelled as fresh results. The new tests exercised only localhost; account/project/branch metadata reads and official documentation requests were separate from production application telemetry. No production database/data query was executed.

## Local target and recovery

Verified existing synthetic database: `vacancy_marketing_test`, marker `vacancy-marketing-synthetic-only`, loopback `127.0.0.1:55432`. All fixture and function changes ran inside a transaction and were rolled back after the explicit reverse/reapply checks. No Supabase migration ledger was changed by direct psql testing; this verifies SQL application order, not the hosted CLI migration orchestration.

PostgreSQL was stopped at `2026-10-05T00:35:49Z`. Shutdown evidence shows zero listeners on port 55432 and no postmaster.pid. The local fixture web server was also stopped after browser tests.

Runtime retained: `C:\Users\PC\Documents\Codex\vacancy-marketing-postgres-test-20261005`.

New evidence retained: `C:\Users\PC\Documents\Codex\2026-09-07\referenced-chatgpt-conversation-this-is-an\work\marketing-checkpoint-artifacts\combined-migrations` (SQL bundle, stdout/stderr, browser log, shutdown record, source checkpoint). Earlier evidence remains untouched.

For any later approved database application: first save the target function definition, owner, grants and configuration; confirm target identity; apply the new forward migration after generated_at. To reverse only this optimization, execute `docs/rollback/admin-marketing-property-first-once.sql`, then compare the restored definition/security to that saved snapshot and repeat authorization checks. The older `admin-marketing-report-function.sql` reverses generated_at too and is not the correct optimization-only recovery file. Once applied through a migration ledger, record any future rollback as a new migration rather than deleting applied history.

For source rollback of this turn only, remove the new optimization migration, its reverse file, the two new QA files and this report, and reverse only the added hunks in the two test files. Do not reset the branch or remove the previous release's uncommitted work. Keep evidence/runtime until the investigation is accepted.

## Simplest safe hosted verification path

Read-only account metadata inspection found one Vacancy project and only its default/main branch; no separate Vacancy test target. The connected organization reports the Free plan and has two active projects; remaining listed projects are inactive and belong to other products. None was restored, repurposed, queried or changed. These metadata checks do not establish an unused safe database.

Recommendation: a **separate, explicitly designated disposable hosted Supabase project**, with synthetic data and two test users (admin and non-admin), and a locally running application configured exclusively for that project. Use real Supabase Auth and RPC, not the local SQL claim helper replacements. Do not clone production data or secrets. Install reviewed schema/function dependencies and both migrations, with only the test admin in admin membership. Restrict the local test runner to the confirmed test host, and do not point live configuration at it.

Required access/setup before proceeding:

1. Owner-approved isolated project identity and permission to configure its Auth, schema and synthetic accounts. An existing project may be reused only after it is explicitly designated disposable and its contents/ownership are checked. Do not infer that inactive means empty.
2. Project-scoped configuration/access through the connector or secure local secret storage: test project URL/public key plus necessary test-only schema/account administration access. No production credentials and no service key in browser code or chat.
3. Two dedicated synthetic test identities, generated test passwords and temporary TOTP enrollment. Test email inbox access is needed only for delivery/confirmation/reset flows. Start with preconfirmed synthetic accounts for password-login/MFA/RPC checks; report email delivery separately instead of treating preconfirmation as delivery verification.
4. Test-only redirect allowlist for the localhost application. Google OAuth, if included, additionally requires a test OAuth client/consent configuration and test identity; it is not required to first verify password-login/TOTP/report RPC.

The simplest initial hosted matrix is: valid password login → actual signed AAL1 token denied report access → TOTP enrollment/challenge → signed AAL2 admin token allowed; anonymous, non-admin AAL1 and non-admin AAL2 denied through the real RPC gateway. Also test wrong/expired MFA codes, invalid/expired access tokens, refresh, logout/session handling, loss of admin membership, and safe browser handling of permission failure. Logout expectations must follow actual access-token lifetime rules; do not assume an already issued JWT is immediately revoked. Compare returned report fields and counts with the synthetic expectations.

**Cost/access blocker:** Supabase documents two free projects across organizations owned/administered by the account, with paused projects excluded. The visible Free organization already has two active projects, so no free capacity is assumed. Need an owner-approved free slot or access to a confirmed disposable isolated target before proceeding. No paid branch/service, plan upgrade, unrelated-project pause or new project was provisioned. A new free organization does not itself bypass the account-wide limit.

A full local Supabase stack could test real local Auth/RPC, but requires additional runtime setup and still would not verify hosted configuration. It is not proposed as a substitute for the remaining hosted checks.

Official references checked 5 October 2026: [MFA and AAL claims](https://supabase.com/docs/guides/auth/auth-mfa), [redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls), [free-project limits](https://supabase.com/docs/guides/platform/billing-on-supabase). Current changelog reviewed; no relevant breaking change was identified for this existing PostgreSQL function-only adjustment.

## Ready versus unverified

- **Ready:** bounded development source migration, reverse SQL, local combined-migration correctness/security/counting/equivalence checks, affected desktop/mobile report behavior, retained evidence and stopped services.
- **Unverified:** complete hosted login/MFA/JWT/RPC/browser session flow; hosted migration orchestration and configuration; hosted performance/concurrency and full production schema/index equivalence. No production-readiness or deployment claim is made from the local permission tests.
