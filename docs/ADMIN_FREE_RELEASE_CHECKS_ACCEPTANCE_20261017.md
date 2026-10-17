# Vacancy additional free release checks — acceptance

**PASS for exact source packaging and refreshed bounded preflight; production release HOLD.** These checks follow the user's free-only continuation and [scope](./ADMIN_FREE_RELEASE_CHECKS_SCOPE_20261017.md). Package source is clean checkpoint `aa37cae6f75a5f5a20e9be24f35af3436546bfe0` on `codex/vacancy-branch-reconciliation-20261016`; runtime remains `d3f14a2`, and application/SQL bytes match genuine final test source `8d5fca6`. No purchase, production change or mail.

## Newly completed checks

| Check | Executed result |
| --- | --- |
| Exact source package | **PASS.** 142 files: 124 committed app files, all 17 canonical candidate migrations and frozen reset handler. Every extracted byte, Git blob and SHA-256 matches pinned source and execution manifest. No working-directory/untracked files, linked credentials, customer data or test fixtures enter the package. |
| Archive safety/reproducibility | **PASS.** Validated entry containment/type/duplicates/size before extraction. Independent regeneration matches: **1,055,124 bytes**, SHA-256 **`fc8aa1b313c7a1fd7af3473260bcaf18aad0e969d2206786191c68c568405795`**. This is a source archive, not Vercel prebuilt output or a deployment. |
| Packaged source/assets | **PASS.** All **98 JavaScript/module files** parse; **90 direct dependency references** resolve. Checks cover local HTML assets, CSS URLs and literal relative module imports, not every dynamic string. Bounded pattern scan finds no privileged JWT, secret API key or private key; not an exhaustive secret audit. |
| Packaged browser | **PASS.** Actual unmodified packaged sign-in and 404 pages at widths **1536 and 390**: visible email/password controls, decoded logo, no horizontal overflow, missing local requests or uncaught page errors. Service workers disabled; loopback, local CSP and browser routing allow no external requests. Both 404 screenshots inspected. No sign-in, mail or hosted API operation performed. |
| Packaged listing recovery | **PASS.** Existing rewrite destinations present. Handler executed in a VM with synthetic in-memory fetch: invalid ID returns 404 without lookup; missing record returns 404; upstream failure returns 502 with Retry/Find recovery. No actual database request. |
| Refreshed final preflight | **Bounded PASS.** Seven exact previously reviewed SELECTs around **09:27 UTC on 17 October** match accepted relations, functions, privileges, receipts, display, icons and favicon results after excluding only observation timestamps. Seven independent snapshots, not a transaction or candidate adoption. |
| Source preservation | **PASS.** Original sixteen candidates, all 86 canonical migrations, frozen contracts, dependencies and both feature provenance anchors preserved. Composed Create/Edit examples still match public renderer fingerprints. No app, SQL, existing test/workflow, dependency or unrelated file changed. |

[Artifact verification](./evidence/admin-free-release-artifact-20261017.json) records all 142 hashes, two screenshot hashes and checker hash. Local archive `work/free-release-checks-3KpH1Z/candidate-source.zip` stays ignored, not uploaded or deployed. [Observations](./evidence/admin-free-release-preflight-20261017.json) and [comparison](./evidence/admin-free-release-preflight-comparison-20261017.json) preserve exact provenance. New package checks are not added to the **289 integration milestones + 24 units** in [run 39016174911](https://github.com/tbond24/special-adventure/actions/runs/39016174911); that successful suite was not rerun because its source and behavior are unchanged.

The first package attempt correctly failed its first byte comparison: Windows `core.autocrlf=true` affected `git archive`. The checker now supplies `-c core.autocrlf=false` only to its Git commands. No repository/global setting, app file or migration changed. Corrected complete check and independent regeneration pass; failed local record is retained.

## Provider state and limits

[Selected metadata](./evidence/admin-free-release-providers-20261017.json), refreshed around **09:32 UTC**, confirms production ACTIVE_HEALTHY, old test INACTIVE, and serving alias unchanged at READY `dpl_558VydjBz3tjnsNok5wgGQsoKZRz`, source `1a03a32592892a05ee0bdebbc33b75e409d7392e`. Both original remote heads and draft PR #2 are unchanged; auto-merge unset. No project, role, account, domain or deployment changed.

Backup metadata again shows **zero listed backups, PITR false, WALG enabled**; no usable actual checkpoint or media recovery is established. The first sandboxed CLI help call failed at its local telemetry-file write; the narrowly approved read-only invocation then worked. This was a filesystem sandbox limit, not a production operation or automatic approval-review rejection. No backup was downloaded/exported/restored.

GitHub still reports **zero repository secrets and zero environments**. No approved test SMTP path was added. Private recipient/identity details remain out of files/logs; earlier sender/DNS readiness is configuration evidence only. No external email sent.

Ordinary Vercel metadata omits rollback eligibility and build/root settings. The denied rollback query was not repeated, and no deployment probes permission. Any separately approved release must verify provider build/root configuration and select the exact reviewed **`app/` tree**, API rewrites and environment. This package is not permission to deploy the historical `release/` directory or whole repository as static content.

## Remaining release gates

1. **Real reset delivery/callback:** secure test-only SMTP/recipient/callback route, then the actual recovery request → inbox → callback → reset → sign-in flow. No paid permanent database is intrinsically required; credentials and safe reachable callback remain absent.
2. **Managed rehearsal:** exact candidate transaction/error/receipt sequence, actual frontend/reset configuration and bounded workload in an approved isolated target. Local package/CI tests cannot establish managed behavior/performance. Do not purchase capacity, resume a project or deploy on assumption.
3. **Actual recovery:** authorized private database checkpoint plus coordinated photo-object recovery set, authority/destination and matching isolated restore evidence. Synthetic recovery cannot establish actual data recovery or production loss/time guarantees; no customer export authorized here.
4. **Fallback authority:** authorized Vercel operator confirms eligible artifact, both domains, permission and undo procedure. READY metadata is insufficient.
5. **Reference/access signoff:** original private conversations, brief/mockup/package and identity note remain inaccessible. Preserve privately selected Owner/Operator; actual eligibility, confirmation/MFA, bootstrap and guarded grant stay separate.
6. **Release operations:** fresh preflight at approved window, exact seventeen-file SQL approval/application, post-adoption/security checks and separately approved frozen Edge/frontend release and scoped smoke. No blanket historical push/repair, merge or production action follows from these tests.

Renter collection stays off. Thirty-day renter/twelve-month audit targets authorize no deletion; notice/privacy and physical retention/hold/backup/link handling remain later activation work. Admin release does not require enabling collection.

All independent checks in this slice are complete. Remaining gates need external configuration, evidence, access or specific operation authority; additional local tests cannot substitute. The free-route decision supersedes declined paid-QA proposals. Historical document/evidence hashes stay tied to their original checkpoint rather than being relabelled as this evidence. Recovery for this slice is a scoped test/documentation revert only.
