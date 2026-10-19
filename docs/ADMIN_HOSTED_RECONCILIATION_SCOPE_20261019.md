# Hosted reconciliation and acceptance — development boundary

Explicit user request: reconcile `vacancy-admin-test`, preserve existing work, then run hosted release checks for free. The previous separately authorized slot change leaves charity paused, Vacancy production healthy and the test project healthy. Do not change project states again in this task. Source checkpoint `b57915abeea0e9adcf0e9769a976a085c22d4944`; PR #3 stays draft. Both original branches and PR #2 remain unchanged.

## Named targets and limits

- All database, synthetic Auth, Storage and Edge writes: **only** test project `raauicmfyjpcuhfzknak`.
- Hosted frontend: **only** existing Vercel recovery lab `prj_gVMPc0rvkw2iLTqOCJQ5cVjGHJwS`, team `team_Pdpu5nE3GkX0xGb5V3rhEx40`. First prove its delivered bundle points only at the test backend. No production domain or project changes.
- Production `xtutkwiivqkgkqjpkxvj` and `getvacancy.site`: metadata preservation checks only. No customer export, SQL, roles, Auth/SMTP change or deployment.
- No purchase, plan upgrade, new project, account-limit workaround, PR merge or external sharing. Use existing Free quotas and standard public-repository Actions. Stop on capacity/rate/spending limits.
- Preserve canonical app/SQL payload and all 86 source migration files, including the 17 proposed production candidates; reconciliation scripts belong outside the production candidate directory. Fix a concrete new runtime issue only with recorded evidence and proportionate regression testing.

## Observed state and selected preservation route

The test database is a partial synthetic contract: 12 public tables, 20 custom public/private functions, 11 historical test receipts, five profiles, two pre-existing confirmed Auth users, nine immutable appearance revisions and 26 immutable audit entries. Its published Save config is the compiled default at revision nine. No Storage objects or custom Auth triggers were observed. The old profile comment explicitly says this is not a production schema. Replaying the release over it directly would collide with incomplete tables and invalidate the canonical adoption preconditions.

Select a protected in-database preservation archive of the existing tables/sequences/functions, with original OIDs/rows/history retained, original definitions/ACLs and count/digest checkpoints. Close all client access to the archive and reject accidental archive writes. Do not delete existing Auth users, storage objects or historical receipts. This preserves earlier test work while allowing the full source schema to be installed in the normal API schemas. Do not pretend archived SQL bodies still constitute the current API: their original qualified names remain in preserved definitions for deliberate recovery.

Then replay the 69 historical source files into the clean application namespaces, retaining the already-reviewed omission of the historical private-account assignment. Historical test setup may group consecutive files into bounded transactions; retain each source/replay digest and map every file to its actual grouped provider receipt. Preserve current test receipts and use test-only receipt name prefixes. Apply each of the 17 canonical candidate bodies unchanged and separately through the managed provider, verifying transaction failure/receipt behavior, adoption and grants. New test receipts are not production history repair. The original revision-nine history remains archived; it must not be rewritten into fabricated canonical revision-zero history.

Before namespace changes, require exact test marker, expected table/function sets, current row/sequence digests, and zero unknown external dependencies. Carry the archive move in one transaction; verify preservation immediately afterward. A failed later source step leaves the preserved archive intact and the incomplete new API closed for testing until repaired. Recovery is a deliberate transaction restoring archived objects/definitions and privileges after inspecting new dependencies; do not claim a source revert recovers data.

## Acceptance and cleanup

Use genuine managed Auth/MFA and browser/API/database journeys, only newly tagged synthetic actors/listings/photos and bounded test commands. Preserve existing users and the archived checkpoint. A temporary test-only bootstrap must authenticate a random expiring nonce, reject browser Origin requests, use runtime authority internally and never return service credentials. Close it after cleanup. Keep credentials, tokens, inbox addresses, Auth rows and raw responses out of GitHub artifacts and logs.

Verify canonical permissions, publication rollback/conflicts/idempotency/restore, all approved controls, customer create/edit/media, guarded ingestion with renter collection off, actual frozen reset Edge behavior and the isolated hosted frontend. Measure a bounded pilot sample within the earlier plan: at most five customer sessions, 1,000 operations, five requests/second, 50 MiB synthetic media and 30 minutes. Record any narrower sample accurately. Do not turn local browser evidence into deployed acceptance or a synthetic restore into actual customer recovery.

Any additional email test must use the already approved private inbox and test-only secret path; never reset either pre-existing account. Existing independent inbox acceptance remains valid for unchanged code. Unsupported/blocked managed SMTP or representative workloads stay explicitly unverified.

Retain sanitized evidence and the protected existing-work archive. Clean only this run's tagged transient fixtures, restore presentation through audited new revisions if exercised, and close test-only privileged endpoints. Leave the approved test project available and charity paused, consistent with the latest user instruction. Actual customer database/photo recovery, original references/private access, fallback authority and separate production approvals remain independent gates.
