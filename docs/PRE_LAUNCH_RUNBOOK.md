# Vacancy pre-launch release and rollback runbook

## Exact candidate
- Branch: `dev/pre-domain-auth`
- Frontend tree: record with `git rev-parse HEAD:app` at checkpoint.
- Edge Functions: `secure-password-reset` and `delete-account` from the same checkpoint commit.
- Accepted preview deployment: `dpl_7ZL3BDdhHsCDSx1EToS5di7zcapb` (`vacancy-bbbibvdlg-tbond24s-projects.vercel.app`).
- Current production remains `vacancy-nine.vercel.app`; do not rebuild when promoting. Promote the exact accepted preview only after the domain/email/Turnstile gate passes.

## Required gates
1. Auth recovery/session/deletion isolated suite green.
2. Genuine renter↔landlord isolated suite green.
3. Preview equivalence 20/20, hardening 10/10, adversarial 24/24.
4. Final domain configured; Resend domain verified; SMTP enabled with confirmation on; Turnstile enabled; real signup confirmation and reset emails received and used.
5. Confirm Vercel deployment READY, no build/runtime errors, Supabase Auth/API healthy, and production RLS/RPC checks 12/12.

## Release
1. Record checkpoint commit, frontend tree, function versions and preview deployment ID.
2. Deploy the two tested Auth functions from the checkpoint and configure the final allowed redirect URLs.
3. Run the real email gate. Stop on any failure.
4. Promote `dpl_7ZL3BDdhHsCDSx1EToS5di7zcapb` without rebuilding.
5. Repeat 54 checks, 12 database checks, real signup/reset, listing creation and renter↔landlord messaging against production.
6. Create a production rollback branch/tag pointing to the exact live commit and record deployed function versions.

## If something breaks
- Signup/reset: pause promotion or public launch; check Supabase Auth logs, SMTP delivery/Resend events, redirect allowlist, CAPTCHA errors and Auth rate limits. Keep confirmation enabled.
- Listings: stop new promotion; check Vercel runtime errors, Supabase API/RPC errors and RLS checks. Do not loosen RLS to restore service.
- Messaging: verify both genuine sessions, block rules and `start_enquiry`/`send_message` RPC results. Preserve data; do not delete conversations during diagnosis.
- Serious production regression: reassign the production alias to the recorded previous READY deployment, restore only the recorded compatible function versions if functions changed, then rerun health checks. Database migrations require a forward fix unless an explicit tested reverse migration exists.

## Health check order
Vercel deployment/alias → app boot desktop/mobile → Supabase Auth → public inventory → authenticated listing write → enquiry/reply → error logs. Record time, failing request, status code and deployment/function version before changing anything.
