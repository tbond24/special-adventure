# Vacancy admin pilot — password-reset verification and separate correction proposal

**Date: 15 October 2026. Outcome: normal reset path verified; a pre-existing failure-path defect has a tested, unapplied proposal. Production release remains HOLD.**

This follow-up closes the normal password-change gap in [customer-flow acceptance](./ADMIN_CUSTOMER_JOURNEYS_ACCEPTANCE_20261015.md). It does not change runtime source on the admin release branch or authorize deployment. The interrupted conversation had already committed additional tests; this retry reconciled those commits, inspected the completed evidence, and tested a narrowly scoped correction separately rather than repeating or misattributing earlier work.

## 1. Verified existing reset flow

- Candidate source: `3b40bb9889c25a26ce68006d19a5923a6cc82ac3` on `feature/admin-desktop-editor-20261014`.
- [Successful baseline integration run 38695917689](https://github.com/tbond24/special-adventure/actions/runs/38695917689).
- Downloaded artifact `11954014625`, SHA-256 `5e9f341d47739f407759e129366b8e194e01d9f91f08eff2b6b0e7501e53fea4`.
- Inspected `evidence.json`: **229 recorded PASS milestones**, `completed=true`, `disposableStackRemoved=true`, **74 source migrations**, `passwordRecovery.completed=true`. These are logged acceptance milestones, not 229 independent test suites.
- The actual copied reset handler was pinned to original Git blob `b6c89f37cd5ca6b6681308c0f55f1c1f748925cc`; no production handler was changed.

| Scenario | Observed result |
| --- | --- |
| Request reset | The existing visible form called genuine local GoTrue and produced an email in local SMTP capture. The message used the generic account-existence response. |
| Open reset link | A real GoTrue recovery verification link opened the current reset page. Its credential fragment was removed from the address bar and did not become the normal browser login session or stored token. |
| Password checks | The real local Edge Runtime rejected weak passwords and a known breached synthetic password through the live Pwned Passwords range service. Rejection left the stored password unchanged. |
| Input/network failures | Mismatched confirmation was rejected by existing native constraint validation. An interrupted browser submission left the password unchanged and retained the form for retry. |
| Final password change | The actual Edge handler and GoTrue persisted a new synthetic password. The visible page showed success and cleared the form. |
| Subsequent access | The old password and two pre-reset refresh tokens were rejected. A fresh visible sign-in with the new password opened the same account. |
| Link reuse | The consumed email link could not issue another recovery session, and the completed reset form could not be reused. |

The original admin/MFA, audit, publication/restore, customer Create/Edit/photo/draft, old-frontend compatibility and actual expired-token milestones remained green in that run.

**Scope clarification:** local SMTP capture proves email generation and link handling, not Gmail/Outlook delivery. Only synthetic password hash prefixes were sent to the password-safety provider. Local timing is not production performance. The old `customerJourneys.limits` field describes that earlier phase; the separate `passwordRecovery` evidence records the subsequently completed reset stage.

## 2. Existing failure-path defect — not hidden by the successful normal path

The original `secure-password-reset/index.ts` performs these actions in one try block: password update, then global logout. When the update succeeds but the logout fetch throws, the outer catch returns HTTP 503 and a generic retry message even though the password has changed. A logout HTTP error is also not inspected. The exact source's offline failure test intentionally remains red for the transport-error scenario on the unmodified admin candidate; do not call the entire release fault gate green.

This is a **pre-existing repository handler behavior**, not a claim that a production incident was observed. It was reproduced using a Node/Deno adapter with explicit Auth/provider stubs, without contacting a live account.

## 3. Proposed correction — tested in isolation, not applied to the release branch

A separate branch, `proposal/recovery-status-20261015`, contains a reviewable patch at `tests/recovery/status-proposal.patch`. Its committed `app/` and production function sources remain unmodified. CI applies the patch only in its disposable workspace.

The patch changes two runtime files: after a confirmed password update, the Edge handler returns success with `sessionsRevoked=true/false`; the existing recovery page reads that flag and displays its existing incomplete-sign-out warning when required. Strength checks, breached-password lookup, caller-token authority and actual password update are preserved. The warning is distinct from password success; there is no silent retry of a committed password change.

- [Successful proposal run 38699629754](https://github.com/tbond24/special-adventure/actions/runs/38699629754), source `34e49ef8b2a68f7dfc434d62176ee47f4ca11747`.
- The exact-handler offline fault suite passed, including thrown logout requests, logout HTTP 429/500, successful logout, authentication denial and password-safety failures. These tests use explicit stubs.
- Full disposable integration then recorded **230 PASS milestones**, `completed=true`, `disposableStackRemoved=true`, **74 migrations**, and the same real recovery/email/password checks.
- Downloaded proposal artifact `11956651468`, SHA-256 `7aad89dba27104755be1421a4448fac837bc1822af94a23b89ecc87f56de45a7`.
- Proposed handler Git blob: `923b1582ad411348ebe2e26373047383a0e3da2f`. Its manifest explicitly records `sourceChanged=true`, `proposalApplied=true` and the original source blob.
- To test the warning UI without damaging a live service, the browser test altered only the acknowledgement field to `sessionsRevoked:false` **after a genuine successful local password change and logout**. Evidence records `realServerSessionsRevoked=true` and `warningResponseInjected=true`. This proves UI handling; it is not a claim that the real local logout failed. Independent offline tests exercise the actual handler's failure branches.
- The initial proposal attempt stopped at patch-context validation before a stack was started. The patch context was corrected, and the final run above passed. No release test was weakened to accept the original misleading error.

## 4. Security and release boundaries

[Supabase documents](https://supabase.com/docs/guides/auth/signout) that existing access tokens can remain valid until expiry even after refresh tokens are revoked. Neither the test result nor the new flag promises immediate invalidation of every issued access token. The proposal also does not eliminate every lost-response/timeout ambiguity before a browser receives acknowledgement.

[Pwned Passwords documents](https://haveibeenpwned.com/API/V3) the range lookup and zero-count padding behavior used by the existing handler. The proposal preserves that check; no real user password, reset link, authenticator secret or service credential is put in the repository or shared evidence.

No Vercel deployment, domain mutation, production SQL, role assignment, hosted Auth change or customer-data write was performed during this retry. A read-only alias check still mapped `getvacancy.site` to original deployment `dpl_558VydjBz3tjnsNok5wgGQsoKZRz`.

**Remaining:** review and explicitly accept the small reset-status proposal before applying it to the development release candidate; then run the reviewed combined release gates. Production function deployment, production SQL, Owner activation and frontend deployment remain separate approvals. External inbox delivery, native desktop 200% zoom, representative hosted load and historical live/source schema reconciliation are not closed by this test. No credentials are required from the user for further isolated work.
