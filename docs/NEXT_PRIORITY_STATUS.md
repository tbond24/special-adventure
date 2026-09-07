# Vacancy — Next Priority Status

## Current state

1. Foundation / canonical source + DB contract — PASS.
2. Stage 2B genuine-session core marketplace QA — PASS.
3. Stage 2A production signup/email delivery — OPEN external infrastructure gate.
4. Hardened Vercel preview — NEXT executable stage.
5. Adversarial persona QA on preview — follows preview.
6. Production promotion — blocked until preview/persona QA passes **and** production signup/email delivery is proven.
7. Known-good checkpoint + monitoring — after production promotion.

## Dependency counter-check

Stage 2A is required for the final production-ready declaration, but it is **not** a prerequisite for deploying an isolated frontend preview or testing public/non-email-dependent product paths. Therefore work can continue on preview + adversarial QA while production email infrastructure is being resolved.

Production must not be promoted as the new known-good release while Stage 2A remains red/open.
