# Stage 2A — Production auth email delivery prerequisite

Status: **BLOCKED ON EMAIL PROVIDER CONFIGURATION**

This prerequisite was discovered during the dependency counter-check for Stage 2. It must be resolved before the full two-user marketplace loop can be considered runtime-proven.

## Why this stage exists

The Stage 2 goal is to prove two independent users can create accounts and complete the marketplace loop. The current frontend contains signup/signin code, but runtime testing showed the hosted Supabase email path is not suitable for deterministic public signup testing yet.

This is not a reason to bypass Auth. It is evidence that email delivery is an infrastructure dependency that was missing from the original roadmap.

## Evidence

### Probe 1 — reserved test domain

A runtime-generated account using an `.invalid` domain was submitted through the real `secure-signup` Edge Function.

Result:
- FAIL before account creation
- Supabase Auth error: `email_address_invalid`
- Root cause: Supabase rejects example/test domains.

No user was created.

### Probe 2 — `example.com`

The same probe used a unique `example.com` address.

Result:
- FAIL before account creation
- Supabase Auth error: `email_address_invalid`
- Root cause: Supabase explicitly rejects example/test domains.

No user was created.

### Probe 3 — address derived from Vacancy's own Vercel hostname

The test generated an address using the app hostname rather than targeting an external person's inbox.

Result:
- FAIL before account creation
- Supabase Auth error: `over_email_send_rate_limit`
- HTTP 429

This proves the request passed basic address validation and reached the hosted email-delivery stage.

Post-failure cleanup check:
- `auth.users where email like 'stage2-%'` = **0 rows**
- no disposable test account was left behind.

## `secure-signup` diagnosis

The production `secure-signup` Edge Function was inspected.

It correctly:
1. validates required fields;
2. enforces password length and complexity;
3. checks HIBP using the range API;
4. rejects leaked passwords;
5. forwards the request to `${SUPABASE_URL}/auth/v1/signup` using the public Auth key.

It does **not** bypass Supabase Auth, auto-confirm users, or use a service-role user-creation shortcut.

Therefore the current blocker is not the custom Edge Function. It is the hosted Auth/email-delivery dependency after the password safety gate.

## Current Supabase guidance relevant to the decision

Current hosted Supabase documentation states that:
- example/test email domains are not supported;
- hosted projects normally require email confirmation by default;
- the default email sender is intended for trial/best-effort use and is rate-limited;
- production projects should configure custom SMTP for reliable auth email delivery.

## Options considered

### Option A — Configure production custom SMTP / transactional email

Examples: Resend, Postmark, SES, SendGrid or another production mail provider with a domain controlled by Vacancy.

Pros:
- fixes the real production dependency rather than only the test;
- supports actual renter/lister signup;
- improves deliverability and sender trust;
- removes reliance on the default sender's very low limits;
- allows Stage 2 to test the same path users will use.

Cons:
- requires a mail provider account;
- requires a domain/subdomain that Vacancy controls and can verify with DNS;
- provider credentials/configuration are external infrastructure and must not be committed to Git.

Value: **highest**. This is the correct production solution.

### Option B — Create a separate isolated auth/test environment

Examples: Supabase development branch/local stack plus a captured test mailbox.

Pros:
- safer automated account churn;
- avoids polluting production user data;
- good long-term CI pattern.

Cons:
- does not solve real production signup delivery;
- Supabase hosted branches may incur hourly cost;
- branch Auth configuration still needs an email strategy;
- substantially more setup for a blocker that production SMTP must solve anyway.

Value: useful later as supporting test infrastructure, not the primary fix.

### Option C — Keep Supabase default SMTP and wait/retry around limits

Pros:
- no setup.

Cons:
- unreliable;
- poor deterministic CI;
- unsuitable for public launch traffic;
- does not address documented default-provider restrictions/limits.

Value: low. Rejected as a production solution.

### Option D — Disable email confirmation

Pros:
- fewer email dependencies during signup.

Cons:
- weakens account assurance for a rental marketplace;
- does not establish control of the claimed email address;
- contradicts the planned visible trust layer;
- changes production security solely to make tests easier.

Value: low. Rejected.

### Option E — Seed/modify `auth.users` directly or expose a test-only service-role endpoint

Pros:
- could manufacture sessions for automated tests.

Cons:
- bypasses the user path being tested;
- direct Auth-schema seeding is fragile/unsupported;
- a test service-role endpoint risks creating a production backdoor;
- false runtime proof.

Value: unacceptable. Rejected.

## Ranking

1. **Option A — custom SMTP / transactional email — chosen**
2. Option B — isolated environment later, after production email is correct
3. Option C — default SMTP — rejected for launch
4. Option D — disable confirmation — rejected
5. Option E — Auth bypass/test backdoor — rejected

## Acceptance criteria for Stage 2A

Stage 2A becomes PASS only when:

1. Vacancy has a production transactional email provider configured with a sender/domain it controls.
2. A fresh real signup can request confirmation without `email_address_invalid`, `email_address_not_authorized`, or built-in SMTP rate-limit failures.
3. Confirmation results in a usable authenticated session.
4. The user can sign out and sign back in with password.
5. The disposable test user can self-delete through the normal delete-account path.
6. No service-role secret is present in browser code or GitHub.
7. Auth errors remain user-friendly and do not leak sensitive implementation details.
8. Stage 1 20/20 regression remains green.

## Recommended provider path

Resend is currently the preferred first candidate because it is simple for transactional email and is available as a ChatGPT plugin. The provider choice is not architecturally locked; Supabase should remain the Auth system and the mail provider should be replaceable.

A verified Vacancy-controlled domain/subdomain is still required for a real production sender. Do not try to use the default `vercel.app` hostname as an email-sending domain.

## Current stop/go decision

**STOP Stage 2 full marketplace E2E here.**

Do not begin Stage 3 listing UX as if authentication were proven. Resume the two-user Stage 2 loop immediately after Stage 2A passes.
