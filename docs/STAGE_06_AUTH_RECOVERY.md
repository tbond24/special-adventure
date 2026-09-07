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
