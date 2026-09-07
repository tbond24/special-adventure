# Stage 6: password recovery

Status: implementation in progress; no acceptance claim or new green checkpoint.
Base: 6d35205e4cf296a2aa3aceda202c33f33b7cbc86, checkpoint/stage4-hardened-preview-pass.
Production and its Supabase configuration must remain unchanged.

## Aim and scope
Recover an existing account using Supabase-issued recovery links. Preserve 12-character mixed-case/digit passwords and fail-closed HIBP checks. No new product features.

## Ranked options
1. Existing REST adapter + isolated recovery UI + server-side password screening. High value, moderate complexity, smallest architecture change. Chosen.
2. Supabase JS client migration. Good session lifecycle support, but broader integration and storage migration risk. Second.
3. Separate custom recovery service. Independent control, highest complexity and security maintenance burden. Third.

## Acceptance
Runtime-prove request feedback, repeated-submission protection, valid reset, wrong/expired links, password rejection, network failure and retry. Use disposable local Supabase in CI, never production test writes. Retain existing suites unchanged. Distinguish mocked transport failure tests from genuine Auth tests. Branded email delivery remains a separate blocked gate.

## Inspection findings (not runtime proof)
Recovery is absent. Signout clears local storage only. Identity lookup clears storage on all errors, including network errors. Local QA currently disables email confirmation and its mail catcher; recovery QA must use confirmation enabled and real local mail delivery. Production secure-signup source was retrieved read-only; it is not being changed.

## Implementation review
Recovery callback handling initially ran only at module load. Ranked fixes: (1) capture callbacks on hashchange before rendering, chosen for small scope; (2) replace router, higher regression risk; (3) force reload, avoidable disruption. Callback credentials are removed from the URL and retained only in memory.

Recovery initially depended on the public vacancy feed during boot. Ranked fixes: (1) render recovery routes before inventory fetch, chosen; (2) refactor all boot dependencies, broader scope; (3) retries alone, does not remove dependency. Successful reset clears the existing local identity and saved state.

## Verification and current score
- All canonical JavaScript syntax checks pass; git diff whitespace check passes.
- These are preliminary checks, not working-product evidence.
- Runtime acceptance: **NOT RUN / NOT ACCEPTED**. No stage advancement.
- Local dependency installation completed. npm reported two high-severity dependency advisories; investigate exact affected package and exposure before accepting the test environment. No automatic dependency upgrade performed.
- This host has no Docker executable available. Existing genuine QA uses disposable Supabase in GitHub Actions.
- Automatic approval review rejected pushing dev/pre-domain-auth to the existing tbond24/special-adventure repository, requesting explicit user authorization to export the new source/tests. No push occurred. Approval was requested; no indirect workaround attempted.

## Next execution
After push authorization, push this development branch and inspect the Pre-domain auth acceptance run. Diagnose any failure; rank three fixes before changing it. Re-run recovery and relevant existing regressions before accepting Stage 6. Recovery uses a new Edge Function that is committed only; deployment and verification in an isolated environment are still pending. Do not deploy it to production during this phase.

Stages 2–6 of the requested launch block remain pending, including auth/session/deletion hardening, operational runbook, full regression and pre-domain checkpoint. The domain is therefore not yet the only blocker.

## Runtime iteration 1: failed
Run 34085925971 started the disposable confirmation-enabled Supabase stack and served the candidate successfully. Targeted results: 2/3 passed. The genuine reset stopped at the landing page.

Trace evidence showed GoTrue redirected to `/#reset-password#access_token=...&type=recovery`. A URL can have only one fragment, so the app parsed `reset-password#access_token=...` as an unknown route and rendered Home. This is a product integration defect, not an eased or incorrect assertion.

Ranked fixes: (1) provide a fragment-free redirect and capture GoTrue's credential fragment before replacing it with `#reset-password`, chosen; (2) accept the malformed double-fragment format, brittle; (3) replace hash routing with path routing, excessive regression surface. The request flow and genuine-link test now use the fragment-free redirect. Full targeted runtime rerun required.

## Runtime iteration 2: passed
Run 34086250688: **3/3 passed** in 4.6 seconds against disposable, confirmation-enabled Supabase Auth. This proves the genuine link/password-change/sign-in path plus invalid and injected failure paths. Stage 6 password-recovery behavior is accepted for the non-domain phase. Branded delivery remains unclaimed. npm audit after upgrading the test-only Playwright dependency from 1.55.0 to the smallest patched 1.55.1 reports zero vulnerabilities.
