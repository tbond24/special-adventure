# Vacancy cheaper testing options — current decision

**Subsequent execution:** [free-route acceptance](./ADMIN_FREE_TESTING_ACCEPTANCE_20261017.md) now passes 289 integration milestones + 24 units, actual synthetic DB/media recovery, post-restore genuine Auth/MFA/browser, native zoom and cleanup at test source `8d5fca6`. Sender/DNS configuration checked read-only; actual inbox delivery remains blocked on secure test-only SMTP setup. No purchase, production change or email. The research-only boundary below describes the earlier decision slice, not the later authorized isolated test execution.

**17 October 2026. The user declined the proposed US$25/month QA subscription and requested cheaper options.** No purchase was approved or made. This supersedes the selected paid setup in [the earlier hosting decision](./ADMIN_ISOLATED_HOSTING_DECISION_20261017.md); keep that record as an unexecuted historical proposal. Continue from clean `c0c3e43730823b962c9db80f97f759c5df44ef69` on `codex/vacancy-branch-reconciliation-20261016`. Exact tested runtime remains `d3f14a2c887d34effdd3e9d69ae1ea45bd672ae7`.

Scope for this slice is research, bounded read-only environment/source/run metadata, this decision and current-status links. Preserve all runtime/migration/test/workflow/dependency bytes and earlier evidence. No new run, resource, software installation, credential retrieval, mail, production action or other-project interruption. Do not request the declined subscription again. No new account to evade Free-project limits. Original private references remain unavailable and the test inbox stays private.

## Ranked options and choice

| Rank | Option | Cost and actual usefulness |
| --- | --- | --- |
| 1 | **Existing disposable GitHub Actions full-stack test setup** | **Selected for continued functional verification; no recurring test-database subscription.** The repository is PUBLIC (visibility unchanged), uses a standard `ubuntu-24.04` runner, and the existing genuine run already passed. Standard runner compute for public repositories is free; artifact/cache limits and account usage are separate. Disposable real Postgres/Auth/Storage/browser tests preserve production isolation. This is an actual working option, not a new platform migration. |
| 2 | Local Supabase on an existing computer | No managed database subscription; uses the computer's resources. Allows a user to exercise localhost reset callbacks directly. Requires a compatible runtime; `docker` and `podman` were not found on this Windows PATH (WSL executable exists, distribution/runtime readiness unknown). No software installed or service started. Prefer CI now rather than require a Windows installation merely to repeat passing functional tests. |
| 3 | Short-lived self-hosted VPS if an always-accessible test URL is necessary | Far below the proposed subscription for a short test. Official current Hetzner EU CX23 server price is **EUR0.0088/hour / EUR5.49 monthly cap**, excluding IPv4; larger CX33 is **EUR0.0136/hour / EUR8.49 monthly cap**. At 24 billed hours, server-only arithmetic is EUR0.2112 or EUR0.3264, respectively. Tax/IP/storage/backup/traffic extras and account/region availability require a real quote. The cost-optimized catalogue reports the entry instance unavailable in its current snapshot, so this is not provisionable capacity proof. Extra Linux/TLS/patching/SMTP/cleanup work and differences from managed Supabase reduce its value for this particular release. No server created. |
| 4 | Free static frontend hosting only | The existing isolated Vercel lab already provides the candidate host option. Another free static host does not supply Supabase Auth/PostgREST/Storage/Edge or solve database capacity. Do not migrate the frontend or create another account just to restate the same backend gap. |

**Decision:** use the existing disposable CI path for further necessary functional checks and do not buy a permanent QA database. Prepare external recovery delivery through a free transactional SMTP tier when the test-only sender/secret path is available. If a persistent public test copy becomes essential, separately quote an hourly VPS with sufficient memory, then obtain its explicit bounded approval. Do not purchase one now or call a self-hosted server managed-Supabase acceptance.

## Evidence specific to Vacancy

Read-only `gh repo view` confirms **PUBLIC**; this task did not publish the repository or change visibility. Existing [final run 39007612662](https://github.com/tbond24/special-adventure/actions/runs/39007612662) is completed/success. Its disposable job ran from **05:48:39 to 05:53:57 UTC** (13:48:39–13:53:57 Perth), about **5 minutes 18 seconds**. This is observed duration, not a promised future runtime or a new test execution. The accepted totals remain **282 integration milestones + 21 separate unit tests**, all 86 source migrations and 17 candidates; do not rerun unchanged source merely to make the cheaper option appear new.

The existing workflow has a 25-minute timeout, genuine loopback-only services, unconditional disposable cleanup and sanitized JSON/PNG evidence with seven-day artifact retention. It has no hosted credentials. Existing `tests/full-stack/config.toml` uses local SMTP capture; it does **not** currently deliver to the supplied inbox. Repository/run/workflow reads and command-availability checks are the only new execution in this decision slice.

## External inbox test without a paid database

The email-delivery gate does not intrinsically require a recurring managed database. Local/disposable GoTrue supports an external SMTP sender. Resend's advertised Free transactional tier is **3,000 emails/month and 100/day**, with SMTP support; that is ample nominal allowance for a bounded test. Actual account plan/quota, verified sender/domain, secure test-only SMTP access and recipient constraints remain unverified here. No API key, sender/domain, DNS record, GitHub secret or SMTP setting was created/changed, and no email was sent.

Use a separately scoped opt-in test configuration and secure secret storage if this path is implemented; preserve the default offline/capture workflow and reviewed runtime. Ordinary CI runs must never send mail. Exercise the actual GoTrue request and frozen reset handler, not a standalone message. Preserve rate limits, redact tokens/passwords, keep the recipient address outside Git, and distinguish provider acceptance, actual inbox receipt and successful link/reset behavior. If the callback is loopback on a remote runner, the user's own browser cannot reach that runner's localhost; arrange a real accessible test callback or an approved secure automated test path before claiming completion. Do not expose a development stack publicly or ask for reset links/credentials in chat.

This is a feasible lower-cost test design, **not completed external delivery or managed hosted acceptance**. The user's privately supplied address need not be requested again. Any implementation needs the remaining sender/secret and exact test-environment scope, not a paid database by assumption.

## Limits kept explicit

Functional CI and external SMTP can close different parts of acceptance. They do not establish managed Supabase hosted latency/cost/receipt semantics, actual production database/media checkpoint and restore, Vercel rollback authority, or unavailable original-reference comparison. Keep those recorded gates open unless resolved by matching evidence or an explicit scope decision; do not quietly downgrade them to PASS to save subscription cost. New renter collection stays off; no retention deletion, role grant, deployment or production mutation.

No change is needed to the existing application or stack to adopt this cost decision. Recovery for this documentation slice is a scoped revert, preserving the historical paid proposal and all test artifacts.

## Current primary sources checked

- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions): public-repository standard runner compute is free; storage/cache and larger runners have separate rules.
- [Supabase local development](https://supabase.com/docs/guides/local-development): local services are free, require a supported runtime and must not be exposed publicly.
- [Supabase SMTP configuration](https://supabase.com/docs/guides/local-development/cli/config#auth.email.smtp): configurable external SMTP; the repository currently uses capture instead.
- [Resend pricing](https://resend.com/pricing) and [Supabase SMTP integration](https://resend.com/docs/send-with-supabase-smtp): Free quota and actual SMTP route; not proof of this account's configuration.
- [Hetzner June 2026 current price adjustment](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/), [cost-optimized catalogue](https://www.hetzner.com/cloud/cost-optimized/) and [hourly billing](https://docs.hetzner.com/cloud/billing/faq/): current server rates, availability caveat, IPv4 exclusion and billing until deletion. Old EUR3.49 examples were not used as today's quote.
- [Supabase self-hosting requirements](https://supabase.com/docs/guides/self-hosting/docker): full-stack minimum 4 GB RAM/2 cores/40 GB SSD, recommended 8 GB or more. A tiny database-only free service is not a full Supabase replacement for this test.
