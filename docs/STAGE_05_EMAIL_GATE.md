# Stage 5 — Production signup/email gate

## Current blocker
Vacancy production signup uses the `secure-signup` Edge Function, which enforces 12+ character mixed-case/digit passwords and checks HIBP before calling Supabase Auth signup. The live function is active and fails closed if HIBP is unavailable.

Supabase's built-in Auth SMTP is not suitable for public production delivery. Current Supabase guidance states that the built-in provider is restricted/rate-limited and recommends custom SMTP for production.

## Current infrastructure facts
- Supabase project: `xtutkwiivqkgkqjpkxvj`
- Vercel project has only `vacancy-nine.vercel.app` and `vacancy-tbond24s-projects.vercel.app`; no custom Vacancy domain is attached.
- Resend is the preferred MVP SMTP provider, but it is not yet connected.
- Email confirmation/security must not be disabled to bypass this gate.

## Security advisor
Supabase reports built-in leaked-password protection disabled. This does not leave current Vacancy signup unscreened because `secure-signup` independently checks HIBP, but Supabase-level leaked-password protection remains recommended for future password-changing flows.

## Performance advisor
Current findings are non-blocking for MVP launch: unindexed foreign keys on analytics/error telemetry and multiple permissive-policy performance warnings. Do not remove unused indexes solely because the advisor reports no usage on the current low-traffic project.

## Release acceptance
Stage 5 passes only when all are true:
1. A production-capable transactional email provider is connected.
2. A verified sender/domain is configured.
3. Supabase Auth uses custom SMTP while email confirmation remains enabled.
4. A fresh public signup receives its confirmation email.
5. Confirmation produces a usable authenticated session/sign-in.
6. Password/HIBP safeguards still reject weak/leaked credentials.
7. No production data/privacy regressions appear after configuration.

Until then, Stage 4 preview remains the tested release candidate and production promotion is not authorised.
