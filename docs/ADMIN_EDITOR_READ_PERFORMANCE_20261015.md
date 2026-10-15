# Vacancy implementation continuation — bounded editor-read verification

**Date:** 15 October 2026. **Result:** PASS in the disposable integration environment. **Production release:** HOLD.

## Reconciled starting point

The latest implementation-review approval was for the password-reset status correction in development only. The repository already contained that correction at `6d7e17ac69764ecb42fc86c77993ae5d3d65cf54`, documented at `473713fe8ac08c0caf2d32f086546bc29b9927e3`. It was not applied twice. See [password-reset acceptance](./ADMIN_PASSWORD_RESET_ACCEPTANCE_20261015.md).

This continuation adds a bounded verification increment, not another product feature or production release. The editor pilot remains **Listing detail → Save listing** (`listing-detail/save-button`).

## Exact scope and source

Tested commit: [`88f57c97f78eb476b2fde5f2173df2fd3aff6cff`](https://github.com/tbond24/special-adventure/commit/88f57c97f78eb476b2fde5f2173df2fd3aff6cff), on `feature/admin-desktop-editor-20261014`.

| File | Change |
| --- | --- |
| `tests/full-stack/editor-read-performance.mjs` | New bounded read measurements using the existing disposable stack and actual authenticated RPCs. |
| `tests/full-stack/editor-read-performance.test.mjs` | Six safety/statistics unit tests. |
| `tests/full-stack/run-recovery.mjs` | Run those tests and append the measurements to the existing full integration suite. |

No application, Edge-function, migration, workflow configuration or dependency file changed in this test commit. The original full integration runner remains pinned to Git blob `894fdf9a7cfab4386e71a9f44acf2f9acbedccf1`. This report is a subsequent documentation-only checkpoint.

## Verified execution and provenance

[GitHub Actions run 38709290793](https://github.com/tbond24/special-adventure/actions/runs/38709290793), job `116336390458`, completed **SUCCESS**. The evidence records execution from `2026-10-15T08:57:17.872Z` to `2026-10-15T09:01:07.162Z`.

- **239/239 recorded integration milestones passed**, including the previous admin permissions, real Auth/MFA, audit/conflict/publish/restore, source rollback compatibility, customer listing/photo and password-recovery journeys. Milestone records are not a count of every individual assertion.
- **6/6 safety/statistics unit tests passed**, separately recorded in the job log and also rerun locally.
- **74 source migrations** were prepared/replayed in the existing disposable test setup, retaining its documented omission of a historical hard-coded account assignment. This does not establish production schema parity.
- `evidence.completed`, `editorReadPerformance.completed` and `disposableStackRemoved` are all `true`; the separate workflow cleanup step also succeeded.

Artifact: `vacancy-disposable-integration`, ID `11959289261`, 669,377 bytes. Its downloaded ZIP SHA-256 was verified against GitHub's recorded digest:

`c340b657701d8610e607fc0f5416c3bec7718955c7ee2460fbe82d18d65f930a`

The archive contains sanitized JSON and existing synthetic test screenshots, not browser sessions, password files or Auth traces. GitHub's recorded artifact expiry is 22 October 2026; retain the supplied archive alongside this report.

## New behavior exercised

The helper accepts only the explicit disposable opt-in, the exact loopback API origin and the designated synthetic Owner. It rejects hosted targets and other identities before requesting the API. Existing real local Auth validates the Owner session; tokens stay in memory.

It creates **60 additional publications through the real draft/publish RPCs**, producing **120 corresponding audit entries**. It then performs three read cases at concurrency 1 and 5. Each case excludes five warmup requests and measures 50 completed reads: **300 measured reads plus 30 warmup reads**, separate from the pre-existing 20-sample check.

Every measured response is validated. Anonymous responses expose only current public configuration, not private drafts, actors or history. Authenticated history stays at **20 newest-first entries** despite 64 stored revisions. Read measurement leaves the checked current state and revision/audit/draft counts unchanged.

The helper restores the exact original published configuration through one further audited publication. It does not erase revisions or audit records. The Owner finishes without an outstanding draft; the pre-existing total draft count remains one. The complete disposable stack is subsequently removed.

## Measured results — local only

P95 uses nearest rank, `ceil(n × 0.95)`, with 50 samples per cell. Timing covers the HTTP request through complete response-body receipt. Payload sizes are UTF-8 response-body bytes, excluding HTTP headers.

| Read | P95, one in flight | P95, five in flight | Response body |
| --- | ---: | ---: | ---: |
| Published public appearance | 4.12 ms | 5.98 ms | 94 bytes |
| Private Owner editor state | 3.84 ms | 9.62 ms | 105 bytes |
| Private revision history | 2.53 ms | 9.12 ms | 4,219 bytes |

All 300 measured requests succeeded and satisfied their response checks. These results measure warm loopback requests on one CI runner with synthetic data. Five concurrent requests are **not five distinct users**. This is not sustained capacity, hosted latency, user-perceived page load time or a production performance guarantee. It does not measure the visitor aggregate or close that aggregate's performance target.

| Disposable measurement point | Revision rows | Audit rows | Total draft rows | Revisions table + indexes | Audit table + indexes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Before extra publications | 4 | 11 | 1 | 81,920 bytes | 81,920 bytes |
| After 60 publications | 64 | 131 | 1 | 139,264 bytes | 139,264 bytes |
| After restoring original configuration | 65 | 133 | 1 | 139,264 bytes | 147,456 bytes |

These are PostgreSQL allocated table/index sizes. They exclude WAL, backups and other storage and must not be linearly extrapolated into monthly bills.

## Production boundary and open work

A read-only Vercel Alias API check during this continuation still mapped `getvacancy.site` to original deployment `dpl_558VydjBz3tjnsNok5wgGQsoKZRz`, project `prj_znush7fSZP7lxpaUCOviftpmUzG3`. No Vercel deployment/domain action, hosted database migration, Owner/Operator assignment, live Auth setting change or production customer mutation was performed by this continuation.

The separate existing recovery tests still distinguish genuine local password update/logout from the browser-injected incomplete-sign-out warning. Real external inbox delivery remains unverified; this run does not claim an actual GoTrue logout failure occurred.

**Still open:** genuine native desktop 200% browser zoom; external inbox delivery; representative hosted candidate performance and operating cost; production/source schema reconciliation and project-specific recovery readiness; and the separately required live SQL, privileged Owner bootstrap, password-reset Edge and frontend release approvals. The approved audit-retention planning decision remains subject to its recorded legal/privacy review and does not authorize deletion.

The wider Stage 3 appearance/icon/display/favicon integrations, additional page-specific elements including the creation/edit language selector, and Stage 4 analytics/funnel work remain unfinished. This measurement increment does not mark the full admin complete. Refer to [the pilot release review](./ADMIN_DESKTOP_PILOT_RELEASE_REVIEW_20261015.md) for the broader constraints; later recorded acceptance supersedes older statements about tests that had not yet run.

## Recovery and continuation

For a test-only rollback, revert commit `88f57c97f78eb476b2fde5f2173df2fd3aff6cff` on the development branch after checking for subsequent changes. That removes these three-file test changes without undoing the approved password-reset correction or requiring any database rollback. Do not reset branch history or discard unrelated work. Keep this evidence as the historical record.

The next bounded independent task is the read-only production/source schema comparison against the six prepared migrations. It must produce exact compatibility findings rather than apply SQL, grant roles or deploy. Public-facing Stage 3 integrations require their scoped review before implementation.
