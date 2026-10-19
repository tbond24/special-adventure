# Managed reconciliation and hosted acceptance

The requested schema reconciliation and supported free hosted functional checks are complete. **Production release remains HOLD.** Only `vacancy-admin-test` and the existing Vercel recovery lab changed, under the [recorded boundary](./ADMIN_HOSTED_RECONCILIATION_SCOPE_20261019.md). No purchase, new project, further pause/resume, production write, original-branch rewrite, PR #2 change or PR merge occurred. PR #3 stays OPEN DRAFT, MERGEABLE, auto-merge unset.

## Preserved work and exact source

The old test database was explicitly a partial synthetic contract. Its 12 tables, four sequences and 20 functions moved with original OIDs into protected, unexposed archive schemas. Five profiles, four old admin memberships, nine immutable revisions and 26 immutable audit entries remain intact. Function definitions differ only in namespace; original definitions/ACLs are retained privately. Archive client access is closed, with row/write/truncate guards. Both original Auth users and all 11 original migration receipts pass unchanged row/digest checks. No customer/Auth contents were exported.

All **69 historical source files and 17 exact canonical candidates** installed. The sole replay adaptation is the already reviewed omission of the historical private-account assignment. Application, migration/candidate, frozen and dependency bytes remain unchanged from `b57915a` in this slice. Historical setup used six individual and ten bounded grouped transactions; each candidate applied separately, unchanged. There are **45 actual provider receipts**, including the preserved 11 and archive receipt. [The source/provider mapping](./evidence/admin-hosted-source-receipts-20261019.json) maps all 86 files to actual receipts, without inventing individual historical receipts.

Two real managed `apply_migration` failure probes rolled back DDL/rows and success receipts, including the exact first candidate followed by an intentional error. These verify the observed test-provider transaction boundary; they do not repair production timestamp/order drift or establish arbitrary network-timeout behavior.

Canonical presentation adopted compiled defaults independently of archived revision-nine history. Test adoption had ten enabled display settings and default favicon; it did **not** reproduce production's eight-enabled/two-disabled values. The 46 adopted rows became 47 when the normal Save editor initialized its registered default. Final verification finds zero values differing from captured `initial_config`.

## Hosted checks

Delivered lab deployment: `dpl_8mbLHRzPufL94KSpGZWndVCLKkpw`, source `e5898b98b4a8ec89fdd6d258379b681951fdfed2`. Its application/SQL payload matches the accepted source above. A test-only ephemeral build replaces public backend configuration, rejects production backend references, packages the actual listing-page function/templates and restricts backend/image origins with CSP. Delivered file hashes and CSP passed. Temporary private access links are revoked; deployment protection remains enabled.

Verified with genuine managed services and deployed browsers, without RPC or listing DTO mocks:

- Confirmed synthetic Auth, real TOTP/AAL2, AAL1/anonymous/non-admin/suspended denials, Owner/Operator separation and genuine AAL2 Owner grant/revocation. First-Owner bootstrap succeeded once; later fixtures used explicitly recorded privileged test reseeds, never a fabricated second bootstrap/self-grant.
- Private drafts, public isolation, validation, conflicts, forced audit rollback, idempotent publication, request mismatch denial, exactly one revision/audit and audited restoration. The broad managed attempt recorded **261 passing milestones**, then failed at its browser access stage; it is **not** reported as an all-green monolithic run. Two customer labels said AAL2 although their genuine sessions were AAL1; labels are corrected without overstating assurance.
- Customer Create, three private photo uploads, clean second-browser recovery, publication, three public image downloads and Edit preserving identity/photos while changing title/rent. An independent fresh page verified the edited clean server URL returned HTTP 200 with correct listing/price, and the detail fitted 390 pixels. This mobile follow-up occurred after physical photo cleanup; fresh mobile image downloads are not claimed.
- Visible deployed admin password login and TOTP enrollment, all nine registered Find/detail/Create/Edit targets, closed preview sandbox, and ten display options selected through their existing single-setting selector.
- Managed connected report, compatible v1/v2 ingestion, replay deduplication and PII rejection. Renter reporting returns unavailable evidence with the 30-day target, collection false and event rows zero.
- Genuine managed recovery OTP, deployed callback URL scrubbing/no credential storage, unchanged reset Edge, live HIBP and GoTrue password update. Old password, two prior normal refresh tokens and consumed OTP failed; new-password visible login passed. This used an admin-generated synthetic OTP and genuine callback fragment, **not** managed SMTP or an emailed-link redirect/allowlist test. No external mail was sent; earlier inbox acceptance remains separately valid for its recorded capture/Resend route.
- A fresh guest verified published desktop radius on the actual detail renderer and exclusion on mobile, then exact audited restoration. Fifteen sequential public reads measured **70–112 ms, p95 112 ms**. This narrow sample does not prove representative load, SLO, capacity or cost.

[Sanitized evidence](./evidence/admin-hosted-reconciliation-20261019.json) separates successful assertions, interrupted attempts and final cleanup. Existing Linux CI acceptance (289 integration milestones, seven upgrade checks, 31 units, 12 asset lifecycle checks) still applies to unchanged product/SQL; no unchanged full-stack rerun was needed.

## Corrections and limitations

Harness corrections covered no-change publication rejection/history setup, share-link cookies, fresh guest data, asynchronous appearance loading, the reset form's implicit submit button, a single display selector, server-function templates and cyclic draft cleanup. These were test-adapter assumptions; product code did not change. Failed attempts remain in ignored work and are not relabeled as green runs.

Full Chromium with the extension required for native tab zoom fails to launch on this Windows host (`spawn UNKNOWN`). Hosted native 200% zoom remains unverified; working headless-shell UI checks proceeded. Accepted Linux native zoom remains valid; no CSS-emulation substitute is claimed.

Security advisor: 21 intentionally closed RLS-table notices, nine anonymous and 44 authenticated executable-definer notices, plus native Auth leaked-password protection disabled. Public RPC interfaces are intentional; guards/validation/direct table denials were exercised. This is **not** a zero-advisor report. The reset's live HIBP path passed; broader Auth configuration was not changed or equated with that check.

## Cleanup and final state

Independent verification confirms **zero** tagged test users, live profiles/admins/roles, synthetic properties, transient account/editor drafts and Storage objects. Exactly the original two Auth users remain. Archived rows/OIDs/sequences, 20 function OIDs/bodies, original receipts and Auth digests pass. All presentation values match baselines; favicon is default, renter collection false, renter events zero. Immutable test audit/history remain.

Private draft assets deliberately have no browser DELETE policy; HTTP success alone was insufficient cleanup proof. Six remaining synthetic images (804 bytes) matched captured manifests exactly, were removed through a fixed-allowlist expiring service-side Storage endpoint, then independently verified absent. Policies were preserved.

Coordinator timeouts and repeated MCP SQL `Invalid or expired requestState` interrupted final acknowledgements. After read-only reconciliation, a two-minute endpoint restricted to the exact final tagged admin/delete action used fixed REST filters then Auth Admin deletion, returning no service credential. Final cleanup was independently verified, rather than calling the timed-out runner successful. Both temporary privileged endpoints now return HTTP 410; both lab access links are revoked. Test project remains healthy/available; no project state changed in this task.

Production remains healthy and `getvacancy.site` still serves `dpl_558VydjBz3tjnsNok5wgGQsoKZRz`. Original continuation `3411cc2` and feature `0a5d4d8` tips remain; PR #2 is OPEN DRAFT and untouched.

## Remaining release gates

1. Actual coordinated private database/photo recovery, restore access/operator and agreed objectives. The archive and earlier synthetic restore are not actual customer backups; no customer export/restore was authorized here.
2. Managed SMTP and allowed emailed-link redirect/callback delivery, representative hosted workload and any required hosted native-zoom comparison. Narrow functional/latency acceptance does not close those boundaries.
3. Frontend fallback operator/permission/eligible-artifact confirmation, original-reference comparison or explicit waiver, and private confirmation/MFA eligibility for the already selected human Owner/Operator.
4. Human review and separate exact production SQL, first-Owner bootstrap, Operator grant, reset Edge and frontend promotion/probe approvals. No live approval or merge is inferred.

Original added conversations and brief/mockup/package attachments remain unavailable unless present in mirrored references; no fresh original visual comparison is claimed. Renter activation and retention deletion remain separate reviewed work. No purchase is needed to retain this test setup/evidence; protected configuration and actual recovery require existing authority/private inputs, not a purchase by default.
