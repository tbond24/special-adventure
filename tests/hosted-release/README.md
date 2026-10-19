# Isolated managed release checks

Read the scope and acceptance records in `docs/ADMIN_HOSTED_RECONCILIATION_*_20261019.md`. Database target is fixed to `raauicmfyjpcuhfzknak`; lab build rejects every project except `prj_gVMPc0rvkw2iLTqOCJQ5cVjGHJwS`. No production authorization is implied.

The database is already reconciled. **Do not replay archive/source steps again.** `reconciliation-plan.mjs --plan` only verifies canonical source/manifest hashes. Actual grouped receipt mapping is retained in the database and sanitized evidence.

A separately authorized fresh run needs a fresh ignored expiring window (`window.mjs --prepare`), a rendered protected test bootstrap and temporary private access cookie for the exact lab. Never print window/access/API/session/TOTP/reset credentials. The build receives only test publishable configuration; service authority stays inside Edge runtimes.

`run.mjs --execute-isolated` exercises broad managed permission/publication and customer flows; `--frontend-only` skips the proven broad matrix. `admin-browser.mjs --execute-isolated` and `reset-browser.mjs --execute-isolated` independently check actual admin/MFA/analytics/appearance and recovery. Preserve previous attempts and use fresh barrier files; never trust an old `.ready` file.

On `WAITING`, `fixture-sql.mjs <phase>` generates reviewable SQL from nonsecret tagged IDs; it never executes it. Review/execute only in the named test project, verify, then signal the corresponding barrier. Media ready files contain verified object manifests as JSON. Never expose arbitrary SQL-over-HTTP or account-wide management authority.

Private immutable draft images have no browser DELETE policy. Verify public removals by response counts. Render `media-cleanup-edge.ts` only after every fixed object matches captured synthetic manifests; it accepts no client-selected paths. Use Storage API, never delete only SQL object metadata; independently verify zero objects.

Cleanup must revoke synthetic sessions, clear cyclic draft head/manifests in order, remove tagged rows/users only, restore presentation through audited publications and verify original archive/Auth/receipt checkpoints and function definitions. Timeouts are not successful cleanup. The acceptance records the fixed-actor REST/Auth fallback used after SQL request-state errors. Close privileged endpoints to HTTP 410 and revoke temporary lab access before finishing.

The Vercel test-only build uses documented Build Output primitives, actual listing-page code and both HTML templates. Verify delivered hashes/CSP/backend isolation. Recovery sends no mail; SMTP/emailed-link redirects remain distinct. Native zoom is claimed only with actual `chrome.tabs` factor/viewport proof, never headless-shell/CSS viewport emulation.
